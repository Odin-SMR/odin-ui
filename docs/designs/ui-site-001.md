# UI-SITE-001 — Odin UI Penpot site atlas

Design documentation completed 2026-11-11. The connected **Odin UI** file contains
16 focused pages and 42 editable boards covering the site, scientific exploration,
interaction states and responsive requirements. Application implementation is
outside this task; proposed behavior is explicitly marked **PROPOSED** on the
boards.

File UUID: `110d30a4-9d92-80de-8008-ee405687389b`. Final design revision observed: **50**.
Permanent version: **UI-SITE-001 · responsive site documentation · 2026-11-11**,
created **2026-11-11T21:18:57.400Z**. The file opens at **00 · Start & journeys**.
The plugin did not expose a verified workspace URL, so this handoff supplies
actual file/page/board identifiers without constructing an unverified URL.

[Source and runtime audit](ui-site-001-source-audit.md) ·
[Source receipt](ui-site-001-source-evidence.json) ·
[Native Penpot validation](ui-site-001-penpot-validation.json) ·
[Coordination task](../../../odin-stack/docs/tasks/UI-SITE-001.md) ·
[Handoff workflow](../design-handoff.md)

## Evidence and scope

The source baseline is odin-ui `15e659fdd0f5dfb06a2ae0c1e38bc11f1babca50`
plus its existing working-tree changes; the receipt identifies 30 inspected
source files by SHA256. The source audit distinguishes observed code, dated
public static-shell behavior and proposed improvements. The live site's asset
revision is unresolved.

The coordinator observed anonymous static pages at 390, 834, 1440 and 1920px,
with scientific API routes blocked. This does not validate live scientific
queries, numerical equivalence or download availability. No application code,
API contracts, AWS resources or scientific products were changed.

All chart values, scan markers, migration counters and readiness specimens in
the design are **illustrative**. News cards use content placeholders. The
existing Odin satellite image is reused from `/images/odin665.jpg`; surrounding
UI remains editable. Simplified local 110m land topology supplies editable
Natural Earth 1 basemap geometry. No plot is a screenshot of live science data.

Odin operations have ended and reprocessing can continue. Neither the design
nor the example ready states assert final observational dates, whole-mission
archival completeness or a production release's validation status.

## Page and route map

| Page | Source routes/components | Design coverage |
| --- | --- | --- |
| 00 Start & journeys | `App.tsx` | Site atlas, evidence legend, cross-page reading order |
| 01 Tokens & themes | `ColorModeContext.tsx`, `definitions.ts` | MUI light/dark foundation, complete frequency-mode palette, scientific semantics |
| 02 Shared components | MUI controls and plot wrappers | Native reusable controls, inspector, toolbar, loading and axis primitives |
| 03 Responsive shell | `App.tsx` | Compact phone navigation, tablet shell, width/spacing/overflow rules |
| 04 Home & mission | `/`, `Home.tsx` | Source hero and mission context; proposed discovery actions; phone/laptop |
| 05 News & documents | `/news`, `/documentation` | Editorial reflow, nine PDFs, planning XLSX and help |
| 06 Access & recovery | `/data_access`, wildcard | Legacy endpoint context, product caveats, wrapped URLs and 404 recovery |
| 07 Measurement statistics | `/level1/statistics[/year]`, `Level1`, `StackedBarPlot*` | Signed sums, explicit zero/missing, annual-to-monthly drilldown, L1/L2 comparison; phone stays 390px |
| 08 L1 discovery | `/level1/calendar`, `L1Calendar`, `OdinCalendar`, `L1ScanInfoPlot` | Calendar/day-mode agenda → shared scan selection → map/timeline/spectrum; phone/laptop/workstation |
| 09 Scan & spectra | `plots/L1b`, `PilotSpectrum` | Spectral axes, valid-band gaps, exact inspection, horizontal zoom/reset, phone stacking |
| 10 Maps & linked selection | `plots/OdinTrack` | Natural Earth 1, start positions, geographic coordinates, regional zoom state, scan-list alternative |
| 11 L2 discovery | `/level2/calendar[/year/month[/day/fm]]`, `L2Calendar` | Day/FM → scan start → product cards; phone/tablet/laptop |
| 12 Retrieval profiles | `L2ProductPlots`, `L2Card`, `L2Plot` | VMR/altitude axes, response threshold, absent diagnostics, JSON behavior; phone/laptop/dark |
| 13 S3 pilot | `/migration-pilot`, `MigrationPilot` | Limited coverage, release gate, raw quality, scan table/map/spectrum and provenance |
| 14 Archive progress | `/migration`, `MigrationArchive`, `MigrationTimeline` | Pending/ready states, real counters, no invented ETA, direct lookup, pinned frequency timeline |
| 15 States & accessibility | Cross-cutting | Loading/empty/error/missing/invalid/unsupported states; pointer/touch/keyboard contract |

