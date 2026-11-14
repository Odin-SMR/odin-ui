# UI-FLOW-001 — A guided public science website

Design handoff, 2026-11-14. Ready for implementation. Eight additive editable
boards describe the new-user flow while preserving the existing scientific
browsers, MUI components and light/dark palettes. All eight were exported through
the Penpot tool and visually inspected. No application code was changed by the
designer.

## Native design

- File: **Odin UI**, `110d30a4-9d92-80de-8008-ee405687389b`.
- New page: **UI-FLOW-001 · Guided public science**,
  `dfad651d-5a91-80a8-8008-f223da42b1c3`.
- Last revision observed during creation: **73**. Subsequent automatic saving
  may advance this revision. No permanent named version was created.
- Existing 20 pages were preserved; only the task page was created/edited.
- The connector exposes verified identifiers but no verified workspace URL.
  No workspace links have been invented.

| Board | UUID | Dimensions / theme |
| --- | --- | --- |
| Mission · desktop | `dfad651d-5a91-80a8-8008-f223fc8458ab` | 1440 × 1120, light |
| Mission · phone | `dfad651d-5a91-80a8-8008-f223fe187d0b` | 390 × 1760, light |
| Platform & SMR · desktop | `dfad651d-5a91-80a8-8008-f224223fd56d` | 1440 × 1120, light |
| Platform & SMR · phone | `dfad651d-5a91-80a8-8008-f224245c3f2a` | 390 × 1790, light |
| Use data · desktop | `dfad651d-5a91-80a8-8008-f22445e17e31` | 1440 × 1120, light |
| Use data · phone | `dfad651d-5a91-80a8-8008-f22447737dbf` | 390 × 1550, light |
| Explore observations · desktop | `dfad651d-5a91-80a8-8008-f2246595e38a` | 1440 × 1160, light |
| Explore observations · phone | `dfad651d-5a91-80a8-8008-f2246728fd0e` | 390 × 1530, dark |

These are composition references, not fixed page heights. Actual content flows
with available space and verified scientific copy. Text in the code sample,
references, diagrams and preview areas is structural design content; replace it
with the task's independently checked scientific material. No chart values on
the boards represent observations.

## Navigation and content progression

Four direct primary links replace the broad Datasets menu:

| Label | Route | Purpose |
| --- | --- | --- |
| Mission | `/` | Welcome a new visitor and explain why this record matters |
| Instrument | `/instrument` | Explain platform, SMR and the measurement chain |
| Use data | `/data_access` | Introduce L2, then guide file selection and analysis |
| Explore | `/explore` | Enter graphical L2/L1 browsing and inspect coverage |

Preserve all existing deep routes. Calendar/statistics routes highlight Explore;
Parquet guide/schema/quickstart routes highlight Use data. The logo returns to
Mission. Desktop links use an underline/current-page treatment in addition to
colour. Mobile uses the existing drawer with the same four links in the same
order, followed by Documents and Mission updates. Keep the theme toggle visible.
Migration/pilot routes remain available as secondary technical destinations,
without occupying the newcomer navigation.

Each page ends with a concrete next step, but the navigation allows visitors to
jump directly to their task. Long technical content belongs in disclosures or
separate guides, not in the first viewport.

### Mission

Use a short scientific introduction and a mission illustration. The desktop hero
has text and image in two columns; text precedes image in DOM order. Primary
action: **Explore observations**. Secondary: **Start with Level 2**. Follow with
a short statement that operations have ended and research/reprocessing continues.

Three compact cards explain the next destinations: understand the mission, work
with the data, explore observations. Finish with a small selected-publications
list linking directly to publisher/DOI pages, with author/year/title context.
Detailed reading lists remain on Documents/Instrument. The landing page does
not automatically load the coverage API/chart.

### Platform and instrument

Start with two concise panels: the Odin platform and the SMR instrument. Show a
conceptual signal-flow diagram with readable native text. On desktop the blocks
run horizontally; on a phone they stack vertically with arrows between them.
Keep the caption visible: conceptual flow, with published instrument references
for engineering detail. Scientific content may require separate platform and
receiver diagrams; apply the same responsive treatment to each.

