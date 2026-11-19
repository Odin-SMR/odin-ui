# Cross-browser acceptance

Use the pinned Node/npm environment from the README, then:

```sh
npm ci
npx playwright install --with-deps chromium webkit
# Installs actual stable Chrome and Edge; may require administrator access.
npx playwright install chrome msedge
```

For optional Vivaldi diagnostics, install it from the [official download](https://vivaldi.com/download/), or
point `ODIN_VIVALDI_EXECUTABLE` at an existing executable. The launcher checks
standard Linux, Windows and macOS install paths. `ODIN_CHROME_EXECUTABLE` and
`ODIN_EDGE_EXECUTABLE` support standalone copies as well. Tests use temporary
browser profiles, never your personal profile.

```sh
npm run test:browsers
# Smaller engine-only check, requiring no branded browser installation:
npm run test:browsers -- --browsers=chromium,webkit
# Focus a reproduction, without rebuilding an unchanged dist:
node tests/browser-matrix.mjs --browsers=webkit --suites=smoke,controls --workers=1
# Vivaldi diagnostic (currently fails on downloads; see below):
npm run test:browsers -- --browsers=vivaldi
```

The default matrix runs **Chrome, Edge and WebKit**, with two browsers
at a time. Missing browsers and failed assertions fail the command; the runner
never silently substitutes Chromium or skips a requested browser. Set
`--workers=1` on smaller machines (maximum 4). `--output=/absolute/path` chooses
an artifact directory; the default is ignored `playwright-results/`.

`npm run test:browsers` builds the production bundle, starts a temporary loopback
preview with all production proxies disabled, and shuts it down after testing.
No existing dev server is needed. Scientific requests are intercepted by local
fixtures. Reports identify browser engine/version, source commit plus working
tree changes, built entrypoint hash, suite outcomes and logs. Each suite retains
screenshots and its detailed receipt in a separate browser/suite/run directory.
The summary points to each run directory; older artifacts cannot be mistaken for
newly written receipts after an early failure.

## Coverage

| Suite | Checks |
| --- | --- |
| smoke | Public routes, light/dark, 320–1920px, enlarged text, calendar months, selected spectra/profiles, exact JSON downloads, inspectors, error/readiness states |
| navigation | Mission, Instrument, data guides, Explore, mobile navigation, preserved fragment links, Python example download |
| disclosures | Expanded instrument diagrams and keyboard focus restoration |
| science | Real emulated touch taps and keyboard plot/map inspection, scientific values and downloads |
| statistics | Exact counts, zero/missing/signed values, hover bounds and scroll stability, keyboard/touch |
| parquet | Sample catalog dates, generated examples, selection downloads, unavailable/retry states |
| archive | Archive filters, pagination, URL/metadata downloads, unavailable/retry states |
| profiles | Uncertainty bars, exact raw/converted values, enlarged text, mouse/touch/keyboard and complete downloads |
| controls | Mouse dragging spectrum range and map, range width, Shift+arrow keyboard controls and complete spectrum download |
| month | Native and simulated unsupported month inputs; real text editing, strict validation, Enter/blur, previous/next, responsive layouts and leap-year UTC queries |

## Interpretation and limits

[Playwright’s WebKit](https://playwright.dev/docs/browsers#webkit) is a patched
WebKit build, **not the Apple Safari application**. Linux WebKit passing is
useful Safari-engine evidence; final Safari release acceptance still requires
real Safari on macOS/iOS. Mobile viewports and touch emulation are not physical
device tests. This matrix does not establish old-version or OS-specific support.

Chrome and Edge use their branded channels (or explicit executable overrides).
Vivaldi is launched as a custom Chromium executable, outside Playwright’s
official browser-channel list; its engine version can differ from its product
version. Inspect launch failures after a browser upgrade instead of accepting a
fallback. Vivaldi requires `--disable-vivaldi` for headless automation: its own
executable and renderer are tested with the desktop browser UI disabled, so its
normal browser UI, extensions and tracker-blocking settings are not covered.
Screenshots are retained for inspection, not compared against an
approved visual baseline.

Fixture tests validate UI behavior and exact test-data handling, not live API
availability or scientific equivalence. Clipboard success/denial is mocked to
verify the application’s copy/manual-copy handling; this does not establish OS
clipboard integration. Touch dragging remains in the existing Chromium CDP
`ui-l1-range.mjs` suite and is not claimed as WebKit coverage.

The CI matrix runs the same Chrome/Edge/WebKit production-build acceptance on
Ubuntu. CI execution is distinct from local results and requires the changes to
be pushed.
It detects regressions independently; it does not gate the separate deployment
workflow.

## Initial local results — 2026-11-18

Chrome 158.0.8127.36, Edge 157.0.4341.60 and WebKit 27.2 each passed all nine
suites against the production bundle from commit `1f7b5fe` with the initial local test
changes. The UI application itself was unchanged in that first phase. Unit/Storybook tests passed
270 tests; lint and production build passed. This is local Linux evidence, not
a claim that the new GitHub Actions jobs have run or that a deployment occurred.

Vivaldi 8.3.4191.45 (Chromium 156.0.8078.110) rendered all 140 smoke route/theme
layouts and passed the disclosure and statistics suites on Linux. Full
acceptance **did not pass**: native Playwright download events timed out across
the other suites. The same failure reproduced on a standalone Blob download
link without Odin code, so this is not established as an Odin UI defect.
Reproduce independently with `ODIN_UI_BROWSER=vivaldi node tests/browser-download-probe.mjs`;
the same probe passes in Chrome and checks exact downloaded bytes.
Neither `--enable-automation`, `--test-type`, nor a disposable persistent profile
with automatic downloads enabled resolved the probe.

Vivaldi remains an explicit diagnostic target, fails nonzero when a check fails,
and is excluded from the passing default/CI matrix. Do not interpret that
exclusion as Vivaldi acceptance. Its normal browser download flow needs a real
Vivaldi check or a working automation integration before full support is claimed.

## Reported month-selection failure

The subsequent Safari/Vivaldi user report identified year/month entry as the
problem. Latest WebKit supports the native month control, so the initial matrix
missed browsers that expose it as a text field. In that fallback, the old
controlled input reparsed every keystroke and restored or normalized the month
before the user could finish typing. Both L1 and L2 reproduced the failure.

The shared calendar now retains a draft, validates a complete `YYYY-MM` and
commits fallback text on Enter or blur. Native pickers keep their existing change
behavior. Inline format/error guidance, coverage bounds, parent-accepted month,
UTC query dates and previous/next controls are preserved. This is an application
fix, separate from the earlier test-only work. Deployment status is recorded by
the repository's separate **Deploy to S3** workflow.

Submitted edits cannot be submitted again when route navigation moves focus.
Browser Back also cancels a draft from the departed month or observation instead
of replacing the history destination, including day changes within the same month.
On narrow screens, the fallback field uses the full
width, with the month arrows underneath so enlarged text remains readable.

The `month` suite is included in the default/CI matrix. It also runs independently
in Vivaldi, since no downloads are needed:

```sh
npm run test:browsers -- --browsers=chrome,msedge,vivaldi,webkit --suites=month
```

Fallback checks simulate the browser's unsupported `month` behavior before the
application loads. They use real keystrokes and exact API-request assertions;
they do not claim to run the Safari application or make native picker icons
identical across browsers.

Final local validation passed all eight month cases in each of Chrome, Edge,
Vivaldi and WebKit (32 total), using the browser versions listed above. Component
and Storybook tests passed 286 tests across 29 files, including 17 focused
calendar tests; lint and the production build passed. Chrome and WebKit also
each passed a targeted smoke rerun with 37 layout/text cases and 13 interaction
journeys. Independent review checked fallback readability at 320px/200% text
and the same-month observation Back regression. Full Vivaldi downloads and the
actual Safari application remain subject to the limits above.