`Leve2PlotInfo.tsx` is an unreferenced source component and is not presented as
an active route. The source L2 day/FM route segments do not currently preselect
an event; reliable selection URLs require implementation.

## Responsive requirements

The representative widths are **390px phone**, **834px tablet**, **1440px
laptop** and **1920px workstation**. Taller boards represent vertically scrollable
pages, not a requirement for an equally tall physical screen.

| Width | Required behavior |
| --- | --- |
| 320–599 | One column, 16px gutters, compact navigation. Day/FM agenda replaces dense calendar interaction. Plot, legend and inspector stack. Scan list/table is an alternative to pointing at small samples. |
| 600–1199 | 24px gutters; filters wrap. Stack calendar and map/list or use two columns only where each panel retains at least 360px. Inspector sits below the plot. |
| 1200–1535 | 24px gutters; two discovery columns and normally two product columns. A side inspector needs at least 320px while the chart retains at least 640px. |
| 1536+ | 32px gutters; up to three discovery panels and four product columns, each at least 360px wide. Keep prose near 70ch and content no wider than 1920px. |

The source MUI breakpoints remain xs 0, sm 600, md 900, lg 1200 and xl 1536.
The bands above express layout requirements; component breakpoints must still
honor the minimum panel sizes.

Controls have proposed minimum 44 × 44px targets. Plot axes/ticks/legends stay
at least 12px: resize changes tick density and plotting area rather than scaling
text down. Long URLs, release IDs and hashes wrap; tables may scroll within a
bounded region. Page scrolling remains available during ordinary inspection.
On phones, map/spectrum/table views retain the date/FM/backend/scan summary.

**320px, intermediate widths and 200% text zoom are implementation acceptance
rules**, not browser-tested outcomes or additional Penpot viewport specimens.
The current app's phone header wraps and the measured Data Access page was
887px wide inside a 390px viewport; compact navigation and overflow containment
are explicitly proposed fixes.

## Scientific axes, selection and introspection

| View | Axis/coordinate contract | Inspection and missing-data contract |
| --- | --- | --- |
| Frequency timeline/statistics | Categorical year/month; signed stored scan-count sum; linear y with visible zero baseline. Positive/negative stacks remain separate. | Real zero is a baseline mark; stored NULL is × and contributes no height. The source's absent-L1-period rule remains distinct. L1 filled/L2 outlined groups and FM text support colour. L2 unavailable remains unavailable; ratios require known L2 and positive L1. |
| Scan timeline | UTC scan start time x; solar zenith angle in degrees y. | Selection shares scan identity with map/spectra. Tooltip/readout retains raw quality; no new pass/fail interpretation. |
| Spectrum | Frequency in Hz x; brightness temperature in K y. Legacy L1 frequency is IFreqGrid + LOFreq[0]. | Missing or nonfinite frequency/brightness pairs remain gaps. Split subbands only with valid boundaries. Pin exposes frequency, brightness, tangent altitude, SZA, raw quality, version/index and exact values in JSON/table. |
| Retrieval profile | VMR in ppmv x (`vmr × 10^6`); altitude in m y, increasing upward. | Source response distinction is strictly >0.8 versus ≤0.8, with filled/open symbols in the proposal. It is not a scientific accept/reject rule. Uncertainty and explicit project/version are unavailable in the current Product response. |
| Map | Natural Earth 1 with geographic graticule; longitude normalized to [−180°, +180°]. Labels describe geographic conventions, not a false Cartesian axis. | Points are scan START positions. No inferred orbital connecting line. Omit invalid/missing coordinates and state the count; never fabricate (0,0). Preserve raw coordinate values alongside formatted N/S/E/W. Regional crop and pin use the same projection transform. |

