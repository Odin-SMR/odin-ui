// Local fixture-only acceptance for shared L1 spectrum selection/inspection.
// Reuse a local Vite server: node tests/ui-l1-range.mjs
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const origin = process.env.ODIN_UI_URL ?? "http://127.0.0.1:5173";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname));
const output = process.env.ODIN_L1_RANGE_DIR ?? "/tmp/odin-l1-range-browser";
await mkdir(output, { recursive: true });
const load = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const archive = await load("src/odinApi/fixtures/migration-http-contract.json");
const pilot = await load("src/odinApi/fixtures/pilot-http-contract.json");
const timeline = await load("src/hooks/fixtures/migration-timeline-http-contract.json");
// Deliberately nonmonotonic heights, one absent height, per-spectrum LO offsets,
// an internal missing channel, and explicit subband boundaries.
const data = {
  ScanID: [1000], FreqMode: [1], Backend: [2], Version: [8, 8, 8, 8, 8],
  Altitude: [60000.123456789, 20000.987654321, 40000.123456789, null, 30000.777777777], Quality: [0, 32, 208, 0, 1], SunZD: [70, 71, 72, 73, 74],
  Frequency: { IFreqGrid: [0, 1, 2, 3, 100, 101, 102, 103], LOFreq: [544300000000, 544300000010, 544300000020, 544300000030, 544300000040], SubBandIndex: [[1, 5], [4, 8]] },
  Spectrum: [
    [10, 12, 14, 12, 16, 13, 12, 10],
    [20, 22, 24, 22, 26, 23, 22, 20],
    [30, 32, null, 32, 36, 33, 32, 30],
    [40, 42, 44, 42, 46, 43, 42, 40],
    [50, 52, 54, 52, 56, 53, 52, 50],
  ],
};
// The legacy generated client accepts absent metadata entries, but not nulls.
const legacyData = { ...data, Altitude: data.Altitude.slice(0, 3), Spectrum: data.Spectrum.map((spectrum) => spectrum.map((value) => value ?? 34)) };
const receipt = { fixtureOnly: true, origin, cases: [], screenshots: [], errors: [], blocked: [], sourceSha256: {} };
const sourcePaths = ["tests/ui-l1-range.mjs", "src/components/plots/PilotSpectrum.tsx", "src/components/plots/scientificValues.ts", "src/components/plots/L1b.tsx", "src/components/InspectMenu.tsx"];
for (const path of sourcePaths) receipt.sourceSha256[path] = createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex");
const browser = await chromium.launch({ headless: true });
receipt.browser = browser.version();
let currentPage;
try {
  for (const { width, touch, theme } of [
    { width: 320, touch: true, theme: "light" },
    { width: 390, touch: true, theme: "dark" },
    { width: 834, touch: false, theme: "light" },
    { width: 1440, touch: false, theme: "dark" },
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: touch, isMobile: touch, colorScheme: theme, timezoneId: "Europe/Stockholm" });
    await context.addInitScript((value) => localStorage.setItem("themeMode", value), theme);
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { receipt.blocked.push(url.href); return route.abort(); }
      if (!url.pathname.startsWith("/rest_api/") && !url.pathname.startsWith("/api/")) return route.continue();
      const fixtures = url.pathname.includes("/pilot/") ? pilot : archive;
      if (url.pathname.includes("/pilot/") && !url.pathname.endsWith("/status")) url.searchParams.delete("release_id");
      let fixture = Object.values(fixtures).find((value) => value.url === url.pathname + url.search);
      if (url.pathname === "/rest_api/migration/v1/statistics/freqmode/timeline/") {
        const value = timeline.requests.find((entry) => entry.year === (url.searchParams.has("year") ? Number(url.searchParams.get("year")) : null));
        if (value) fixture = { ...value, headers: { ...value.headers, "X-Odin-Release": archive.status.body.release_id } };
      }
      if (url.pathname.startsWith("/rest_api/v5/period_info/")) fixture = { body: { Type: "period_info", Count: 1, Data: [{ Date: "2015-01-11", Backend: "AC2", FreqMode: 1, NumScan: 2, URL: "/" }] } };
      if (url.pathname.startsWith("/rest_api/v5/freqmode_info/")) fixture = { body: { Type: "Log", Count: 2, Data: [
        { ScanID: 1000, DateTime: "2015-01-11T12:08:24Z", LatStart: 30, LonStart: 190, SunZD: 75.2, Quality: 0 },
        { ScanID: 1001, DateTime: "2015-01-11T13:08:24Z", LatStart: -10, LonStart: 10, SunZD: 76, Quality: 32 },
      ] } };
      if (url.pathname.endsWith("/L1b/")) {
        const scan = url.pathname.includes("/1001/") ? 1001 : 1000;
        fixture = { ...fixture, body: { Type: "L1b", Count: 5, Data: { ...(url.pathname.startsWith("/rest_api/v5/") ? legacyData : data), ScanID: [scan] } } };
      }
      if (!fixture) { receipt.blocked.push(url.pathname + url.search); return route.abort(); }
      return route.fulfill({ status: fixture.status ?? 200, headers: { ...Object.fromEntries(Object.entries(fixture.headers ?? {}).filter(([key]) => key.toLowerCase() !== "content-length")), "content-type": "application/json" }, body: JSON.stringify(fixture.body) });
    });
    const page = await context.newPage(); currentPage = page;
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => receipt.errors.push(String(error)));
    const fit = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px viewport fits`);
    const screenshot = async (name) => {
      const filename = `${width}-${name}.png`;
      await page.screenshot({ path: `${output}/${filename}`, fullPage: false, animations: "disabled" });
      receipt.screenshots.push({ filename, sha256: createHash("sha256").update(await readFile(`${output}/${filename}`)).digest("hex") });
    };
    for (const path of ["/level1/calendar", "/migration", "/migration-pilot"]) {
      await page.goto(origin + path);
      await page.evaluate(() => document.fonts.ready);
      if (path === "/level1/calendar") {
        if (!touch) await page.getByRole("button", { name: "List view", exact: true }).click();
        await page.getByRole("button", { name: /11 Jan 2015.*FM 1/ }).click();
        await page.getByRole("button", { name: "Select scan 1000, latitude 30°, longitude 190°", exact: true }).click();
        if (touch) await page.getByRole("tab", { name: "spectrum", exact: true }).click();
      }
      const plot = page.locator('svg[aria-label="Brightness temperature spectrum"]');
      await plot.waitFor();
      await plot.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelectorAll('[data-spectrum-line="true"]').length === 5);
      const lines = plot.locator('[data-spectrum-line="true"]');
      assert.deepEqual(await lines.evaluateAll((elements) => elements.map((element) => Number(element.getAttribute("data-spectrum-index")))), [0, 1, 2, 3, 4]);
      const first = page.getByRole("slider", { name: "First spectrum", exact: true });
      const last = page.getByRole("slider", { name: "Last spectrum", exact: true });
      assert.equal(await first.getAttribute("aria-valuenow"), "1");
      assert.equal(await last.getAttribute("aria-valuenow"), "5");
      await first.focus(); await page.keyboard.press("Shift+ArrowRight");
      assert.equal(await first.getAttribute("aria-valuenow"), "1", "The full range cannot shift past the scan");
      assert.equal(await last.getAttribute("aria-valuenow"), "5");
      for (const [thumb, inward, outward] of [[first, "ArrowRight", "ArrowLeft"], [last, "ArrowLeft", "ArrowRight"]]) {
        await thumb.focus(); await page.keyboard.press(inward); await page.keyboard.press(outward);
        // Allow the optional value-label transition to finish before measuring it.
        await page.waitForTimeout(250);
        await fit();
        for (const label of await page.locator(".MuiSlider-valueLabelOpen").all()) {
          const bounds = await label.boundingBox();
          assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1, "High-precision/missing-height thumb labels stay inside viewport");
        }
      }
      // Pixel-accurate hover at the stored first channel of spectrum 4.
      await plot.scrollIntoViewIfNeeded();
      const point = await plot.locator('[data-spectrum-index="3"][data-spectrum-line="true"]').evaluate((line) => {
        const p = line.getPointAtLength(0), svg = line.ownerSVGElement, screen = new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM());
        return { x: screen.x, y: screen.y };
      });
      await page.mouse.move(point.x, point.y);
      const tooltip = page.getByRole("tooltip");
      await tooltip.waitFor();
      const tooltipText = await tooltip.innerText();
      assert.match(tooltipText, /Spectrum 4/);
      assert.match(tooltipText, /40 K/);
      assert.match(tooltipText, /Tangent altitude: Missing/);
      assert.match(tooltipText, new RegExp(`${path === "/level1/calendar" ? 544300000000 : 544300000030} Hz`));
      const tooltipBox = await tooltip.boundingBox();
      assert.ok(tooltipBox && tooltipBox.x >= 0 && tooltipBox.x + tooltipBox.width <= width + 1, "Tooltip stays inside viewport");
      if (path === "/level1/calendar" && width === 1440) await screenshot("all-spectra-hover");
      await page.mouse.move(1, 1); await tooltip.waitFor({ state: "hidden" });
      // Both range thumbs can converge: select only spectrum 3.
      await first.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
      await last.focus(); await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowLeft");
      assert.equal(await lines.count(), 1);
      assert.equal(await lines.first().getAttribute("data-spectrum-index"), "2");
      assert.match(await first.getAttribute("aria-valuetext"), /40/);
      assert.equal(await tooltip.count(), 0, "Range changes clear hover");
      await last.focus(); await page.keyboard.press("Shift+ArrowRight");
      assert.equal(await first.getAttribute("aria-valuenow"), "4");
      assert.equal(await last.getAttribute("aria-valuenow"), "4");
      assert.equal(await lines.count(), 1, "Keyboard movement preserves a single-spectrum selection");
      await page.keyboard.press("Shift+ArrowLeft");
      assert.equal(await first.getAttribute("aria-valuenow"), "3");
      assert.equal(await last.getAttribute("aria-valuenow"), "3");
      // Real touch and keyboard continue to open the exact-value inspector.
      await plot.scrollIntoViewIfNeeded();
      if (touch) await plot.tap({ position: { x: 120, y: 160 } });
      else { await plot.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter"); }
      await page.getByRole("dialog").waitFor();
      assert.match(await page.getByRole("dialog").innerText(), /40000\.123456789 m/);
      await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(await plot.evaluate((element) => document.activeElement === element), true, "Inspector returns focus");
      await fit();
      if (path === "/level1/calendar" && width === 390) await screenshot("single-spectrum");
      // Downloads keep every spectrum despite selecting a single one.
      const opener = page.getByRole("button", { name: path === "/level1/calendar" ? "Download" : "Scan details & downloads", exact: true });
      await opener.click();
      const downloadButton = page.getByRole("button", { name: path === "/level1/calendar" ? "Download scan JSON" : "Download spectra JSON", exact: true });
      const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
      const exported = JSON.parse(await readFile(await download.path(), "utf8"));
      assert.deepEqual(exported.Data ?? exported, path === "/level1/calendar" ? legacyData : data, "Download retains complete source data");
      await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
      // Leave the download trigger's focus/hover preview before using controls below it.
      await first.focus(); await page.mouse.move(1, 1);
      await page.waitForFunction(() => !document.querySelector('[role="tooltip"]'));
      await page.getByRole("button", { name: "Show all", exact: true }).click();
      assert.equal(await lines.count(), 5);
      const dragThumb = async (thumb, target) => {
        await thumb.scrollIntoViewIfNeeded();
        const coordinates = await thumb.evaluate((input, value) => {
          const handle = input.parentElement.getBoundingClientRect();
          const track = input.closest(".MuiSlider-root").getBoundingClientRect();
          return { startX: handle.x + handle.width / 2, y: handle.y + handle.height / 2, endX: track.x + track.width * (value - 1) / 4 };
        }, target);
        if (touch) {
          const session = await context.newCDPSession(page);
          await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: coordinates.startX, y: coordinates.y }] });
          await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: coordinates.endX, y: coordinates.y }] });
          await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await session.detach();
        } else {
          await page.mouse.move(coordinates.startX, coordinates.y); await page.mouse.down();
          await page.mouse.move(coordinates.endX, coordinates.y, { steps: 5 }); await page.mouse.up();
        }
      };
      await dragThumb(first, 2); await dragThumb(last, 4);
      assert.equal(await first.getAttribute("aria-valuenow"), "2");
      assert.equal(await last.getAttribute("aria-valuenow"), "4");
      assert.equal(await lines.count(), 3, "Pointer dragging both thumbs narrows the plotted spectra");
      const assertRange = async (low, high) => {
        assert.equal(await first.getAttribute("aria-valuenow"), String(low));
        assert.equal(await last.getAttribute("aria-valuenow"), String(high));
        assert.deepEqual(await lines.evaluateAll((elements) => elements.map((element) => Number(element.getAttribute("data-spectrum-index")))), Array.from({ length: high - low + 1 }, (_, index) => low - 1 + index));
      };
      const dragRange = async (steps, expectedBefore, expectedAfter, cancel = false, grip = false) => {
        await first.scrollIntoViewIfNeeded();
        const coordinates = await first.evaluate((input, { distance, grip }) => {
          const slider = input.closest(".MuiSlider-root");
          const bounds = slider.getBoundingClientRect(), track = slider.querySelector(".MuiSlider-track").getBoundingClientRect();
          return { x: track.x + track.width / 2, y: track.y + (grip ? 36 : track.height / 2), delta: bounds.width * distance / 4 };
        }, { distance: steps, grip });
        if (touch) {
          const session = await context.newCDPSession(page);
          await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: coordinates.x, y: coordinates.y }] });
          await assertRange(...expectedBefore); // Grabbing the band must not resize it.
          if (!cancel) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: coordinates.x + coordinates.delta, y: coordinates.y }] });
          await session.send("Input.dispatchTouchEvent", { type: cancel ? "touchCancel" : "touchEnd", touchPoints: [] });
          await session.detach();
        } else {
          await page.mouse.move(coordinates.x, coordinates.y); await page.mouse.down();
          await assertRange(...expectedBefore);
          if (!cancel) await page.mouse.move(coordinates.x + coordinates.delta, coordinates.y, { steps: 6 });
          await page.mouse.up();
        }
        await assertRange(...expectedAfter);
        await page.mouse.move(1, 1);
        await assertRange(...expectedAfter); // Released/cancelled drags cannot keep moving.
      };
      await dragRange(1, [2, 4], [3, 5]);
      if (width === 390 && path === "/level1/calendar") await screenshot("moved-spectrum-range");
      await dragRange(-3, [3, 5], [1, 3]);
      await dragRange(3, [1, 3], [3, 5]);
      await dragRange(-1, [3, 5], [3, 5], true);
      // Thumb resizing remains available after range dragging and cancellation.
      await dragThumb(first, 4);
      await assertRange(4, 5);
      await first.focus(); await page.keyboard.press("Shift+ArrowLeft");
      await assertRange(3, 4);
      await last.focus(); await page.keyboard.press("Shift+ArrowRight");
      await assertRange(4, 5);
      await first.focus(); await page.keyboard.press("ArrowRight");
      await assertRange(5, 5);
      await dragRange(-1, [5, 5], [4, 4], false, true);
      await page.getByRole("button", { name: "Show all", exact: true }).click();
      await dragRange(1, [1, 5], [1, 5]);
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await fit();
      await page.evaluate(() => { document.documentElement.style.fontSize = "100%"; });
      if (path === "/level1/calendar") {
        await first.focus(); await page.keyboard.press("End");
        if (touch) await page.getByRole("tab", { name: "map", exact: true }).click();
        await page.getByRole("button", { name: "Select scan 1001, latitude -10°, longitude 10°", exact: true }).click();
        if (touch) await page.getByRole("tab", { name: "spectrum", exact: true }).click();
        await plot.waitFor();
        assert.equal(await first.getAttribute("aria-valuenow"), "1", "New scan resets range");
        assert.equal(await last.getAttribute("aria-valuenow"), "5");
        assert.equal(await lines.count(), 5);
      }
      await fit();
      receipt.cases.push({ width, theme, touch, path, checks: ["all spectra by default", "source-order range down to one", "nearest spectrum hover", "correct LO policy", "missing height", "bounded tooltip", "touch/keyboard exact inspection", "complete download", "show all reset", "mouse/touch dragging both thumbs", "grab range without jumping", "drag range with fixed width", "range clamps at both ends", "release/cancel clears drag", "thumb resizing after range drag", "Shift+arrow on either thumb preserves selection width", "full/single selection keyboard movement", "single-spectrum grip dragging", "full-range dragging stays unchanged", "200% text fits", ...(path === "/level1/calendar" ? ["scan reset"] : [])] });
    }
    await context.close();
  }
  assert.deepEqual(receipt.errors, []);
  assert.deepEqual(receipt.blocked, []);
  receipt.passed = true;
} catch (error) {
  receipt.failure = String(error);
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: receipt.passed, cases: receipt.cases.length, screenshots: receipt.screenshots.length, output }));
