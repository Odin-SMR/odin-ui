# UI-VISUAL-001 — Visual-first exploration

The observation record, scan maps, spectra and retrieval profiles now lead the
interface. Tables, detailed metadata and numeric axis forms are secondary actions.
This implements the [visual-first Penpot handoff](ui-visual-001.md) while retaining
the scientific contracts from [UI-IMPLEMENT-001](ui-implement-001.md).

## Navigation and information hierarchy

| Flow | Primary interaction | Secondary information |
| --- | --- | --- |
| Home → statistics | Real annual visx timeline → inspect count → monthly URL; browser Back returns to Home | Mission context, exact-count table and manual year entry |
| Level 1 | Day/FM → map or solar geometry → selected spectrum | Calendar collapses after selection; scan list follows plots |
| Level 2 | Day/FM URL → map → selected product profiles | Scan list follows products; source values and diagnostics open from Inspect |
| Archived L1 / pilot | Readiness gate → day/backend/FM → map → spectrum | Ready-state counters, scan lists, direct lookup and provenance are disclosed on demand |
| Documentation / news / access | Existing content navigation and download links | These remain reading-oriented routes; no invented science graphics |

Phones default to the Level 1 map. Map, geometry and spectrum tabs retain the
selected scan. Desktop maps and geometry share a row; spectra follow immediately.
Phone spectrum/profile controls sit below the graph so the controls do not push
the data out of view. Desktop controls remain above the graph. The spectrum
selector stays above its chart. Header download icons retain explicit accessible
labels and tooltip descriptions. Empty, loading, failed and unavailable states
remain visible; unavailable data is never replaced by an illustrative plot.

## Graphs, inspection and zoom

