# Odin-SMR historical Parquet examples

Snapshot `odin-parquet-examples-20261113`, published 2026-11-13, provides small
byte-identical copies of existing `ALL-Strat-v3.0.0` frequency-mode-1 products.
It is an access snapshot, not a new retrieval or calibration version.

The [ozone selection](selection.json) contains 6,188 vertical rows in 221 scans,
observed 25–26 August 2001. The [diagnostics selection](diagnostics-selection.json)
contains 1,184 scan rows: 221 successful retrievals matching the ozone selection
and 963 failed retrievals. Failed rows, missing values and original precision
are preserved. No scientific quality filter has been applied.

Save both selection files into the working directory of the downloadable
[notebooks](../../guide.md). The first-profile and coverage notebooks use
`selection.json`; diagnostics also uses `diagnostics-selection.json`. The two
files total 17,012,136 bytes, below the notebooks' 64 MiB tutorial limit. Each
download is checked against its full SHA256 and row count before analysis.

The diagnostic file has no UTC timestamp column. Its coverage dates are null;
select and join it by project, frequency mode and scan ID. Do not assign dates
to failed retrievals by guessing from satellite-time words. The example scan
257532932 has a paired valid fitted spectrum.

For the wider record, use the archive file index on the Data Access page. It
lists 52,277 files across the three projects used by the current L2 API:
`ALL-Strat-v3.0.0`, `ALL-Meso-v3.0.0` and `meso21`. Its year/month fields are
partition labels, not measured observation bounds. The index excludes legacy
and test projects, backups, and the unfinished PostgreSQL migration. It does
not certify archive completeness, scientific quality or checksums for all files.

## Provenance and interpretation

The [provenance receipt](provenance.json) records exact source bucket keys,
SHA256, sizes, physical schemas, row counts and scan matching. The source objects
are unversioned. These small copies use content-addressed object names and must
never be overwritten with different bytes. Scientific data are not stored in
the UI Git repository; the catalog and provenance receipt are versioned there.

Exact historical producer commits, toolchains and auxiliary-data versions are
not embedded in the original files and have not been reconstructed. No claim
of complete processing reproducibility is made from this access snapshot.

Read the [physical schema and units](schema.md), [reuse notes](access-terms.md),
and the [Odin Level 2 data documentation](https://odin-smr.org/documents/L2_DATA.pdf)
before scientific interpretation. Preserve the product identity, snapshot ID,
selection JSON, file SHA256 values and analysis parameters with derived work.

The copied files are served over anonymous HTTPS. Their backing S3 bucket
remains private; use the catalog's HTTPS URLs rather than unsigned S3 requests.