The internally consistent illustrative selection is scan 123456 at 12:08:24 UTC,
SZA 75.2°, start latitude +30° and longitude −10°. Its spectral pin is
544,300,000,000 Hz / 63.000 K; full and zoomed spectra use the same samples and
gap mask. The zoom window is 544,200,000,000–544,400,000,000 Hz. The profile pin
is 30,000 m / 5.168 ppmv (underlying illustrative value 5.16829726699746) with
response 0.83. These values are design examples, not a scientific baseline.

Inspect mode previews on hover and pins on click/tap/focus. Close pin preserves
the selected scan and returns focus to its invoking control. Zoom/pan require
an explicit mode on touch; +/- and numeric range controls are alternatives to
dragging/pinching. Reset restores full domain. Escape exits/cancels the current
mode. Default spectral zoom changes x only; autoscaling y must be explicit.
Linked-view scale differences must remain visible.

## Native prototypes versus specified behavior

There are **35 native prototype interactions**:

- **11 same-page NavigateTo transitions** demonstrate desktop annual/monthly
  drilldown, phone annual/monthly drilldown in both directions, spectral
  zoom/reset, map zoom/reset and archive pending/ready design previews.
- **24 OpenUrl actions** point to expected-host public routes or the ten
  documentation files. These are navigation links; their presence is not an
  HTTP-availability or scientific-download check.

Continuous brush zoom, pan, hover synchronization, keyboard handling, range
inputs, retry/refresh polling, real selection loading, exact-value tables and
Close pin behavior are **annotated implementation requirements**, not executed
Penpot logic. Their visible controls/state examples are editable. Product
downloads retain the source behavior and documented provenance requirements;
buttons without native actions do not simulate a data request or download.
The archive “Preview ready/pending design” controls are design navigation, not
application controls or processing actions.

## Tokens, components and layers

The local library contains **55 native tokens**, **38 colour assets**,
**5 typography styles** and **13 components**. Core, Light and Dark token sets
use explicit names; bindings appear on shared components and representative
screen/plot fills, text sizes and borders. The validation receipt records the
actual bound-property count for its observed revision.

Typography uses exact Roboto (`gfont-roboto`) with Helvetica/Arial fallback in
implementation. Sizes are 30px page title, 20px section, 16px body, 14px controls
and 12px caption/plot labels. Core spacing is 4/8/12/16/24/32px; source control
radius 4px and proposed panel radius 8px. Focus is a visible 2px ring with gap.
The plot toolbar specimen uses native flex layout; the overall fixed-size
boards specify responsive composition through the four widths and rules above.

Light primary/background/text are #1976d2 / #ffffff / #212121.
Dark primary/background/text are #90caf9 / #121212 / #ffffff.
Frequency-mode tokens preserve all 18 entries from `src/definitions.ts`.
Unknown/unspecified mode is a labelled neutral state and is distinct from
the explicit FM 0 entry.

Layer names follow Shell / Page / Filters / Content; Plot / Axis / Grid /
Series / Selection; Map / Land / Graticule / Scan start; Inspector / Status.
Imported basemap paths are named by role. Units belong to axis/quantity layers,
not only tooltip text. The 13 components map to MUI controls and plot composition:

