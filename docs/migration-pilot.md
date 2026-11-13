# S3 migration pilot view

`/migration-pilot` is an additive public view for the committed Parquet pilot.
The Datasets menu links to it. Existing L1/L2 routes use their existing clients.

The view starts at **2015-01-11**, mode 1, and selects scan 7013927028 when
present. Actual available dates, frequency modes, scans, readiness and release
identity come from `/rest_api/pilot/v1/status` and its discovery routes. A pending
migration refreshes status every 30 seconds. A failed or unavailable migration
does not enable discovery; dates outside published coverage do not issue data
requests. A successful empty response is displayed separately from HTTP failures.
Pending export/validation shows the API's reported row/file counters and current
table when available. Final table totals appear only after readiness; an empty
in-flight table map is not displayed as a zero-table migration result.

Every data request and anonymous JSON download pins `release_id`. The client
checks `X-Odin-Source: s3-parquet-pilot` and the pinned `X-Odin-Release` header.
It constructs only pilot routes and never falls back to PostgreSQL or follows
legacy URLs returned in a response. Refreshing status selects the current
configured release; old requests are cancelled and cannot replace current data.

The calendar, scan list, map, log and spectra all consume the pilot source.
Scans with missing/invalid start coordinates are omitted from the map with a
visible count; their records remain in the list. Quality flags and versions are
shown as stored. Spectrum frequency is `IFreqGrid[channel] + LOFreq[spectrum]`,
in hertz. Doppler corrections are already applied by the API producer and are
not added again. Brightness is kelvin; tangent altitude is metres. Missing
frequency or brightness values appear as gaps rather than zero or interpolation.
The spectrum also retains explicit subband gaps: `Frequency.SubBandIndex` gives
two rows of **1-based inclusive** channel starts/ends, with `-1` for absent bands.
Lines connect channels only within one complete, valid band definition. If bounds
are absent, overlap, miss channels or are invalid, every finite channel is shown
as a separate point; no frequency-spacing threshold is inferred. Neither the
source arrays nor downloads are changed by this rendering rule.
Downloads retain the original response envelope and scientific metadata, and add
a top-level `Pilot` provenance field with source, release identifier, coverage
label and the pinned URL. The browser exports already validated values; the
separate **Open source JSON** link retrieves the original response anonymously.
The download serializer retains signed zero (`-0.0`), including applied-Doppler
metadata. Other finite numbers retain their JavaScript round-trip representation;
non-finite values use JSON null. This is a JSON response export; archival binary
companions preserve source PostgreSQL floating-point bit patterns independently.

Run `npm run test:pilot`, `npm run build`, and lint the changed files. The isolated
pilot test configuration avoids the repository's Storybook-only test project and
does not call the public API. Fixture checks establish rendering and error
handling; deployed anonymous access and numerical equality require coordinator
verification against the committed pilot and source PostgreSQL results.

The wire regression fixture in `src/odinApi/fixtures/pilot-http-contract.json`
comes from the actual Flask routes using explicitly synthetic scientific inputs.
Calendar and scan-list `Data` are arrays; single-scan Log `Data` is an object with
`Count: null`; L1b `Data` is an object whose `Count` can be null. Tests exercise
these exact envelopes, including preserving all fields during JSON downloads.

For a Chromium fixture journey, run `npm run preview -- --host 127.0.0.1 --port
4173`, then `node tests/migration-pilot.browser.mjs --fixture
http://127.0.0.1:4173`. It intercepts only the pilot data requests using the Flask
wire fixture and separately checks planning/exporting/interrupted/failed states.
After publication, `node tests/migration-pilot.browser.mjs --public
https://odin-smr.org` exercises actual anonymous data without interception. A
pending migration checks disabled discovery; a validated release checks calendar,
scans, Log, spectra, release pinning and both downloads. Browser artifacts are
written under `/tmp/odin-pilot-ui-*.png` and clearly distinguish fixture/public.

Source contract: `odin-api` pilot blueprint and
`odin-stack/docs/tasks/DB-S3-PILOT-001.md`. API/exporter/publication are owned by
their respective repositories and the workspace coordinator.
