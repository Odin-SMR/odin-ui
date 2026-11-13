# Analyze Odin-SMR Parquet data

Use this guide with a published release selected on [Data Access](https://odin-smr.org/data_access#parquet-access). A release marked **planned** has no public files to select yet. The planned AWS Open Data release does not establish a current public bucket, license or complete mission coverage.

## Choose the right data

| Level | Intended use | Read first |
| --- | --- | --- |
| L0 | Decoded instrument and engineering records | Decoder generation, clock/reboot identity, calibration requirements and preservation caveats |
| L1 | Calibrated spectra and supporting measurements | Complete spectrum keys, spectral decoding, frequencies, calibration version and units |
| L2 | Retrieved atmospheric profiles | Product/project, vertical coordinates, retrieval diagnostics and validation guidance |
| L2I | Retrieval and fitted-spectrum diagnostics | Matching L2 identity, row grain, STW/channel alignment and failure states |

Start with L2 for a first atmospheric profile. The [schema guide](schema-guide.md) explains why a single generic reader cannot safely cover every generation.

## Select and retain the exact inputs

1. Choose a release and dataset on Data Access. The dataset identifies its processing project, product and available mode information.
2. Select a short date range. The range chooses **whole files whose declared observation coverage overlaps the dates**; it does not remove other rows from those files. An empty selection means no catalogued files overlap, not necessarily that the mission made no observations.
3. Check the file count, compressed size, row count, schema and release notes. Those totals describe complete files; rows may be vertical levels rather than scans, and the size is not a query-cost estimate.
4. Download the selection JSON and save it as `selection.json` beside your analysis. It contains release, dataset and processing identity, exact HTTPS locations, SHA256 checksums, file sizes and row counts. Preserve it with your results.
5. Read the selected release's license, citation and scientific guidance. Keep the release fixed when reproducing an analysis; changing to another release is a new input choice.

The catalog exposes committed scientific files only. Do not substitute a recursive wildcard over a migration bucket or combine files from different processing projects merely because column names match.

## Quick preview with Python or SQL

Use **Copy Python** or **Copy SQL** for the selected files. Python requires DuckDB; the SQL example runs in DuckDB on your machine. Both query explicit public HTTPS objects without AWS credentials. They select a small set of columns and limit displayed rows.

A `LIMIT` bounds output rows, not download bytes. Column and row-group pruning depend on the files and query. The preview retains the selection metadata but does not calculate a full-file checksum. For verified downloads and a byte limit, use the notebooks below.

[DuckDB's HTTPS reader](https://duckdb.org/docs/stable/core_extensions/httpfs/https.html) uses HTTP range requests for suitable Parquet queries. This capability does not guarantee that every query reads only a small amount.

## Downloadable notebooks

Download a notebook and [requirements.txt](requirements.txt), then save `selection.json` in the same directory. The notebooks are self-contained; no Odin-specific Python package is needed.

```sh
python -m venv .venv
# Linux/macOS:
. .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip install jupyterlab
jupyter lab
```

Python 3.12 and the versions in `requirements.txt` were tested. JupyterLab is an optional interface; the calculation environment is recorded in each generated provenance file. Restart the notebook kernel after installing packages.

| Notebook | Inputs and behavior |
| --- | --- |
| [Your first Odin profile](first-profile.ipynb) | One small L2 selection; plots a scalar vertical profile and measurement response. Set the value column explicitly; optional uncertainty must have matching documented units. |
| [Find observations](coverage.ipynb) | A small L2 selection; filters UTC dates and scan reference latitude, counts scans separately from vertical rows, and reports missing time/location. |
| [Retrieval diagnostics](diagnostics.ipynb) | `selection.json` for L2 plus `diagnostics-selection.json` for matching L2I; checks release/project/modes and STW/spectrum alignment before plotting one fitted spectrum. |

Each notebook downloads complete selected files under a **64 MiB tutorial limit**, verifies SHA256 and declared file size, and reuses a verified local cache. The diagnostic notebook applies the limit to both selections combined. Choose fewer files if the limit is exceeded; increase it only after reviewing the expected download and memory use. This limit is a tutorial setting, not a scientific tolerance or expected mission size.

The notebooks reject unsupported or ambiguous schemas and missing unit definitions. A planned catalog has no scientific sample: do not replace the missing selection with an invented release or tutorial fixture. Notebook validation used explicitly synthetic data and does not establish scientific equivalence or public availability of a real release.

The output includes PNG figures where there are usable observations, the original selection in provenance JSON, and Python/package versions. Check the printed row/missing-value counts. No universal quality or measurement-response threshold is applied. A monthly coverage plot is not a climate trend analysis.

## Other tools

**Command line.** Copy CLI downloads the exact complete files over HTTPS and checks their SHA256 values. It needs `curl`, a POSIX shell and `sha256sum` (available in GNU coreutils; install it or use the notebooks on platforms without it). Run it in a new directory and keep `selection.json` there. Download and verify failure stops the script; inspect incomplete files before retrying.

**PyArrow.** For local verified files, `pyarrow.parquet.read_table(path)` is a useful starting point. For a published S3 URI, use `pyarrow.fs.S3FileSystem(anonymous=True, region=...)` with the region from the selection, then read the bucket/key path. Do not let a default local AWS credential chain silently replace anonymous access. Preserve partition metadata from the selection when reading physical files directly. See [PyArrow S3FileSystem](https://arrow.apache.org/docs/python/generated/pyarrow.fs.S3FileSystem.html).

**R.** The `duckdb` and `DBI` packages can execute the selected DuckDB SQL. Retain `selection.json` and record `sessionInfo()` with the analysis. SQL examples are engine-specific; they are not Athena SQL.

**Athena and other cloud tools.** Use your own AWS account and budget for query compute and result storage. A public S3 object does not automatically expose Odin's Glue catalog. Create your own catalog/table using a release-specific, validated schema and partition definitions, with an appropriate region and private query-results location. Athena table locations refer to directories, not arbitrary selected file lists, so only use a published prefix whose complete contents belong to the intended release. Do not point Athena at migration attempts or mixed schemas. See [Athena table locations](https://docs.aws.amazon.com/athena/latest/ug/tables-location-format.html). Hosting sponsorship does not make users' analysis compute free.

## Scientific interpretation and support

Preserve the complete product/project/mode/scan identity, original time fields, units, missing values and array correspondence. Temperature retrievals must not be interpreted as gas mixing ratios. Noise error and total error are specific retrieval quantities; the selected product documentation defines their scope. Quality flags may be null. A failed retrieval, missing diagnostic and successful zero-valued observation are different cases.

Consult the release-specific dictionary and [Odin scientific documentation](https://odin-smr.org/documentation) before selecting data for research. Record quality criteria and all unit conversions in your notebook. Cite the release, processing project and relevant scientific references; the selection's citation is the starting point.

If an object fails to download or its checksum changes, preserve the selection and error message, stop that analysis and contact the support route in the release documentation. Do not silently skip the file or combine it with a newer release. Catalog or HTTP errors are not evidence of missing scientific observations.
