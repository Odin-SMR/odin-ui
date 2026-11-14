# L2 quickstart implementation and evidence

Task: `UI-FLOW-001`, 2026-11-14. Base UI revision: `ed63fc5`.

The route `/data_access/quickstart` uses `src/components/L2Quickstart.tsx`.
It starts with one bounded download, explains row grain and units, then offers
daily counts and regional scan selection. Advanced interpretation, opening a
local file in Python and an illustrative altitude-binned mean are collapsed.
The page reads its SQL directly from `public/parquet/l2-quickstart.py`, so the
download and displayed queries share one source. File discovery links target
`/data_access/files#parquet-access` and `/data_access/files#parquet-archive`.

## Scientific inputs and scope

- Snapshot: `odin-parquet-examples-20261113`, project `ALL-Strat-v3.0.0`,
  product `O3-501GHz-20to50km`, frequency mode 1, inversion mode `stnd`.
- Exact file: [public sample](https://odin-smr.org/parquet/releases/odin-parquet-examples-20261113/files/cffb359348a56bedc32e9164f74a9dfc65b9dbfe8858eb5b9477fd55a051d149.parquet).
- SHA256: `cffb359348a56bedc32e9164f74a9dfc65b9dbfe8858eb5b9477fd55a051d149`;
  2,145,428 bytes; 6,188 altitude rows; 221 distinct scans; 25–26 August 2001.
- Every `quality` value is null in this exact sample. This is displayed near
  the first interpretation step; no quality or measurement-response threshold
  is introduced. Finite-value selection in the mean is computational hygiene,
  not scientific screening.
- The [release dictionary](../public/parquet/releases/odin-parquet-examples-20261113/schema.md)
  supplies field meaning and units, grounded in the 2020-08-12 L2 data document,
  version 1.1, printed pages 3, 7–8. The original processing revision and
  auxiliary-input versions remain unknown, as recorded by the release.
- `lat_1d` is the scan-reference latitude. Regional examples use explicit
  latitude bands (tropics ±23.5°, north ≥60°, south ≤−60°), not a physical polar
  vortex classification. Invalid/nonfinite/null locations are `unknown`.
- The optional mean first averages finite VMR values within each scan and 5 km
  altitude bin in 20–50 km, then gives each contributing scan equal weight.
  It separates UTC day, quality and altitude bin. It is a SQL demonstration,
  not a validated regional mean: it does not account for averaging kernels,
  sampling bias, product-specific screening or uncertainty of the average.
- Identity is fixed in the script and retained in its receipt. This file's
  physical schema does not embed project/product/mode. Do not concatenate
  unrelated projects or files with overlapping scans.
- DuckDB 1.4.4 reads timezone-aware nanosecond timestamps at microsecond
  precision. The page/receipt disclose this; original file bytes are preserved.

## Validation actually performed

Executed with Python 3.12.11 and DuckDB 1.4.4, using the existing isolated
`/tmp/odin-parquet-notebooks-venv` environment:

```sh
mkdir -p /tmp/odin-ui-flow-quickstart
cd /tmp/odin-ui-flow-quickstart
/tmp/odin-parquet-notebooks-venv/bin/python \
  /home/joakim/work/odin-ui/public/parquet/l2-quickstart.py
```

The first execution downloaded the real public file and checked size/SHA256.
The completed execution reused that checked file and ran all three queries;
a minimal-environment missing `pytz` dependency discovered during development
was removed by serializing timestamps with DuckDB's `to_json`, preserving the
single-package install instructions. Receipt and complete query outputs are
`/tmp/odin-ui-flow-quickstart/l2-quickstart-provenance.json`.

Observed results:

| Selection | Scans | Altitude rows |
| --- | ---: | ---: |
| 2001-08-25 UTC | 108 | 3,024 |
| 2001-08-26 UTC | 113 | 3,164 |
| Tropics | 55 | — |
| Northern polar band | 25 | — |
| Southern polar band | 53 | — |
| Midlatitudes | 88 | — |
| Unknown latitude | 0 | — |

All regional counts were independently reproduced in Python from distinct
`scan_id, lat_1d` pairs. Synthetic controls exercised null, NaN, infinity,
out-of-range latitude and exact ±23.5°/±60° boundaries; counts preserved unknown
quality and location. Wrong cache size/hash and an HTTPS-to-HTTP redirect were
rejected. These checks validate tutorial mechanics, not scientific quality.
Receipt: `/tmp/odin-ui-flow-quickstart/validation.json`.

Three component tests passed via
`npx vitest run src/components/L2Quickstart.test.tsx`, covering progressive
disclosure, correct navigation/downloads, on-page/download SQL identity,
region switching and clipboard success/failure. Scoped ESLint passed for both
component files; `git diff --check` passed. Root owns overall build/browser
validation and independent review.

## Sources and limits

- Local catalog and release provenance from UI revision `ed63fc5`.
- [DuckDB Parquet documentation](https://duckdb.org/docs/stable/data/parquet/overview.html)
  checked 2026-11-14; the current stable documentation resolves to 2.0, while
  the example deliberately pins the version actually tested, 1.4.4.
- [DuckDB Python installation](https://duckdb.org/docs/stable/guides/python/install.html)
  checked 2026-11-14. The script needs only Python's standard library and
  DuckDB; no AWS credentials, remote SQL extension or Pandas dependency.
- No scientific files were added to the repository, no backend or released
  dataset was changed, and no site deployment was performed by this worker.

For another dataset, use catalog/selection-driven notebooks and its generation's
dictionary. Do not edit the tutorial's hash or broaden its single-file download
without updating and validating the complete input/identity contract.
