# Parquet access implementation and release onboarding

Implemented for data-stack `PARQUET-ACCESS-002`, 2026-11-13. This is local application/documentation work. It does not publish a scientific release, change a bucket policy or establish sponsorship acceptance.

## Application and asset contract

`DataAccess.tsx` links the catalog-driven Parquet section. `src/parquet/catalog.ts` validates the catalog, and `src/parquet/snippets.ts` produces pinned selections and copyable examples. `public/parquet/catalog.json` is the deployment-owned, static publication catalog. No scientific object is fetched merely by opening the page.

UI-RELEASE-001 activates a bounded, checksummed historical L2/L2I example snapshot and a separate complete metadata index for the three current L2 API projects. The example snapshot is not a new scientific processing version. Existing anonymous CloudFront access works for current object keys; direct S3 remains private. Reuse notes explicitly declare no additional license. The unfinished database migration is excluded.

Public assets owned by this implementation:

- `public/parquet/guide.md`: installation, selection, notebooks, CLI/PyArrow/R/Athena guidance and scientific interpretation.
- `public/parquet/schema-guide.md`: generation-specific row, key, array, time and preservation caveats. This is an overview, not a substitute for each release's dictionary.
- `public/parquet/requirements.txt`: tested calculation dependencies.
- `public/parquet/first-profile.ipynb`, `coverage.ipynb`, `diagnostics.ipynb`: self-contained notebook templates with no embedded observations or fabricated public release.
- `tests/parquet-notebooks.py`: isolated synthetic-fixture notebook validation, including bounded downloader and failure behavior.

The UI provides rendered guide/schema pages; raw Markdown remains downloadable. Notebook links are normal static downloads. No custom Python library or hosted compute service is required.

## Catalog schema version 1

The executable schema in `src/parquet/catalog.ts` is the source of truth. Unknown fields are rejected.

| Object | Required fields and meaning |
| --- | --- |
| Catalog | `schema_version: 1`, `status`, `message`, `releases`; planned requires no releases, published requires at least one |
| Release | `id`, `title`, `published_at` calendar date, `license: {name, url}`, `citation`, `documentation_url`, `datasets` |
| Dataset | `id`, `title`, `level` (L0/L1/L2/L2I), `project`, `product`, `schema_url`, `description`, `columns`, `notes`, `files`; optional `frequency_mode` and `inversion_mode` |
| Column | Physical `name`, `type`, `description`; optional verified `unit`. The `_odin_` prefix is reserved for generated provenance columns |
| File | Permanent `url`, lowercase SHA256, positive `size_bytes`, nonnegative `row_count`, inclusive `observation_start`/`observation_end` dates, or both null when unknown; optional `s3_uri` and `region` supplied together |

Use permanent anonymous HTTPS URLs without embedded credentials, query parameters or fragments. File URLs end in `.parquet`. A dataset's files must share one physical schema and logical processing identity; do not add partitions with incompatible types. Supply only real physical columns in `columns`; fields absent from files remain explicit dataset metadata in the selection. Keep release/schema versions distinct from scientific project/calibration versions. `schema_url` should point to a stable, release-specific dictionary whose version is identifiable from its content/location.

A download selection is `{schema_version, release, dataset, files}`. Its release omits `datasets`, and its dataset omits `files`. It retains exact full-file metadata. Date overlap chooses whole files; generated preview SQL does not apply a row-level date filter. Row-level filtering belongs in analysis with the release's verified time convention. Datasets cannot mix dated and undated files. Undated diagnostics show no date controls and are selected by scan identity; date-filtered helper calls never claim that an unknown range overlaps the requested dates.

The separate archive interface loads `/parquet/archive/index.json`, then only the selected product's snapshot shard. It records keys, byte lengths, partition months, modification timestamps and opaque S3 ETags. It does not claim row counts, measured coverage or full scientific checksums. Regenerate these static shards from complete scoped inventories with `python3 scripts/build-parquet-archive.py INVENTORY_DIR --snapshot SNAPSHOT_ID`; the snapshot receipt pins input and output metadata hashes. Scientific payloads are downloaded only when the user requests them.

Current operational bounds are 100 releases/catalog, 1,000 datasets/release and 10,000 files/dataset. Do not publish a mission-wide object dump into one browser payload. Partition large catalogs into scientifically meaningful dataset selections or extend this versioned interface with sharding before exceeding those bounds. The present interface does not claim to implement a mission-scale catalog service.

## Activate an accepted release

