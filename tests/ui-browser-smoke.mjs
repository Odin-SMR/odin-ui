// Local, deterministic UI acceptance. Scientific requests never reach a live API.
// Start npm run dev, then run: node tests/ui-browser-smoke.mjs
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const origin = process.env.ODIN_UI_URL ?? "http://127.0.0.1:5173";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname), "UI acceptance is restricted to a local server");
const output = process.env.ODIN_UI_QA_DIR ?? "/tmp/odin-ui-visual-001-browser";
await mkdir(output, { recursive: true });
const contract = JSON.parse(await readFile(new URL("../src/odinApi/fixtures/migration-http-contract.json", import.meta.url)));
const pilot = JSON.parse(await readFile(new URL("../src/odinApi/fixtures/pilot-http-contract.json", import.meta.url)));
const timeline = {
  Years: [2001, 2007, 2015, 2019, 2025],
  Data: { "2": [[2001, 80], [2007, 150], [2015, 220], [2019, -40], [2025, 180]], "8": [[2001, 20], [2007, 40], [2015, null], [2019, 70], [2025, 60]] },
};
const spectrum = { ScanID: [1000], FreqMode: [1], Backend: [2], MJD: [57033.5], Quality: [0], Version: [8],
  Altitude: [32000], SunZD: [75.2], Frequency: { IFreqGrid: [0, 1, 2, 10, 11, 12], LOFreq: [544300000000], SubBandIndex: [[1, 4], [3, 6]] }, Spectrum: [[10, 20, 15, 25, 40, 20]] };
