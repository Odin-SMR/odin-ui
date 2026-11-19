// Isolate browser download automation from Odin code, Vite, API data and network.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchBrowser } from './browser-launcher.mjs';

const name = process.env.ODIN_UI_BROWSER ?? 'chromium';
const output = resolve(process.env.ODIN_DOWNLOAD_PROBE_DIR ?? 'playwright-results/download-probe', name, new Date().toISOString().replaceAll(':', '-'));
await mkdir(output, { recursive: true });
const receipt = { browser: name, odinApplicationLoaded: false, externalNetwork: false, passed: false };
const browser = await launchBrowser();
receipt.engineVersion = browser.version();
try {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><h1>Download probe</h1></body></html>' }));
  const page = await context.newPage();
  await page.goto('http://127.0.0.1/download-probe');
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['Odin browser download probe\n'], { type: 'text/plain' }));
    link.download = 'download-probe.txt';
    link.textContent = 'Download probe';
    document.body.append(link);
  });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }),
    page.getByRole('link', { name: 'Download probe', exact: true }).click(),
  ]);
  assert.equal(download.suggestedFilename(), 'download-probe.txt');
  assert.equal(await readFile(await download.path(), 'utf8'), 'Odin browser download probe\n');
  receipt.passed = true;
} catch (error) {
  receipt.failure = String(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(resolve(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
}
console.log(JSON.stringify(receipt, null, 2));
console.log(`Receipt: ${resolve(output, 'receipt.json')}`);
