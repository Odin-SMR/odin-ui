// Local, fixture-only acceptance for altitude bars and source uncertainty.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.ODIN_UI_URL ?? 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname));
const output = process.env.ODIN_PROFILE_QA_DIR ?? '/tmp/odin-profile-bars-browser';
await mkdir(output, { recursive: true });
const data = {
  alt: [10000, 12000, 14000, 16000, 18000, 20000, 23000, 26000, 30000, 34000, 39000, 44000, 50000],
  vmr: [-0.1e-6, 0.3e-6, 0.8e-6, null, 2.8e-6, 4e-6, 5.4e-6, 6.2e-6, 5.6e-6, 4.1e-6, 2.4e-6, 1e-6, 0],
  meas_resp: [0.4, 0.5, 0.7, 0.8, 0.83, 0.91, 0.95, 0.98, 0.94, 0.89, 0.8, 0.7, 0.5],
  error_total: [0.2e-6, 0.2e-6, 0.3e-6, 0.4e-6, 0.4e-6, 0.5e-6, 0.6e-6, 0.7e-6, 0.6e-6, 0.5e-6, null, -0.1e-6, 0],
  error_noise: [0.1e-6, 0.1e-6, 0.2e-6, 0.3e-6, 0.3e-6, 0.4e-6, 0.5e-6, 0.6e-6, 0.5e-6, 0.4e-6, 0.2e-6, 0.1e-6, 0],
  temp: Array(13).fill(225), pressure: Array(13).fill(1000),
};
const product = { name: 'O3 · illustrative fixture', scanid: 1000, data };
const receipt = { fixtureOnly: true, startedAt: new Date().toISOString(), cases: [], errors: [], blocked: [], screenshots: [], sourceSha256: {} };
const sourcePaths = ['src/components/L2Plot.tsx', 'src/components/L2Card.tsx', 'src/components/L2ProductPlots.tsx', 'src/components/plots/profileGeometry.ts', 'src/odinApi/cloud_client.tsx', 'tests/ui-profile-bars.mjs'];
for (const path of sourcePaths) receipt.sourceSha256[path] = createHash('sha256').update(await readFile(new URL(`../${path}`, import.meta.url))).digest('hex');
const browser = await chromium.launch({ headless: true });
receipt.browser = browser.version();
try {
  for (const width of [320, 390, 834, 1440, 1920]) {
    for (const theme of ['light', 'dark']) {
      const touch = width === 390 || width === 834;
      const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: touch });
      await context.addInitScript((mode) => localStorage.setItem('themeMode', mode), theme);
      let legacy = false;
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(origin).origin) { receipt.blocked.push(url.href); return route.abort(); }
        if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/rest_api/')) return route.continue();
        let body;
        if (url.pathname === '/api/calendar') body = [{ day: '2015-01-11', freqmode: 1, count: 1 }];
        if (url.pathname === '/api/scans') body = [{ scanid: 1000, lat: 30, lon: -10 }];
        if (url.pathname === '/api/products') {
          const payload = structuredClone(product);
          if (legacy) { delete payload.data.error_total; delete payload.data.error_noise; }
          body = [payload];
        }
        if (!body) { receipt.blocked.push(url.href); return route.abort(); }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror', (error) => receipt.errors.push({ width, theme, message: String(error) }));
      const open = async () => {
        await page.goto(origin + '/level2/calendar/2015/1/11/1');
        await page.getByRole('button', { name: /Select scan 1000, latitude/ }).click();
        await page.locator('svg[aria-label$="retrieval profile"]').waitFor();
        await page.evaluate(() => document.fonts.ready);
      };
      await open();
      const plot = page.locator('svg[aria-label$="retrieval profile"]');
      const card = plot.locator('xpath=ancestor::*[contains(@class,"MuiCard-root")][1]');
      await plot.scrollIntoViewIfNeeded();
      const level = plot.locator('circle[data-level="5"]');
      await level.hover();
      const tooltip = page.getByRole('tooltip');
      await tooltip.waitFor();
      assert.match(await tooltip.innerText(), /20000 m/);
      assert.match(await tooltip.innerText(), /4 ppmv/);
      assert.match(await tooltip.innerText(), /0.5 ppmv/);
      const fit = async () => {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${theme} fits viewport`);
        for (const overlay of [page.getByRole('tooltip'), page.getByRole('dialog')]) {
          if (await overlay.isVisible()) {
            const box = await overlay.boundingBox();
            assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, `${width}/${theme} overlay fits`);
          }
        }
      };
      await fit();
      if ([390, 1440].includes(width) && theme === 'light') {
        const filename = `${width}-profile-hover.png`;
        await page.screenshot({ path: `${output}/${filename}`, animations: 'disabled' });
        receipt.screenshots.push(filename);
      }
      await page.keyboard.press('Escape');
      await tooltip.waitFor({ state: 'hidden' });
      await plot.focus();
      await page.keyboard.press('ArrowUp'); await tooltip.waitFor();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog').waitFor();
      assert.match(await page.getByRole('dialog').innerText(), /Source VMR/);
      await fit();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(await plot.evaluate((element) => element === document.activeElement), true);
      if (touch) {
        await level.tap(); await page.getByRole('dialog').waitFor();
        assert.match(await page.getByRole('dialog').innerText(), /20000 m/);
        await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' });
      }
      await card.getByRole('button', { name: 'Download', exact: true }).click();
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download JSON', exact: true }).click()]);
      assert.deepEqual(JSON.parse(await readFile(await download.path(), 'utf8')), data);
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await card.getByRole('button', { name: 'Zoom +', exact: true }).click();
      await card.getByRole('button', { name: 'Reset', exact: true }).click();
      for (const font of [100, 200]) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}%`; }, font);
        await page.waitForTimeout(150);
        await fit();
        receipt.cases.push({ width, theme, font, touch, hover: true, keyboard: true, downloadExact: true });
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; });
      if (width === 1440 && theme === 'light') {
        await page.mouse.move(0, 0);
        await card.screenshot({ path: `${output}/profile-bars.png`, animations: 'disabled' });
        receipt.screenshots.push('profile-bars.png');
      }
      legacy = true;
      await open();
      assert.match(await card.innerText(), /unavailable|unprovided|not supplied|not available|missing/i);
      receipt.cases.push({ width, theme, olderResponse: true });
      console.log(`${width}px ${theme} passed`);
      await context.close();
    }
  }
  assert.deepEqual(receipt.errors, []);
  assert.deepEqual(receipt.blocked, []);
  for (const path of sourcePaths) assert.equal(createHash('sha256').update(await readFile(new URL(`../${path}`, import.meta.url))).digest('hex'), receipt.sourceSha256[path], `${path} unchanged during acceptance`);
  receipt.completedAt = new Date().toISOString();
  console.log(JSON.stringify({ cases: receipt.cases.length, screenshots: receipt.screenshots, errors: receipt.errors }));
} finally {
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
  await browser.close();
}
