# Local timeline compatibility preparation

This change prepares the existing L1 annual/monthly comparison charts for the
retained statistics contract. The default source remains
`/rest_api/v5/statistics/freqmode/timeline/`, optionally `?year=N`. A separate
archive timeline is locally implemented within the migration view; no publication
or default-source cutover has occurred. The accepted
`dist/assets/index-D7IC5xcE.js` build is preserved; verification builds use a
temporary output directory.

The contract is `Data: {mode: [[period, sum_or_null], ...]}` and `Years`, or
`Months`/`Year`. An observed mode has every requested period; an absent period
contributes zero. A mode absent over the entire interval is omitted. An existing
group with an all-NULL SQL SUM retains NULL. Non-NULL SQL sums may be positive,
negative or a genuine zero. The additive API contract will name the NULL mode
key `"null"`; legacy Flask behavior for mixed NULL/integer keys is unreliable and
may fail before emitting JSON. The local UI can accept `"null"` without claiming
parity with those legacy exceptions.

Charts retain source NULLs and display separate missing markers (×), excluding
them from bar heights. Genuine zero has a horizontal line and zero tooltip;
positive and negative counts stack separately around a visible zero baseline.
Known mode colours, frequency/species descriptions, annual selection and valid
L2/L1 percentages remain. Unknown modes use an explicit unknown description;
`"null"` is labelled **Unspecified frequency mode**. No new numerical tolerances,
count clipping or scientific corrections are introduced.

The schema requires integer values in JavaScript's safe integer range. Native
integer JSON tokens outside that range remain unsafe after ordinary JSON parsing
and are rejected with an explicit unavailable state. Stack endpoints are summed
with BigInt and also checked before plotting; independently safe values that
would produce an unsafe stacked total are unavailable rather than rounded.
Axes/pixel geometry and percentages use the existing number-based visualization
conventions. Actual complete-release aggregate ranges still require independent
post-validation acceptance; fixtures establish behavior, not mission-wide safety.

The hook handles loading, HTTP/transport/format errors, aborts stale requests and
checks returned years. Initial/error states contain no synthetic observation.
Both chart wrappers render these states rather than stale data or zero counts.
Calendar axes must be unique and valid (years 1–9999, months 1–12). Per-mode
pairs must also have unique periods and belong to the declared axes; malformed
responses show a format error without a chart, avoiding silent first-record
selection or hidden observations. Valid sparse pairs and unknown modes remain
accepted, including calendar years outside the mission interval.
Missing supplied L2 values remain missing in the comparison. The isolated
`Level2Stats` hook uses the generated `/api/stats` client for years 2000–2050 and
known comparison modes. Loading contains no observation rows. Each failed or
malformed mode remains NULL across all months with a visible caller warning;
only a successful empty or absent COUNT group supplies zero. Signed stored counts
remain signed. Duplicate groups, invalid months, mismatched modes and unsafe
integer counts reject the affected mode without discarding successful neighbors.
Stale year responses are aborted and discarded. The default L1 source remains PG.

The archive timeline mounts only when the full archive reports a validated ready
release. Requests pin `release_id` and optionally a calendar year 1–9999 to
`/rest_api/migration/v1/statistics/freqmode/timeline/`. All successful responses
require the expected migration source, mission coverage and exact release headers,
plus valid SHA256 timeline and source-manifest headers. Monthly responses must
match both hashes from the annual response. Release/year/hash changes clear stale
results, source links and downloads; there is no PG fallback. Explicit years
before 2001 or beyond the annual overview remain selectable.

JSON downloads preserve the original response, including signed zero and extra
source fields, using the existing exact serializer. A `Migration` field records
source, coverage, release, request URL, `timeline_sha256` and
`source_manifest_sha256`. Source links remain anonymous and release-pinned.

Focused tests use synthetic JSON and SVG fixtures only, including nullable sums,
true zeros, signed domains, NULL/unknown modes, unchanged known descriptions,
unsafe integer wire tokens/stack totals, loading/failures, stale responses and
comparison ratios, duplicate periods and invalid/out-of-axis periods, archive
headers/hash mismatches, downloads, explicit outlier years and partial/all-failed
L2 responses. The checked-in archive fixture contains seven actual Flask envelopes
emitted from the API owner's synthetic 20-table FullRunner/builder/checker fixture,
release `offline-full-release`; its provenance explicitly marks production parity
false. No database, AWS, public endpoint or live Vite proxy is used.

```sh
PATH=/home/joakim/.nvm/versions/node/v24.20.0/bin:$PATH npm exec -- vitest run --config tests/vitest.timeline.config.ts
PATH=/home/joakim/.nvm/versions/node/v24.20.0/bin:$PATH npm run lint
PATH=/home/joakim/.nvm/versions/node/v24.20.0/bin:$PATH npm run build -- --outDir /tmp/odin-ui-timeline-build-20261004
git diff --check
```

With a local SPA static server serving the temporary build, the fixture-only
Chromium runner blocks external requests and intercepts every API request:

```sh
PATH=/home/joakim/.nvm/versions/node/v24.20.0/bin:$PATH node tests/migration-timeline.browser.mjs http://127.0.0.1:18187
```

Its parent archive-status/catalogue responses are synthetic discovery fixtures;
the seven timeline bodies/headers are the actual synthetic Flask envelopes above.
It checks pending readiness, migration-only release pins, real responsive signed
and NULL geometry, explicit outlier years and anonymous exact JSON source/download.
Evidence is written to `/tmp/odin-migration-timeline-browser-result.json`,
`/tmp/odin-migration-timeline-fixture.png` and
`/tmp/odin-migration-timeline-fixture-download.json`. These files are local fixture
evidence, not public availability or accepted whole-record parity.

Remaining work: actual full-release/derived source reconciliation, aggregate range
checks, deployed browser/download acceptance and independent review before
publication or default-source cutover. Local fixtures make no live parity claim.
