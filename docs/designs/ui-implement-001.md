# UI-IMPLEMENT-001 — Penpot implementation

The public interface now follows the [Odin UI Penpot handoff](ui-site-001.md),
file `110d30a4-9d92-80de-8008-ee405687389b`, saved revision 50. Native boards,
properties and exported views were inspected before implementation. No design
sample values were copied into application data.

## Result

- Responsive navigation, a phone drawer, route focus/titles, a skip link,
  persistent theme choice and self-hosted Roboto. Primary colours, typography,
  spacing and outlined panel corners follow the design tokens.
- Mission context and clear Level 1/Level 2 entry points; searchable historical
  news; all nine documentation PDFs and the planning workbook; product guidance
  retaining the original validation caveats and legacy endpoints.
- A UTC day/mode agenda on phones, a calendar/list choice on larger screens,
  month navigation and linked scan selection. Phone scan cards avoid dense
  tables. Maps, geometry and spectra retain the selection when switching views.
- Level 2 day/frequency-mode URLs now select the requested observation. Loading,
  request failure, no selection and an empty result are separate states.
- Natural Earth 1 maps retain scan START positions, show omitted-coordinate
  counts, preserve exact raw coordinates and support keyboard selection,
  explicit zoom, pan, reset and focusing the selected scan.
- Spectrum and profile inspectors offer exact-value tables, keyboard/touch
  selection, pins, numeric ranges and reset controls. Spectrum zoom/pan also
  supports explicit pointer modes. Labels retain at least 12 CSS pixels as
  panels resize; scales change tick density instead of shrinking labels.
  Frequency tick precision follows the zoomed range; narrow panels use explicitly
  labelled Hz offsets and a full absolute reference when needed for readability.
- Statistics preserve signed sums, missing values and genuine zero. Level 2
  comparisons use outlined bars, frequency-mode labels and exact-value tables.
  Selecting another route year resets the comparison.
- Migration release gates, backend/release identifiers, provenance, raw flags
  and existing scientific JSON formats are retained. Migration calendars use
  the same responsive agenda. Downloads with extra product metadata are a
  separate action.

The supported dependency refresh and its constraints are documented in the
[dependency report](ui-implement-001-dependencies.md). Node/npm and CI workflows
are aligned with the lockfile. The default test command now includes source unit
tests and Storybook browser tests.

## Source map

| Area | Main changed paths |
| --- | --- |
| Shell, theme and content | `src/App.tsx`, `src/ColorModeContext.tsx`, `src/DataAccess.tsx`, `src/components/{Home,News,Documents,Footer,NotFound,PageIntro}.tsx`, `index.html` |
| Discovery and selection | `src/components/{L1Calendar,L2Calendar,OdinCalendar,ScanTable,L1ScanInfoPlot}.tsx` |
| Statistics | `src/components/{Level1,StackedBarPlot,MigrationTimeline}.tsx` |
| Scientific plots and downloads | `src/components/{L2Card,L2Plot,L2ProductPlots}.tsx`, `src/components/plots/{L1b,PilotSpectrum,OdinTrack,scientificValues,mapCoordinates,usePlotWidth}.*` |
| Migration integration | `src/components/{MigrationArchive,MigrationPilot}.tsx`; release/backend logic retained |
| Toolchain and evidence | `package.json`, `package-lock.json`, `.nvmrc`, `eslint.config.js`, `vitest.config.ts`, `.storybook/vitest.setup.ts`, three `.github/workflows/` files, focused unit tests, `tests/ui-browser-smoke.mjs`, `README.md`, this implementation report and the dependency report |

The pre-existing files under `src/hooks/` and `src/odinApi/` match the task's
starting snapshot byte for byte. Other pre-existing migration and documentation
work remains in the checkout; no commits, resets, stashes or branch changes were
made.

## Scientific boundaries and implementation decisions

Legacy L1 frequency remains `IFreqGrid + LOFreq[0]`; pilot/archive spectra retain
their per-spectrum LO selection. Validated 1-based inclusive subband bounds
control connectivity. Missing or nonfinite coordinate/value pairs remain gaps;
unusable bounds produce separate points. No interpolation fills missing data.

Retrieval VMR remains `vmr × 10^6` in ppmv, altitude remains in metres increasing
upward, and the response distinction remains strictly `>0.8` versus `≤0.8`.
Open/filled symbols and a missing-response mark supplement colour. Response is
not presented as a scientific acceptance rule. Uncertainty and project/version
are explicitly unavailable where the API omits them.

