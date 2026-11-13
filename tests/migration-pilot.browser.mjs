import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { chromium } from "playwright";

// --fixture uses actual Flask-emitted synthetic wire payloads; --public does not intercept data.
const mode = process.argv[2] ?? "--fixture";
assert.ok(["--fixture", "--public"].includes(mode), "Use --fixture or --public followed by the site URL");
const base = process.argv[3] ?? (mode === "--fixture" ? "http://127.0.0.1:4173" : "https://odin-smr.org");
const fixtureMode = mode === "--fixture";
const contract = JSON.parse(await fs.readFile(new URL("../src/odinApi/fixtures/pilot-http-contract.json", import.meta.url), "utf8"));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const errors = [];
const requests = [];
let phase = "ready";

// Python/Flask emits -0.0; ordinary JSON.stringify would alter the wire fixture.
function fixtureJson(value) {
  if (Object.is(value, -0)) return "-0.0";
  if (Array.isArray(value)) return `[${value.map(fixtureJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .map(([key, entry]) => `${JSON.stringify(key)}:${fixtureJson(entry)}`).join(",")}}`;
  return JSON.stringify(value);
}
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  const url = new URL(request.url());
  if (url.pathname.startsWith("/rest_api/") || url.pathname.startsWith("/api/")) requests.push(url);
});

if (fixtureMode) await page.route("**/rest_api/**", async (route) => {
  const url = new URL(route.request().url());
  assert.ok(url.pathname.startsWith("/rest_api/pilot/v1/"));
  const record = Object.values(contract).find((entry) => new URL(entry.url, base).pathname === url.pathname);
  assert.ok(record, `Unexpected fixture route ${url.pathname}`);
  if (!url.pathname.endsWith("/status")) assert.equal(url.searchParams.get("release_id"), contract.status.body.release_id);
  let body = record.body;
  if (url.pathname.endsWith("/status") && phase !== "ready") body = {
    ...body, ready: false, status: phase, tables: {},
    ...(phase === "validating" ? {
      counters: { export_rows: 674395, committed_files: 80, validation_rows: 253369, source_read_bytes: 2574098073 },
      current_table: "public.fba_level0",
    } : {}),
    ...(["failed", "interrupted"].includes(phase) ? { error: `Fixture ${phase} state` } : {}),
  };
  await route.fulfill({ status: record.status, headers: record.headers, body: fixtureJson(body) });
});

async function waitForStatus() {
  const response = await page.waitForResponse((response) => new URL(response.url()).pathname === "/rest_api/pilot/v1/status");
  assert.equal(response.status(), 200);
  assert.equal(response.headers()["x-odin-source"], "s3-parquet-pilot");
  return response.json();
}

async function download(name) {
  const [artifact] = await Promise.all([
    page.waitForEvent("download"), page.getByRole("button", { name, exact: true }).click(),
  ]);
  return { body: JSON.parse(await fs.readFile(await artifact.path(), "utf8")), filename: artifact.suggestedFilename() };
}

