# Full PostgreSQL archive view

The additive `/migration` route and **Datasets → S3 Archive Migration** menu use
only `/rest_api/migration/v1`. `/migration-pilot` continues using its separate,
published pilot client. Existing PostgreSQL and L2 routes are unchanged.

The frozen producer is `../odin-api/src/odinapi/migration/app.py` and its contract
is `../odin-api/docs/parquet-migration.md`, based on API `737f250` plus the accepted
pilot/full reader changes. Full status uses `odin.pg-parquet-full/v1`, source
`s3-parquet-migration`, bounded catalogue dates/backends/frequency modes/versions,
and table rows/validation/bounds. It has no mission-sized date or scan-ID list.

The page shows export/validation row and section counters, committed files and
source/Parquet byte counts, current table/section and update time when supplied.
It polls pending status every 30 seconds and supports manual refresh. Missing
totals remain pending; no percentage or completion time is inferred. Discovery,
direct scan lookup and downloads remain disabled until a validated ready release
is received. Failed, interrupted, capped and unavailable states remain distinct
from empty scientific data.

`waiting_for_source` is a safe pause while export or validation waits for possible
writing sessions to settle. Its optional `waiting_phase`, `waiting_writer_count`
and `writer_wait_seconds` fields show the suspended phase and elapsed wait.
Zero possible writers still means confirming a quiet source before resuming;
historical waiting fields are ignored once status returns to exporting/validating.
Discovery remains disabled throughout the wait. This UI does not inspect or
expose source session/query text.

Calendar requests cover at most one month, clipped to stored catalogue bounds.
Backend and mode selections are explicit because different backends can share a
mode. NULL backend/mode rows retain stored counts, appear honestly in the calendar,
and do not create invalid lookup routes. Empty covered dates are ordinary absence;
HTTP404/503/409 and storage failures remain explicit errors. The direct scan-ID
form can request an identifier independently of catalogue date bounds. All science
requests pin the release and backend; successful replies must echo the expected
source, release and `mission` coverage headers. There is no PostgreSQL/pilot
fallback or use of server-supplied legacy URLs.

Stored `measurements_cache.nscans` is a nullable signed smallint. Calendar counts
retain integers exactly, including negative stored counts; NULL is shown as
**Missing**, never as zero. A missing or signed count does not hide valid neighboring
catalogue records or block their scan lookups.
Calendar event titles wrap within each day so stored counts and missing labels
remain visible at the narrow month-view width.

Fixed-width source backend columns can emit `FB ` while scan records use `FB`.
Selection, option deduplication, backend comparisons and request URLs remove only
trailing ASCII spaces. Calendar response fields and downloaded values retain the
stored padding exactly; no scientific data or broader whitespace is normalized.

All archived versions are listed. The API reconstructs spectra for AC1 and AC2
with the existing version8 algorithm; AOS/FB catalogue and log discovery remains
available without making unsupported spectrum requests. Other products and
database consumers still require separate compatibility acceptance.

The existing reviewed spectrum component retains K/Hz/metres, quality/version
fields, per-spectrum LO frequencies, inclusive source SubBandIndex boundaries and
missing-data gaps. No numerical corrections or new interpolation are introduced.
Downloads retain the entire API envelope, source arrays and negative-zero values
using the accepted explicit serializer, adding a top-level `Migration` provenance
field with source/release/mission coverage/pinned URL. The anonymous **Open source
JSON** link provides the original API envelope without added metadata.

`src/odinApi/fixtures/migration-http-contract.json` contains 14 actual Flask-emitted
HTTP responses generated locally with synthetic Parquet, accepted API test fixtures,
and Python3.13; it contains no database or AWS data. It covers early/2015/late
catalogues, alternate AC backend, AOS logs and the full scientific spectrum. Its
producer directory for this run was `/tmp/odin-full-ui-contract-eez_fac_`.
The mixed-count regression was emitted by Flask over a synthetic nullable int16
`nscans` column at `/tmp/odin-full-ui-count-contract-2r5i_7dw`; its month retains
the three stored counts `[491, null, -7]`.
Fixture imports use raw JSON text to preserve the emitted `-0.0` numbers.

`migration-fb-http-contract.json` adds four actual Flask responses over synthetic
character(3) measurement/varchar(3) scan fields. Its coverage preserves both `FB `
and `FB`, catalogue Backend remains `FB `, and its pinned URLs use canonical `FB`.
The producer app SHA256 is recorded in its provenance. The browser regression
checks unique catalogue/direct backend options, padded event selection, cached FB
scan/log discovery, exact log download fields and absence of FB spectrum requests.

```sh
PATH=/home/joakim/.nvm/versions/node/v24.20.0/bin:$PATH npm run test:migration
PATH=/home/joakim/.nvm/versions/node/v24.20.0/bin:$PATH npm run test:pilot
PATH=/home/joakim/.nvm/versions/node/v24.20.0/bin:$PATH npm run lint
PATH=/home/joakim/.nvm/versions/node/v24.20.0/bin:$PATH npm run build
# Serve the built UI on port4173, then run fully intercepted, local science fixtures.
/home/joakim/.nvm/versions/node/v24.20.0/bin/node tests/migration.browser.mjs --fixture
```

The browser runner also accepts `--public https://odin-smr.org`; pending public
releases are checked without scientific queries. Public complete-release parity,
mission-scale response times and anonymous download checks remain dependent on
independent validation and publication. Local fixture checks do not establish
mission completeness or authorize PostgreSQL shutdown. Coordinator owns review,
AWS publication, monitoring and retirement decisions.
