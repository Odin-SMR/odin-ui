import { datasetSchema, releaseSchema, type Dataset, type ParquetFile, type Release } from "./catalog.ts";

export interface Selection {
  schema_version: 1;
  release: Omit<Release, "datasets">;
  dataset: Omit<Dataset, "files">;
  files: ParquetFile[];
}

export const selectionFilename = (selection: Selection): string =>
  selection.dataset.level === "L2I" ? "diagnostics-selection.json" : "selection.json";

/** Resolve only complete, unchanged entries from the selected committed dataset. */
export function buildSelection(release: Release, dataset: Dataset, files: ParquetFile[]): Selection {
  const validatedRelease = releaseSchema.parse(release);
  const validatedDataset = datasetSchema.parse(dataset);
  if (!validatedRelease.datasets.some((entry) => JSON.stringify(entry) === JSON.stringify(validatedDataset))) throw new Error("Dataset is not part of this release.");
  if (!files.length || new Set(files.map((file) => file.url)).size !== files.length) throw new Error("Select at least one distinct file.");
  const originals = new Map(validatedDataset.files.map((file) => [file.url, file]));
  const selected = files.map((file) => {
    const original = originals.get(file.url);
    if (!original || JSON.stringify(original) !== JSON.stringify(file)) throw new Error("File metadata does not match the committed dataset.");
    return original;
  });
  const { datasets: _datasets, ...releaseMetadata } = validatedRelease;
  const { files: _files, ...datasetMetadata } = validatedDataset;
  void _datasets; void _files;
  return { schema_version: 1, release: releaseMetadata, dataset: datasetMetadata, files: selected };
}

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;
const sqlIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;
const shellString = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

export function generateSql(selection: Selection): string {
  const columns = selection.dataset.columns.slice(0, 6).map((column) => sqlIdentifier(column.name));
  return `-- DuckDB: run locally. These are explicit files from one release/dataset.
-- Dates select whole files; this preview does not filter individual observations.
-- LIMIT bounds the output, not a guaranteed network-transfer budget.
INSTALL httpfs;
LOAD httpfs;
SELECT ${sqlString(selection.release.id)} AS _odin_release_id,
       ${sqlString(selection.dataset.id)} AS _odin_dataset_id,
       ${columns.join(", ")}
FROM read_parquet([
  ${selection.files.map((file) => sqlString(file.url)).join(",\n  ")}
], hive_partitioning = false, union_by_name = false)
LIMIT 20;
-- Save ${selectionFilename(selection)} with your results for processing identity and checksums.
`;
}

export function generatePython(selection: Selection): string {
  // Nested JSON encodes a Python string literal without interpolating executable code.
  const literal = JSON.stringify(JSON.stringify(selection));
  const query = generateSql(selection).split("LOAD httpfs;\n")[1].split("\n-- Save")[0];
  return `# Install the tested environment from /parquet/requirements.txt.
# This preview uses anonymous HTTPS and needs no AWS account.
import json
from pathlib import Path
import duckdb

selection = json.loads(${literal})
Path(${JSON.stringify(selectionFilename(selection))}).write_text(json.dumps(selection, indent=2) + "\\n", encoding="utf-8")
con = duckdb.connect()
con.execute("INSTALL httpfs")
con.execute("LOAD httpfs")
# Selects whole files. LIMIT does not cap download bytes.
# For full-file SHA256 verification and a byte cap, use the downloadable notebooks.
result = con.execute(${JSON.stringify(query)})
print([column[0] for column in result.description])
for row in result.fetchall():
    print(row)
con.close()
`;
}

export function generateCli(selection: Selection): string {
  return `# Anonymous HTTPS download of the selected complete files.
# Run in a new directory. Keep ${selectionFilename(selection)} beside these downloads.
# Each output is verified with its manifest SHA256; processing stops on failure.
set -eu
${selection.files.map((file, index) => {
    const filename = `part-${String(index + 1).padStart(4, "0")}.parquet`;
    return `test ! -e ${shellString(filename)}\ncurl --fail --location --proto '=https' --proto-redir '=https' --output ${shellString(filename)} ${shellString(file.url)}\nprintf '%s\\n' ${shellString(`${file.sha256}  ${filename}`)} | sha256sum --check -`;
  }).join("\n")}
`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB", "PiB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length);
  return `${(bytes / 1024 ** exponent).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${units[exponent - 1]}`;
}
