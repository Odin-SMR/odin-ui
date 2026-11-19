// Fixture-only touch/keyboard and archive acceptance. Reuse a running local Vite server.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { launchBrowser } from "./browser-launcher.mjs";

const origin = process.env.ODIN_UI_URL ?? "http://127.0.0.1:5173";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname), "Only a local server is allowed");
const output = process.env.ODIN_UI_FLOW_DIR ?? "/tmp/odin-ui-visual-flows";
await mkdir(output, { recursive: true });
const load = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const archive = await load("src/odinApi/fixtures/migration-http-contract.json");
const pilot = await load("src/odinApi/fixtures/pilot-http-contract.json");
const timeline = await load("src/hooks/fixtures/migration-timeline-http-contract.json");
const profileData = { alt: [10000, 20000, 30000], vmr: [1e-6, 2e-6, 3e-6], meas_resp: [0.5, 0.9, 0.8], temp: [], pressure: [] };
const sourcePaths = ["tests/ui-visual-flows.mjs", "src/components/InspectMenu.tsx", "src/components/plots/OdinTrack.tsx", "src/components/plots/PilotSpectrum.tsx", "src/components/L2Plot.tsx", "src/components/L2Calendar.tsx", "src/components/L1Calendar.tsx", "src/components/L1ScanInfoPlot.tsx", "src/components/plots/L1b.tsx", "src/components/L2Card.tsx", "src/components/L2ProductPlots.tsx", "src/odinApi/cloud_client.tsx", "src/components/MigrationArchive.tsx", "src/components/MigrationPilot.tsx", "src/components/MigrationTimeline.tsx", "src/components/plots/scientificValues.ts", "src/components/plots/mapCoordinates.ts", "src/hooks/Migration.ts", "src/hooks/Pilot.ts", "src/hooks/MigrationTimeline.tsx", "src/odinApi/migration.ts", "src/odinApi/pilot.ts", "src/odinApi/fixtures/migration-http-contract.json", "src/odinApi/fixtures/pilot-http-contract.json", "src/hooks/fixtures/migration-timeline-http-contract.json"];
const hash = async (path) => createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex");
const receipt = { fixtureOnly: true, origin, startedAt: new Date().toISOString(), browser: null, checks: [], mapContainment: [], screenshots: [], requests: [], blocked: [], pageErrors: [], sourceSha256: Object.fromEntries(await Promise.all(sourcePaths.map(async (path) => [path, await hash(path)]))), fixtureNotes: ["Pilot fixture paths omit release_id; requests must carry the fixture release, then matching omits only that parameter.", "Archive timeline uses the existing timeline fixture with its release header set to the archive fixture release.", "L2 touch-only fixture supplies two scan locations and three finite profile levels; L1 uses one local scan and the archive spectrum fixture. These are illustrative acceptance data."] };
const browser = await launchBrowser();
receipt.browserName = process.env.ODIN_UI_BROWSER ?? "chromium";
receipt.browserEngine = browser.browserType().name();
receipt.browser = browser.version();
let currentPage;
try {
  for (const width of (process.env.ODIN_UI_FLOW_WIDTHS?.split(",").map(Number) ?? [390, 834])) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: true, isMobile: true, timezoneId: "Europe/Stockholm" });
    let pending = false;
    await context.addInitScript(() => {
      window.odinTouchEvents = [];
      for (const kind of ["pointerdown", "pointerup", "click"]) document.addEventListener(kind, (event) => window.odinTouchEvents.push({ kind, type: event.pointerType, target: event.target?.tagName, className: event.target?.getAttribute?.("class"), plot: event.target?.closest?.("svg")?.getAttribute("aria-label"), dialog: !!document.querySelector('[role="dialog"]'), timestamp: performance.now() }), true);
    });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(origin).origin) { receipt.blocked.push(url.href); return route.abort(); }
      if (!url.pathname.startsWith("/rest_api/") && !url.pathname.startsWith("/api/")) return route.continue();
      receipt.requests.push({ width, url: url.pathname + url.search, pending });
      const isPilot = url.pathname.includes("/pilot/");
      const fixtures = isPilot ? pilot : archive;
      if (isPilot && !url.pathname.endsWith("/status")) {
        assert.equal(url.searchParams.get("release_id"), pilot.status.body.release_id);
        url.searchParams.delete("release_id");
      }
      let fixture = Object.values(fixtures).find((value) => value.url === url.pathname + url.search);
      if (url.pathname === "/rest_api/migration/v1/statistics/freqmode/timeline/") {
        assert.equal(url.searchParams.get("release_id"), archive.status.body.release_id);
        const value = timeline.requests.find((entry) => entry.year === (url.searchParams.has("year") ? Number(url.searchParams.get("year")) : null));
        if (value) fixture = { ...value, status: 200, headers: { ...value.headers, "X-Odin-Release": archive.status.body.release_id } };
      }
      if (url.pathname === "/api/calendar") fixture = { body: [{ day: "2015-01-11", freqmode: 1, count: 2 }], headers: {} };
      if (url.pathname === "/api/scans") fixture = { body: [{ scanid: 1000, lat: 30, lon: 190 }, { scanid: 1001, lat: -10, lon: 10 }], headers: {} };
      if (url.pathname === "/api/products") fixture = { body: [{ name: "O3 touch fixture", scanid: Number(url.searchParams.get("scanid")), data: profileData }], headers: {} };
      if (url.pathname.startsWith("/rest_api/v5/period_info/")) fixture = { body: { Type: "period_info", Count: 1, Data: [{ Date: "2015-01-11", Backend: "AC2", FreqMode: 1, NumScan: 1, URL: "/" }] }, headers: {} };
      if (url.pathname.startsWith("/rest_api/v5/freqmode_info/")) fixture = { body: { Type: "Log", Count: 1, Data: [{ ScanID: 1000, DateTime: "2015-01-11T12:08:24Z", LatStart: 30, LonStart: 190, SunZD: 75.2, Quality: 0 }] }, headers: {} };
      if (url.pathname.startsWith("/rest_api/v5/level1/") && url.pathname.endsWith("/L1b/")) fixture = { body: archive.l1b.body, headers: {} };
      if (!fixture) { receipt.blocked.push(url.pathname + url.search); return route.abort(); }
      const body = pending && url.pathname.endsWith("/status") ? { ...fixture.body, ready: false, status: "validating", tables: {} } : fixture.body;
      return route.fulfill({ status: fixture.status ?? 200, headers: { ...Object.fromEntries(Object.entries(fixture.headers).filter(([key]) => key.toLowerCase() !== "content-length")), "content-type": "application/json" }, body: JSON.stringify(body, (_, value) => Object.is(value, -0) ? JSON.rawJSON("-0.0") : value) });
    });
    const page = await context.newPage(); currentPage = page;
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => receipt.pageErrors.push({ width, error: String(error) }));
    const settle = async () => {
      await page.locator("main h1").waitFor(); await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => ![...document.querySelectorAll('main [role="status"]')].some((element) => /Loading/i.test(element.textContent ?? "")));
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    const dismiss = async (focusTarget) => {
      await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
      if (focusTarget) assert.equal(await focusTarget.evaluate((element) => element === document.activeElement), true, "Escape restores trigger focus");
    };
    const screenshot = async (name) => {
      await page.waitForFunction(() => {
        for (let element = document.querySelector('[role="dialog"]'); element; element = element.parentElement) {
          if (Number(getComputedStyle(element).opacity) < 0.999) return false;
        }
        return true;
      });
      const filename = `${width}-${name}.png`;
      await page.screenshot({ path: `${output}/${filename}`, fullPage: !await page.getByRole("dialog").isVisible(), animations: "disabled" });
      const bytes = await readFile(`${output}/${filename}`); receipt.screenshots.push({ filename, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    };
    const checkMapContainment = async (mapCard, path, panel = "map") => {
      for (const font of [100, 200]) {
        await page.evaluate((font) => { document.documentElement.style.fontSize = `${font}%`; }, font);
        // visx useParentSize debounces resized dimensions by 300ms.
        await page.waitForTimeout(350);
        const bounds = await mapCard.evaluate((paper) => {
          const boundary = paper.getBoundingClientRect();
          const visible = [...paper.querySelectorAll('button, .MuiTypography-root, svg')].filter((element) => element.getBoundingClientRect().height > 0);
          const maxBottom = Math.max(...visible.map((element) => element.getBoundingClientRect().bottom - boundary.top));
          return { height: boundary.height, maxBottom };
        });
        await page.waitForTimeout(350);
        const settledHeight = await mapCard.evaluate((paper) => paper.getBoundingClientRect().height);
        const stable = Math.abs(settledHeight - bounds.height) <= 1;
        receipt.mapContainment.push({ width, path, panel, font, ...bounds, settledHeight, stable });
        assert.ok(stable, `${width}px ${path} ${panel} at ${font}% text has stable sizing`);
        assert.ok(bounds.maxBottom <= bounds.height + 1, `${width}px ${path} at ${font}% text: map controls/readout overflow their card`);
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = "100%"; });
      await page.waitForTimeout(350);
    };
    const fit = async () => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px viewport fits`);
      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible()) {
        const box = await dialog.boundingBox(); assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, "Inspection stays within the viewport");
      }
    };
    for (const [path, fixtures, tableName, metadataKey] of [["/migration", archive, "Archive scans", "Migration"], ["/migration-pilot", pilot, "Pilot scans", "Pilot"]]) {
      await page.goto(origin + path); await settle();
      const map = page.locator('svg[aria-label="Natural Earth map of scan start locations"]');
      const mapCard = map.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
      const point = map.getByRole("button", { name: "Select scan 1000, latitude 30°, longitude 190°", exact: true });
      await point.waitFor(); await point.tap();
      await checkMapContainment(mapCard, path);
      assert.equal(await point.getAttribute("aria-pressed"), "true");
      await point.focus(); await page.keyboard.press("Space");
      assert.equal(await point.getAttribute("aria-pressed"), "true", "Keyboard map selection keeps the linked scan");
      const inspect = mapCard.getByRole("button", { name: "Inspect scan", exact: true });
      await inspect.tap();
      const text = await page.getByRole("dialog").innerText();
      assert.match(text, /Start latitude: 30°/); assert.match(text, /Start longitude \(raw\): 190°/); assert.match(text, /Displayed longitude: -170°/);
      await fit(); await screenshot(path === "/migration" ? "archive-map-inspector" : "pilot-map-inspector");
      await dismiss(inspect);
      const tools = mapCard.getByRole("button", { name: "Map tools", exact: true });
      await tools.tap(); assert.equal(await page.getByRole("button", { name: "Pan map", exact: true }).isDisabled(), true); await dismiss(tools);
      await mapCard.getByRole("button", { name: "Zoom +", exact: true }).tap();
      assert.match(await mapCard.innerText(), /zoom 2×/);
      await tools.tap(); await page.getByRole("button", { name: "Focus scan", exact: true }).tap();
      await page.getByRole("dialog").waitFor({ state: "hidden" }); assert.match(await mapCard.innerText(), /zoom 4×/);
      await tools.tap(); await page.getByRole("button", { name: "Pan map", exact: true }).tap(); await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.waitForFunction((svg) => Math.abs(Number(svg.getAttribute("height")) - svg.parentElement.getBoundingClientRect().height) < 1, await map.elementHandle());
      const before = Number(await point.locator("circle").first().getAttribute("cx"));
      await mapCard.getByRole("button", { name: "Pan map west", exact: true }).tap();
      await page.waitForFunction(({ svg, before }) => Number(svg.querySelector("circle")?.getAttribute("cx")) > before, { svg: await map.elementHandle(), before });
      await mapCard.getByRole("button", { name: "Reset", exact: true }).tap();
      assert.match(await mapCard.innerText(), /zoom 1×/);
      assert.equal(await mapCard.getByRole("button", { name: "Pan map west", exact: true }).count(), 0);
      assert.equal(await point.getAttribute("aria-pressed"), "true", "Reset retains scan selection");
      const table = page.getByRole("table", { name: tableName, exact: true, includeHidden: true });
      assert.equal(await table.isVisible(), false, "Scan table is secondary and collapsed");
      const spectrum = page.locator('svg[aria-label="Brightness temperature spectrum"]'); await spectrum.waitFor();
      assert.equal(await spectrum.evaluate((element, label) => !!(element.compareDocumentPosition(document.querySelector(`table[aria-label="${label}"]`)) & Node.DOCUMENT_POSITION_FOLLOWING), tableName), true, "Spectrum precedes scan table");
      await spectrum.tap({ position: { x: 150, y: 160 } }); await page.getByRole("dialog").waitFor();
      const channel = Number(await page.getByLabel("Channel (1-based)", { exact: true }).inputValue()) - 1;
      const data = fixtures.l1b.body.Data;
      const frequency = data.Frequency.IFreqGrid[channel] + data.Frequency.LOFreq[0];
      assert.ok(channel >= 0 && channel < data.Spectrum[0].length);
      assert.match(await page.getByRole("dialog").innerText(), new RegExp(`Frequency: ${frequency} Hz`));
      assert.match(await page.getByRole("dialog").innerText(), /Brightness temperature: 1 K/);
      await fit(); await screenshot(path === "/migration" ? "archive-touch-spectrum" : "pilot-touch-spectrum"); await dismiss(spectrum);
      const details = page.getByRole("button", { name: "Scan details & downloads", exact: true }); await details.tap();
      assert.match(await page.getByRole("dialog").innerText(), /Altitude: 20000 m to 60000 m/);
      assert.match(await page.getByRole("dialog").innerText(), /Quality: 32/);
      const link = await page.getByRole("link", { name: "Open source JSON", exact: true }).getAttribute("href");
      const expectedUrl = fixtures.status.body.release_id;
      assert.equal(new URL(link, origin).searchParams.get("release_id"), expectedUrl);
      if (path === "/migration") assert.equal(new URL(link, origin).searchParams.get("backend"), "AC2");
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download spectra JSON", exact: true }).tap()]);
      const exported = JSON.parse(await readFile(await download.path(), "utf8"));
      assert.deepEqual(exported.Data, data, "Downloaded scientific values match the full fixture exactly");
      assert.equal(exported[metadataKey].release_id, fixtures.status.body.release_id);
      assert.equal(exported[metadataKey].url, link);
      assert.equal(exported[metadataKey].source, fixtures.status.body.source);
      await dismiss(details); await fit();
      assert.ok((await page.evaluate(() => window.odinTouchEvents)).some((event) => event.type === "touch" && event.plot === "Brightness temperature spectrum"), "Spectrum interaction used real browser touch events");
      receipt.checks.push({ width, route: path, checks: ["touch and keyboard map selection", "exact raw/normalized coordinates", "Escape restores inspection trigger", "zoom/focus/directional pan/reset", "collapsed scan table after spectrum", "real touch pins exact spectrum channel", "download preserves scientific values/release/source URL", "viewport and inspector fit"] });
      if (path === "/migration") {
        const requestsBefore = receipt.requests.length;
        await page.getByLabel("Observation day (UTC)", { exact: true }).fill("2026-01-01"); await settle();
        await page.getByText("Reconstructed spectra are unavailable for AOS.", { exact: false }).waitFor();
        assert.match(await page.locator("main").innerText(), /Scan 9000 · AOS · FM 5/);
        assert.ok(receipt.requests.slice(requestsBefore).every((request) => !request.url.includes("/L1b/")), "Unsupported backend does not query reconstructed spectra");
        await screenshot("archive-aos-log-only");
        receipt.checks.push({ width, route: path, checks: ["date changes backend and frequency mode to AOS/FM5", "unsupported spectra stays explicit", "no spectrum request for AOS"] });
      }
      pending = true; const beforePending = receipt.requests.length;
      await page.goto(origin + path); await settle();
      assert.equal(await page.getByLabel("Observation day (UTC)", { exact: true }).isDisabled(), true);
      assert.ok(receipt.requests.slice(beforePending).every((request) => request.url.endsWith("/status")), "Unvalidated release blocks scientific discovery");
      assert.equal(await page.locator('svg[aria-label="Brightness temperature spectrum"]').count(), 0);
      receipt.checks.push({ width, route: path, checks: ["pending validation disables discovery and issues only status requests"] });
      pending = false;
    }
    // The public L2 route starts without a scan: touch selection must request its actual identity.
    await page.goto(origin + "/level2/calendar/2015/1/11/1"); await settle();
    const l2map = page.locator('svg[aria-label="Natural Earth map of scan start locations"]');
    assert.equal(await page.locator('svg[aria-label$="retrieval profile"]').count(), 0);
    await l2map.getByRole("button", { name: "Select scan 1000, latitude 30°, longitude 190°", exact: true }).tap();
    const profile = page.locator('svg[aria-label="O3 touch fixture retrieval profile"]'); await profile.waitFor();
    await checkMapContainment(l2map.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]'), "/level2/calendar/2015/1/11/1");
    await profile.locator('[data-level="1"]').tap(); await page.getByRole("dialog").waitFor();
    const profileText = await page.getByRole("dialog").innerText();
    assert.match(profileText, /Altitude: 20000 m/); assert.match(profileText, /VMR: 2 ppmv/);
    assert.match(profileText, /Source VMR: 0.000002/); assert.match(profileText, /Measurement response: 0.9/);
    await fit(); await screenshot("l2-touch-profile"); await dismiss(profile);
    assert.ok((await page.evaluate(() => window.odinTouchEvents)).some((event) => event.type === "touch" && event.plot === "O3 touch fixture retrieval profile"));
    const secondScan = l2map.getByRole("button", { name: "Select scan 1001, latitude -10°, longitude 10°", exact: true });
    await secondScan.focus(); await page.keyboard.press("Enter"); await settle();
    assert.equal(await secondScan.getAttribute("aria-pressed"), "true");
    assert.match(receipt.requests.filter((request) => request.url.startsWith("/api/products")).at(-1).url, /scanid=1001/);
    assert.equal(await page.getByText("Level 1 · 20000 m · 2 ppmv", { exact: true }).count(), 0, "Previous scan pin does not leak into the new profile");
    receipt.checks.push({ width, route: "/level2/calendar/2015/1/11/1", checks: ["touch selects an initially unselected scan", "touch opens persistent profile inspector with exact raw and converted values", "Escape restores profile focus", "keyboard selects another scan and requests its identity", "profile inspector fits viewport"] });
    await page.goto(origin + "/level1/calendar"); await settle();
    const listView = page.getByRole("button", { name: "List view", exact: true });
    if (await listView.isVisible()) await listView.tap();
    await page.getByRole("button", { name: /11 Jan 2015.*FM 1/ }).tap(); await settle();
    const l1map = page.locator('svg[aria-label="Natural Earth map of scan start locations"]');
    await l1map.getByRole("button", { name: /Select scan 1000,/ }).tap(); await settle();
    await checkMapContainment(l1map.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]'), "/level1/calendar");
    const geometryTab = page.getByRole("tab", { name: "geometry", exact: true });
    if (await geometryTab.isVisible()) await geometryTab.tap();
    const geometry = page.locator('svg[aria-label="Solar zenith angle in degrees by scan start time UTC"]'); await geometry.waitFor();
    await checkMapContainment(geometry.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]'), "/level1/calendar", "geometry");
    receipt.checks.push({ width, route: "/level1/calendar", checks: ["day/mode selection retains linked map/geometry", "map and geometry contain controls/readouts at100/200% text", "panel sizing settles without growth feedback"] });
    await context.close(); currentPage = null;
  }
  assert.deepEqual(receipt.blocked, [], "No external or unhandled scientific requests");
  assert.deepEqual(receipt.pageErrors, [], "No uncaught browser errors");
  receipt.sourceStable = (await Promise.all(sourcePaths.map(async (path) => receipt.sourceSha256[path] === await hash(path)))).every(Boolean);
  assert.ok(receipt.sourceStable, "Source remains unchanged during this acceptance run");
  console.log(`Passed ${receipt.checks.length} fixture-only flow cases at 390/834px; ${receipt.mapContainment.length} map containment checks; ${receipt.screenshots.length} screenshots`);
} catch (error) {
  receipt.failure = String(error);
  if (currentPage) { receipt.lastTouchEvents = await currentPage.evaluate(() => window.odinTouchEvents); receipt.lastPage = await currentPage.locator("body").innerText(); await currentPage.screenshot({ path: `${output}/failure.png`, fullPage: true }); }
  throw error;
} finally {
  receipt.finishedAt = new Date().toISOString(); await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2) + "\n"); await browser.close();
}