Temperature products now have download-only cards with a clear plotting limit;
they were previously filtered out. They are never plotted on a ppmv axis. The
original data-only JSON remains available; a separate download adds the product
name and scan identifier.

Calendars open at the design's January 2015 reference month rather than an empty
post-mission current month. This is a browsing default, not a claim about the
latest observation, final mission coverage or archive readiness. Level 2 route
dates override it. Legacy L1 scan lookup remains keyed by day and frequency mode
as supported by the existing API; stored spectrum backend metadata is retained.

The design's explanatory SOURCE/PROPOSED annotations and illustrative values
are design documentation, not product content. Actual content replaces the
news placeholders. Numeric and button controls provide profile zoom; continuous
profile brushing is not added. Native pointer zoom/pan is implemented for the
spectrum and map only in an explicit mode, preserving ordinary page scrolling.
Hover previews stay within their plot; explicit scan selection synchronizes the
map, geometry and spectrum. Exact-value tables provide a keyboard alternative.

## Validation

The production build, lint, Storybook build and **196 tests in 21 suites passed**.
The [source-bound browser receipt](ui-implement-001-browser.json) records
**167 layout/text-enlargement cases and eight interaction journeys**, with no
captured Playwright `pageerror` events. Its 29 source hashes were checked against the final
working tree. Checks used Node 26.13.1, npm 12.2.2 and Playwright Chromium.

| Check | Outcome |
| --- | --- |
| `npm ci` and dependency/lock consistency | Passed; no peer bypasses |
| `npm run build` | Passed |
| `npm run lint` | Passed without errors or warnings |
| `npm test` | 196 passed, including source unit tests and two Storybook browser cases |
| `npm run build-storybook` | Passed |
| `npm run test:ui` | 167 cases and eight journeys passed |
| `git diff --check` in both repositories | Passed |
| `python3 scripts/workspace.py check` in data-stack | Passed: 20 roots and 27 agent definitions |

The browser matrix covers ten routes at 320, 390, 600, 834, 1024, 1440 and
1920px in light/dark themes. Root text was enlarged to 200% on nine routes at
320, 390 and 834px. Selected spectra/profiles also fit with enlarged text.
These CSS text-enlargement checks are not a claim of assistive-technology or
all-browser conformance.

Journeys cover mobile navigation, day/mode and scan selection, exact channel and
level tables, spectrum zoom/reset, 12Hz/20MHz frequency-axis readability at
320/390/834px, linked desktop map selection, original L1/L2 JSON payloads, all
ten local documentation files (HTTP status and PDF/XLSX signatures), keyboard
focus, persisted theme choice, explicit failure states and the archive release
gate. All scientific requests were intercepted. The build retains its large
shared-chunk advisory; dependency audit constraints remain in the dependency
report.

The Vite development console also emitted Buffer-externalization and
ResizeObserver notification diagnostics. These were not collected as Playwright
`pageerror` events. Functional checks and stable SVG sizing passed; the receipt
does not claim a warning-free browser console.

Retained screenshots use **local fixture data**:

- [Phone home](ui-implement-001-previews/home-phone.png)
- [Documents](ui-implement-001-previews/documents-desktop.png)
- [Workstation linked L1 workspace](ui-implement-001-previews/workstation-l1.png)
- [Phone spectrum and exact inspection](ui-implement-001-previews/phone-spectrum.png)
- [Phone retrieval profile](ui-implement-001-previews/phone-profile.png)
- [Dark statistics](ui-implement-001-previews/dark-statistics.png)
- [Screenshot dimensions and checksums](ui-implement-001-previews/manifest.json)

Independent review found and rechecked fixes for zone-less UTC scan timestamps,
invalid-to-valid plot measurement, invalid-channel table access and statistics
route state. Root Chromium checks also caught and corrected intermediate-width
form wrapping, tall sticky scan-table headers on phones and narrow enlarged-text
navigation. Final inspection also corrected the geometry axis-title spacing and
frequency tick precision at narrow zooms; browser checks measure actual tick
bounds, label sizes and the absolute values behind offset ticks. Scientific
baseline files and backend schemas were not changed.

No live scientific API, Athena, AWS or database queries were used for UI testing.
The browser harness intercepts all scientific requests with local fixtures and
rejects external browser requests. It validates the local application behavior;
it does not establish deployed product availability, numerical equivalence to a
published release, assistive-technology conformance or live deployment identity.
Nothing was deployed or published.
