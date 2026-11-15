// Run against a local Vite server: ODIN_UI_URL=http://127.0.0.1:5176 node tests/statistics-tooltips.browser.mjs
// All statistics responses are deterministic fixtures; no scientific requests reach production.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const origin = process.env.ODIN_UI_URL ?? "http://127.0.0.1:5176";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname));
const output = process.env.ODIN_STATS_QA_DIR ?? "/tmp/odin-stats-001";
await mkdir(output, { recursive: true });
const years = [2001, 2007, 2015, 2019, 2023, 2025];
const months = Array.from({ length: 12 }, (_, index) => index + 1);
const annual = { Years: years, Data: {
  "1": years.map((year, index) => [year, 12000 + index * 1000]),
  "2": years.map((year, index) => [year, 6000 + index * 500]),
} };
const monthly = { Year: 2023, Months: months, Data: {
  "1": months.map((month) => [month, 1200 + month * 100]),
  "2": months.map((month) => [month, month === 2 ? null : month === 3 ? 0 : month === 4 ? -200 : 600 + month * 50]),
} };
const receipt = { fixtureOnly: true, origin, completed: false, cases: [], interactions: [], errors: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const fixtureRoute = async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== origin) return route.abort();
  if (url.pathname === "/rest_api/v5/statistics/freqmode/timeline/") {
    return route.fulfill({ json: url.searchParams.has("year") ? monthly : annual });
  }
  if (url.pathname === "/api/stats") {
    const mode = Number(url.searchParams.get("fm"));
    return route.fulfill({ json: [1, 2].includes(mode)
      ? months.map((month) => ({ month, freqmode: mode, count: mode === 1 ? 600 + month * 50 : month === 4 ? -100 : 300 + month * 25 })) : [] });
  }
  if (url.pathname.startsWith("/rest_api/") || url.pathname.startsWith("/api/")) {
    return route.fulfill({ status: 503, json: { detail: "Unexpected API request in local statistics test" } });
  }
  return route.continue();
};
await context.route("**/*", fixtureRoute);
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on("pageerror", (error) => receipt.errors.push(error.message));
const annualChart = () => page.locator('svg[aria-label="Level 1 frequency-mode timeline"]');
const monthlyChart = () => page.locator('svg[aria-label="Level 1 and Level 2 frequency-mode timeline"]');
const tooltip = () => page.getByRole("tooltip");
const settle = async () => {
  await monthlyChart().locator('rect[data-level="1"][data-mode="1"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const measure = () => page.evaluate(() => ({
  width: document.documentElement.scrollWidth,
  height: document.documentElement.scrollHeight,
  x: scrollX, y: scrollY,
}));
const withinViewport = async () => {
  await tooltip().waitFor();
  await page.waitForFunction(() => {
    const element = document.querySelector('[role="tooltip"]');
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.left >= 7 && rect.top >= 7 && rect.right <= innerWidth - 7 && rect.bottom <= innerHeight - 7;
  });
};
const pointAt = async (element) => {
  const rect = await element.boundingBox();
  assert.ok(rect && rect.width > 0 && rect.height > 0);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await withinViewport();
};

