import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

// Fixture-only: all API traffic is intercepted and external requests are blocked.
const base = new URL(process.argv[2] ?? "http://127.0.0.1:18187");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Only a local fixture server is supported");
const fixture = JSON.parse(await fs.readFile(new URL("../src/hooks/fixtures/migration-timeline-http-contract.json", import.meta.url), "utf8"));
const archive = JSON.parse(await fs.readFile(new URL("../src/odinApi/fixtures/migration-http-contract.json", import.meta.url), "utf8"));
const annual = fixture.requests.find((record) => record.year === null);
const release = annual.headers["X-Odin-Release"];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, serviceWorkers: "block" });
const page = await context.newPage();
const errors = [], requests = [];
let ready = false;
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/*", async (route) => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin !== base.origin) { errors.push(`Blocked external request ${url.origin}`); await route.abort(); return; }
  if (!url.pathname.startsWith("/rest_api/") && !url.pathname.startsWith("/api/")) { await route.continue(); return; }
  requests.push(url.href);
  assert.equal(request.headers().authorization, undefined);
  assert.ok(url.pathname.startsWith("/rest_api/migration/v1/"), `Unexpected science source ${url.pathname}`);
  let body, headers = annual.headers;
  if (url.pathname.endsWith("/status")) body = { ...archive.status.body, ready, status: ready ? "validated" : "exporting", release_id: release };
  else {
    assert.ok(ready, "Science requested before validated readiness");
    assert.equal(url.searchParams.get("release_id"), release);
    if (url.pathname.includes("/period_info/")) body = { Type: "freqmode_info", Count: 0, Data: [] };
    else {
      assert.equal(url.pathname, "/rest_api/migration/v1/statistics/freqmode/timeline/");
      const year = url.searchParams.has("year") ? Number(url.searchParams.get("year")) : null;
      const record = fixture.requests.find((entry) => entry.year === year);
      assert.ok(record, `Unexpected fixture year ${year}`); body = record.body; headers = record.headers;
    }
  }
  await route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(body) });
});
try {
  await page.goto(new URL("/migration", base).href);
  await page.getByText("Discovery opens after the entire archive", { exact: false }).waitFor();
  assert.equal(await page.getByText("Archived L1 frequency-mode timeline", { exact: true }).count(), 0);
  assert.ok(requests.every((url) => new URL(url).pathname.endsWith("/status")));
  ready = true; await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await page.locator('[data-mode="null"][data-count="-9"]').waitFor();
  const signed = await page.evaluate(() => {
    const bar = document.querySelector('[data-mode="null"][data-count="-9"]');
    const baseline = bar.closest("svg").querySelector('[data-zero-baseline="true"]');
    return { y: +bar.getAttribute("y"), height: +bar.getAttribute("height"), zero: +baseline.getAttribute("y1") };
  });
  assert.ok(signed.height > 0 && signed.y >= signed.zero);
  assert.equal(await page.locator('[data-mode="2"][data-group="2015"][data-count-state="missing"]').count(), 1);
  for (const year of [1, 1999, 2099, 9999, 2015]) {
    await page.getByLabel("Statistics year", { exact: true }).fill(String(year));
    await page.getByRole("button", { name: "Show monthly statistics", exact: true }).click();
    await page.getByText(`${year} monthly archived L1 statistics`, { exact: true }).waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((element) => element.textContent === "Download monthly statistics JSON" && !element.disabled));
  }
  const [artifact] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download monthly statistics JSON", exact: true }).click()]);
  const text = await fs.readFile(await artifact.path(), "utf8"), downloaded = JSON.parse(text);
  const expected = fixture.requests.find((record) => record.year === 2015);
  assert.deepEqual(downloaded, { ...expected.body, Migration: {
    source: "s3-parquet-migration", coverage: "mission", release_id: release,
    url: `/rest_api/migration/v1/statistics/freqmode/timeline/?release_id=${release}&year=2015`,
    timeline_sha256: expected.headers["X-Odin-Timeline-SHA256"], source_manifest_sha256: expected.headers["X-Odin-Source-Manifest-SHA256"],
  } });
  await fs.writeFile("/tmp/odin-migration-timeline-fixture-download.json", text);
  const direct = await page.getByRole("link", { name: "Open monthly source JSON", exact: true }).getAttribute("href");
  const source = await page.evaluate(async (url) => { const response = await fetch(url); return { status: response.status, body: await response.json() }; }, direct);
  assert.equal(source.status, 200); assert.deepEqual(source.body, expected.body);
  await page.getByText("Archived L1 frequency-mode timeline", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/odin-migration-timeline-fixture.png", fullPage: true });
  assert.deepEqual(errors, []);
  const result = { fixture_only: true, production_parity: false, requests, signed_geometry: signed, release,
    timeline_sha256: annual.headers["X-Odin-Timeline-SHA256"], source_manifest_sha256: annual.headers["X-Odin-Source-Manifest-SHA256"],
    checks: ["no science before readiness", "migration-only pinned requests", "real responsive signed/NULL SVG", "explicit years1/1999/2099/9999", "anonymous exact JSON download/source", "no browser errors"],
    screenshot: "/tmp/odin-migration-timeline-fixture.png" };
  await fs.writeFile("/tmp/odin-migration-timeline-browser-result.json", `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
