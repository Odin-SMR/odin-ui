import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { chromium } from "playwright";

// Full/v1 payloads below were emitted by the isolated Flask app over synthetic Parquet.
const mode = process.argv[2] ?? "--fixture";
assert.ok(["--fixture", "--public"].includes(mode), "Use --fixture or --public followed by the site URL");
const fixtureMode = mode === "--fixture";
const base = process.argv[3] ?? (fixtureMode ? "http://127.0.0.1:4173" : "https://odin-smr.org");
const contract = JSON.parse(await fs.readFile(new URL("../src/odinApi/fixtures/migration-http-contract.json", import.meta.url), "utf8"));
const fb = JSON.parse(await fs.readFile(new URL("../src/odinApi/fixtures/migration-fb-http-contract.json", import.meta.url), "utf8"));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const errors = [], requests = [];
let phase = "ready";
let mixedCounts = false;
let fbMode = false;
function json(value) {
  if (Object.is(value, -0)) return "-0.0";
  if (Array.isArray(value)) return `[${value.map(json).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, entry]) => entry !== undefined).map(([key, entry]) => `${JSON.stringify(key)}:${json(entry)}`).join(",")}}`;
  return JSON.stringify(value);
}
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname.startsWith("/rest_api/") || url.pathname.startsWith("/api/")) requests.push(url); });
if (fixtureMode) await page.route("**/rest_api/**", async (route) => {
  const url = new URL(route.request().url());
  assert.ok(url.pathname.startsWith("/rest_api/migration/v1/"), `Unexpected source route ${url.pathname}`);
  if (!url.pathname.endsWith("/status")) assert.equal(url.searchParams.get("release_id"), "fixture-full");
  if (fbMode) {
    const body = url.pathname.endsWith("/status") ? fb.status : url.pathname.includes("/period_info/") ? fb.calendar : url.pathname.includes("/Log/") ? fb.log : fb.scans;
    if (url.pathname.includes("freqmode_info") || url.pathname.includes("level1")) assert.equal(url.searchParams.get("backend"), "FB");
    assert.ok(!url.pathname.includes("/L1b/"), "FB must not request unsupported spectrum reconstruction");
    await route.fulfill({ status: 200, headers: fb.headers, body: json(body) }); return;
  }
  let record = Object.values(contract).find((entry) => {
    const candidate = new URL(entry.url, base);
    return candidate.pathname === url.pathname && candidate.searchParams.get("backend") === url.searchParams.get("backend");
  });
  if (mixedCounts && url.pathname === new URL(contract.mixed_calendar.url, base).pathname) record = contract.mixed_calendar;
  // Covered days without catalogue rows, and unsupported/missing spectra are honest absences.
  if (!record && url.pathname.includes("/period_info/")) record = { status: 200, headers: contract.calendar.headers, body: { Type: "freqmode_info", Count: 0, Data: [] } };
  if (!record && url.pathname.includes("/L1b/")) record = { status: 404, headers: contract.l1b.headers, body: { detail: "No reconstructed spectrum is available" } };
  assert.ok(record, `Unexpected fixture route ${url.pathname}`);
  let body = record.body, status = record.status;
  if (url.pathname.endsWith("/status") && phase !== "ready") body = {
    ...body, ready: false, status: phase, tables: {},
    counters: { export_rows: 4301472278, committed_files: 10000, validation_rows: 1000000, source_read_bytes: 1024 ** 4, exported_units: 142351, validated_units: 9 },
    current_table: "public.ac_level1a", current_unit: "AC2-stw-2015",
    ...(phase === "waiting_for_source" ? { waiting_phase: "validating", waiting_writer_count: 0, writer_wait_seconds: 30 } : {}),
    ...(["failed", "interrupted", "limit_exceeded"].includes(phase) ? { error_code: `fixture_${phase}` } : {}),
  };
  if (phase === "unavailable" && url.pathname.endsWith("/status")) { body = { ...body, error: "Archive storage unavailable" }; status = 503; }
  await route.fulfill({ status, headers: record.headers, body: json(body) });
});
const statusResponse = () => page.waitForResponse((response) => new URL(response.url()).pathname === "/rest_api/migration/v1/status");
async function download(name) {
  const [artifact] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name, exact: true }).click()]);
  return JSON.parse(await fs.readFile(await artifact.path(), "utf8"));
}
async function select(name, option) {
  await page.getByRole("combobox", { name: new RegExp(`^${name}(?:\\s|$)`) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
try {
  const statusPromise = statusResponse();
  await page.goto(new URL("/migration", base).href);
  const response = await statusPromise;
  assert.equal(response.headers()["x-odin-source"], "s3-parquet-migration");
  assert.equal(response.headers()["x-odin-coverage"], "mission");
  const status = await response.json();
  const checks = ["separate anonymous archive route", "full source and mission coverage headers"];
  if (status.ready) {
    await page.getByRole("img", { name: "Brightness temperature spectrum" }).waitFor({ timeout: 120_000 });
    const saved = await download("Download spectra JSON"), log = await download("Download log JSON");
    for (const artifact of [saved, log]) {
      assert.equal(artifact.Migration.source, "s3-parquet-migration");
      assert.equal(artifact.Migration.release_id, status.release_id);
      const url = new URL(artifact.Migration.url, base);
      assert.equal(url.searchParams.get("release_id"), status.release_id);
      assert.ok(url.searchParams.get("backend"));
    }
    const sourceLink = await page.getByRole("link", { name: "Open source JSON", exact: true }).getAttribute("href");
    assert.equal(sourceLink, saved.Migration.url);
    if (fixtureMode) {
      const { Migration: provenance, ...payload } = saved;
      const { Migration: logProvenance, ...logPayload } = log;
      assert.equal(provenance.coverage, "mission"); assert.equal(logProvenance.coverage, "mission");
      assert.ok(isDeepStrictEqual(payload, contract.l1b.body), "Download changed full scientific payload or signed-zero values");
      assert.ok(isDeepStrictEqual(logPayload, contract.log.body));
      const d = await page.getByRole("img", { name: "Brightness temperature spectrum" }).locator("path").getAttribute("d");
      assert.equal((d.match(/M/g) ?? []).length, payload.Data.Frequency.SubBandIndex[0].filter((start) => start >= 1).length);
      assert.equal((d.match(/[ML]/g) ?? []).length, payload.Data.Spectrum[0].filter(Number.isFinite).length);
      await select("Spectrum", "2 of 2");
      await page.getByText("Quality: 208", { exact: false }).waitFor();
      checks.push("complete Flask download equality including signed zeros", "explicit inclusive subband boundaries", "spectrum selection");
      mixedCounts = true;
      const mixedStatus = statusResponse(); await page.reload(); await mixedStatus;
      await page.getByRole("img", { name: "Brightness temperature spectrum" }).waitFor();
      const titles = await page.locator(".fc-event-title").allTextContents();
      assert.ok(titles.includes("AC1 · FM1 · 491"));
      assert.ok(titles.includes("AC2 · FM1 · Missing"));
      assert.ok(titles.includes("AC2 · FM2 · -7"));
      const countVisible = await page.locator(".fc-event-title").evaluateAll((elements) => elements.every((element) => {
        const node = element.firstChild;
        if (!node || node.nodeType !== Node.TEXT_NODE) return false;
        const text = node.textContent, lastToken = text.lastIndexOf(" · ") + 3;
        const range = document.createRange(); range.setStart(node, lastToken); range.setEnd(node, text.length);
        const textBounds = range.getBoundingClientRect(), eventBounds = element.closest(".fc-daygrid-event").getBoundingClientRect();
        return textBounds.width > 0 && textBounds.left >= eventBounds.left && textBounds.right <= eventBounds.right && textBounds.top >= eventBounds.top && textBounds.bottom <= eventBounds.bottom;
      }));
      assert.equal(countVisible, true, "Missing and signed counts must remain visible inside calendar event bounds");
      assert.ok(!(await page.locator("body").textContent()).includes("unsupported data format"));
      checks.push("actual mixed Flask month retains null/signed counts and neighboring scan discovery");
      await select("Backend", "AC1");
      await page.getByText("Scan 1001 · AC1 · FM 1", { exact: true }).waitFor();
      await page.getByText("No reconstructed spectrum is available", { exact: false }).waitFor();
      assert.ok(requests.some((url) => url.pathname.includes("/freqmode_info/") && url.searchParams.get("backend") === "AC1"));
      checks.push("alternate backend does not use default-mode backend", "missing spectrum remains explicit");
      await page.getByLabel("Observation day (UTC)").fill("2026-01-01");
      await page.getByText("Scan 9000 · AOS · FM 5", { exact: true }).waitFor();
      await page.getByText("Reconstructed spectra are unavailable for AOS", { exact: false }).waitFor();
      assert.ok(!requests.some((url) => url.pathname.includes("/level1/5/9000/L1b/")));
      checks.push("non-AC backend log works without unsupported spectrum query");
      await page.getByLabel("Observation day (UTC)").fill("2001-01-01");
      await page.getByText("Scan 100 · AC1 · FM 2", { exact: true }).waitFor();
      checks.push("early and late mission catalogue bounds");
      await page.getByLabel("Observation day (UTC)").fill("2015-02-01");
      await page.getByText("No catalogue records are stored for this day", { exact: false }).waitFor();
      checks.push("honest empty covered day");
    } else {
      for (const artifact of [saved, log]) {
        const source = await page.context().request.get(new URL(artifact.Migration.url, base).href);
        assert.equal(source.status(), 200);
        assert.equal(source.headers()["x-odin-source"], "s3-parquet-migration");
        assert.equal(source.headers()["x-odin-release"], status.release_id);
        const { Migration: provenance, ...payload } = artifact;
        assert.equal(provenance.coverage, "mission");
        assert.ok(isDeepStrictEqual(payload, await source.json()));
      }
      checks.push("anonymous exact source JSON downloads");
    }
    const outside = new Date(`${status.coverage.date_end}T00:00:00Z`); outside.setUTCDate(outside.getUTCDate() + 1);
    const before = requests.length;
    await page.getByLabel("Observation day (UTC)").fill(outside.toISOString().slice(0, 10));
    await page.getByText("This date is outside the stored catalogue coverage", { exact: false }).waitFor();
    assert.equal(requests.length, before);
    checks.push("outside catalogue coverage sends no data requests");
    if (fixtureMode) {
      await page.getByText("Look up a scan identifier directly", { exact: true }).click();
      await page.getByLabel("Scan identifier", { exact: true }).fill("1000");
      await page.getByRole("button", { name: "Find scan", exact: true }).click();
      await page.getByRole("img", { name: "Brightness temperature spectrum" }).waitFor();
      checks.push("direct source scan lookup outside catalogue date bounds");
    }
    assert.ok(requests.every((url) => url.pathname.startsWith("/rest_api/migration/v1/") && (url.pathname.endsWith("/status") || url.searchParams.get("release_id") === status.release_id)));
    checks.push("all science requests use pinned full source without pilot or PostgreSQL fallback");
    await page.getByLabel("Observation day (UTC)").fill("2015-01-11");
    if (fixtureMode) await select("Backend", "AC2");
    await page.getByRole("img", { name: "Brightness temperature spectrum" }).waitFor();
  } else {
    await page.getByLabel("Observation day (UTC)").waitFor();
    assert.equal(await page.getByLabel("Observation day (UTC)").isDisabled(), true);
    assert.ok(requests.every((url) => url.pathname.endsWith("/status")));
    checks.push("pending release disables science and sends status requests only");
  }
  const screenshot = fixtureMode ? "/tmp/odin-full-ui-flask-fixture.png" : "/tmp/odin-full-ui-public.png";
  await page.screenshot({ path: screenshot, fullPage: true });
  if (fixtureMode) {
    fbMode = true;
    const before = requests.length, fbStatus = statusResponse();
    const fbCalendar = page.waitForResponse((response) => new URL(response.url()).pathname.includes("/period_info/"));
    await page.reload(); await fbStatus;
    assert.equal((await (await fbCalendar).json()).Data[0].Backend, "FB ");
    await page.getByText("Scan 1000 · FB · FM 20", { exact: true }).waitFor();
    await page.getByText("Reconstructed spectra are unavailable for FB", { exact: false }).waitFor();
    await page.getByRole("combobox", { name: /^Backend(?:\s|$)/ }).click();
    assert.deepEqual(await page.getByRole("option").allTextContents(), ["FB"]);
    await page.getByRole("option", { name: "FB", exact: true }).click();
    await page.locator(".fc-daygrid-event").first().click();
    await page.getByText("Look up a scan identifier directly", { exact: true }).click();
    await page.getByRole("combobox", { name: /^Scan backend(?:\s|$)/ }).click();
    assert.deepEqual(await page.getByRole("option").allTextContents(), ["FB"]);
    await page.getByRole("option", { name: "FB", exact: true }).click();
    const savedLog = await download("Download log JSON");
    const { Migration: provenance, ...payload } = savedLog;
    assert.ok(isDeepStrictEqual(payload, fb.log), "FB download must preserve the original emitted fields");
    assert.equal(new URL(provenance.url, base).searchParams.get("backend"), "FB");
    assert.ok(requests.slice(before).every((url) => url.pathname.endsWith("/status") || url.searchParams.get("release_id") === "fixture-full"));
    assert.ok(!requests.slice(before).some((url) => url.pathname.includes("/L1b/")));
    await page.locator('svg circle[fill="blue"]').first().waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: "/tmp/odin-full-ui-fb-fixture.png", fullPage: true });
    checks.push("actual padded FB catalogue retains source field, canonical unique options and scan lookup", "FB log download retains original fields without unsupported spectrum query");
    fbMode = false;
  }
  if (fixtureMode) for (const state of ["planning", "exporting", "validating", "waiting_for_source", "interrupted", "failed", "limit_exceeded", "unavailable"]) {
    phase = state;
    const before = requests.length, pending = statusResponse(); await page.reload();
    const reply = await pending;
    assert.equal(reply.status(), state === "unavailable" ? 503 : 200);
    await page.getByText(state === "unavailable" ? "Archive storage unavailable" : ["failed", "interrupted", "limit_exceeded"].includes(state) ? `fixture_${state}` : "Discovery opens after the entire archive", { exact: false }).waitFor();
    assert.equal(await page.getByLabel("Observation day (UTC)").isDisabled(), true);
    assert.ok(requests.slice(before).every((url) => url.pathname.endsWith("/status")));
    if (state === "validating") {
      await page.getByText("Current table: public.ac_level1a · Section: AC2-stw-2015", { exact: true }).waitFor();
      assert.ok(!(await page.locator("body").textContent()).includes("0 validated tables"));
    }
    if (state === "waiting_for_source") await page.getByText("Confirming the source is quiet before continuing", { exact: false }).waitFor();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ fixture: fixtureMode, status: status.status, release: status.release_id, checks, requests: requests.length, screenshot }));
} finally { await browser.close(); }
