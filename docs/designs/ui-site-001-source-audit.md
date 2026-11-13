# UI-SITE-001 — Source and public-shell evidence

Observed 2026-11-11. This supports the Penpot [design handoff](ui-site-001.md)
for [UI-SITE-001](../../../odin-stack/docs/tasks/UI-SITE-001.md).
Application source is the existing dirty working tree at base commit
`15e659fdd0f5dfb06a2ae0c1e38bc11f1babca50`; it is not established as the
deployed asset revision. No application source was changed for this task.
The [evidence receipt](ui-site-001-source-evidence.json) records source hashes
and bounded public-shell observations. Illustrative Penpot plots are not data
validation results.

## Routes and current page anatomy

| Route family | Source and current content | Design coverage |
| --- | --- | --- |
| `/` | [Home](../../src/components/Home.tsx): satellite image, mission title and introduction; max width 900 px; image heights 200/300/380 px at xs/sm/md | Mission introduction and discovery entry points |
| `/news` | [NewsList](../../src/components/newList.tsx): local Markdown news, dated cards, text and image columns at md; stack at xs | Readable news feed and article content |
| `/documentation` | [Documents](../../src/components/Documents.tsx): nine PDF links, planning XLSX and explanatory tooltip | Document list, format/date and accessible explanations |
| `/data_access` | [DataAccess](../../src/DataAccess.tsx): REST introduction, legacy HTTP endpoints, format links, example query and eight-product table with scientific caveats | Wrapped examples and contained product table; anonymous access guidance |
| `/level1/statistics` and `/:year` | [Level1](../../src/components/Level1.tsx): annual stored L1 scan counts, annual click to monthly L1/L2 comparison | Signed counts, missing values, drilldown and exact inspection |
| `/level1/calendar` | [L1Calendar](../../src/components/L1Calendar.tsx): UTC month, FM/day event, linked map and solar-zenith time plot, selected scan spectra | Discovery through sample inspection/download |
| `/level2/calendar` and `/:year/:month[/:day/:fm]` | [L2Calendar](../../src/components/L2Calendar.tsx): UTC month/event, map selection, product cards; route day/FM segments currently do not initialize selection | Calendar, product selection, vertical profile inspection |
| `/migration-pilot` | [MigrationPilot](../../src/components/MigrationPilot.tsx): status and limited pilot dates, mode, calendar/map/table, scan metadata/spectra, pinned release downloads | Coverage and readiness distinct from whole archive |
| `/migration` | [MigrationArchive](../../src/components/MigrationArchive.tsx): status/counters, archive timeline, date/backend/FM, map/table, direct ID lookup, scan log/spectra/downloads | Stored catalogue coverage distinct from exact scan lookup |
| wildcard | [NotFound](../../src/components/NotFound.tsx): page-not-found message and image | Recovery links are a proposed enhancement |

[App](../../src/App.tsx) provides Home, News and Documents navigation plus a
Datasets menu with Statistics, Level1 Calendar, Level2 Calendar, S3 Migration
Pilot, S3 Archive Migration and Data Access. Header links remain inline at
all widths. [ColorModeProvider](../../src/ColorModeContext.tsx) uses default MUI
light/dark themes and persists `themeMode` in local storage. MUI declares
Roboto with Helvetica/Arial fallbacks. The footer has project information,
Chalmers and Molflow/ESA images and an OSIRIS link.

## Scientific plots and existing interactions

| Component | Current axes and data meaning | Implemented interaction |
| --- | --- | --- |
| [FrequencyTimelinePlot](../../src/components/StackedBarPlot.tsx) and [comparison](../../src/components/StackedBarPlottCompare.tsx) | Categorical Year/Month x; linear signed stored scan-count sums y; positive/negative stacks around zero; L1/L2 comparison side by side | Mouse tooltip includes period, FM, counts, frequency range/species and conditional L2/L1; annual click selects year |
| [L1ScanInfoPlot](../../src/components/L1ScanInfoPlot.tsx) | UTC time x (`HH:mm`); solar zenith angle in degrees y | Hover shows scan ID/raw Quality; click selects linked map/spectra scan |
| [L1BPlots](../../src/components/plots/L1b.tsx) | Frequency Hz x = IFreqGrid + first LO frequency; brightness temperature K y; all spectra | Hover thickens spectrum and shows tangent altitude m/SZA degrees; menu downloads L1b JSON; exact frequency/K tooltip is commented out |
| [OdinTrack](../../src/components/plots/OdinTrack.tsx) | Natural Earth 1 projection; longitude normalized to −180…180; unlabeled geographic graticule; scan start points rather than a connected orbit path | Red points, selected blue; hover enlarges and click selects; focus style exists but circles have no keyboard tab stops/activation |
| [L2Plot](../../src/components/L2Plot.tsx) | Linear VMR ppmv x = raw vmr × 10⁶; altitude m increases upward | Point colors depend on measurement response `>0.8`; no response legend, tooltip or selection |
| [PilotSpectrum](../../src/components/plots/PilotSpectrum.tsx) | Frequency Hz x = IF grid + shared/selected spectrum LO; brightness temperature K y; five numeric ticks per axis | Spectrum dropdown; tangent altitude/SZA/raw quality/version metadata; native channel/Hz/K titles on isolated points |
| [Level2PlotInfo](../../src/components/Leve2PlotInfo.tsx) | UTC time rug plot, no quantitative y axis | Scan-selection marks in reference code; unreferenced by the current application |

None of these components currently implements zoom, pan, brush, reset, user axis
limits or fullscreen. Penpot versions of those controls are proposed behavior.

### Counts and missing data

- Statistics preserve signed stored counts and separate positive/negative stacks.
  A genuine zero uses a short mark. Present SQL NULL uses × and contributes no
  stack height. An absent L1 period maps to zero under the existing response
  contract. Failed/missing L2 requests remain missing with warnings.
