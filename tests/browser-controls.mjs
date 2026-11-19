// Real mouse/keyboard acceptance for controls shared by the L1 spectrum and map.
// Scientific HTTP responses are fixtures; external requests are blocked.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { launchBrowser } from './browser-launcher.mjs';

const origin = process.env.ODIN_UI_URL ?? 'http://127.0.0.1:4173';
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname));
const output = process.env.ODIN_CONTROLS_QA_DIR ?? '/tmp/odin-browser-controls';
await mkdir(output, { recursive: true });
const data = {
  ScanID: [1000], FreqMode: [1], Backend: [2], Version: [8, 8, 8, 8, 8],
  Altitude: [60000.123456789, 20000.987654321, 40000.123456789],
  Quality: [0, 32, 208, 0, 1], SunZD: [70, 71, 72, 73, 74],
  Frequency: { IFreqGrid: [0, 1, 2, 100, 101, 102], LOFreq: [544300000000], SubBandIndex: [[1, 4], [3, 6]] },
  Spectrum: Array.from({ length: 5 }, (_, index) => [10, 12, 14, 16, 13, 10].map(value => value + index * 10)),
};
const receipt = { fixtureOnly: true, origin, checks: [], errors: [], blocked: [] };
const browser = await launchBrowser();
Object.assign(receipt, { browser: browser.version(), browserName: process.env.ODIN_UI_BROWSER ?? 'chromium', browserEngine: browser.browserType().name() });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Stockholm' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { receipt.blocked.push(url.href); return route.abort(); }
    if (!/^\/(rest_api|api)\//.test(url.pathname)) return route.continue();
    let body;
    if (url.pathname.startsWith('/rest_api/v5/period_info/')) body = { Type: 'period_info', Count: 1, Data: [{ Date: '2015-01-11', Backend: 'AC2', FreqMode: 1, NumScan: 1, URL: '/' }] };
    else if (url.pathname.startsWith('/rest_api/v5/freqmode_info/')) body = { Type: 'Log', Count: 1, Data: [{ ScanID: 1000, DateTime: '2015-01-11T12:08:24Z', LatStart: 30, LonStart: 10, SunZD: 75.2, Quality: 0 }] };
    else if (url.pathname.endsWith('/L1b/')) body = { Type: 'L1b', Count: 5, Data: data };
    else { receipt.blocked.push(url.href); return route.abort(); }
    return route.fulfill({ json: body });
  });
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => receipt.errors.push(String(error)));
  await page.goto(origin + '/level1/calendar');
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.getByRole('button', { name: /11 Jan 2015.*FM 1/ }).click();
  const map = page.locator('svg[aria-label="Natural Earth map of scan start locations"]');
  const point = map.getByRole('button', { name: /Select scan 1000,/ });
  await point.click();
  const plot = page.locator('svg[aria-label="Brightness temperature spectrum"]');
  await plot.waitFor();
  const lines = plot.locator('[data-spectrum-line="true"]');
  const first = page.getByRole('slider', { name: 'First spectrum', exact: true });
  const last = page.getByRole('slider', { name: 'Last spectrum', exact: true });
  const range = async (low, high) => {
    assert.equal(await first.getAttribute('aria-valuenow'), String(low));
    assert.equal(await last.getAttribute('aria-valuenow'), String(high));
    assert.deepEqual(await lines.evaluateAll(elements => elements.map(element => Number(element.dataset.spectrumIndex))), Array.from({ length: high - low + 1 }, (_, index) => low - 1 + index));
  };
  await range(1, 5);
  const dragThumb = async (thumb, target) => {
    await thumb.scrollIntoViewIfNeeded();
    const p = await thumb.evaluate((input, target) => {
      const handle = input.parentElement.getBoundingClientRect();
      const track = input.closest('.MuiSlider-root').getBoundingClientRect();
      return { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2, end: track.x + track.width * (target - 1) / 4 };
    }, target);
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move(p.end, p.y, { steps: 6 }); await page.mouse.up();
  };
  await dragThumb(first, 2); await dragThumb(last, 4); await range(2, 4);
  const dragRange = async (steps, low, high) => {
    await first.scrollIntoViewIfNeeded();
    const p = await first.evaluate((input, steps) => {
      const slider = input.closest('.MuiSlider-root');
      const bounds = slider.getBoundingClientRect(), track = slider.querySelector('.MuiSlider-track').getBoundingClientRect();
      return { x: track.x + track.width / 2, y: track.y + track.height / 2, delta: bounds.width * steps / 4 };
    }, steps);
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move(p.x + p.delta, p.y, { steps: 6 }); await page.mouse.up();
    await range(low, high);
    await page.mouse.move(1, 1); await range(low, high);
  };
  await dragRange(1, 3, 5);
  await first.focus(); await page.keyboard.press('Shift+ArrowLeft'); await range(2, 4);
  await last.focus(); await page.keyboard.press('Shift+ArrowRight'); await range(3, 5);
  receipt.checks.push('Mouse drags both range thumbs and selected band; release and Shift+arrows preserve the selected source indices');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download scan JSON', exact: true }).click()]);
  assert.deepEqual(JSON.parse(await readFile(await download.path(), 'utf8')), data);
  await page.keyboard.press('Escape'); await page.locator('.MuiPopover-root').waitFor({ state: 'detached' });
  receipt.checks.push('Range selection retains the complete exact-value JSON download');

  const card = map.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
  await card.getByRole('button', { name: 'Zoom +', exact: true }).click();
  await card.getByRole('button', { name: 'Map tools', exact: true }).click();
  await page.getByRole('button', { name: 'Pan map', exact: true }).click();
  await page.locator('.MuiPopover-root').waitFor({ state: 'detached' });
  await map.scrollIntoViewIfNeeded();
  const before = Number(await point.locator('circle').first().getAttribute('cx'));
  const bounds = await map.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2, { steps: 8 });
  await page.mouse.up();
  assert.notEqual(Number(await point.locator('circle').first().getAttribute('cx')), before, 'Dragging pans the map');
  assert.equal(await point.getAttribute('aria-pressed'), 'true', 'Map drag keeps the selected scientific scan');
  receipt.checks.push('Real mouse pointer drag pans the zoomed map and preserves scan selection');
  assert.deepEqual(receipt.errors, []); assert.deepEqual(receipt.blocked, []);
  receipt.completed = true;
  console.log(`Passed ${receipt.checks.length} browser control journeys`);
} catch (error) {
  receipt.failure = String(error);
  if (page) await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
  await browser.close();
}
