# Physical schema: historical frequency-mode-1 example files

The exact Arrow types are listed in the catalog and
[provenance receipt](provenance.json). This dictionary applies to these two
checksummed files, not every historical Odin Parquet generation.

## Ozone vertical rows

One row is one retrieved altitude level. Join profiles by `scan_id` together
with project, frequency mode and product metadata from the selection. Do not
infer these partition values from a file reader's directory parsing.

| Fields | Units / interpretation |
| --- | --- |
| `scan_id` | Stored integer identifier; repeated over vertical levels |
| `time` | UTC timestamp, nanosecond storage precision; preserve the supplied value |
| `mjd` | Stored Modified Julian Date; preserve the original representation |
| `vmr`, `apriori` | Ozone volume mixing ratio, mol/mol; multiply by 1e6 only for ppmv display |
| `error_noise`, `error_total` | Source standard errors in the same mol/mol units; retain unavailable/invalid values |
| `altitude` | Metres; stored grid spacing is not retrieval vertical resolution |
| `pressure` | Pa |
| `temperature` | K |
| `lat_1d`, `latitude` | Degrees north; scan reference versus level-dependent location |
| `lon_1d`, `longitude` | Degrees east; scan reference versus level-dependent location |
| `quality` | Original integer quality flag; no automatic threshold is prescribed here |
| `meas_response` | Source measurement response; not an uncertainty |
| `avk` | Original averaging-kernel row; preserve kernel/profile axis correspondence |

Units are supported by the 2020-08-12 version 1.1
[L2_DATA.pdf](https://odin-smr.org/documents/L2_DATA.pdf), printed pages 3 and 7,
section 2.4.1. That document explains the scientific fields; it does not
establish the exact software build that wrote these newer Parquet files.

## Retrieval diagnostics

Each row is a scan, with nested arrays. `stw` orders the associated fitted
spectra, `fit_spectrum` is in K, and `channels_id` retains the original channel
identifiers. A channel index is not a calibrated frequency axis.

`freq_offset` and `lo_freq` are in Hz; `point_offset` is in degrees and
`residual` in K (L2_DATA.pdf, printed page 8, section 2.4.2). Other fields
`bline_offset`, `min_lm_factor` and `sb_path` are retained exactly; do not infer
unverified units from their names. `inv_mode` is `stnd` for valid rows and can
be null for failures. `comments` preserves original retrieval comments.

`processing_error=true` identifies failed retrievals. There are 963 failed
rows and 221 successful rows. Null spectra and missing timestamps remain
missing; never turn them into zero measurements or successful retrievals.
There is no physical UTC/MJD column in this file and no verified all-row date
range. The catalog therefore stores both coverage bounds as null.

The diagnostics notebook matches the 221 ozone scans by explicit project,
frequency mode, inversion mode and scan ID. It preserves the nested STW/channel
ordering and reports failure/missing-data states separately.
