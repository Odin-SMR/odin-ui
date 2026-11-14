// Navigation, progressive disclosure and responsive acceptance against local assets.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const origin = process.env.ODIN_UI_URL ?? 'http://127.0.0.1:5174';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const output = process.env.ODIN_UI_FLOW_OUTPUT ?? '/tmp/odin-ui-flow-001';
await mkdir(output, { recursive: true });
const receipt = { fixtureOnly: true, layouts: [], journeys: [], errors: [], requests: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext();
    await context.addInitScript((theme) => localStorage.setItem('themeMode', theme), theme);
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(origin).origin) return route.abort();
      if (!/^\/(rest_api|api)\//.test(url.pathname)) return route.continue();
      receipt.requests.push(url.pathname);
      if (url.pathname === '/rest_api/v5/statistics/freqmode/timeline/') return route.fulfill({json: { Years: [2014, 2015], Data: { '1': [[2014, 100], [2015, 200]] } }});
      if (url.pathname === '/api/calendar') return route.fulfill({json: [{ day: '2015-01-11', freqmode: 1, count: 1 }]});
      if (url.pathname.startsWith('/rest_api/v5/period_info/')) return route.fulfill({json: {Type: 'period_info', Count: 1, Data: [{Date:'2015-01-11', Backend:'AC2', FreqMode:1, NumScan:1, URL:'/'}]}});
      return route.fulfill({status:503, json:{detail:'No fixture'}});
    });
    const page = await context.newPage();
    page.on('pageerror', error => receipt.errors.push(String(error)));
    const settle = async () => {
      await page.locator('main h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => ![...document.querySelectorAll('main [role="status"]')].some(el => /Loading/i.test(el.textContent ?? '')));
    };
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height:1000});
      for (const path of ['/', '/instrument', '/data_access', '/data_access/quickstart', '/explore', '/data_access/files', '/data_access/files#parquet-archive', '/data_access/api']) {
        const before = receipt.requests.length;
        await page.goto(origin + path); await settle();
        if (path === '/') assert.equal(receipt.requests.length, before, 'Mission does not request scientific API data');
        assert.equal(await page.locator('main h1').count(), 1);
        assert.ok(!/Page not found/.test(await page.title()));
        for (const textSize of [100, 200]) {
          await page.evaluate(size => document.documentElement.style.fontSize = `${size}%`, textSize);
          await page.waitForTimeout(350);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme} ${width} ${path} ${textSize}% fits`);
          receipt.layouts.push({theme, width, path, textSize});
        }
        await page.evaluate(() => document.documentElement.style.fontSize = '100%');
        if ([390,1440].includes(width) && ['/', '/instrument', '/data_access', '/data_access/quickstart', '/explore'].includes(path)) await page.screenshot({path:`${output}/${theme}-${width}-${path.replaceAll('/','_') || 'mission'}.png`, fullPage:true});
      }
    }
    await page.setViewportSize({width:390,height:1000});
    await page.goto(origin); await settle();
    await page.getByRole('button', {name:'Open navigation menu'}).click();
    const mobile = page.getByRole('navigation', {name:'Mobile navigation'});
    for (const label of ['Mission', 'Instrument', 'Use data', 'Explore']) assert.equal(await mobile.getByRole('link',{name:label,exact:true}).count(),1);
    await mobile.getByRole('link',{name:'Use data',exact:true}).click(); await settle();
    await page.getByRole('link',{name:'Start the L2 quickstart'}).click(); await settle();
    await page.getByRole('button',{name:'Find a region',exact:true}).click();
    assert.match(await page.locator('pre[aria-label="SQL · tropical or polar scans"]').innerText(),/lat_1d/);
    assert.ok(await page.getByText('Try a simple altitude-binned mean',{exact:true}).isVisible());
    await page.getByText('Try a simple altitude-binned mean',{exact:true}).click();
    assert.ok(await page.locator('pre[aria-label="SQL · illustrative mean"]').isVisible());
    await page.getByText('Open the file in Python',{exact:true}).click();
    assert.ok(await page.locator('pre[aria-label="Open verified Parquet"]').isVisible());
    const download = page.waitForEvent('download');
    await page.getByRole('link',{name:'Download Python example'}).click();
    assert.equal((await download).suggestedFilename(),'l2-quickstart.py');
    receipt.journeys.push(`${theme}: mobile navigation → quickstart → region SQL → optional mean → Python download`);
    for (const hash of ['#parquet-access','#parquet-archive','#level2-api','#level1-api','#archive-api','#scientific-use']) {
      await page.goto(origin + '/data_access' + hash); await settle();
      const target = page.locator(hash); await target.waitFor();
      assert.ok(page.url().includes(hash.startsWith('#parquet-') ? '/data_access/files' : '/data_access/api'));
      await page.waitForTimeout(100);
      assert.ok(await target.evaluate(el => {const r = el.getBoundingClientRect(); return r.top >= -1 && r.top < innerHeight;}), `Legacy ${hash} scrolls to destination`);
    }
    receipt.journeys.push(`${theme}: six legacy fragment links redirect and scroll correctly`);
    await page.goto(origin+'/explore'); await settle();
    await page.getByRole('link',{name:'Explore L2 profiles',exact:true}).click();
    await page.getByRole('heading',{level:1,name:'Level 2 retrievals',exact:true}).waitFor(); await settle();
    assert.match(await page.locator('h1').innerText(),/Level 2/);
    await page.getByRole('link',{name:'← Explore observations',exact:true}).click();
    await page.getByRole('heading',{level:1,name:'Get to know the observations',exact:true}).waitFor(); await settle();
    await page.getByRole('link',{name:'Explore L1 spectra',exact:true}).click();
    await page.getByRole('heading',{level:1,name:'Level 1 observations',exact:true}).waitFor(); await settle();
    assert.match(await page.locator('h1').innerText(),/Level 1/);
    receipt.journeys.push(`${theme}: Explore → L2 calendar → back → L1 calendar`);
    await context.close();
  }
  assert.deepEqual(receipt.errors,[]);
} finally {
  await browser.close();
  await writeFile(`${output}/receipt.json`,JSON.stringify(receipt,null,2));
}
console.log(JSON.stringify({layouts:receipt.layouts.length,journeys:receipt.journeys,errors:receipt.errors,output},null,2));
