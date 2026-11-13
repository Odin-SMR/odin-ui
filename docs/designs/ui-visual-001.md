# UI-VISUAL-001 — Graphs first, inspection on demand

Design handoff completed **2026-11-12**. Four new focused Penpot pages contain
11 editable boards. Graphs/maps carry the science; tables, long text, range
forms and provenance become secondary disclosures or inspection menus.
The **16 pages / 42 boards from revision 50 are preserved** as historical
documentation.

- File: **Odin UI**, UUID `110d30a4-9d92-80de-8008-ee405687389b`.
- Saved revision: **64**.
- Permanent version: **UI-VISUAL-001 · visual-first exploration · 2026-11-12**, created **2026-11-12T21:23:42.073Z**.
- Scope: new V1–V4 designs, this handoff and `ui-visual-001-penpot*` artifacts.
  No application source, API/schema, production/cloud resources or scientific
  data were changed by the designer.
- Status: design specification and exports complete. Application implementation
  and final browser acceptance are coordinated separately in
  [UI-VISUAL-001](../../../odin-stack/docs/tasks/UI-VISUAL-001.md).

[Native design receipt](ui-visual-001-penpot.json) ·
[Export manifest](ui-visual-001-penpot-previews/manifest.json) ·
[Revision-50 site atlas](ui-site-001.md) ·
[Handoff workflow](../design-handoff.md)

The plugin exposes verified UUIDs but no verified workspace URL. No Penpot
workspace links have been constructed from guesses.

## Visual hierarchy and measurements

| Priority | Default composition |
| --- | --- |
| 1 | Compact page title and selected UTC day / FM / backend where available / scan. A calendar or period chooser opens on demand after selection. |
| 2 | Desktop map and solar-geometry plot, approximately 7/12 and 5/12 columns; selected spectrum immediately below. L2 products are graph cards, without permanent inspector forms. |
| 3 | A compact selected-value readout plus Inspect / zoom / Reset. More opens extended controls and information. |
| 4 | Scan list, exact table, numeric ranges, product metadata, raw flags and source/JSON actions are collapsed or in a persistent inspection menu. |

Desktop specimens use **1440px** with 24px gutters and 24px panel gaps.
The L1 map/geometry panels are **816 / 552px**, 348px high; the full-width
spectrum is **1392 × 380px**. The dedicated spectrum is **1392 × 488px**.
L2 product plots are **684 × 584px**. These are composition references:
real plots must size from their measured container.

Phone specimens use **390px**, 16px gutters and 358px content. After selecting
a day/FM, **Map** is the initial exploration view; Map / Geometry / Spectrum
switch the main panel while retaining selection. Scan list remains an accessible
secondary action. The phone profile keeps a **358 × 492px** plot above its
inspection actions and exact-data disclosure.

The spectrum/profile graph stays ahead of the raw table in reading and focus
order. The public Home/News/Documents/Data Access pages remain appropriate
reading/discovery pages; “graphs first” does not force decorative charts into
those routes.

## Inspection, tooltip and menu contract

Hover or keyboard focus gives a brief **noninteractive preview**, normally
two or three lines. Moving away removes the preview. Exact and extended data
remain available without hover.

Click/tap, Enter or the labelled Inspect control pins the sample and opens a
persistent inspector:

- Desktop: an anchored Popover, approximately **376 × 404px** in the specimen.
  Reposition/clamp it to the viewport; avoid covering the selected sample when
  possible.
- Phone: a bottom sheet, approximately **390 × 412px** in the specimen. Cap its
  height against the actual viewport; its body scrolls internally. Keep values,
  units and the close control available.
- Close, Escape and outside click close the inspector **without clearing the
  pin**. **Clear pin** is a separate explicit action. Return focus to the
  invoking sample/control; if it no longer exists, use the plot's inspection
  control.
- Label the ellipsis for its plot, for example “Spectrum details”; label ×
  “Close inspection”, not “Clear pin”.
- Inspect mode leaves ordinary page scrolling available on touch. Pan/brush
  capture starts only after explicit mode choice. Buttons and numeric ranges
  are alternatives to gestures.

The panel exposes exact source values and units, selection identity and
relevant raw quality/version/index fields. Exact table and JSON actions remain
visible menu choices. Advanced range forms and verbose provenance may be
further disclosures. Do not place buttons inside a transient hover tooltip.

**Native Penpot behavior:** V3 has eight OpenOverlay/CloseOverlay actions:
desktop and phone Inspect controls, 44 × 44px transparent sample hit regions
and More buttons open the appropriate overlay; each × closes it. Native
validation passes. The desktop preview is an illustrated state rather than a
continuous hover simulation. Keyboard/focus handling, Clear pin, real table and
download actions and continuous visx interaction are implementation behavior,
not simulated Penpot logic.

## Scientific interpretation that stays visible

Units, axis direction and reference, selected identity, missing-data summaries,
diagnostic caveats and release readiness/coverage remain outside hover-only
content.

