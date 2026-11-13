# Odin Parquet schemas and scientific contracts

This is a reader's checklist and description of known source generations, not a claim that every file uses one schema. The **schema link in the selected dataset** is authoritative for that release. A Parquet physical type alone does not define scientific meaning, units or a safe join.

## Release metadata and physical columns

Keep release ID, processing project, product, frequency/inversion modes and schema version distinct. Partition fields may live in directory names rather than inside files. The examples disable automatic Hive partition inference and retain those identities in `selection.json`; they do not silently add guessed columns or merge schemas.

The selection includes original object URLs, checksums, sizes, row counts and date coverage. Row counts describe physical rows. They cannot be interpreted as observations or scans until the row grain is known. Dates describe declared observation coverage, not object creation/upload times.

## L2 vertical profiles

One newer source generation stores one vertical level per row, with lowercase columns such as:

| Fields | Interpretation to verify for the selected release |
| --- | --- |
| `scan_id` | Scan identity within the full project/product/mode context; not a globally sufficient join key |
| `pressure`, `altitude` | Vertical coordinate, units, convention and ordering |
| `vmr`, `temperature`, `apriori` | Retrieved variable, accompanying temperature, a priori, and their product-specific meaning/units; VMR can be absent for temperature products |
| `error_noise`, `error_total` | Retrieval error definitions, scaling and units; do not assume total error includes every source of uncertainty |
| `meas_response`, `quality` | Measurement response definition and nullable quality status; no universal acceptance threshold follows from these names |
| `avk` | One averaging-kernel matrix row; its column coordinate and representation must be documented |
| `time`, `mjd` | Observation time, scale and conversion convention; retain source time values |
| `latitude`, `longitude`, `lat_1d`, `lon_1d` | Per-level versus scan-reference positions, units and longitude convention |

Older files can use mixed-case names such as `ScanID`, `VMR` and `Time`. Do not treat a simple renaming as proof of equivalent science or processing version. Timestamp storage has differed from some historical catalog declarations; inspect the actual file and published dictionary.

The first-profile notebook supports the lowercase scalar-row layout and uses unit labels from the selection. It sorts altitude for display only. Sorting rows without applying the corresponding permutation to both axes of an averaging kernel changes its interpretation, so the notebook does not reorder or use kernels.

## L2I diagnostics

Two known layouts must remain separate:

- **Scan rows:** one scan row contains a list of STWs and nested lists of fitted spectra. The outer spectrum order corresponds to the STW order.
- **STW rows:** each row contains a scalar STW and one fitted spectrum vector.

Preserve this relationship and the stored channel order. Channel index is not a reconstructed frequency axis. Match release, processing project, frequency mode, inversion mode and scan before associating diagnostics with a profile; follow any extra generation-specific identity requirements.

Null diagnostic fields and `processing_error=true` are explicit missing/failure cases. A list of nulls or an entirely null field is not an array of zeros. The diagnostics notebook reports absent/failed records and rejects mismatched nesting or duplicate identities.

## L1 spectra and retained calibration products

Current database-preservation formats retain some spectra as binary payloads. PostgreSQL arrays may have typed list values plus `_pg_*` preservation companions for dimensions, lower bounds and original binary representations. A `read_parquet` result is not automatically a decoded, frequency-aligned spectrum.

Use the reader and encoding definition supplied for the selected release. The full documented L1 spectrum identity includes `stw`, `backend`, `frontend`, `version`, `intmode`, `soda`, `sourcemode` and `freqmode`. Scan grouping through `calstw` can be nullable. Do not deduplicate on scan ID alone. Backend identity, calibration version and SODA version have separate meanings.

A typed analysis representation, when published, must identify its source generation and decoding provenance. This guide does not supply a universal binary-spectrum decoder or imply that a preservation archive is an analysis-ready release.

## L0 and time

Decoded L0 generations can differ in source identity, numeric representation and decoder behavior. Historical rounded exports and exact database preservation are different products; neither should automatically be called original integer telemetry. A raw-derived generation needs its own provenance.

STW prefix directories are routing keys, often hexadecimal, not calendar dates. Do not convert STW into UTC without the documented clock/reboot mapping. Creation or processing timestamps are not observation timestamps. Retain the original source MJD/STW and state any conversion explicitly.

## What every release dictionary must resolve

A published dictionary must name the row grain, physical and partition fields, complete keys, valid joins, units and conversion factors, vertical/time conventions, matrix/vector dimensions and order, null/fill/nonfinite meanings, failure states, quality recommendations, uncertainty scope, processing/auxiliary provenance and known coverage gaps. Numerical thresholds must come from applicable product guidance, not from a generic tutorial.

These distinctions were traced to the QSMR runtime writer and dated physical-file inspection. They describe known generations; the current release must be checked independently. Read the [analysis guide](guide.md) and the schema/citation links in the selection for the files you actually use.