try {
  for (const theme of process.env.ODIN_STATS_QA_INTERACTIONS_ONLY ? [] : ["light", "dark"]) {
    await page.goto(origin);
    await page.evaluate((value) => localStorage.setItem("themeMode", value), theme);
    for (const viewport of [{ width: 320, height: 900 }, { width: 390, height: 900 }, { width: 834, height: 900 }, { width: 1440, height: 900 }, { width: 390, height: 520 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${origin}/level1/statistics/2023`);
      await settle();
      assert.ok((await measure()).width <= viewport.width, "Page overflows before hover");
      const filled = await monthlyChart().locator('rect[data-level="2"]').evaluateAll((bars) => bars.every((bar) => {
        const color = getComputedStyle(bar).fill;
        return color !== "none" && color !== "transparent" && color !== "rgba(0, 0, 0, 0)";
      }));
      assert.ok(filled, "Level 2 bars must be filled");
      for (const [name, chart, groups] of [["annual", annualChart(), [2001, 2015, 2025]], ["monthly", monthlyChart(), [1, 6, 12]]]) {
        await chart.evaluate((element) => element.scrollIntoView({ block: "center" }));
        await page.mouse.move(0, 0);
        await page.waitForTimeout(100);
        const before = await measure();
        for (const group of [...groups, ...groups.slice().reverse()]) {
          for (const level of name === "monthly" ? [1, 2] : [1]) {
            const bar = chart.locator(`rect[data-level="${level}"][data-mode="1"][data-group="${group}"]`);
            await pointAt(bar);
            assert.deepEqual(await measure(), before, `${theme} ${viewport.width}x${viewport.height} ${name}: hovering must not change page dimensions or scroll position`);
            assert.match(await tooltip().innerText(), /FM 1/);
            if (name === "monthly") assert.match(await tooltip().innerText(), /2023/);
          }
        }
        receipt.cases.push({ theme, ...viewport, chart: name, stableDimensions: before, boundedTooltips: true });
        if ([390, 1440].includes(viewport.width) && viewport.height === 900 && name === "monthly") {
          await page.screenshot({ path: `${output}/${theme}-${viewport.width}-monthly.png` });
        }
        await page.mouse.move(0, 0);
        await tooltip().waitFor({ state: "hidden" });
      }
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/level1/statistics/2023`);
  await settle();
  await monthlyChart().evaluate((element) => element.scrollIntoView({ block: "center" }));
  const january = monthlyChart().locator('rect[data-level="2"][data-mode="1"][data-group="1"]');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(100);
  await pointAt(january);
  await page.keyboard.press("Escape");
  await tooltip().waitFor({ state: "hidden" });
  receipt.interactions.push("Escape dismisses a mouse tooltip without moving focus to its bar");
  await january.focus();
  await withinViewport();
  assert.match(await tooltip().innerText(), /January 2023/);
  assert.match(await tooltip().innerText(), /1,300/);
  assert.match(await tooltip().innerText(), /650/);
  assert.match(await tooltip().innerText(), /50\.0/);
  assert.ok(await january.getAttribute("aria-describedby"), "Focused bar describes its tooltip");
  await page.keyboard.press("Escape");
  await tooltip().waitFor({ state: "hidden" });
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: "Inspect counts" }).waitFor();
  assert.match(await page.getByRole("dialog", { name: "Inspect counts" }).innerText(), /L2 count: 650/);
  await page.getByRole("button", { name: "Close Inspect counts", exact: true }).click();
  await page.getByRole("dialog", { name: "Inspect counts" }).waitFor({ state: "hidden" });
  await page.locator(".MuiPopover-root").waitFor({ state: "detached" });
  receipt.interactions.push("Keyboard focus has a bounded descriptive tooltip; Escape dismisses; Enter opens exact-count inspection");

  const missing = monthlyChart().locator('[data-level="1"][data-mode="2"][data-group="2"]');
  await missing.focus(); await withinViewport();
  assert.match(await tooltip().innerText(), /Missing/);
  const zero = monthlyChart().locator('[data-level="1"][data-mode="2"][data-group="3"]');
  await zero.focus(); await withinViewport();
  assert.match(await tooltip().innerText(), /L1[^\d]*0/);
  const negative = monthlyChart().locator('[data-level="1"][data-mode="2"][data-group="4"]');
  await negative.focus(); await withinViewport();
  assert.match(await tooltip().innerText(), /-200/);
  assert.match(await tooltip().innerText(), /-100/);
  assert.doesNotMatch(await tooltip().innerText(), /50\.0/);
  receipt.interactions.push("Missing, zero and negative counts remain distinct; undefined ratios are not percentages");
  await page.keyboard.press("Escape");
  await page.mouse.move(0, 0);
  await pointAt(january);
  await page.mouse.wheel(0, 60);
  await tooltip().waitFor({ state: "hidden" });
  receipt.interactions.push("Scrolling dismisses stale pointer details");

  // A real touch context exercises the same inspect control without relying on hover.
  const touchContext = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 900 } });
  await touchContext.route("**/*", fixtureRoute);
  const touchPage = await touchContext.newPage();
  touchPage.on("pageerror", (error) => receipt.errors.push(error.message));
  await touchPage.goto(`${origin}/level1/statistics/2023`);
  await touchPage.locator('svg[aria-label="Level 1 and Level 2 frequency-mode timeline"] rect[data-level="2"][data-mode="1"][data-group="1"]').tap();
  await touchPage.getByRole("dialog", { name: "Inspect counts" }).waitFor();
  assert.match(await touchPage.getByRole("dialog", { name: "Inspect counts" }).innerText(), /L2 count: 650/);
  receipt.interactions.push("Phone touch opens exact-count inspection");
  await touchContext.close();

  await page.goto(`${origin}/level1/statistics`);
  await annualChart().locator('rect[data-mode="1"]').first().waitFor();
  await annualChart().evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(100);
  const annualBefore = await measure();
  await pointAt(annualChart().locator('rect[data-mode="1"][data-group="2025"]'));
  assert.match(await tooltip().innerText(), /2025/);
  assert.deepEqual(await measure(), annualBefore);
  assert.equal(await monthlyChart().count(), 0);
  receipt.interactions.push("Full-width annual route keeps tooltip bounded and page dimensions stable");
  assert.deepEqual(receipt.errors, []);
  receipt.completed = true;
  console.log(JSON.stringify({ cases: receipt.cases.length, interactions: receipt.interactions, errors: receipt.errors }, null, 2));
} catch (error) {
  receipt.failure = String(error);
  receipt.failureState = await page.evaluate(() => {
    const bar = document.querySelector('svg[aria-label="Level 1 and Level 2 frequency-mode timeline"] rect[data-level="2"][data-mode="1"][data-group="1"]');
    const rect = bar?.getBoundingClientRect();
    return { scrollY, active: document.activeElement?.outerHTML, bar: bar?.outerHTML, rect: rect?.toJSON(),
      tooltips: [...document.querySelectorAll('[role="tooltip"]')].map((el) => ({ html: el.outerHTML, rect: el.getBoundingClientRect().toJSON() })),
      overlays: [...document.querySelectorAll('.MuiModal-root')].map((el) => el.outerHTML.slice(0, 1500)),
      hit: rect && document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.outerHTML,
      parents: bar && [...(function* () { let el = bar; while (el) { yield el; el = el.parentElement; } })()].map((el) => ({ tag: el.tagName, visibility: getComputedStyle(el).visibility, display: getComputedStyle(el).display, opacity: getComputedStyle(el).opacity, pointerEvents: getComputedStyle(el).pointerEvents, transform: getComputedStyle(el).transform })) };
  });
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  await writeFile(`${output}/browser.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