| Component | UUID |
| --- | --- |
| Odin / Action / Secondary | `dfad651d-5a91-80a8-8008-ee5957a410ad` |
| Odin / Plot / Toolbar | `dfad651d-5a91-80a8-8008-ee59589d9654` |
| Odin / Action / Focus | `dfad651d-5a91-80a8-8008-ee5957b613f0` |
| Odin / Plot / FrequencyLegend | `dfad651d-5a91-80a8-8008-ee5958b43329` |
| Odin / Axis / LinearX | `dfad651d-5a91-80a8-8008-ee5c51292330` |
| Odin / Status / Loading | `dfad651d-5a91-80a8-8008-ee59590ac6f9` |
| Odin / Input / Select | `dfad651d-5a91-80a8-8008-ee5957ec44ee` |
| Odin / Data / Inspector | `dfad651d-5a91-80a8-8008-ee5958e32151` |
| Odin / Action / Disabled | `dfad651d-5a91-80a8-8008-ee5957c4ab2c` |
| Odin / Status / Missing | `dfad651d-5a91-80a8-8008-ee595836b9b0` |
| Odin / Action / Primary | `dfad651d-5a91-80a8-8008-ee59579570e3` |
| Odin / Navigation / DatasetRow | `dfad651d-5a91-80a8-8008-ee5958103235` |
| Odin / Axis / QuantityUnit | `dfad651d-5a91-80a8-8008-ee5c51377b73` |

## Preview and validation evidence

Durable previews, copied by the coordinator from final native exports:

- [Scientific overview](ui-site-001-previews/scientific-overview.png)
- [Phone spectrum](ui-site-001-previews/phone-spectrum.png)
- [Phone retrieval profile](ui-site-001-previews/phone-profile.png)
- [Workstation L1 workspace](ui-site-001-previews/workstation-l1.png)
- [Responsive rules](ui-site-001-previews/responsive-rules.png)
- [Preview dimensions and SHA256 manifest](ui-site-001-previews/manifest.json)

All **42 boards were exported as PNG** at their native dimensions to
`/tmp/odin-ui-site-001/penpot/<board-key>.png`. Seven contact sheets
`contact-1.png` through `contact-7.png` cover all boards. These temporary exports
may be cleaned; the Penpot file, named version and durable preview subset are
the retained design artifacts.

Visual review inspected the seven sheets plus full-size scientific/device
specimens. It corrected sample/pin inconsistencies, spectral gap/zoom
consistency, map projection/selection and footer rows, tick clipping/sizes,
phone monthly width, duplicate tablet kicker, a wrapped note heading and a
clipped desktop dependency note. A Penpot text-run issue required recreating
affected native text shapes; final disk PNGs were regenerated and checked.
The independent reviewer verified corrected saved scientific previews.

Native `File.validate()` returned no errors at revision 50. The coordinator's
validation checks page sizes, token references, internal destinations,
expected external hosts, minimum scientific label sizes and phone hit-area
heights. The final design has at most 373 shapes per page; most pages have
two or three boards, with four small statistics boards to retain phone
drilldown width. Reported text bounds fit their top-level boards.
These structural/visual checks do not establish WCAG conformance, browser
behavior after implementation, numerical equivalence or live downloads.

No application build/test was run for this design/documentation task.
The coordinator owns workspace/documentation checks and integration.

## Dependencies and implementation acceptance

The design documentation is complete. Implementation should consume these
references in a separate scoped change and preserve existing API contracts.

- Implement compact navigation, responsive reflow/overflow containment,
  consistent status states, focus management, touch controls, exact-value
  table inspection and domain handling before claiming that the app matches
  these proposed screens.
- Recheck 320, 390, 600, 834, 900, 1200, 1440, 1536 and 1920px plus 200% text
  zoom in a browser with isolated fixtures; validate keyboard, touch, contrast
  and screen-reader announcements.
- Do not add uncertainty bands, pressure switching, scientific quality rules
  or provenance fields without an explicit data/science contract. The L2
  Product response lacks uncertainty and explicit project/version.
- Keep public discovery and downloads anonymous, original values/precision,
  release/backend/FM/scan/index identity, quality flags and provenance.
  Validate actual API/download behavior separately before publication.
- Preserve bounded pilot scope; expose archive discovery only after the source
  ready/validation gate. Do not infer percentages, ETA, completeness or
  final mission coverage from missing counters.

## Penpot page identifiers

