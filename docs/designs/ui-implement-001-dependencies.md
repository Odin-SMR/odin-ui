# UI-IMPLEMENT-001 dependency refresh

Observed 2026-11-11 against npm's public registry and the official project guides.
This is a local toolchain update; no deployment or scientific products changed.

## Version choices

| Family | Selected version | Compatibility decision |
| --- | --- | --- |
| Node / npm | 26.13.1 LTS / 12.2.2 | Newest LTS runtime and stable npm observed; exact Node version in `.nvmrc`, package-manager version and engine bounds in `package.json`. |
| React / React DOM | 19.3.1 | React and DOM versions aligned with matching 19.3 types. |
| Material UI / icons | 9.5.0 | Both packages aligned; source migrates removed APIs. |
| MUI X date pickers | 9.17.0 | Declares Material UI 9 and React 19 peer support. |
| visx | 4.0.0 | Current stable supports React 19; added directly imported `@visx/text` to the manifest. |
| FullCalendar React | 7.1.4 | Current stable React package; plugins move to package entrypoints, Temporal peer added, classic theme and explicit styles required. Removed the obsolete separate core/daygrid/interaction dependencies. |
| Vite / React SWC plugin | 8.3.8 / 4.3.3 | Vite's current supported minor and matching plugin peer range. |
| Vitest / browser / coverage | 5.1.0 | Versions aligned; Storybook's Vitest addon declares support for v5. |
| Storybook and official addons | 10.6.7 | Versions aligned; Chromatic addon updated to 5.6.0. |
| Playwright / jsdom | 1.65.0 / 31.0.0 | Current stable; runtime engine requirements satisfied. |
| ESLint / typescript-eslint | 10.14.0 / 8.72.2 | Current stable supported ESLint intersection. |
| TypeScript | 6.0.3 | Newest stable in typescript-eslint's supported range `>=4.8.4 <6.1.0`; latest 7.0.2 remains outside it. |
| Zod / Zodios | 3.25.76 / 10.9.6 | Zodios requires Zod 3. Keep generated API clients' runtime validation contract; Zod 4 needs a separate client migration. |
| Roboto | 5.3.0 | Local font assets match the Penpot typography without third-party runtime requests. |

Other direct dependencies are updated to the registry's current stable versions.
The unused `dayjs-plugin-utc` package was removed; source uses Day.js's built-in
UTC plugin. No `--force`, `--legacy-peer-deps`, peer overrides or prereleases are
used.

## Validation

- `npm ci` passed on Node 26.13.1 / npm 12.2.2 (588 installed packages).
- `npm ls --all --json` reports no dependency-tree problems. Manifest dependency,
  development-dependency and engine maps match the lockfile.
- `npm outdated --json` reports only the two deliberate TypeScript/Zod boundaries
  above; every other direct package is at the observed current stable release.
- `npm install-scripts ls` reports no unreviewed install scripts. Reviewed and
  approved only `@swc/core@1.16.22` and `esbuild@0.28.2`, pinned in `allowScripts`;
  `npm rebuild @swc/core esbuild` passed.
- `npm run build-storybook` passed with the current Vite/Storybook toolchain;
  it retains the upstream large-chunk advisory.
- Initial lint passed with no errors and two Fast Refresh warnings in the
  in-progress map implementation. Build and test source migration findings were
  returned to the coordinator for integrated checks; they do not certify the
  completed UI. Chromium and its headless shell v1254 are installed for the
  Playwright 1.65 browser checks.

The default Vitest configuration now includes both source unit tests and the
existing Storybook browser project. `test:unit` and `test:storybook` select those
projects; the existing pilot and migration scripts are retained. Previously,
`npm test` selected the Storybook project alone.

Storybook 10.3+ automatically applies preview annotations, so the redundant
generated `setProjectAnnotations` setup is removed. Vitest uses
`import.meta.dirname`, supported by the pinned runtime, in place of `__dirname`.
All three GitHub workflows use `.nvmrc` and explicitly install npm 12.2.2 before
`npm ci`; deployment behavior and action versions are otherwise unchanged.

The Hooks plugin is current, with the conventional `rules-of-hooks` error and
`exhaustive-deps` warning retained. React Compiler is not configured, so this
upgrade does not opt into the plugin's additional compiler recommendations or
force unrelated loading-effect rewrites.

## Remaining advisories

`npm audit --json` reports **15 affected dependency entries**: 13 moderate
development-tool entries and two high runtime entries (`zod` and its parent
`@zodios/core`). These are three underlying advisories, including parent-package
propagation; they are not 15 distinct vulnerabilities. `npm audit --omit=dev`
reports only the two high entries.

- [Zod memory exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
  affects versions below 4.6.6. Zodios's latest stable release requires Zod 3,
  so a supported remediation needs a generated-client migration. No Zod 3 patch
  or compatible Zodios release is available in the observed registry.
- [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
  is patched in 14.0.2, outside the latest Storybook docgen plugin's declared
  glob range.
- [minimatch pattern amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249)
  is patched in 11.0.1, outside the versions declared by the current ESLint and
  typescript-eslint dependency chains.

No unsupported transitive-major override, tooling downgrade or audit suppression
was applied. These limitations are recorded for follow-up; an up-to-date
compatible install does not establish an advisory-free dependency tree.

The original lockfile/dependency tree caused stale ESLint peer resolution during
the first update attempt. They were retained under `/tmp` and a fresh lockfile
was resolved from supported manifest ranges; no peer checks were bypassed.

## Primary evidence

- [npm registry](https://registry.npmjs.org/): package `latest` tags, version metadata, peer dependencies and engines; installation lockfile preserves exact selected versions and integrity hashes.
- [Node release schedule](https://nodejs.org/en/about/previous-releases): Node 26 is LTS; production tools should use an LTS release.
- [Vite supported versions](https://vite.dev/releases): regular fixes apply to 8.3.
- [FullCalendar v7 JavaScript migration](https://fullcalendar.io/docs/upgrading-from-v6-js): React package/plugin, CSS and Temporal changes.
- [Material UI v9 migration](https://mui.com/material-ui/migration/upgrade-to-v9/): current API changes and browser baseline.
- [typescript-eslint supported versions](https://typescript-eslint.io/users/dependency-versions/): TypeScript `<6.1` support boundary.
- [Zodios npm metadata](https://registry.npmjs.org/@zodios/core/10.9.6): Zod `^3.x` peer boundary.
- [Vitest getting started](https://vitest.dev/guide/): supported Node/Vite requirements.