1. Freeze the scientific release scope and immutable object keys. Select only committed, accepted scientific files; exclude migration attempts and operational/restoration material. Preserve previous published baselines.
2. Reconcile every file's size, row count and SHA256. Inspect each physical-schema family and its actual partition fields; verify coverage/gaps, scientific identities, units, fill/failure semantics, quality/uncertainty and L2/L2I joins. Source-writer inspection alone is insufficient.
3. Publish the approved license, citation, release-specific dictionary and provenance under stable locations. Record input/code/auxiliary versions and known provenance limits. Obtain independent scientific/public-access review.
4. Verify anonymous HTTPS/S3 access to the approved files and metadata, including genuine Parquet bytes rather than an HTML fallback, ranges, full-file checksums, browser CORS where required, and the intended public-read/private-write boundary. A successful HTTP 200 alone is insufficient.
5. Populate `public/parquet/catalog.json` with measured metadata and set `status: published`. Check the candidate locally:

   ```sh
   node scripts/validate-parquet-catalog.ts
   # Optional: explicitly performs anonymous bounded network range checks.
   node scripts/validate-parquet-catalog.ts --check-files
   npm run test:unit -- src/parquet src/components/ParquetAccess.test.tsx
   npm run build
   npm run lint
   ```

   Use the repository's pinned Node environment. `--check-files` verifies a 206 range response, declared object length and `PAR1` prefix; it does **not** verify complete checksums, scientific schema, CORS, license or scientific acceptance. Full anonymous download/notebook validation is a separate release acceptance step.
6. Exercise all three notebooks with suitably small accepted selections and actual units. Retain exact selections, expected counts, execution outputs and measured resource use with the release receipt. Test missing/failed cases as well as valid profiles.
7. Review the concrete deployment/publication change under the owner's authorization. Preserve the preceding application/catalog version for rollback. After deployment, repeat anonymous access and browser checks before announcing the release.

AWS Open Data onboarding additionally requires its Registry entry and approved account/service/region arrangement. This UI implementation does not create those resources or grant production publication authority.

## Notebook support boundaries

All notebooks verify complete selected file bytes and SHA256 under a 64 MiB tutorial cap, cache by checksum, disable Hive partition inference and compare physical row totals with the selection. HTTPS redirects are checked before being followed; plaintext/credentialed redirect destinations are refused. They retain exact selection hashes, template version `odin-parquet-notebooks-1`, calculation package versions and actual query parameters in JSON receipts. Download caps are usability settings, not scientific tolerances.

The first-profile template supports scalar lowercase L2 vertical rows and plots the deterministic minimum scan ID. Users explicitly choose `vmr` or `temperature`; optional noise/total uncertainty needs the same documented unit as the chosen variable. It retains NaN gaps, rejects duplicate altitudes within the selected scan and does not operate on averaging kernels. Sorting displayed rows is not a kernel transformation.

The coverage template requires timezone-aware `time` and `lat_1d` documented in degrees north. It verifies scan time/reference-latitude consistency, counts scans separately from vertical rows, reports missing time/latitude and applies explicit UTC date/latitude bounds. It applies no automatic scientific quality filter.

The diagnostics template requires explicitly matching release/project/frequency mode/inversion mode selections. It accepts either one scan row with nested STWs/spectra or multiple scalar STW rows, preserving STW/channel pairing. It reports missing/failure states, rejects ambiguous identity/nesting and deterministically plots the spectrum for the minimum valid STW. It does not reconstruct a frequency axis or imply that stored channel index is frequency.

These templates intentionally stop if the selected physical generation is incompatible. L1 binary-spectrum decoding and older mixed-case L2 schemas need their own documented, validated reader. Do not weaken these checks just to make a different generation run.

## Validation and reproducibility

Tested calculation environment: Python 3.12.11, DuckDB 1.4.4, Matplotlib 3.10.8, NumPy 2.4.2. Isolated validation additionally uses PyArrow 23.0.1, nbformat 5.10.4, nbclient 0.10.4 and ipykernel 6.31.0. Install into a task-owned environment, not a running processing environment:

```sh
python3.12 -m venv /tmp/odin-parquet-notebook-test-env
/tmp/odin-parquet-notebook-test-env/bin/python -m pip install \
  -r public/parquet/requirements.txt \
  pyarrow==23.0.1 nbformat==5.10.4 nbclient==0.10.4 ipykernel==6.31.0
MPLBACKEND=Agg /tmp/odin-parquet-notebook-test-env/bin/python tests/parquet-notebooks.py
```

The test creates its own temporary kernelspec, synthetic Parquet files, selections and checksummed cache; it makes no real dataset requests. Three notebooks execute from start to finish in Jupyter kernels. Extra cases cover STW-row diagnostics in reversed file order, processing failure, invalid object URLs, HTTPS downgrade/credentialed redirects, checksum mismatch, bounded mock download, cache reuse and oversized-response cleanup. The script prints the temporary artifact directory containing execution receipts and figures. Published notebooks retain no test outputs or real observations.

These checks establish template behavior on the stated fixtures, not numerical equivalence, correctness of a scientific quality rule, mission coverage or public availability. A release maintainer must additionally exercise the templates against accepted real release files and review the scientific outputs.

## Scientific source evidence

Known-generation caveats come from `qsmr-system` at `7251517`, `src/qsmr_system/dataset.py` (L2 vertical rows and L2I STW rows), its consumed QSMR `2dc25ba3` retrieval source, and data-stack `docs/designs/l1-athena-alignment.md` (dated physical samples including L2I scan rows). The L1 identity/preservation caveats are recorded in data-stack `docs/designs/l1-parquet.md` and the prior `PARQUET-ACCESS-001` source handoff. These references are evidence navigation, not claims of deployed source identity. No scientific producer files were changed.
