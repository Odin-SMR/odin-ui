import { describe, expect, it } from "vitest";
import { archivePartitionFiles, parseArchiveIndex, parseArchiveShard } from "./archive";

const file = { url: "https://science.example.org/l2/one.parquet", size_bytes: 100, year: 2023, month: 1, etag: '"opaque-tag"', last_modified: "2026-11-13T10:00:00Z" };
const group = { id: "test", project: "project", product: "O3", level: "L2" as const, file_count: 1, size_bytes: 100, index_url: "/parquet/archive/test-snapshot/test.json" };
const index = { schema_version: 1 as const, snapshot_id: "test-snapshot", generated_at: "2026-11-13T12:00:00Z", source_scope: "Synthetic project only.", description: "Synthetic inventory.", groups: [group] };
const shard = { schema_version: 1, snapshot_id: index.snapshot_id, group_id: group.id, files: [file] };

describe("archive listing contract", () => {
  it("keeps partition metadata distinct from observation dates and scientific checksums", () => {
    const parsed = parseArchiveShard(shard, parseArchiveIndex(index), group);
    expect(parsed.files[0].etag).toBe('"opaque-tag"');
    expect(archivePartitionFiles(parsed.files, 2023, 1)).toHaveLength(1);
    expect(archivePartitionFiles(parsed.files, 2023, 2)).toEqual([]);
    expect(parsed.files[0]).not.toHaveProperty("sha256");
    expect(parsed.files[0]).not.toHaveProperty("observation_start");
  });

  it.each(["https://other.example/index.json", "/parquet/archive/other/test.json", "/parquet/archive/test-snapshot/../test.json"])("rejects unexpected shard location %s", (index_url) => {
    expect(() => parseArchiveIndex({ ...index, groups: [{ ...group, index_url }] })).toThrow();
  });

  it.each(["http://science.example.org/one.parquet", "https://user@science.example.org/one.parquet", "https://science.example.org/one.parquet?token=secret", "https://science.example.org/index.html"])("rejects unsafe or non-Parquet URL %s", (url) => {
    expect(() => parseArchiveShard({ ...shard, files: [{ ...file, url }] }, index, group)).toThrow();
  });

  it("rejects mixed snapshots, wrong groups, duplicate files and mismatched totals", () => {
    expect(() => parseArchiveShard({ ...shard, snapshot_id: "other" }, index, group)).toThrow(/identity/);
    expect(() => parseArchiveShard({ ...shard, group_id: "other" }, index, group)).toThrow(/identity/);
    expect(() => parseArchiveShard({ ...shard, files: [{ ...file, size_bytes: 101 }] }, index, group)).toThrow(/sizes/);
    expect(() => parseArchiveShard({ ...shard, files: [file, file] }, index, { ...group, file_count: 2, size_bytes: 200 })).toThrow(/duplicated/);
    expect(() => parseArchiveIndex({ ...index, groups: [group, group] })).toThrow(/Duplicate/);
  });
});