try {
  const statusPromise = waitForStatus();
  await page.goto(new URL("/migration-pilot", base).href);
  const status = await statusPromise;
  await page.getByText(status.release_id ? `Release: ${status.release_id}` : "Release: Awaiting release", { exact: true }).waitFor();
  const checks = ["anonymous migration page", "S3 source header"];
  let observation;
  const screenshot = fixtureMode ? "/tmp/odin-pilot-ui-flask-fixture.png" : "/tmp/odin-pilot-ui-public.png";
  if (!status.ready) {
    await page.getByLabel("Observation day (UTC)").waitFor();
    assert.equal(await page.getByLabel("Observation day (UTC)").isDisabled(), true);
    assert.ok(requests.every((url) => url.pathname.endsWith("/status")));
    checks.push("pending/failed migration disables discovery without data requests");
  } else {
    await page.getByRole("img", { name: "Brightness temperature spectrum" }).waitFor({ timeout: 120_000 });
    await page.getByRole("button", { name: "Download log JSON", exact: true }).waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll("button"))
      .some((button) => button.textContent === "Download log JSON" && !button.disabled), null, { timeout: 120_000 });
    assert.ok(await page.locator(".fc-daygrid-event").count() > 0);
    assert.ok(requests.every((url) => url.pathname.startsWith("/rest_api/pilot/v1/") && (url.pathname.endsWith("/status") || url.searchParams.get("release_id") === status.release_id)));
    const spectra = await download("Download spectra JSON");
    const log = await download("Download log JSON");
    assert.equal(spectra.body.Pilot.release_id, status.release_id);
    assert.equal(spectra.body.Pilot.source, "s3-parquet-pilot");
    assert.equal(log.body.Count, null);
    assert.ok(log.body.Data && !Array.isArray(log.body.Data));
    assert.ok(spectra.filename.startsWith(status.release_id.replace(/[^a-zA-Z0-9_-]/g, "_")));
    const spectrumPath = await page.getByRole("img", { name: "Brightness temperature spectrum" }).locator("path").getAttribute("d");
    const positiveBandStarts = spectra.body.Data.Frequency.SubBandIndex[0].filter((start) => start >= 1);
    const finiteChannels = spectra.body.Data.Spectrum[0].filter((value) => typeof value === "number" && Number.isFinite(value));
    assert.equal((spectrumPath.match(/M/g) ?? []).length, positiveBandStarts.length, "Spectrum must begin a separate curve for every explicit band");
    assert.equal((spectrumPath.match(/[ML]/g) ?? []).length, finiteChannels.length, "Inclusive last channels must remain rendered");
    checks.push("explicit subband gaps and inclusive channel retention");
    if (fixtureMode) {
      const { Pilot: spectrumProvenance, ...spectrumResponse } = spectra.body;
      const { Pilot: logProvenance, ...logResponse } = log.body;
      assert.equal(spectrumProvenance.release_id, contract.status.body.release_id);
      assert.equal(logProvenance.release_id, contract.status.body.release_id);
      assert.ok(isDeepStrictEqual(spectrumResponse, contract.l1b.body), "Spectrum download changed the Flask payload, including signed zeros");
      assert.ok(isDeepStrictEqual(logResponse, contract.log.body), "Log download changed the Flask payload");
      await page.getByRole("combobox", { name: "Spectrum" }).click();
      await page.getByRole("option", { name: "2 of 2", exact: true }).click();
      assert.ok((await page.locator("body").textContent()).includes("Quality: 208"));
      checks.push("exact Flask Log object and nullable counts", "full spectrum/metadata download equivalence", "spectrum selection");
    } else {
      const scan = spectra.body.Data.ScanID?.[0];
      assert.equal(scan, 7013927028, "The selected public reference scan changed");
      await page.getByRole("combobox", { name: "Frequency mode" }).click();
      const modeLabels = await page.getByRole("option").allTextContents();
      const modes = modeLabels.map((label) => Number(label.replace(/^FM\s*/, ""))).sort((a, b) => a - b);
      assert.deepEqual(modes, [...status.coverage.freqmodes].sort((a, b) => a - b));
      await page.keyboard.press("Escape");
      assert.equal(await page.locator('svg circle[fill="blue"]').count(), 1, "The selected scan is absent from the map");
      const sourceBodies = [];
      for (const artifact of [spectra, log]) {
        const response = await page.context().request.get(new URL(artifact.body.Pilot.url, base).href);
        assert.equal(response.status(), 200);
        assert.equal(response.headers()["x-odin-source"], "s3-parquet-pilot");
        assert.equal(response.headers()["x-odin-release"], status.release_id);
        const source = await response.json();
        const { Pilot: provenance, ...downloaded } = artifact.body;
        assert.equal(provenance.release_id, status.release_id);
        assert.ok(isDeepStrictEqual(downloaded, source), "A public download changed source JSON values, including signed zeros");
        sourceBodies.push(source);
      }
      const countNegativeZeros = (value) => {
        if (typeof value === "number") return Object.is(value, -0) ? 1 : 0;
        if (Array.isArray(value)) return value.reduce((sum, entry) => sum + countNegativeZeros(entry), 0);
        if (value && typeof value === "object") return countNegativeZeros(Object.values(value));
        return 0;
      };
      observation = {
        scan, modes,
        scanRows: await page.locator('table[aria-label="Pilot scans"] tbody tr').count(),
        spectra: spectra.body.Data.Spectrum.length,
        channels: spectra.body.Data.Spectrum[0].length,
        negativeZeros: sourceBodies.map(countNegativeZeros),
      };
      checks.push("all exported frequency modes", "selected scan plotted on map", "anonymous direct source JSON", "full known-scan download equality including signed zeros");
    }
    checks.push("calendar scan list/map log spectra", "anonymous downloads with release provenance", "all requests pinned without legacy fallback");
    const openSource = await page.getByRole("link", { name: "Open source JSON", exact: true }).getAttribute("href");
    assert.equal(new URL(openSource, base).searchParams.get("release_id"), status.release_id);
    const beforeOutside = requests.length;
    const outside = new Date(`${status.coverage.dates[status.coverage.dates.length - 1]}T00:00:00Z`);
    outside.setUTCDate(outside.getUTCDate() + 1);
    await page.getByLabel("Observation day (UTC)").fill(outside.toISOString().slice(0, 10));
    await page.getByText("This date is outside the pilot coverage.", { exact: false }).waitFor();
    assert.equal(requests.length, beforeOutside);
    checks.push("outside coverage sends no data requests");
    await page.getByLabel("Observation day (UTC)").fill(status.coverage.dates[0]);
    await page.getByRole("img", { name: "Brightness temperature spectrum" }).waitFor();
  }
  await page.screenshot({ path: screenshot, fullPage: true });
  if (fixtureMode) for (const state of ["planning", "exporting", "validating", "interrupted", "failed"]) {
    phase = state;
    const before = requests.length;
    const statePromise = waitForStatus();
    await page.reload();
    assert.equal((await statePromise).status, state);
    await page.getByText(["interrupted", "failed"].includes(state) ? `Fixture ${state} state` : "Discovery opens after", { exact: false }).waitFor();
    assert.equal(await page.getByLabel("Observation day (UTC)").isDisabled(), true);
    assert.ok(requests.slice(before).every((url) => url.pathname.endsWith("/status")));
    if (state === "validating") {
      assert.ok((await page.locator("body").textContent()).includes("674,395 rows exported"));
      assert.ok((await page.locator("body").textContent()).includes("Validated table totals will appear"));
      assert.ok(!(await page.locator("body").textContent()).includes("0 tables"));
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ fixture: fixtureMode, status: status.status, release: status.release_id, observation, checks, requests: requests.length, screenshot }));
} finally { await browser.close(); }