Spectrum and retrieval-profile renderers now use `@visx/scale`, `@visx/axis` and
`@visx/shape` LinePath. Statistics and solar geometry already used visx. Maps use
visx geographic/responsive primitives with the existing Natural Earth projection.
The installed dependency versions and lockfile were not changed by this task.
The visx [axis documentation](https://visx.airbnb.tech/docs/axis) was consulted.

The shared `InspectMenu` provides a tooltip-described button, desktop popover and
phone bottom dialog. Its semantics follow a dialog because it contains forms and
actions. MUI supplies modal focus management, Escape and backdrop dismissal;
see the [Popover documentation](https://mui.com/material-ui/react-popover/).
Hover/focus previews are brief, with persistent click/tap inspection available.
Map and solar-geometry marks retain small visible dots with 44-pixel hit areas.

- Click/tap or keyboard selection pins a spectrum channel or retrieval level.
  Closing its inspector retains the pin; **Clear pin** removes it. Escape on the
  chart clears the pin. Closing returns focus to the invoking plot or control.
- Numeric ranges and explicit spectrum pan/zoom modes are in **Axes & range**.
  Zoom buttons and Reset remain available. Ordinary phone scrolling is preserved
  outside explicit drag modes.
- Map tools expose pan, directional buttons and focus-selected-scan; Reset restores
  the globe. Selected raw coordinates are available in **Inspect scan**.
- Annual and monthly marks open an exact-count inspector. Annual inspection offers
  an explicit monthly action, which updates the route for history and deep links.
- Exact tables and the original anonymous JSON actions remain available. A product
  metadata download remains separate from the original data-only L2 JSON.

Inspection opens on click rather than pointerup, preventing a synthesized touch
click from immediately dismissing tablet popovers. Plot toolbars have stable keys
when they move at the phone breakpoint so open inspection state and invoking
controls can survive the layout change.

## Scientific boundaries

Frequency reference policy is unchanged: legacy L1 uses `IFreqGrid + LOFreq[0]`;
pilot/archive retain the per-spectrum LO policy. Missing/nonfinite pairs and
validated subband boundaries still break spectral lines. Invalid boundaries show
separate points. No interpolation or source resampling was introduced.

Profiles retain raw VMR and the displayed multiplication by 10^6 to ppmv; altitude
is in metres increasing upward. Filled/open/missing-response marks retain the
strict >0.8 diagnostic distinction and visible non-pass/fail caveat. Missing
uncertainty/project/version remains explicit. Statistics preserve signed sums,
true zero and absent values. Maps show scan starts and retain raw coordinates
alongside normalized display longitude. Release gates and backend/release pins
remain unchanged.

## Validation and evidence

Independent review confirmed preserved scientific values and contracts, and
closed two interaction/layout regressions: toolbar focus loss while crossing the
phone breakpoint, and chart controls/captions escaping fixed-height panels at
200% text. Dedicated touch testing caught and rechecked the tablet click-through
issue. Maps and geometry now measure an absolutely positioned SVG inside their
viewport; cards grow with wrapped text. Statistics use a plotting height that
is independent of the natural-flow legend and controls, avoiding resize feedback.

| Check | Final result |
| --- | --- |
| `npm run build` | Passed |
| `npm run lint` | Passed |
| `npm test` | 199 tests in 21 suites passed, including Storybook browser tests |
| `npm run test:ui` | 177 responsive/text-enlargement cases and 11 journeys passed |
| `node tests/ui-visual-flows.mjs` | 14 touch/keyboard flows and 20 map/geometry containment/stability checks passed |
| `python3 scripts/workspace.py check` | 20 roots and 27 agent definitions passed |
| `git diff --check` | Both repositories passed |

The [main browser receipt](ui-visual-001-browser.json) covers ten routes at
320, 390, 600, 834, 1024, 1440 and 1920px in light/dark themes; nine routes at
200% root text at 320/390/834px; and selected spectra/profiles at five widths.
It verifies exact downloads, frequency ticks, scan selection, inspection,
zoom/reset, history, documentation assets, failure and release-gate behavior.
Measured chart content stayed inside its panels. Its **31 source hashes** match
the final checkout.

The [touch/flow receipt](ui-visual-001-touch-browser.json) covers actual touch
input at 390/834px, raw versus normalized coordinates, pan/focus/reset, persistent
spectrum/profile inspectors, keyboard selection and focus return, ready/pending
archive and pilot routes, backend changes, negative zero and download provenance.
Its **25 source hashes** were stable through the run and match the final checkout.
Containment checks include 100%/200% text and repeated size samples to detect
resize feedback. Both browser suites captured no page errors and intercepted all
scientific requests with local fixtures; external requests were blocked.

Root and the designer inspected representative rendered views against revision
64. All seven retained application screenshots use **local fixture data**:

- [Phone Home](ui-visual-001-previews/home-phone.png)
- [Workstation L1 workspace](ui-visual-001-previews/workstation-l1.png)
- [Phone spectrum](ui-visual-001-previews/phone-spectrum.png)
- [Phone retrieval profile](ui-visual-001-previews/phone-profile.png)
- [Phone channel inspector](ui-visual-001-previews/phone-inspector.png)
- [Touch spectrum inspection](ui-visual-001-previews/touch-spectrum-phone.png)
- [Tablet retrieval inspection](ui-visual-001-previews/touch-profile-tablet.png)
- [Preview dimensions and SHA256 manifest](ui-visual-001-previews/manifest.json)

The build retains Buffer externalization and large-chunk advisories. Node/Vite
also emit development notices. Passing checks do not establish a warning-free
console, all-browser/assistive-technology conformance, live scientific download
availability or equivalence to a published scientific release. No live science
queries were used for validation. The pre-existing local Vite server was reused
and remains running for the user.

The task-start checkout was already modified at base `15e659f`. Its source/tests
snapshot is `/tmp/odin-ui-visual-first-baseline`; no reset, stash, branch change or
commit was made. A concurrent `src/DataAccess.tsx` edit was outside this task and
was preserved. Shared hooks, generated clients, scientific value/coordinate helpers and dependency
files were unchanged across 26 checked files. No deployment, cloud mutation, scientific processing or backend
schema change belongs to this task.
