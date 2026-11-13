# Odin-SMR public interface

Browse calibrated spectra, retrieved atmospheric profiles, documentation and the
retained Odin record. The React application follows the
[Penpot design handoff](docs/designs/ui-site-001.md). Scientific queries use the
Flask `/rest_api` and cloud `/api` services; generated clients preserve their
separate contracts.

## Local development

Use the Node version pinned in `.nvmrc` and npm 12.2.2:

```sh
nvm install
nvm use
npm install --global npm@12.2.2
npm ci
npm run dev
```

The development proxy forwards scientific requests to odin-smr.org. The
[isolated browser checks](tests/ui-browser-smoke.mjs) intercept every science
request and use local fixtures instead.

## Validation

```sh
npm run build
npm run lint
npx playwright install chromium
npm test
npm run build-storybook
```

`npm test` runs source unit tests and Storybook browser tests. Use
`npm run test:unit`, `npm run test:storybook`, `npm run test:pilot` or
`npm run test:migration` for a narrower check. With a local dev server running,
`npm run test:ui` checks responsive routes, themes, enlarged text, navigation,
selection, JSON downloads and release gates using local fixtures. Its receipts
and screenshots are written under `/tmp/odin-ui-implement-001-browser` by
default; `ODIN_UI_QA_DIR` selects another output directory.

[Dependency compatibility and remaining advisories](docs/designs/ui-implement-001-dependencies.md)
records the current supported version choices and the TypeScript/Zod boundaries.
[Implementation and browser evidence](docs/designs/ui-implement-001.md)
records design coverage and validation limits.

## Production deployment

The `main` deployment workflow validates the UI and publication catalog, builds
with the locked Node/npm versions, and verifies the Odin AWS account before
uploading to `odin-smr-ui`. Deployments are serialized. Content-addressed assets
are uploaded first and retained across releases; mutable documentation/catalog
files follow, and `index.html` is updated last. The workflow refreshes CloudFront
routes and metadata after upload. Old assets consume storage until separately
reviewed for cleanup, but keep existing browser sessions and rollback usable.

Before a release, preserve the current `index.html` and mutable public assets
outside the deployment destination, together with the exact new build and source
commit. Rollback restores those prior mutable files and invalidates CloudFront;
retained content-addressed assets already support the previous entrypoint. UI
publication does not validate or publish an unfinished migration dataset. Follow
[Parquet release onboarding](docs/parquet-access.md) for scientific files.

## Generate the client

Use the api specification to generate the client
```bash
npx openapi-zod-client ../odin-cloud-api/openapi.json  --export-schemas --export-types --strict-objects  --output src/odinApi/cloud_client.tsx
```

## Repository and agent navigation

See [the agent guide](docs/agent-guide.md) for this repository's information,
classification, build boundaries and validation; [AGENTS.md](AGENTS.md) supplies
workspace coordination context. The `ui_designer` specialist sketches designs in
Penpot, and `ui` implements them using the [design handoff](docs/design-handoff.md).
