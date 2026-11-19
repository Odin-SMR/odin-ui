// Run the production build with fixture-backed acceptance in real browser engines.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { browserNames } from './browser-launcher.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const suites = {
  smoke: ['ui-browser-smoke.mjs', 'ODIN_UI_QA_DIR'],
  navigation: ['ui-flow.browser.mjs', 'ODIN_UI_FLOW_OUTPUT'],
  disclosures: ['ui-flow-disclosures.browser.mjs', 'ODIN_UI_FLOW_OUTPUT'],
  science: ['ui-visual-flows.mjs', 'ODIN_UI_FLOW_DIR'],
  statistics: ['statistics-tooltips.browser.mjs', 'ODIN_STATS_QA_DIR'],
  parquet: ['parquet-access.browser.mjs', 'ODIN_PARQUET_QA_DIR'],
  archive: ['parquet-archive.browser.mjs', 'ODIN_ARCHIVE_QA_DIR'],
  profiles: ['ui-profile-bars.mjs', 'ODIN_PROFILE_QA_DIR'],
  controls: ['browser-controls.mjs', 'ODIN_CONTROLS_QA_DIR'],
  month: ['browser-month-fallback.mjs', 'ODIN_MONTH_QA_DIR'],
};
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--(browsers|suites|output|workers)=(.+)$/.exec(arg);
  assert.ok(match, `Unknown argument ${arg}; use --browsers=chrome,msedge,vivaldi,webkit --suites=smoke --output=path --workers=2`);
  return [match[1], match[2]];
}));
const selectedBrowsers = (args.browsers ?? 'chrome,msedge,webkit').split(',');
const selectedSuites = (args.suites ?? Object.keys(suites).join(',')).split(',');
assert.ok(selectedBrowsers.every(name => browserNames.includes(name)), `Browsers: ${browserNames.join(', ')}`);
assert.ok(selectedSuites.every(name => Object.hasOwn(suites, name)), `Suites: ${Object.keys(suites).join(', ')}`);
assert.equal(new Set(selectedBrowsers).size, selectedBrowsers.length, 'Duplicate browser output directories are not allowed');
assert.equal(new Set(selectedSuites).size, selectedSuites.length, 'Duplicate suites are not allowed');
const workers = Number(args.workers ?? 2);
assert.ok(Number.isInteger(workers) && workers >= 1 && workers <= 4, 'Use 1–4 browser workers');
const output = resolve(root, args.output ?? 'playwright-results');
await mkdir(output, { recursive: true });
const receipt = {
  runId: `${new Date().toISOString().replaceAll(':', '-')}-${process.pid}`,
  startedAt: new Date().toISOString(), fixtureOnly: true, platform: process.platform,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  workingTree: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  playwright: JSON.parse(await readFile(new URL('../node_modules/playwright/package.json', import.meta.url))).version,
  buildIndexSha256: createHash('sha256').update(await readFile(new URL('../dist/index.html', import.meta.url))).digest('hex'),
  selectedBrowsers, selectedSuites, results: [],
  limitations: ['WebKit is Playwright’s patched engine, not the Apple Safari application.', 'Headless browser contexts use local scientific fixtures, not live backend data.', 'Clipboard mocks validate application handling, not OS clipboard integration.'],
};
// Explicitly disable both proxy settings: a missing fixture must never hit production.
const server = await preview({ root, server: { proxy: {} }, preview: { host: '127.0.0.1', port: 0, proxy: {} } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
receipt.origin = origin;
const children = new Set();
let reportWrite = Promise.resolve();
const saveSummary = () => {
  reportWrite = reportWrite.then(() => writeFile(resolve(output, 'summary.json'), JSON.stringify(receipt, null, 2) + '\n'));
  return reportWrite;
};
const stop = () => { for (const child of children) child.kill('SIGTERM'); };
const interrupt = () => { process.exitCode = 1; stop(); void server.close(); };
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

async function runSuite(browser, suite) {
  const [file, outputVariable] = suites[suite];
  const directory = resolve(output, browser, suite, receipt.runId);
  await mkdir(directory, { recursive: true });
  const metadataFile = resolve(directory, 'browser-identity.json');
  const started = Date.now();
  console.log(`[${browser}] ${suite} started`);
  const log = createWriteStream(resolve(directory, 'run.log'), { flags: 'w' });
  const result = await new Promise(resolveResult => {
    const env = { ...process.env, ODIN_UI_URL: origin, ODIN_UI_BROWSER: browser, ODIN_UI_BROWSER_METADATA: metadataFile, [outputVariable]: directory };
    // Matrix receipts always mean full coverage, regardless of a developer's quick-run settings.
    for (const key of ['ODIN_UI_QA_JOURNEYS_ONLY', 'ODIN_STATS_QA_INTERACTIONS_ONLY', 'ODIN_UI_FLOW_WIDTHS']) delete env[key];
    const child = spawn(process.execPath, [resolve(root, 'tests', file)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 600_000 });
    children.add(child);
    let tail = '';
    const record = data => { log.write(data); tail = (tail + data).slice(-6000); };
    child.stdout.on('data', record);
    child.stderr.on('data', record);
    child.on('error', error => { tail += String(error); });
    child.on('close', (code, signal) => {
      children.delete(child);
      log.end(() => resolveResult({ browser, suite, code, signal, passed: code === 0, seconds: (Date.now() - started) / 1000, directory, ...(code === 0 ? {} : { error: tail }) }));
    });
  });
  try { result.identity = JSON.parse(await readFile(metadataFile, 'utf8')); } catch { /* Launch failures have no identity. */ }
  receipt.results.push(result);
  console.log(`[${browser}] ${suite} ${result.passed ? 'PASS' : 'FAIL'} (${result.seconds.toFixed(1)}s)`);
  if (!result.passed) console.error(result.error);
  await saveSummary();
}

try {
  const queue = [...selectedBrowsers];
  await Promise.all(Array.from({ length: Math.min(workers, queue.length) }, async () => {
    let browser;
    while ((browser = queue.shift())) {
      for (const suite of selectedSuites) {
        if (process.exitCode) return;
        await runSuite(browser, suite);
      }
    }
  }));
} finally {
  stop();
  await server.close();
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  receipt.finishedAt = new Date().toISOString();
  receipt.passed = receipt.results.length === selectedBrowsers.length * selectedSuites.length && receipt.results.every(result => result.passed);
  await saveSummary();
}
console.log(`${receipt.results.filter(result => result.passed).length}/${selectedBrowsers.length * selectedSuites.length} suites passed. Report: ${resolve(output, 'summary.json')}`);
if (!receipt.passed) process.exitCode = 1;
