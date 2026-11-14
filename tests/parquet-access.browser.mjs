// Local acceptance only. Never sends requests to scientific APIs or object stores.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const origin = process.env.ODIN_UI_URL ?? "http://127.0.0.1:5187";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const output = process.env.ODIN_PARQUET_QA_DIR ?? "/tmp/odin-parquet-browser";
await mkdir(output, { recursive: true });
const fixture = JSON.parse(await readFile(new URL("../src/parquet/fixtures/catalog.json", import.meta.url), "utf8"));
// Keep both acceptance states deterministic when the production catalog publishes.
const planned = { schema_version: 1, status: "planned", message: "Local planned-release fixture.", releases: [] };
let scenario = "planned";
const receipt = { fixtureOnly: true, cases: [], errors: [], blockedRequests: [] };
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/rest_api/")) {
      receipt.blockedRequests.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/parquet/catalog.json") {
      if (scenario === "error") return route.fulfill({ status: 503, body: "Unavailable" });
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(scenario === "published" ? fixture : planned) });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => receipt.errors.push(error.message));
  const section = page.locator('section[aria-labelledby="parquet-access"]');
  for (scenario of ["planned", "published"]) {
    for (const width of [320, 390, 768, 1440]) {
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`${origin}/data_access/files`);
        await page.evaluate((value) => localStorage.setItem("themeMode", value), theme);
        await page.reload();
        if (scenario === "planned") await section.getByText("Public Parquet release in preparation", { exact: true }).waitFor();
        else await section.locator("#parquet-release").waitFor();
        await page.evaluate(() => document.fonts.ready);
        for (const fontSize of [16, 32]) {
          await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
          const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
          assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `Overflow: ${scenario}/${width}/${theme}/${fontSize}: ${JSON.stringify(dimensions)}`);
          receipt.cases.push({ scenario, width, theme, fontSize, ...dimensions });
        }
        await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; });
        if ((width === 390 && theme === "light") || (width === 1440 && theme === "dark")) {
          await section.screenshot({ path: `${output}/${scenario}-${width}-${theme}.png` });
        }
      }
    }
  }
  await page.getByLabel("Coverage start date", { exact: true }).fill("2015-02-01");
  await page.getByLabel("Coverage end date", { exact: true }).fill("2015-02-28");
  await section.getByText("1 file · 2 KiB · 24 stored rows", { exact: true }).waitFor();
  const downloadPromise = page.waitForEvent("download");
  await section.getByRole("button", { name: "Download selection.json", exact: true }).click();
  const download = await downloadPromise;
  const selection = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.deepEqual(selection.files, [fixture.releases[0].datasets[0].files[1]]);
  assert.equal(selection.release.id, fixture.releases[0].id);
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value) => { window.__copiedParquet = value; } } }); });
  for (const language of ["Python", "SQL", "CLI"]) {
    await section.getByRole("button", { name: language, exact: true }).click();
    const code = await section.locator(`pre[aria-label="${language} Parquet example"]`).textContent();
    await section.getByRole("button", { name: `Copy ${language} Parquet example`, exact: true }).click();
    assert.equal(await page.evaluate(() => window.__copiedParquet), code);
    assert.ok(code.includes("february.parquet") && !code.includes("january.parquet"));
  }
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Denied"); } } }); });
  await section.getByRole("button", { name: "Copy CLI Parquet example", exact: true }).click();
  await section.getByText("Clipboard access is unavailable. Select the text below and copy it.").waitFor();
  await page.getByLabel("Coverage start date", { exact: true }).fill("2016-01-01");
  await page.getByLabel("Coverage end date", { exact: true }).fill("2016-01-31");
  await section.getByText(/No catalog files overlap/).waitFor();
  assert.equal(await section.getByRole("button", { name: "Download selection.json", exact: true }).count(), 0);
  scenario = "error";
  await page.reload();
  await section.getByText("Parquet catalog unavailable", { exact: true }).waitFor();
  scenario = "planned";
  await section.getByRole("button", { name: "Retry", exact: true }).click();
  await section.getByText("Public Parquet release in preparation", { exact: true }).waitFor();
  for (const route of ["parquet-guide", "parquet-schema"]) {
    await page.goto(`${origin}/data_access/${route}`);
    await page.locator("main h1").waitFor();
    assert.ok(!(await page.locator("main").textContent()).includes("Page not found"));
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const fontSize of [16, 32]) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
        const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `Guide overflow: ${route}/${width}/${fontSize}`);
        receipt.cases.push({ route, width, fontSize, ...dimensions });
      }
    }
  }
  assert.deepEqual(receipt.errors, []);
  assert.deepEqual(receipt.blockedRequests, []);
  await writeFile(`${output}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`Passed ${receipt.cases.length} layout cases, selection/download/copy/error journeys, and guide routes. Receipt: ${output}/receipt.json`);
} finally {
  await browser.close();
}
