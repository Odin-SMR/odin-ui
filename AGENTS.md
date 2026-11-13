# odin-ui

Read [docs/agent-guide.md](docs/agent-guide.md) for source navigation, validation
and current classification. In this multi-repository workspace, explicitly read
[../odin-stack/AGENTS.md](../odin-stack/AGENTS.md),
[workspace map](../odin-stack/docs/workspace.md) and the coordinator's task record.
If the coordination checkout is absent, ask for its task context before relying
on cross-repository assumptions; local source work can proceed within its scope.

Reusable specialists: [`ui_designer`](.codex/agents/ui_designer.toml) sketches
designs in Penpot; [`ui`](.codex/agents/ui.toml) implements them. Follow the
[design handoff](docs/design-handoff.md) for design-led tasks. Stay within the
assigned repositories and files; do not assume coordinator ownership, spawn more
workers or edit the shared ledger. You are not alone: preserve existing changes,
respect one writer per file, and never reset, stash or switch another worker's
checkout. Return the shared task template's handoff fields.

Preserve released scientific products, units, keys, precision, quality flags,
uncertainty and provenance. Distinguish source behavior from observed runtime.
Do not deploy, publish, send processing jobs, run bulk queries or mutate databases
and S3 as a validation step. Follow the user's authorization for actual tasks.
For AWS discovery verify account 991049544436 with explicit profile odin first;
use explicit observed regions and applicable AWS skills. For database discovery
read [the access runbook](../odin-stack/docs/operations/database-access.md),
use read-only sessions/timeouts, and never expose credential values.