Expose the broad principle immediately, then use details/summary or MUI
Accordion for orbit/observing geometry, bands/modes, and technical references.
The summary text must identify what opens. Finish with **Next: use Level 2 data**.

### Use data

Lead with L2, not a long list of API endpoints. Three short steps introduce
choosing a product/period, reading a bounded sample, then asking a regional or
aggregation question. The first runnable example stays approachable; longer
schema/quality explanations and additional analyses can be disclosed on demand.

Keep the existing catalog, archive index, notebooks and APIs as named next
destinations. Do not remove them or silently change their release semantics.
If examples live on a dedicated quickstart page, the Use data landing page must
link there prominently. Keep a clear way back to visual exploration.

### Explore

Present L2 atmospheric profiles first and L1 calibrated spectra second. Explain
the difference in one sentence per option, with explicit buttons to the existing
calendars. Preview areas can use real bounded observations or labelled conceptual
illustrations; never present the board's synthetic bars as measurements.

Move the existing observation-record chart here. Preserve its real counts,
frequency-mode identity, missing-data distinctions and year-navigation behavior.
An existing ready bounded example can reduce the effort needed to reach the
first graph, provided its date, mode, scan and provenance remain visible.

## Measurements and visual system

- Reading pages use a maximum content width of **1200px** (MUI Container lg).
  The desktop specimens have 120px outer margins at 1440px. At smaller widths use
  **24px** gutters, and **16px** on phones. Scientific workspaces can retain their
  existing larger maximum width.
- Navigation is **64px** high. Desktop section gaps are **48–56px**; phone gaps
  are **32–40px**. Internal gaps are **16–24px**.
- Desktop hero image is approximately **552 × 324px**, text approximately
  **540px** wide, with a flexible gap. The phone image is **358 × 228px** and
  follows the two full-width action buttons. Preserve the illustration's content
  with an appropriate object-fit/crop and an honest caption.
- Desktop three-card rows use **384px** cards and **24px** gaps. Two-card rows
  use **588px** cards and **24px** gaps. Cards stack when their text becomes too
  narrow; use `minmax(0, 1fr)` and avoid fixed heights in application code.
- Existing Roboto: body **16px**, supporting copy **14px**, captions **12px**;
  body line-height **1.65**. Page headings **30px/500**, section headings
  **20–24px/500**. Mission hero can use **40px** desktop and **30px** phone.
- Existing theme palette remains authoritative: light primary `#1976D2`, text
  `#212121`, secondary `#616161`, surface `#FFFFFF`, divider `#D7DCE2`; dark
  primary `#90CAF9`, text `#FFFFFF`, secondary `#BDBDBD`, surface `#121212`,
  divider `#424242`. Use semantic theme tokens in application code.
- Existing panel radius **8px**, control radius **4px**, outlined panels and
  low visual weight. Buttons and icon controls keep a **44px** minimum target.
  Native boards reuse the existing type-family and background tokens. Do not
  replace or redefine the shared token libraries.

## Assets, interaction and accessibility

The mission sketch reuses the site's existing `/images/odin665.jpg` illustration,
imported into Penpot as media `110d30a4-9d92-80de-8008-f223dee76f99`.
The sketch does not establish original copyright/credit; final attribution is
the science-source task's responsibility. Describe it as an illustration in
caption/alt text rather than as a photograph. Preserve the existing footer logos.
New block diagrams should be HTML/CSS or SVG with accessible labels, not raster
screenshots of documents.

The exported boards are static layouts; they do not simulate native navigation,
accordion toggles, focus or asynchronous data. Implement using the existing
React Router/MUI semantics. Maintain one h1, hierarchical headings, skip-to-main,
visible focus, logical reading order and current-page labels. Drawer dismissal
returns focus to the trigger. Disclosures work with Enter/Space and expose
expanded state. External links name their destination and only announce a new
tab when they actually open one.