- Spectra: frequency **Hz**, brightness **K**. Missing or nonfinite pairs and
  declared subband boundaries remain gaps. If offset ticks are used, show
  their reference frequency beside the graph. Frequency zoom must not silently
  change the brightness scale. The compact preview's GHz form is equivalent
  display formatting; the persistent inspector retains exact Hz.
- Retrievals: **VMR ppmv** versus **altitude m**, increasing upward. The
  existing **>0.8 / ≤0.8** measurement-response distinction is diagnostic,
  not pass/fail; use filled/open symbols as well as colour. Uncertainty and
  explicit project/version remain unavailable when absent from the response.
- Maps: **Natural Earth 1**, preserved aspect/projection; points are scan
  **START** positions. Invalid coordinates are omitted with a visible count.
  There is no inferred orbital connecting line. Longitude normalization and
  N/S/E/W formatting do not replace exact source coordinate access.
- Statistics: preserve signed stored sums, a labelled zero baseline, a genuine
  zero mark and NULL ×. Missing is not zero. FM identities use text and existing
  colours; L2 ratios require known L2 and positive L1.
- Archive/pilot: show source readiness and coverage before discovery. Pending
  states retain measured counters, without invented percentages, completion,
  history or ETA. Pilot scope remains bounded. Ready timeline/map/spectrum
  examples are explicitly illustrative, not evidence of production readiness.

All depicted data are **illustrative**. The shared example is scan 123456,
12:08:24 UTC, SZA 75.2°, start +30° / −10°. Spectrum selection is
544300000000 Hz / 63 K with a real gap between the drawn example subbands.
The O3 profile pin is 30000 m / 5.16829726699746 ppmv, response 0.83.
The HNO3 specimen uses a separate illustrative ppmv range one thousandth of
the O3 range; it is a layout example, not a claimed retrieval.

## Responsive and shared-system requirements

Use the established Roboto, light/dark semantic palette, spacing and source
frequency-mode tokens. Existing Primary/Focus controls and Plot Toolbar
components are instantiated; new shapes bind **939 existing token properties**.
No revision-50 component or token definitions were replaced.

Layer conventions remain Shell / Page / Selection, Plot / Axis / Grid /
Series, Map / Land / Graticule / Scan start, and Tooltip / Popover / Sheet /
Secondary disclosure. Axes/ticks are native editable shapes and at least 12px.
New pages have **123–209 shapes**, keeping browser work bounded.

Retain MUI breakpoints and minimum panel sizes from the site atlas:

- 320–599px: one column, compact controls, one primary exploration panel;
  plot actions may follow the graph. No table or long identifier widens the page.
- 600–1199px: stack or use two columns only where each retains at least 360px.
  Popovers clamp to the viewport; phone-style sheet behavior may apply where
  necessary.
- 1200–1535px: two discovery/product columns and compact controls.
- 1536px+: graph panels expand within the 1920px content cap; do not grow
  explanatory paragraphs ahead of the science.

The new Penpot specimens directly cover **390 / 1200 / 1440px** and two
overlay dimensions. Tablet/workstation behavior is specified here and in the
preserved atlas; this is not a claim of additional new Penpot viewport boards.
**320px and 200% text zoom are browser acceptance requirements**, not outcomes
established by the fixed-size drawings.

## Application-flow review and source mapping

Source context was inspected from the current dirty working tree at base
`15e659f`, including App/theme, L1/L2 discovery, maps, spectra, profiles,
statistics and migration views. The coordinator retained the task-start
snapshot at `/tmp/odin-ui-visual-first-baseline`. Source continued changing
during implementation; final code/runtime attribution belongs to the
coordinator's integration evidence.

| Flow | Intended visual-first behavior |
| --- | --- |
| Home → News / Documents → Data Access | Preserve current navigation, article context, file types/dates, planning help and anonymous access. Product caveats/format guidance remain readable. No extra scientific query is required. |
| Datasets → L1 day/FM → scan | Before selection, show the chooser. Afterwards collapse it, foreground map and geometry, retain a compact selection summary and bring spectra before the scan table. |
| L1 scan → spectrum → channel | Compact spectrum selector and plot first; inspect by point/keyboard/control, preserve gaps, expose exact source values and metadata/JSON from the menu. |
| Datasets → L2 day/FM → scan → products | Keep date/FM route context and map selection; show product graphs before raw scan rows; inspect retrieval levels without a permanent form under every plot. |
| Statistics → year → monthly / mode | Annual plot remains the entry point; monthly comparison preserves signed/zero/missing semantics. Exact-count table remains a secondary accessible alternative. |
| Pilot / archive status → ready discovery | Essential state/coverage stays visible; detailed table totals/provenance collapse. Timeline/map/spectrum lead after readiness. Direct scan lookup remains available as a secondary path. |
| Unknown / empty / failed / invalid | 404 recovery stays explicit. A successful empty result, failed fetch and invalid value have distinct states; retry never renders zero. Unavailable actions explain why. |

The V4 flow diagram covers these lanes without creating unrelated application
features. Data download, quality and provenance requirements from the
[original source audit](ui-site-001-source-audit.md) remain in force.

## Implementation comparison

