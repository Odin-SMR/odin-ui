import { describe, expect, it } from "vitest";
import fixture from "./fixtures/catalog.json";
import { filterFiles, parseCatalog } from "./catalog";
import { buildSelection, formatBytes, generateCli, generatePython, generateSql } from "./snippets";

const clone = () => structuredClone(fixture);

describe("public Parquet release contract", () => {
  it("accepts a truthful unpublished catalog without fabricating a release", () => {
    expect(parseCatalog({ schema_version: 1, status: "planned", message: "Pending publication", releases: [] }).releases).toHaveLength(0);
  });
  it("requires publication metadata and a nonempty committed file list", () => {
    expect(() => parseCatalog({ ...fixture, releases: [] })).toThrow();
    expect(() => parseCatalog({ ...fixture, status: "planned" })).toThrow();
    const missing = clone(); missing.releases[0].datasets[0].files = [];
    expect(() => parseCatalog(missing)).toThrow();
    const license = clone(); license.releases[0].license.name = "";
    expect(() => parseCatalog(license)).toThrow();
  });
  it.each([
    "http://example.invalid/file.parquet",
    "https://user:password@example.invalid/file.parquet",
    "https://example.invalid/file.parquet?X-Amz-Signature=temporary",
    "https://example.invalid/file.parquet#fragment",
    "javascript:alert(1)",
    "https://example.invalid/index.html",
  ])("rejects nonpermanent or unsafe object URLs: %s", (url) => {
    const input = clone(); input.releases[0].datasets[0].files[0].url = url;
    expect(() => parseCatalog(input)).toThrow();
  });
  it("rejects duplicate identities and file URLs", () => {
    const input = clone(); input.releases[0].datasets[0].files.push(input.releases[0].datasets[0].files[0]);
    expect(() => parseCatalog(input)).toThrow();
    expect(() => parseCatalog({ ...fixture, releases: [fixture.releases[0], fixture.releases[0]] })).toThrow();
  });
  it.each(["2015-02-30", "2015-13-01", "not-a-date"])("rejects invalid coverage: %s", (observation_start) => {
    const input = clone(); input.releases[0].datasets[0].files[0].observation_start = observation_start;
    expect(() => parseCatalog(input)).toThrow();
  });
  it("rejects reversed dates, missing checksums and unsafe numeric precision", () => {
    const input = clone(); input.releases[0].datasets[0].files[0].observation_start = "2020-01-01";
    expect(() => parseCatalog(input)).toThrow();
    input.releases[0].datasets[0].files[0].observation_start = "2015-01-01";
    input.releases[0].datasets[0].files[0].sha256 = "not-a-sha256";
    expect(() => parseCatalog(input)).toThrow();
    input.releases[0].datasets[0].files[0].sha256 = "a".repeat(64);
    input.releases[0].datasets[0].files[0].size_bytes = Number.MAX_SAFE_INTEGER;
    expect(() => parseCatalog(input)).toThrow();
  });
  it("selects inclusive overlapping files and rejects invalid input dates", () => {
    const dataset = parseCatalog(fixture).releases[0].datasets[0];
    expect(filterFiles(dataset, "2015-01-31", "2015-02-01")).toHaveLength(2);
    expect(filterFiles(dataset, "2015-01-15", "2015-01-15")).toEqual([dataset.files[0]]);
    expect(filterFiles(dataset, "2016-01-01")).toEqual([]);
    expect(filterFiles(dataset, "2015-02-31")).toEqual([]);
    expect(filterFiles(dataset, "2015-02-01", "2015-01-01")).toEqual([]);
  });
  it("preserves unknown diagnostic coverage without matching invented dates", () => {
    const source = clone().releases[0].datasets[0];
    const undated = { ...source, files: source.files.map((file) => ({ ...file, observation_start: null, observation_end: null })) };
    const input = { ...fixture, releases: [{ ...fixture.releases[0], datasets: [undated] }] };
    const dataset = parseCatalog(input).releases[0].datasets[0];
    expect(filterFiles(dataset)).toHaveLength(2);
    expect(filterFiles(dataset, "2015-01-01", "2015-01-31")).toEqual([]);
    expect(() => parseCatalog({ ...input, releases: [{ ...input.releases[0], datasets: [{ ...undated, files: [undated.files[0], source.files[1]] }] }] })).toThrow();
    expect(() => parseCatalog({ ...input, releases: [{ ...input.releases[0], datasets: [{ ...undated, files: [{ ...undated.files[0], observation_start: "2015-01-01" }] }] }] })).toThrow();
  });
});

describe("reproducible file selections and examples", () => {
  const release = parseCatalog(fixture).releases[0];
  const dataset = release.datasets[0];
  const selection = buildSelection(release, dataset, [dataset.files[0]]);

  it("retains processing metadata/checksums and only the selected files", () => {
    expect(selection.release.id).toBe(release.id);
    expect(selection.dataset.project).toBe(dataset.project);
    expect(selection.files).toEqual([dataset.files[0]]);
    expect(selection.dataset).not.toHaveProperty("files");
    expect(selection.release).not.toHaveProperty("datasets");
  });
  it("rejects empty, foreign and altered selections", () => {
    expect(() => buildSelection(release, dataset, [])).toThrow();
    expect(() => buildSelection(release, { ...dataset, id: "foreign" }, dataset.files)).toThrow();
    expect(() => buildSelection(release, dataset, [{ ...dataset.files[0], sha256: "c".repeat(64) }])).toThrow();
    expect(() => buildSelection(release, dataset, [dataset.files[0], dataset.files[0]])).toThrow();
  });
  it("preserves release identity without partition inference or unbounded globs", () => {
    const sql = generateSql(selection);
    expect(sql).toContain("hive_partitioning = false");
    expect(sql).toContain("union_by_name = false");
    expect(sql).toContain("'test-release-1' AS _odin_release_id");
    expect(sql).toContain(dataset.files[0].url);
    expect(sql).not.toContain(dataset.files[1].url);
    expect(sql).not.toContain("*.parquet");
    expect(generatePython(selection)).toContain("selection.json");
    expect(generateCli(selection)).toContain(dataset.files[0].sha256);
  });
  it("quotes identifiers and untrusted strings instead of executing them", () => {
    const special = structuredClone(selection);
    special.files[0].url = "https://example.invalid/a'b$(touch injected).parquet";
    special.dataset.columns[0].name = 'scan"name';
    expect(generateSql(special)).toContain('"scan""name"');
    expect(generateSql(special)).toContain("a''b$(touch injected).parquet");
    expect(generateCli(special)).toContain("'https://example.invalid/a'\"'\"'b$(touch injected).parquet'");
  });
  it("labels binary byte units", () => {
    expect(formatBytes(1024)).toBe("1 KiB");
    expect(formatBytes(1536)).toBe("1.5 KiB");
  });
  it("keeps a diagnostic selection beside the profile selection", () => {
    const diagnostic = structuredClone(selection);
    diagnostic.dataset.level = "L2I";
    expect(generatePython(diagnostic)).toContain('Path("diagnostics-selection.json")');
    expect(generateSql(diagnostic)).toContain("Save diagnostics-selection.json");
    expect(generateCli(diagnostic)).toContain("Keep diagnostics-selection.json");
  });
});
