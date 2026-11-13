# odin-ui: agent guide

Reviewed 2026-10-03: `15e659f` (`main`) plus existing working-tree changes where present. Active public-access source: live CloudFront default origin is `odin-smr-ui` and the public homepage returned HTTP 200 on 2026-10-03. Exact deployed asset revision is not established.

[Workspace map](../../odin-stack/docs/workspace.md) ·
[Runtime evidence](../../odin-stack/docs/operations/runtime-inventory-2026-10-03.md) ·
[Shared brief](../../odin-stack/AGENTS.md)

## What this repository contains

| Information | Start here |
| --- | --- |
| Routes and public pages | `src/App.tsx`, `src/components/`, `src/content/news/` |
| L1/L2 calendars and scientific plots | `src/components/Level1.tsx`, `L2Calendar.tsx`, `L2ProductPlots.tsx`, `plots/` |
| API contracts | `src/odinApi/client.tsx` (Flask), `cloud_client.tsx` (FastAPI), `src/hooks/` |
| Toolchain and local tests | `package.json`, `package-lock.json`, `.nvmrc`, `vitest.config.ts`, colocated tests/stories |
| Penpot design and implementation handoff | `docs/design-handoff.md`, `.codex/agents/ui_designer.toml`, `.codex/agents/ui.toml` |
| Public deployment | `.github/workflows/deploy.yml`: build to `odin-smr-ui`, then CloudFront invalidation |

The UI uses `/rest_api` and `/api`; `vite.config.ts` proxies them to the public
site during development. A local browser session can therefore access live data.
The cloud client is generated from `../odin-cloud-api/openapi.json`; check the
producer specification before editing or regenerating it. The Flask contract
is a separate dependency. The README retains the upstream Vite setup notes.

Validation candidates from `package.json`: `npm test`, `npm run lint`,
`npm run build`, after the locked Node/npm environment is ready. No application
checks were run for the documentation update. Check plots with invalid/missing
data and preserve units, quality flags, retrieval uncertainties and scan identity.

## Specialist and handoff

Use `ui_designer` from [.codex/agents/ui_designer.toml](../.codex/agents/ui_designer.toml)
for graphical design: editable sketches in Penpot, responsive layouts, components,
visual specifications and implementation handoff. Use `ui` from
[.codex/agents/ui.toml](../.codex/agents/ui.toml) to implement the designs and own
application code, scientific plots and API-client compatibility. The
[design handoff guide](design-handoff.md) defines the deliverables and visual
comparison expected between the roles. Penpot editing requires the intended file
to be connected through the Penpot MCP plugin; agent configuration alone does
not establish a connection or grant access.

The coordinator supplies the task, absolute shared brief, base revision, allowed
files, Penpot target and read/write scope. Return changed paths/design IDs,
checks actually run, source
versus runtime evidence, limitations and dependencies; the root owns task records.