At 320px and 200% text, allow headings, buttons, cards and diagram labels to wrap.
Never hide content to fit a board height. Code can wrap; long URLs and exact
tables may use contained scrolling, never page-wide overflow. Do not make
scientific metadata available only on hover. Reduced-motion preferences are
already covered by the shared theme.

Static mission/instrument pages have no data-loading state. Explore retains the
existing chart/calendar loading, error/retry, empty and missing-data states. A
failed preview must not prevent opening the calendar. Catalog states must still
distinguish planned/empty/error/published datasets. Keep product/project/version,
units, uncertainty, diagnostic context and unavailable-data notices visible where
they affect scientific interpretation. Loading or missing observations are never
rendered as zero.

## Verification, limits and handoff

All eight boards were exported as PNG through `export_shape` and visually
inspected at their designed dimensions. Text was legible; no clipping or overlap
was observed. PNGs were viewed in the tool session and were not saved as local
repository assets. Phone Explore demonstrates dark-theme treatment; other dark
variants must be checked in the implemented site.

A final file-wide native validation/containment request did not return during a
bounded wait and its waiting cell was terminated. No validation result or named
version is claimed. The preceding completed create/export calls establish the
page/board IDs above. There are no known visual blockers from the exports.

Implementation acceptance: responsive checks at 320/390/768/1440px, both themes,
200% text; keyboard drawer/disclosures/navigation; all four primary destinations
and existing calendar/download routes; real-data and failure-state exploration;
checked Python/DuckDB examples and independently reviewed scientific references.
The coordinator owns application checks, integration and publication decisions.

## Implementation comparison — 2026-11-14

Reviewed refreshed screenshots under `/tmp/odin-ui-flow-001/` (filesystem
timestamps 20:28–20:29): light Mission and Instrument at 1440/390px; light Use
data and Explore at 1440/390px; light quickstart at 390px; dark Mission and
Instrument at 390px. The comparison used the eight previously inspected native
board exports and this specification. No additional Penpot calls were made
after its tab lost its connection.

The implementation retains the intended four-link navigation, newcomer landing
page, text-before-image phone order, L2-first access/browsing, consistent theme,
stacked phone cards, responsive conceptual diagrams and explicit onward actions.
No clipping, overlapping controls or unreadable text was observed in these
captures. Dark text, links and diagram blocks remain clearly distinguishable.

Accepted implementation differences:

- Checked scientific copy and complete article citations replace structural
  sketch text. The three-paper landing list remains concise; Instrument carries
  the longer reading list.
- Use data is a short destination chooser with a prominent quickstart. Runnable
  SQL/Python lives on `/data_access/quickstart`, giving the landing page less
  material to present at once. The quickstart's mobile code wraps inside its
  panel and retains copy/download actions.
- The platform diagram has its own disclosure. The visible instrument diagram
  separates reception/spectrometry from ground calibration/retrieval, producing
  a longer but readable phone layout. This preserves the scientific distinction
  absent from the deliberately abbreviated sketch.
- Explore cards link directly to existing scientific browsers without synthetic
  preview graphs. The existing interactive coverage component occupies the
  chart area, retaining its labels and exact-count controls.
- The established full footer remains in place. Actual content grows naturally
  beyond the reference board heights; no fixed-height clipping was introduced.

One nonblocking spacing observation was sent to the coordinator: the Explore
phone chart reserves approximately 160px of empty space below its controls.
Reducing only the surrounding minimum height could make this page more compact;
this does not affect the correctness or discoverability of the current controls.

These are visual layout checks, not live scientific-data acceptance. The browser
script explicitly uses isolated API fixtures (`fixtureOnly: true`), including
the displayed 2014/2015 counts. Keyboard behavior, 320/768px reflow, 200% text,
error/retry states, full dark-route checks, actual downloads and numerical
example validation remain covered by the coordinator's separate checks and
review record rather than inferred from these screenshots.
