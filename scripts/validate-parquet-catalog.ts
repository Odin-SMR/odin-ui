import { readFile } from "node:fs/promises";
import { parseCatalog } from "../src/parquet/catalog.ts";

const args = process.argv.slice(2);
const checkFiles = args.includes("--check-files");
const path = args.find((argument) => !argument.startsWith("--"));
if (args.some((argument) => argument.startsWith("--") && argument !== "--check-files")) throw new Error("Usage: node scripts/validate-parquet-catalog.ts [catalog.json] [--check-files]");
const catalog = parseCatalog(JSON.parse(await readFile(path ?? new URL("../public/parquet/catalog.json", import.meta.url), "utf8")));
const files = catalog.releases.flatMap((release) => release.datasets.flatMap((dataset) => dataset.files));
console.log(`Valid ${catalog.status} catalog: ${catalog.releases.length} releases, ${files.length} file entries.`);

if (checkFiles) {
  if (!files.length) throw new Error("No published files to verify.");
  for (const file of files) {
    // Metadata/range checks only; no credentials or full payload download.
    const response = await fetch(file.url, { headers: { Range: "bytes=0-3", Origin: "https://odin-smr.org" }, signal: AbortSignal.timeout(20000), redirect: "error" });
    const reader = response.body?.getReader();
    const bytes: number[] = [];
    try {
      if (response.status !== 206 || response.headers.get("content-range") !== `bytes 0-3/${file.size_bytes}`) throw new Error(`Missing expected range response: ${file.url} (${response.status})`);
      if (!reader) throw new Error(`Missing response body: ${file.url}`);
      while (bytes.length < 4) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes.push(...chunk.value.slice(0, 4 - bytes.length));
      }
      if (new TextDecoder().decode(new Uint8Array(bytes)) !== "PAR1") throw new Error(`Not ordinary Parquet: ${file.url}`);
    } finally {
      await reader?.cancel();
    }
    console.log(`Range and Parquet prefix verified: ${file.url}`);
  }
  console.log("Range checks do not verify full-file checksums, physical schema, CORS, license or scientific acceptance.");
}
