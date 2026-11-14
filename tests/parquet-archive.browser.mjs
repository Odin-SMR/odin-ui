// Fixture-only discovery acceptance: no scientific object requests are allowed.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const origin = process.env.ODIN_UI_URL ?? "http://127.0.0.1:5191";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const output = process.env.ODIN_ARCHIVE_QA_DIR ?? "/tmp/odin-ui-release-archive-browser";
await mkdir(output, { recursive: true });
const file = (name, year, month) => ({ url: `https://science.example.org/${name}.parquet`, size_bytes: 1024, year, month, etag: "opaque", last_modified: "2026-11-13T10:00:00Z" });
const shards = [
  { schema_version: 1, snapshot_id: "test", group_id: "a", files: [...Array.from({ length: 51 }, (_, i) => file(`january-${i}`, 2022, 1)), file("march", 2022, 3), file("next-year", 2023, 2)] },
  { schema_version: 1, snapshot_id: "test", group_id: "b", files: [file("other-project", 2024, 6)] },
];
const index = { schema_version: 1, snapshot_id: "test", generated_at: "2026-11-13T12:00:00Z", description: "Synthetic inventory only.", source_scope: "Two synthetic projects.", groups: shards.map((shard) => ({ id: shard.group_id, project: `synthetic-long-processing-project-${shard.group_id}`, product: "O3 545 GHz synthetic product", frequency_mode: 1, inversion_mode: "strat", level: "L2", file_count: shard.files.length, size_bytes: shard.files.length * 1024, index_url: `/parquet/archive/test/${shard.group_id}.json` })) };
const receipt = { fixtureOnly: true, cases: [], errors: [], blocked: [], metadataRequests: [], sourceSha256: {} };
for (const path of ["src/components/ParquetArchive.tsx", "src/parquet/archive.ts", "src/DataAccess.tsx", "tests/parquet-archive.browser.mjs"]) receipt.sourceSha256[path] = createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex");
let failShard = false;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/rest_api/")) { receipt.blocked.push(url.href); return route.abort(); }
    if (url.pathname.startsWith("/parquet/archive/")) {
      receipt.metadataRequests.push(url.pathname);
      const isIndex = url.pathname.endsWith("/index.json");
      return route.fulfill({ status: failShard && !isIndex ? 503 : 200, contentType: "application/json", body: JSON.stringify(isIndex ? index : shards.find((shard) => url.pathname.endsWith(`/${shard.group_id}.json`))) });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => receipt.errors.push(error.message));
  const section = page.locator('section[aria-labelledby="parquet-archive"]');
  for (const width of [320, 390, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/data_access/files#parquet-archive`);
      await page.evaluate((value) => localStorage.setItem("themeMode", value), theme); await page.reload();
      await section.getByText("51 files · 51 KiB in partition 2022-01", { exact: true }).waitFor();
      for (const size of [16, 32]) {
        await page.evaluate((value) => { document.documentElement.style.fontSize = `${value}px`; }, size);
        const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.ok(dimensions.scrollWidth <= dimensions.width + 1, JSON.stringify({ width, theme, size, dimensions }));
        receipt.cases.push({ width, theme, size });
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = "16px"; });
      if (width === 390 && theme === "light" || width === 1440 && theme === "dark") await section.screenshot({ path: `${output}/archive-${width}-${theme}.png` });
    }
  }
  assert.equal(await section.getByRole("link").count(), 50);
  await section.getByRole("button", { name: "Next files", exact: true }).click();
  assert.equal(await section.getByRole("link").count(), 1);
  await section.getByRole("button", { name: "Previous files", exact: true }).click();
  await section.getByLabel("Partition month", { exact: true }).selectOption("3");
  const before = receipt.metadataRequests.length;
  assert.equal(await section.getByRole("link").getAttribute("href"), "https://science.example.org/march.parquet");
  const downloadPromise = page.waitForEvent("download");
  await section.getByRole("button", { name: "Download archive URLs", exact: true }).click();
  assert.equal(await readFile(await (await downloadPromise).path(), "utf8"), "https://science.example.org/march.parquet\n");
  const metadataPromise = page.waitForEvent("download");
  await section.getByRole("button", { name: "Download archive metadata", exact: true }).click();
  const metadata = JSON.parse(await readFile(await (await metadataPromise).path(), "utf8"));
  assert.deepEqual(metadata.files, [shards[0].files[51]]);
  assert.equal(receipt.metadataRequests.length, before);
  await section.getByLabel("Processing project", { exact: true }).selectOption("synthetic-long-processing-project-b");
  await section.getByText("1 file · 1 KiB in partition 2024-06", { exact: true }).waitFor();
  assert.equal(receipt.metadataRequests.length, before + 1);
  failShard = true;
  await section.getByLabel("Processing project", { exact: true }).selectOption("synthetic-long-processing-project-a");
  await section.getByRole("button", { name: "Retry product", exact: true }).waitFor();
  assert.equal(await section.getByRole("link").count(), 0);
  failShard = false;
  await section.getByRole("button", { name: "Retry product", exact: true }).click();
  await section.getByText("51 files · 51 KiB in partition 2022-01", { exact: true }).waitFor();
  assert.deepEqual(receipt.errors, []); assert.deepEqual(receipt.blocked, []);
  await writeFile(`${output}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`Passed ${receipt.cases.length} archive layouts, pagination, partition/project filters, exact downloads and failure/retry. ${output}/receipt.json`);
} finally { await browser.close(); }