| Page | UUID |
| --- | --- |
| 00 · Start & journeys | `110d30a4-9d92-80de-8008-ee405687389c` |
| 01 · Tokens & themes | `dfad651d-5a91-80a8-8008-ee58fa2131b0` |
| 02 · Shared components | `dfad651d-5a91-80a8-8008-ee58fa4cbf17` |
| 03 · Responsive shell | `dfad651d-5a91-80a8-8008-ee58fa4dfb19` |
| 04 · Home & mission | `dfad651d-5a91-80a8-8008-ee58fa4f56f7` |
| 05 · News & documents | `dfad651d-5a91-80a8-8008-ee58fa512022` |
| 06 · Access & recovery | `dfad651d-5a91-80a8-8008-ee58fa52e8c2` |
| 07 · Measurement statistics | `dfad651d-5a91-80a8-8008-ee58fa54a88d` |
| 08 · L1 discovery | `dfad651d-5a91-80a8-8008-ee58fa561231` |
| 09 · Scan & spectra | `dfad651d-5a91-80a8-8008-ee58fa580390` |
| 10 · Maps & linked selection | `dfad651d-5a91-80a8-8008-ee58fa5a3c55` |
| 11 · L2 discovery | `dfad651d-5a91-80a8-8008-ee58fa61b482` |
| 12 · Retrieval profiles | `dfad651d-5a91-80a8-8008-ee58fa637850` |
| 13 · S3 pilot | `dfad651d-5a91-80a8-8008-ee58fa64aa7b` |
| 14 · Archive progress | `dfad651d-5a91-80a8-8008-ee58fa66710e` |
| 15 · States & accessibility | `dfad651d-5a91-80a8-8008-ee58fa676a11` |

## Penpot board identifiers

