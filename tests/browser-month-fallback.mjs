// Month selection with actual native controls and a simulated unsupported-month
// text fallback. Scientific responses are local fixtures; no downloads required.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchBrowser } from './browser-launcher.mjs';

const origin = process.env.ODIN_UI_URL ?? 'http://127.0.0.1:4173';
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname));
const output = process.env.ODIN_MONTH_QA_DIR ?? '/tmp/odin-month-fallback';
await mkdir(output, { recursive: true });
const receipt = { fixtureOnly: true, forcedFallbackIsSimulation: true, origin, cases: [], errors: [], blocked: [] };
const browser = await launchBrowser();
Object.assign(receipt, { browser: browser.version(), browserName: process.env.ODIN_UI_BROWSER ?? 'chromium', browserEngine: browser.browserType().name() });
let page;
try {
  for (const fallback of [true, false]) for (const width of [390, 1440]) for (const level of [1, 2]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'America/Los_Angeles' });
    if (fallback) await context.addInitScript(() => {
      // Emulate browsers where assigning type=month creates a plain text input.
      const type = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'type');
      Object.defineProperty(HTMLInputElement.prototype, 'type', {
        ...type, set(value) { type.set.call(this, value === 'month' ? 'text' : value); },
      });
      const setAttribute = HTMLInputElement.prototype.setAttribute;
      HTMLInputElement.prototype.setAttribute = function (name, value) {
        return setAttribute.call(this, name.toLowerCase() === 'type' ? 'type' : name, name.toLowerCase() === 'type' && value === 'month' ? 'text' : value);
      };
    });
    const requests = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { receipt.blocked.push(url.href); return route.abort(); }
      if (!/^\/(rest_api|api)\//.test(url.pathname)) return route.continue();
      requests.push(url.pathname + url.search);
      if (url.pathname.startsWith('/rest_api/v5/period_info/')) return route.fulfill({ json: { Type: 'period_info', Count: 0, Data: [] } });
      if (url.pathname === '/api/calendar') {
        const month = `${url.searchParams.get('year')}-${url.searchParams.get('month').padStart(2, '0')}`;
        return route.fulfill({ json: [11, 12].map(day => ({ day: `${month}-${day}`, freqmode: 1, count: 1 })) });
      }
      if (url.pathname === '/api/scans') return route.fulfill({ json: [] });
      receipt.blocked.push(url.href); return route.abort();
    });
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => receipt.errors.push(String(error)));
    await page.goto(`${origin}/level${level}/calendar`);
    const input = page.getByLabel('Observation month (UTC)', { exact: true });
    await input.waitFor();
    await page.waitForFunction(() => ![...document.querySelectorAll('[role="status"]')].some(el => /Loading/.test(el.textContent)));
    assert.equal(await input.inputValue(), '2015-01');
    const type = await input.evaluate(el => el.type);
    if (fallback) assert.equal(type, 'text', 'The fallback probe uses a real editable text input');
    const before = requests.length;
    if (type === 'text') {
      await input.press('ControlOrMeta+A');
      await input.pressSequentially('2016-');
      assert.equal(await input.inputValue(), '2016-', 'Partial month editing must not reset or normalize the typed value');
      assert.equal(requests.length, before, 'Partial input must not query scientific data');
      await input.press('Tab');
      await page.getByText('Enter a valid month as YYYY-MM (01–12).', { exact: true }).waitFor();
      for (const invalid of ['2016-13', '2016-00', '0000-02', '']) {
        await input.fill(invalid); await input.press('Tab');
        assert.equal(await input.inputValue(), invalid, 'Invalid input remains available for correction');
        assert.equal(requests.length, before, 'Invalid input must not change the requested month');
      }
      await input.focus(); await input.pressSequentially('2016-02');
      assert.equal(await input.inputValue(), '2016-02');
      assert.equal(requests.length, before, 'Text edits commit on Enter or blur');
    }
    const selectMonth = async (month, action) => {
      const [year, number] = month.split('-').map(Number);
      const expected = level === 1 ? `/rest_api/v5/period_info/${year}/${String(number).padStart(2, '0')}/01/` : '/api/calendar';
      const response = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === expected && (level === 1 || url.searchParams.get('year') === String(year) && url.searchParams.get('month') === String(number));
      });
      await action(); await response;
      await page.waitForFunction(({ input, month }) => input.value === month, { input: await input.elementHandle(), month });
      assert.equal(await input.inputValue(), month);
      if (level === 2) assert.equal(new URL(page.url()).pathname, `/level2/calendar/${year}/${number}`);
      return new URL(requests.at(-1), origin);
    };
    const selected = await selectMonth('2016-02', () => type === 'text' ? input.press('Enter') : input.fill('2016-02'));
    await input.press('Tab');
    await page.waitForFunction(({ input }) => input.value === '2016-02', { input: await input.elementHandle() });
    assert.equal(await input.inputValue(), '2016-02', 'Blur after Enter/native selection must not restore the previous month');
    if (level === 2) assert.equal(new URL(page.url()).pathname, '/level2/calendar/2016/2');
    if (level === 1) assert.equal(selected.searchParams.get('length'), '29', 'Leap February retains 29 UTC days in a western timezone');
    await selectMonth('2016-03', () => page.getByRole('button', { name: 'Next month', exact: true }).click());
    await selectMonth('2016-02', () => page.getByRole('button', { name: 'Previous month', exact: true }).click());
    if (type === 'text') {
      await input.fill('incomplete');
      await selectMonth('2016-03', () => page.getByRole('button', { name: 'Next month', exact: true }).click());
      assert.equal(await input.getAttribute('aria-invalid'), 'false', 'Arrow navigation clears an invalid draft');
      await input.fill('2020-02');
      await selectMonth('2020-02', () => input.press('Tab'));
      if (level === 2) {
        const beforeBack = requests.length;
        await input.fill('2022-05');
        await selectMonth('2016-03', () => page.goBack());
        assert.ok(requests.slice(beforeBack).every(value => !value.includes('year=2022')), 'Browser Back must not submit the old page\'s dirty draft');
        await page.goto(`${origin}/level2/calendar/2015/1/11/1`);
        await page.getByRole('button', { name: /Change observation/ }).click();
        const list = page.getByRole('button', { name: 'List view', exact: true });
        if (await list.isVisible()) await list.click();
        const nextDay = page.getByRole('button', { name: /12 Jan 2015.*FM 1/ });
        // Finish opening the observation picker before clicking its clipped list.
        await page.waitForFunction(button => button.closest('.MuiCollapse-root')?.classList.contains('MuiCollapse-entered'), await nextDay.elementHandle());
        await nextDay.click();
        await page.waitForURL('**/2015/1/12/1');
        await page.getByRole('button', { name: /Change observation/ }).click();
        await input.fill('2020-03');
        const beforeDayBack = requests.length;
        const restoredScans = page.waitForResponse(response => {
          const url = new URL(response.url());
          return url.pathname === '/api/scans' && url.searchParams.get('day') === '2015-01-11' && url.searchParams.get('fm') === '1';
        });
        await page.goBack(); await restoredScans;
        await page.waitForURL('**/2015/1/11/1');
        await page.waitForFunction(({ input }) => input.value === '2015-01', { input: await input.elementHandle() });
        assert.ok(requests.slice(beforeDayBack).every(value => !value.includes('year=2020')), 'Same-month day history must not submit the old selection\'s dirty draft');
        await page.getByRole('button', { name: /Change observation/ }).click();
      }
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'The month controls fit the viewport');
    await page.screenshot({ path: `${output}/${fallback ? 'fallback' : 'native'}-${width}-l${level}.png`, fullPage: false });
    receipt.cases.push({ fallback, type, width, level, requests, month: await input.inputValue() });
    await context.close(); page = undefined;
  }
  assert.deepEqual(receipt.errors, []); assert.deepEqual(receipt.blocked, []);
  receipt.completed = true;
  console.log(`Passed ${receipt.cases.length} native/fallback month-selection cases`);
} catch (error) {
  receipt.failure = String(error);
  if (page) {
    receipt.lastUrl = page.url();
    receipt.lastPage = await page.locator('body').innerText();
    await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  }
  throw error;
} finally {
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
  await browser.close();
}