- Unsafe integer counts/stack sums are rejected rather than rounded. Loading,
  HTTP/format failures and genuinely empty intervals have separate states.
  L2 comparison supports years 2000–2050 and warns for other years.
- Unknown/unspecified frequency modes retain explicit labels. Mode range strings
  in [definitions](../../src/definitions.ts) have no explicit unit suffix; do not
  silently infer one for those strings.

### Spectra, quality and retrieval diagnostics

- PilotSpectrum joins only valid channel pairs within validated subband bounds.
  Missing/nonfinite pairs create gaps. Unknown or invalid subband bounds use
  separate points. No finite pairs differs from no stored spectra. Do not join
  subbands or gaps for a smoother illustration.
- Raw quality values remain raw; no pass/fail interpretation was established.
  The existing L2 measurement-response `>0.8` color distinction is a visual rule,
  not a newly validated scientific acceptance criterion.
- The generated [L2 Product contract](../../src/odinApi/cloud_client.tsx) exposes
  vmr, meas_resp, temp, pressure, alt, product name and scan ID. It has no
  uncertainty array or explicit project/version field. An uncertainty band,
  pressure-axis switch or complete provenance inspector requires a specified
  data dependency and an honest unavailable state.

### Discovery, releases and downloads

- L1: UTC month → FM/day event → scan collection → map/time-plot selection →
  spectra → JSON. The source stacks at xs, puts map/time plot together at md,
  and calendar/map/time plot in three columns at xl; spectra spans the row.
- L2: UTC month → FM/day event → map point → product profiles → JSON. Calendar
  and map share a row at xl. Product cards use one/two/four columns at xs/md/xl.
  Products whose names start with Temperature are excluded by current source.
- Pilot/archive discovery requires validated, ready status. Pending/failed
  states show counters and actual status without an estimated percentage/ETA.
  Pending status polls every 30 seconds; ready releases remain pinned until
  refresh. Invalid coordinates are omitted from maps with an omission count.
- Archive supports backend and FM selection, previous/next month and exact
  integer scan lookup outside the stored date catalogue. Unsupported spectra
  have a specific message while catalogue/log discovery remains available.
- [MigrationTimeline](../../src/components/MigrationTimeline.tsx) provides annual
  overview, year input 1–9999, monthly drilldown, reload, annual/monthly JSON and
  source links. Release, timeline SHA256 and source-manifest SHA256 stay pinned;
  changes require reload. Downloads preserve source values/metadata with their
  migration or pilot provenance wrapper.

## Source gaps and proposed interaction contract

Legacy L1 error handling often logs errors while retaining old data; some
missing metadata/coordinates are replaced with zero and empty domains may be
nonfinite. L2 errors can appear as empty data or retain old points; product
errors show “No scans selected,” conflating failures, no selection and empty
results. L2 VMR values lack finite/gap filtering. These are source findings,
not corrected application behavior.

Most SVGs lack keyboard mark navigation and touch-specific inspection. Native
titles/ARIA labels do not make individual marks keyboard operable.
PilotSpectrum scales a 1000×400 viewBox, shrinking phone labels. The proposed
design therefore requires:

1. Labeled, readable axes outside the plot clipping region; zoom changes the
   visible domain without changing sample identity or downloaded values.
2. Explicit Inspect, Zoom and Pan modes, visible Reset/domain bounds and
   buttons/keyboard alternatives to gestures. Keep ordinary page scrolling
   until a user engages interaction mode or an expanded chart.
3. Tap to pin inspection, explicit selection and visible dismiss/clear actions.
   Exact values belong in an inspector/table, separate from rounded axis ticks.
4. Inspector identity for scan/backend/FM/release/spectrum/channel where provided,
   units, raw quality, response and honest unavailable uncertainty/provenance.
5. Non-color cues for selection/response/missing data; visible focus and keyboard
   selection; omitted-map-coordinate explanations.
6. One main plot with inspector sheet/table on phones; an expanded plot and
   adjacent/below inspector on tablets; linked views and inspector on workstations.

These requirements document proposed implementation behavior. Penpot prototypes
illustrate state transitions; they do not perform numerical zoom or fetch data.

## Anonymous public-shell checks

Chromium checked `https://odin-smr.org/` on 2026-11-11 with requests to
`/api/`, `/rest_api/` and `/l2/` intercepted/blocked. The static routes issued
zero requests matching those guards. No scientific requests or downloads were
tested. No AWS, database, deployment or application build was needed.

| Screen | Viewport | HTTP | Document width | Observation |
| --- | --- | --- | --- | --- |
| Home phone | 390×844 | 200 | 390 | Brand wraps into two lines; theme button wraps to another header row |
| Home tablet | 834×1112 | 200 | 834 | Inline header; satellite and footer images load |
| Home laptop | 1440×1000 | 200 | 1440 | Datasets menu contains six source-matching entries |
| Home workstation | 1920×1080 | 200 | 1920 | Centered home content; satellite/footer images load |
| Documents phone | 390×844 | 200 | 390 | List and nine PDF/one XLSX titles present |
| News phone | 390×844 | 200 | 390 | Dated news cards present |
| Data Access phone | 390×844 | 200 | 887 | Page-wide overflow; long example URL/table need containment |
| Unknown route phone | 390×844 | 200 | 390 | SPA displays page-not-found content |

Screenshots and the full public-shell report are in the local validation
directory `/tmp/odin-ui-site-001/`; these temporary captures are not Penpot
exports. Root visually inspected the phone home screenshot. The receipt is
retained in this repository. Public shell checks do not establish exact deployed
revision, scientific correctness, responsive scientific views or download
availability. The application remains unchanged by this design task.