const products = [{ name: "O3 / 545 GHz (test fixture)", scanid: 1000, data: { alt: [10000, 20000, 30000, 40000, 50000], vmr: [1e-6, 3e-6, null, 5e-6, 2e-6], meas_resp: [0.5, 0.8, 0.83, 0.9, 0.7], temp: [], pressure: [] } }];
const receipt = { fixtureOnly: true, origin, startedAt: new Date().toISOString(), cases: [], interactions: [], errors: [], screenshotDirectory: output, sourceSha256: {} };
for (const path of ["src/components/InspectMenu.tsx", "src/components/MigrationTimeline.tsx", "src/App.tsx", "src/ColorModeContext.tsx", "src/components/L1Calendar.tsx", "src/components/L2Calendar.tsx", "src/components/OdinCalendar.tsx", "src/components/ScanTable.tsx", "src/components/Level1.tsx", "src/components/StackedBarPlot.tsx", "src/components/L1ScanInfoPlot.tsx", "src/components/plots/OdinTrack.tsx", "src/components/plots/PilotSpectrum.tsx", "src/components/plots/usePlotWidth.ts", "src/components/L2Plot.tsx", "src/components/L2Card.tsx", "src/components/L2ProductPlots.tsx", "src/components/MigrationArchive.tsx", "src/components/MigrationPilot.tsx", "src/components/plots/scientificValues.ts", "src/components/plots/mapCoordinates.ts", "src/components/Home.tsx", "src/components/News.tsx", "src/components/Documents.tsx", "src/components/Footer.tsx", "src/components/NotFound.tsx", "src/components/PageIntro.tsx", "src/DataAccess.tsx", "package.json", "package-lock.json", "tests/ui-browser-smoke.mjs"]) {
  receipt.sourceSha256[path] = createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex");
}
const browser = await chromium.launch({ headless: true });
receipt.browser = browser.version();
const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, timezoneId: "Europe/Stockholm" });
let failure = false;
let pending = false;
const requests = [];
await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== new URL(origin).origin) return route.abort();
  if (!url.pathname.startsWith("/rest_api/") && !url.pathname.startsWith("/api/")) return route.continue();
  requests.push(url.pathname + url.search);
  if (failure) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Local test outage" }) });
  const fixtures = url.pathname.includes("/pilot/") ? pilot : contract;
  const fixture = Object.values(fixtures).find((value) => value.url === url.pathname + url.search);
  if (fixture) {
    const body = pending && url.pathname.endsWith("/status") ? { ...fixture.body, ready: false, status: "validating", tables: {} } : fixture.body;
    return route.fulfill({ status: 200, headers: Object.fromEntries(Object.entries(fixture.headers).filter(([key]) => key.toLowerCase() !== "content-length")), body: JSON.stringify(body) });
  }
  let body;
  if (url.pathname === "/rest_api/v5/statistics/freqmode/timeline/") body = url.searchParams.has("year")
    ? { Year: Number(url.searchParams.get("year")), Months: [1, 2, 3, 4], Data: { "2": [[1, 10], [2, 0], [3, -3], [4, 12]], "8": [[1, 5], [2, null], [3, 2], [4, 3]] } } : timeline;
  else if (url.pathname.startsWith("/rest_api/v5/period_info/")) body = { Type: "period_info", Count: 2, Data: [{ Date: "2015-01-11", Backend: "AC2", FreqMode: 1, NumScan: 2, URL: "/" }, { Date: "2015-01-12", Backend: "AC1", FreqMode: 2, NumScan: 0, URL: "/" }] };
  else if (url.pathname.startsWith("/rest_api/v5/freqmode_info/")) body = { Type: "Log", Count: 2, Data: [{ ScanID: 1000, DateTime: "2015-01-11T12:08:24Z", LatStart: 30, LonStart: -10, SunZD: 75.2, Quality: 0 }, { ScanID: 1001, DateTime: "2015-01-11T13:08:24Z", LatStart: 95, LonStart: 400, SunZD: 85, Quality: 1 }] };
  else if (url.pathname.endsWith("/L1b/")) body = { Type: "L1b", Count: 1, Data: spectrum };
  else if (url.pathname === "/api/calendar") body = [{ day: "2015-01-11", freqmode: 1, count: 2 }];
  else if (url.pathname === "/api/scans") body = [{ scanid: 1000, lat: 30, lon: -10 }, { scanid: 1001, lat: 95, lon: 400 }];
  else if (url.pathname === "/api/products") body = products;
  else if (url.pathname === "/api/stats") body = [];
  else return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "No local fixture for this request" }) });
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on("pageerror", (error) => receipt.errors.push(error.message));
const settle = async () => {
  await page.locator("main h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => ![...document.querySelectorAll('main [role="status"]')].some((element) => /Loading/i.test(element.textContent ?? "")));
  await page.waitForFunction(() => [...document.querySelectorAll("main svg")].every((svg) => !svg.querySelector("text") || !svg.viewBox.baseVal.width || Math.abs(svg.getBoundingClientRect().width - svg.viewBox.baseVal.width) < 1));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const measure = async () => page.evaluate(() => ({
  width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
  heading: document.querySelector("main h1")?.textContent,
  maxChartOverflow: Math.max(0, ...[...document.querySelectorAll('main svg[aria-label]')].filter((svg) => /frequency-mode timeline|Natural Earth map|Solar zenith angle/.test(svg.getAttribute("aria-label") ?? "")).flatMap((svg) => {
    const paper = svg.closest(".MuiPaper-root");
    if (!paper || !paper.getClientRects().length) return [];
    const bottom = paper.getBoundingClientRect().bottom;
    return [...paper.querySelectorAll("button, svg, .MuiTypography-root")].filter((element) => element.closest(".MuiPaper-root") === paper && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden").map((element) => element.getBoundingClientRect().bottom - bottom);
  })),
  minPlotLabelSize: Math.min(...[...document.querySelectorAll("main svg text")].map((text) => {
    const transform = text.getScreenCTM();
    return Number((Number.parseFloat(getComputedStyle(text).fontSize) * (transform ? Math.hypot(transform.a, transform.b) : 1)).toFixed(3));
  })),
}));
const routes = ["/", "/news", "/documentation", "/data_access", "/level1/statistics/2015", "/level1/calendar", "/level2/calendar/2015/1/11/1", "/migration", "/migration-pilot", "/missing-page"];
try {
  for (const theme of process.env.ODIN_UI_QA_JOURNEYS_ONLY ? [] : ["light", "dark"]) {
    await page.goto(origin); await page.evaluate((mode) => localStorage.setItem("themeMode", mode), theme);
    for (const width of [320, 390, 600, 834, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of routes) {
        await page.goto(origin + path); await settle();
        const metrics = await measure();
        receipt.cases.push({ theme, path, ...metrics });
        assert.ok(metrics.maxChartOverflow <= 1, `Chart content exceeds its panel by ${metrics.maxChartOverflow}px at ${width}px`);
        assert.ok(metrics.scrollWidth <= width + 1, `${theme} ${width}px ${path} overflows to ${metrics.scrollWidth}px`);
        assert.ok(metrics.minPlotLabelSize >= 12 || !Number.isFinite(metrics.minPlotLabelSize), `${path}: plot label below12px`);
        if ([390, 1440].includes(width) && ["/", "/documentation", "/data_access", "/level1/statistics/2015", "/level2/calendar/2015/1/11/1"].includes(path)) {
          await page.screenshot({ path: `${output}/${theme}-${width}-${path.replaceAll("/", "_") || "home"}.png`, fullPage: true });
        }
      }
      console.log(`Passed ${theme} ${width}px route layouts`);
    }
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(origin); await settle();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Level 1 calendar" }).click();
  await settle();
  await page.getByRole("button", { name: /11 Jan 2015.*FM 1/ }).click();
  await page.getByRole("button", { name: /Select scan 1000, latitude/ }).click();
  await page.getByRole("tab", { name: "spectrum", exact: true }).click();
  await page.locator('svg[aria-label="Brightness temperature spectrum"]').waitFor();
  await page.getByRole("button", { name: "Zoom +", exact: true }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("table", { name: /channel/i }).waitFor();
  await page.getByRole("button", { name: "Inspect channel 1", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download scan JSON" }).click()]);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(download.suggestedFilename(), "1000.json");
  assert.deepEqual(JSON.parse(await readFile(await download.path(), "utf8")), spectrum);
  const spectrumPlot = page.locator('svg[aria-label="Brightness temperature spectrum"]');
  const spectrumCard = page.locator(".MuiCard-root").filter({ has: spectrumPlot });
  const assertFrequencyAxis = async () => {
    const ticks = await spectrumPlot.locator("text[data-frequency-tick]").evaluateAll((elements) => elements.map((element) => ({ text: element.textContent, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right })));
    assert.ok(ticks.length >= 2, "Frequency axis needs at least two ticks");
    assert.equal(new Set(ticks.map((tick) => tick.text)).size, ticks.length, "Narrow zoom must retain distinct tick labels");
    const ordered = [...ticks].sort((a, b) => a.left - b.left);
    for (let index = 1; index < ordered.length; index++) assert.ok(ordered[index - 1].right <= ordered[index].left, "Frequency tick labels must not overlap");
  };
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(100);
    await spectrumCard.getByRole("button", { name: "Reset", exact: true }).click();
    await assertFrequencyAxis();
    await page.getByRole("button", { name: "Axes & range", exact: true }).click();
    await page.getByLabel("Minimum frequency (Hz)", { exact: true }).fill("544290000000");
    await page.getByLabel("Maximum frequency (Hz)", { exact: true }).fill("544310000000");
    await page.getByRole("button", { name: "Apply range", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await assertFrequencyAxis();
  }
  await page.getByRole("button", { name: "Hide table", exact: true }).click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(100);
  const lightTheme = page.getByRole("button", { name: "Switch to light theme" });
  if (await lightTheme.count()) await lightTheme.click();
  await spectrumCard.getByRole("button", { name: "Reset", exact: true }).click();
  const geometry = page.locator('svg[aria-label="Solar zenith angle in degrees by scan start time UTC"]');
  const geometryAxis = await geometry.locator(".visx-axis-bottom text").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().bottom));
  const geometryTitle = await geometry.getByText("Scan start time (UTC)", { exact: true }).boundingBox();
  assert.ok(geometryTitle && Math.max(...geometryAxis) < geometryTitle.y, "Geometry axis title must clear its tick labels");
  await page.screenshot({ path: `${output}/workstation-l1-selection.png`, fullPage: true });
  await page.getByRole("button", { name: "Map tools", exact: true }).click();
  await page.getByRole("button", { name: "Focus scan", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: /Select scan 1000, latitude/ }).getAttribute("aria-pressed"), "true");
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${output}/phone-spectrum-selection.png`, fullPage: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await settle();
  assert.ok((await measure()).scrollWidth <= 391, "Selected spectrum must fit with200% text");
  await page.evaluate(() => { document.documentElement.style.fontSize = "100%"; });
  receipt.interactions.push("Mobile navigation → L1 day/mode → scan → spectrum; zoom/reset/exact table; downloaded JSON equals fixture");
  receipt.interactions.push("Distinct non-overlapping frequency ticks at320/390/834px for12Hz and20MHz ranges; desktop linked map selection");

  // Selected science views and persistent inspectors at all target device classes.
  for (const width of [320, 390, 834, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await settle();
    await spectrumPlot.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const inspector = page.getByRole("dialog");
    await inspector.waitFor();
    await page.waitForTimeout(250);
    assert.match(await inspector.innerText(), /Frequency: .* Hz/);
    const selectedChannel = await inspector.getByRole("spinbutton", { name: "Channel (1-based)", exact: true }).inputValue();
    const bounds = await inspector.boundingBox();
    assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1, "Inspector stays inside viewport");
    await page.screenshot({ path: `${output}/inspect-channel-${width}.png`, fullPage: false });
    await page.keyboard.press("Escape");
    await inspector.waitFor({ state: "hidden" });
    assert.equal(await spectrumPlot.evaluate((element) => element === document.activeElement), true, "Inspector returns focus to its plot");
    await page.keyboard.press("Enter");
    await inspector.waitFor();
    assert.equal(await inspector.getByRole("spinbutton", { name: "Channel (1-based)", exact: true }).inputValue(), selectedChannel, "Closing and reopening retains the pinned channel");
    await page.keyboard.press("Escape");
    await inspector.waitFor({ state: "hidden" });
    assert.equal(await page.getByRole("table", { name: /channel/i }).count(), 0, "Exact table is secondary and closed");
    const metrics = await measure();
    receipt.cases.push({ selectedView: "spectrum", ...metrics });
    assert.ok(metrics.scrollWidth <= width + 1);
    assert.ok(metrics.minPlotLabelSize >= 12);
  }
  receipt.interactions.push("Selected spectrum and inspection menu at320/390/834/1440/1920px; Escape restores plot focus and retains pin");

  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(origin + "/level2/calendar/2015/1/11/1"); await settle();
  await page.getByRole("button", { name: /Select scan 1000, latitude/ }).click();
  await page.getByRole("heading", { name: products[0].name, exact: true }).waitFor();
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const [l2Download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download JSON", exact: true }).click()]);
  assert.deepEqual(JSON.parse(await readFile(await l2Download.path(), "utf8")), products[0].data);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.screenshot({ path: `${output}/phone-retrieval-selection.png`, fullPage: true });
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("button", { name: "Inspect level 0", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await settle();
  assert.ok((await measure()).scrollWidth <= 391, "Selected retrieval must fit with200% text");
  await page.evaluate(() => { document.documentElement.style.fontSize = "100%"; });
  receipt.interactions.push("L2 day/FM deep link → scan → retrieval; original data-only JSON preserved");

  await page.getByRole("button", { name: "Hide table", exact: true }).click();
  const profilePlot = page.locator('svg[aria-label$="retrieval profile"]');
  for (const width of [320, 390, 834, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 }); await settle();
    await profilePlot.focus(); await page.keyboard.press("ArrowUp"); await page.keyboard.press("Enter");
    const inspector = page.getByRole("dialog"); await inspector.waitFor();
    assert.match(await inspector.innerText(), /Source VMR:/);
    const bounds = await inspector.boundingBox();
    assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1);
    await page.keyboard.press("Escape"); await inspector.waitFor({ state: "hidden" });
    assert.equal(await profilePlot.evaluate((element) => element === document.activeElement), true);
    const metrics = await measure(); receipt.cases.push({ selectedView: "profile", ...metrics });
    assert.ok(metrics.scrollWidth <= width + 1); assert.ok(metrics.minPlotLabelSize >= 12);
  }
  receipt.interactions.push("Selected profile at five widths; exact source/converted values available in keyboard/touch inspector; focus restored");

  await page.goto(origin + "/level1/statistics"); await settle();
  await page.getByRole("button", { name: "View exact counts in table" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "View 2015", exact: true }).first().click();
  await page.getByRole("heading", { name: "2015 monthly distribution vs. L2" }).waitFor();
  receipt.interactions.push("Exact signed-count table → monthly comparison");
  await page.goto(origin); await settle();
  await page.locator('[data-group="2015"][data-mode="2"][data-level="1"]').focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "View 2015 monthly", exact: true }).click();
  await page.waitForURL("**/level1/statistics/2015"); await settle();
  await page.goBack(); await settle();
  assert.equal(new URL(page.url()).pathname, "/");
  receipt.interactions.push("Home visual count selection → persistent inspector → monthly URL → browser Back");


  await page.goto(origin + "/documentation"); await settle();
  const documents = await page.locator('main a[href^="/documents/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  assert.equal(documents.length, 10);
  for (const path of documents) {
    const response = await context.request.get(origin + path);
    assert.equal(response.status(), 200, path);
    const bytes = await response.body();
    assert.ok(path.endsWith(".pdf") ? bytes.subarray(0, 5).toString() === "%PDF-" : bytes.subarray(0, 2).toString() === "PK", `${path}: expected scientific document bytes`);
  }
  receipt.interactions.push("Nine public PDF files and planning XLSX served anonymously with valid file signatures");
  await page.goto(origin); await settle();
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").textContent(), "Skip to content");
  await page.keyboard.press("Tab");
  const focus = await page.locator(":focus").evaluate((element) => ({ outline: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
  assert.deepEqual(focus, { outline: "solid", width: "2px" });
  await page.getByRole("button", { name: /Switch to .* theme/ }).click();
  const background = await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.reload(); await settle();
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor), background);
  receipt.interactions.push("Skip link and visible header keyboard focus; theme preference survives reload");

  const zoomTheme = await page.evaluate(() => localStorage.getItem("themeMode") ?? "light");
  for (const width of [320, 390, 834]) for (const path of routes.slice(0, 9)) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin + path); await settle();
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await settle();
    const metrics = await measure();
    receipt.cases.push({ theme: zoomTheme, textZoom: "200%", path, ...metrics });
    assert.ok(metrics.maxChartOverflow <= 1, `Chart content exceeds its panel by ${metrics.maxChartOverflow}px at ${width}px`);
        assert.ok(metrics.scrollWidth <= width + 1, `200% text ${width}px ${path} overflows to ${metrics.scrollWidth}px`);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  failure = true;
  await page.goto(origin + "/level1/calendar"); await settle();
  await page.getByText("Observation records could not be loaded.", { exact: false }).waitFor();
  assert.equal(await page.getByText("No observation records are stored for this month.", { exact: false }).count(), 0);
  receipt.interactions.push("Failed observation request shows error without inventing empty coverage");
  failure = false; pending = true;
  const before = requests.length;
  await page.goto(origin + "/migration"); await settle();
  await page.getByText("Discovery opens after the entire archive", { exact: false }).waitFor();
  assert.ok(requests.slice(before).every((path) => path.endsWith("/status")), "Pending archive must not query scientific discovery");
  receipt.interactions.push("Pending archive preserves release/discovery gate");
  assert.deepEqual(receipt.errors, [], "Uncaught browser exceptions");
  console.log(`Passed ${receipt.cases.length} layout/text-zoom cases and ${receipt.interactions.length} interaction journeys`);
} catch (error) {
  receipt.failure = String(error);
  receipt.lastPage = await page.locator("body").innerText();
  receipt.lastRequests = requests.slice(-30);
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  receipt.finishedAt = new Date().toISOString();
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2) + "\n");
  await browser.close();
}