| Page | Board | Native dimensions | UUID |
| --- | --- | --- | --- |
| 00 | Start / Site atlas and evidence | 1200 × 1000 | `dfad651d-5a91-80a8-8008-ee591e12f8bb` |
| 01 | Foundations / Tokens and themes | 1200 × 1000 | `dfad651d-5a91-80a8-8008-ee593b4e2e4e` |
| 02 | Library / Shared component specimens | 1200 × 1050 | `dfad651d-5a91-80a8-8008-ee595763ab88` |
| 03 | Phone / Compact shell and navigation | 390 × 844 | `dfad651d-5a91-80a8-8008-ee59c4f4d21e` |
| 03 | Tablet / Two-column workspace shell | 834 × 1112 | `dfad651d-5a91-80a8-8008-ee59c58b02c6` |
| 03 | Responsive / Layout contracts | 1120 × 900 | `dfad651d-5a91-80a8-8008-ee59c6cd34ec` |
| 04 | Laptop / Mission and discovery | 1440 × 1100 | `dfad651d-5a91-80a8-8008-ee59d77b6564` |
| 04 | Phone / Mission and discovery | 390 × 1100 | `dfad651d-5a91-80a8-8008-ee59d7d3a98e` |
| 05 | Laptop / Documentation catalogue | 1200 × 1060 | `dfad651d-5a91-80a8-8008-ee59f63c16c5` |
| 05 | Tablet / News and mission updates | 834 × 1112 | `dfad651d-5a91-80a8-8008-ee59f741443f` |
| 05 | Phone / News reflow | 390 × 844 | `dfad651d-5a91-80a8-8008-ee59f7fc0170` |
| 06 | Laptop / Data access and product caveats | 1200 × 1100 | `dfad651d-5a91-80a8-8008-ee5a13ac1588` |
| 06 | Phone / Product card and wrapped URL | 390 × 1000 | `dfad651d-5a91-80a8-8008-ee5a14ab4195` |
| 06 | Recovery / Unknown route | 800 × 780 | `dfad651d-5a91-80a8-8008-ee5a152a6611` |
| 07 | Laptop / Annual measurement distribution | 1440 × 1120 | `dfad651d-5a91-80a8-8008-ee5a3d569e05` |
| 07 | Phone / Annual chart and year entry | 390 × 1100 | `dfad651d-5a91-80a8-8008-ee5a3f21669b` |
| 07 | State / Monthly L1 and L2 comparison | 1200 × 900 | `dfad651d-5a91-80a8-8008-ee5a4155bc2e` |
| 08 | Workstation / L1 linked observation workspace | 1920 × 1250 | `dfad651d-5a91-80a8-8008-ee5ab216f648` |
| 08 | Laptop / L1 discovery reflow | 1440 × 1100 | `dfad651d-5a91-80a8-8008-ee5ab8798751` |
| 09 | Laptop / Spectrum and pinned data inspection | 1440 × 1120 | `dfad651d-5a91-80a8-8008-ee5afc0b9b7c` |
| 09 | Phone / Spectrum and inspection | 390 × 1310 | `dfad651d-5a91-80a8-8008-ee5afd8ad3f8` |
| 09 | State / Zoomed spectral domain | 1000 × 900 | `dfad651d-5a91-80a8-8008-ee5aff1a581f` |
| 10 | Map / World selection and coordinates | 1200 × 980 | `dfad651d-5a91-80a8-8008-ee5b2f6599e9` |
| 10 | Map / Regional zoom and pinned inspection | 1200 × 980 | `dfad651d-5a91-80a8-8008-ee5b304d782c` |
| 10 | Phone / Map and scan-list alternative | 390 × 1150 | `dfad651d-5a91-80a8-8008-ee5b311fbbd6` |
| 11 | Laptop / Level 2 discovery and products | 1440 × 1120 | `dfad651d-5a91-80a8-8008-ee5b5264a041` |
| 11 | Tablet / L2 stacked discovery | 834 × 1470 | `dfad651d-5a91-80a8-8008-ee5b56591fb7` |
| 11 | Phone / Day-mode list and product entry | 390 × 1250 | `dfad651d-5a91-80a8-8008-ee5b5bd2c945` |
| 12 | Laptop / Retrieval profile and diagnostics | 1440 × 1260 | `dfad651d-5a91-80a8-8008-ee5b9164e473` |
| 12 | Phone / Retrieval profile and readout | 390 × 1370 | `dfad651d-5a91-80a8-8008-ee5b92c79b04` |
| 12 | Dark / Scientific plot contrast specimen | 834 × 1112 | `dfad651d-5a91-80a8-8008-ee5b94b78bc7` |
| 13 | Laptop / Validated S3 pilot exploration | 1440 × 1250 | `dfad651d-5a91-80a8-8008-ee5bb98bd5d4` |
| 13 | Phone / Pilot scope and scan selection | 390 × 1290 | `dfad651d-5a91-80a8-8008-ee5bbade1664` |
| 14 | Laptop / Archive migration status and gates | 1440 × 1180 | `dfad651d-5a91-80a8-8008-ee5be5d92d52` |
| 14 | State / Validated archive and frequency timeline | 1440 × 1330 | `dfad651d-5a91-80a8-8008-ee5be6d23798` |
| 14 | Phone / Truthful archive progress | 390 × 1160 | `dfad651d-5a91-80a8-8008-ee5be9c7b3f1` |
| 15 | States / Scientific data truth and recovery | 1200 × 1240 | `dfad651d-5a91-80a8-8008-ee5c23e3493e` |
| 15 | Interaction / Input modes and scientific contracts | 1200 × 1140 | `dfad651d-5a91-80a8-8008-ee5c24f3223c` |
| 01 | Foundations / Frequency modes and scientific layers | 1200 × 930 | `dfad651d-5a91-80a8-8008-ee5c4ea1f49a` |
| 02 | Library / Editable scientific axis primitives | 920 × 620 | `dfad651d-5a91-80a8-8008-ee5c50c65751` |
| 07 | Phone state / Monthly signed comparison | 390 × 1160 | `dfad651d-5a91-80a8-8008-ee5ed9ec52da` |
| 08 | Phone / L1 day-mode agenda and scan list | 390 × 1250 | `dfad651d-5a91-80a8-8008-ee5edddb8426` |
