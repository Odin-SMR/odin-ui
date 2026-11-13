# Penpot design and implementation handoff

`ui_designer` creates editable sketches and visual specifications in Penpot.
`ui` implements the referenced designs in React and verifies the result. The
coordinator assigns scope and passes the completed design package between them;
neither specialist launches the other or edits the shared task ledger.

Use this workflow for design-led tasks. Small fixes can go directly to `ui`.

## Designer workflow

1. Read the brief and inspect the existing routes, MUI components, light/dark
   themes, scientific plots and available Penpot libraries. Record the screens,
   user journeys, constraints and questions that affect implementation.
2. Use the Penpot MCP tools. Read `high_level_overview` once before other Penpot
   tools and fetch the API documentation needed for the operation. Inspect the
   connected file and verify the assigned page/board before editing. If access
   or the target is missing, report the required connection/identifier and
   continue work that does not depend on it.
3. Sketch within assigned pages/boards. Use semantic names, editable components
   and appropriate flex/grid layouts. Reuse established assets and styles;
   record any proposed changes. Preserve other designers' boards and libraries.
4. Cover the requested viewport sizes, responsive rules, relevant light/dark
   variants, interactions and data states. Include loading, empty, invalid,
   missing-data and error states where the screen needs them. Document focus,
   keyboard order, contrast and cues that work without colour alone.
5. Export and visually inspect each relevant board at its intended dimensions.
   Check hierarchy, legibility, clipping, overlap and unavailable fonts/assets.
   Fix issues within scope and record anything not inspected.
6. Write the handoff below in the coordinator-assigned document, normally
   `docs/designs/<task-id>.md`. Return its path and Penpot identifiers to the
   coordinator. Use actual references; an unavailable connection means the
   Penpot work remains incomplete.

Preserve scientific units, coordinates, precision, quality flags, uncertainty,
provenance and scan/product identity. Visually distinguish zero from absent or
invalid data. Label example data as illustrative and keep published-product
discovery/downloads available anonymously. Record new backend/data needs as
dependencies rather than assuming they exist.

## Handoff template

- Task, objective, scope and design status (draft or ready for implementation):
- Penpot file URL/ID, page URL/ID, board URLs/IDs and names:
- Design revision/version if available, observation date, and changed boards:
- Screens/user journeys and mapping to existing routes/components:
- Board dimensions, supported viewport sizes and responsive rules:
- Theme variants and component variants/states:
- Typography, colours, spacing, dimensions, grid, borders and token references:
- Icons/images/fonts, asset export paths or references and intended formats:
- Navigation, hover/focus/selection/disabled states, validation and transitions:
- Loading, empty, error and missing/invalid-data behaviour:
- Accessibility and scientific-data display requirements:
- Exported previews, visual checks actually performed and limitations:
- Open decisions, API/data dependencies and acceptance criteria:

## Implementer workflow

Read the handoff and inspect its Penpot boards, properties and assets. Follow the
referenced revision for layout, typography, colours, spacing, component states and
responsive behaviour. Reuse repository components where they fit. Resolve missing
specifications or conflicts with existing API/scientific contracts through the
coordinator; record decisions and material deviations in the handoff.

Compare rendered UI with the referenced boards at the specified viewports and
themes, including applicable interaction and data states. Record screenshots or
other visual evidence, accessibility observations and remaining differences.
Use isolated fixtures where available and run the source checks appropriate to
the changed code. The designer can review visual differences when assigned;
the coordinator owns acceptance and any publication authorization.
