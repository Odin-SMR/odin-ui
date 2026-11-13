import { readFile } from "node:fs/promises";
import { parseArchiveIndex, parseArchiveShard } from "../src/parquet/archive.ts";

// Local metadata only. No scientific object is requested by this check.
const publicRoot = new URL("../public/", import.meta.url);
const index = parseArchiveIndex(JSON.parse(await readFile(new URL("parquet/archive/index.json", publicRoot), "utf8")));
let count = 0;
for (const group of index.groups) {
  const shard = parseArchiveShard(JSON.parse(await readFile(new URL(group.index_url.slice(1), publicRoot), "utf8")), index, group);
  count += shard.files.length;
}
console.log(`Valid archive snapshot ${index.snapshot_id}: ${index.groups.length} groups, ${count} file entries. Scientific completeness and file bytes are not checked.`);
