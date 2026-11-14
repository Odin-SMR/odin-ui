import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.ODIN_UI_URL ?? 'http://127.0.0.1:5174';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const browser=await chromium.launch();
const results=[];
try {
  for(const theme of ['light','dark']) {
    const context=await browser.newContext({viewport:{width:390,height:900}});
    await context.addInitScript(theme=>localStorage.setItem('themeMode',theme),theme);
    const page=await context.newPage();
    await page.goto(origin+'/instrument');
    await page.getByRole('heading',{level:1}).waitFor();
    for(const id of ['platform-diagram-heading','instrument-detail-heading','calibration-detail-heading']) {
      const button=page.locator('#'+id);
      await button.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(id=>document.getElementById(id)?.getAttribute('aria-expanded')==='true',id);
    }
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>document.documentElement.style.fontSize='200%');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      results.push({theme,width,textSize:200,expandedInstrument:true});
    }
    await page.evaluate(()=>document.documentElement.style.fontSize='100%');
    await page.setViewportSize({width:390,height:1000});
    await page.screenshot({path:`/tmp/odin-ui-flow-001/${theme}-390-instrument-expanded.png`,fullPage:true});
    const trigger=page.getByRole('button',{name:'Open navigation menu'});
    await trigger.click(); await page.keyboard.press('Escape');
    await page.getByRole('navigation',{name:'Mobile navigation'}).waitFor({state:'hidden'});
    assert.ok(await trigger.evaluate(el=>el===document.activeElement));
    results.push({theme,drawerEscapeRestoresFocus:true});
    await context.close();
  }
} finally {await browser.close();}
await writeFile('/tmp/odin-ui-flow-001/disclosures.json',JSON.stringify(results,null,2));
console.log(`Passed ${results.length} expanded-diagram and keyboard checks`);