The coordinator compared the rendered application with these boards and accepted
three practical adaptations: one collapsed “Change observation” row replaces
separate date/FM buttons; desktop toolbars remain above their plots while phone
spectrum/profile toolbars follow the graph; compact download icons retain explicit
accessible names and tooltips. Source data and actual responses replace every
illustrative design value.

The final [implementation and validation report](ui-visual-001-implementation.md)
links settled application screenshots, local-fixture interaction results and the
responsive acceptance matrix. Native Penpot interactions remain limited to the
eight documented overlay actions; the application supplies continuous chart/map
behavior and real data controls.

## Exports, review and remaining acceptance

Every new board was exported and its **saved PNG inspected at native
dimensions**, including axes, sample/readout consistency, map aspect, phone
layouts and overlay text/controls. Three contact sheets cover all 11 boards:

[Contact 1](ui-visual-001-penpot-previews/contact-1.png) ·
[Contact 2](ui-visual-001-penpot-previews/contact-2.png) ·
[Contact 3](ui-visual-001-penpot-previews/contact-3.png)

The [manifest](ui-visual-001-penpot-previews/manifest.json) records dimensions,
SHA256 and bytes for all 11 native PNGs (829360 bytes total). The native
[receipt](ui-visual-001-penpot.json) records IDs, per-page counts, token bindings,
eight interactions and empty `File.validate()` findings at revision 64.
No scientific axis label is below 12px.

Design artifacts are complete. Application acceptance is recorded in the
coordinator's [implementation report](ui-visual-001-implementation.md), including: day/FM/scan selection,
zoom/pan/reset, tooltip versus persistent menu, keyboard/Escape/focus return,
pin retention and explicit clearing, exact table/anonymous download, failure
states, 320–1920px widths and 200% text zoom. Do not treat a screenshot or a
Penpot prototype as numerical or live-download verification.

No application build/tests were run by the designer, who changed no app code.
The designer's documentation/preview checks and the coordinator's integration
checks are reported separately.

## Page identifiers

| New page | UUID |
| --- | --- |
| V1 · Visual-first discovery | `dfad651d-5a91-80a8-8008-efa8dbd8d365` |
| V2 · Spectra & profiles | `dfad651d-5a91-80a8-8008-efa8dbff0ede` |
| V3 · Inspection menus | `dfad651d-5a91-80a8-8008-efa8dc00d77f` |
| V4 · Flows & archive | `dfad651d-5a91-80a8-8008-efa8dc0157bf` |

## Board identifiers and previews

| Page | Board | Native dimensions | UUID | Export |
| --- | --- | --- | --- | --- |
| V1 | Visual-first / Desktop L1 discovery | 1440 × 1120 | `dfad651d-5a91-80a8-8008-efa9443f8772` | [PNG](ui-visual-001-penpot-previews/workspaceDesktop.png) |
| V1 | Visual-first / Phone focused map | 390 × 880 | `dfad651d-5a91-80a8-8008-efa94712aab3` | [PNG](ui-visual-001-penpot-previews/workspacePhone.png) |
| V2 | Visual-first / Desktop spectrum | 1440 × 960 | `dfad651d-5a91-80a8-8008-efa9add2fdcf` | [PNG](ui-visual-001-penpot-previews/spectrumDesktop.png) |
| V2 | Visual-first / Desktop retrieval product grid | 1440 × 1040 | `dfad651d-5a91-80a8-8008-efa9af9799c3` | [PNG](ui-visual-001-penpot-previews/profilesDesktop.png) |
| V2 | Visual-first / Phone retrieval profile | 390 × 1010 | `dfad651d-5a91-80a8-8008-efa9b51af4dc` | [PNG](ui-visual-001-penpot-previews/profilePhone.png) |
| V3 | Inspection / Desktop preview and pin trigger | 1200 × 860 | `dfad651d-5a91-80a8-8008-efaa26ff121f` | [PNG](ui-visual-001-penpot-previews/inspectDesktop.png) |
| V3 | Inspection / Phone profile and sheet trigger | 390 × 1010 | `dfad651d-5a91-80a8-8008-efaa289c301b` | [PNG](ui-visual-001-penpot-previews/inspectPhone.png) |
| V3 | Overlay / Pinned spectral channel menu | 376 × 404 | `dfad651d-5a91-80a8-8008-efaa2a6f883a` | [PNG](ui-visual-001-penpot-previews/desktopPopover.png) |
| V3 | Overlay / Phone pinned level sheet | 390 × 412 | `dfad651d-5a91-80a8-8008-efaa3f1e0708` | [PNG](ui-visual-001-penpot-previews/phoneSheet.png) |
| V4 | Visual-first / Validated archive workspace | 1440 × 1140 | `dfad651d-5a91-80a8-8008-efaaa05f2e26` | [PNG](ui-visual-001-penpot-previews/archiveDesktop.png) |
| V4 | Flows / Visual-first review and constraints | 1200 × 1160 | `dfad651d-5a91-80a8-8008-efaaabfcd6d1` | [PNG](ui-visual-001-penpot-previews/flowReview.png) |
