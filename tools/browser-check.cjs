const { chromium } = require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.env.PRETTY_FISH_URL||'http://127.0.0.1:4173/';
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const hashCanvas=(page,id)=>page.locator('#'+id).evaluate(canvas=>{
  const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let hash=2166136261;for(let i=0;i<data.length;i++)hash=Math.imul(hash^data[i],16777619);
  return (hash>>>0).toString(16);
});
const ready=page=>page.waitForFunction(()=>document.querySelector('#paint-canvas').dataset.seed&&document.querySelector('#studies').getAttribute('aria-busy')==='false',null,{timeout:30000});
async function change(page,id,value){
  const prev=await hashCanvas(page,'paint-canvas');
  if(id==='palette') await page.locator('#palette').selectOption(value);
  else await page.locator('#'+id).evaluate((input,v)=>{input.value=v;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await page.waitForFunction(({id,value})=>document.querySelector('#paint-canvas').dataset[id]===String(value),{id,value},{timeout:20000});
  assert.notEqual(await hashCanvas(page,'paint-canvas'),prev,`${id} must visibly change the painting`);
}
(async()=>{
  await fs.mkdir('artifacts',{recursive:true});
  const browser=await chromium.launch({executablePath:chrome,headless:true});
  const errors=[];
  let context;
  try {
    context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.goto(new URL('?seed=Nerina%20lucens',base).href);await ready(page);
    assert.equal(await page.locator('#status.error').count(),0);
    const original=await hashCanvas(page,'line-canvas');
    const firstPainting=await hashCanvas(page,'paint-canvas');
    assert.notEqual(original,firstPainting);
    await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
    for(const palette of ['vermilion','indigo','plum','celadon']) await change(page,'palette',palette);
    await change(page,'pigment',25);await change(page,'grain',80);
    assert.equal(await hashCanvas(page,'line-canvas'),original,'painting controls must preserve line art');
    const cleanPainting=await hashCanvas(page,'paint-canvas');
    await page.locator('#regions').check();
    assert.equal(await page.locator('#region-legend').isVisible(),true);
    assert.ok(await page.locator('#region-legend li').count()>=7);
    assert.notEqual(await hashCanvas(page,'paint-canvas'),cleanPainting);
    await page.screenshot({path:'artifacts/regions.png',fullPage:true});
    await page.locator('#regions').uncheck();
    assert.equal(await hashCanvas(page,'paint-canvas'),cleanPainting,'overlay must restore clean painting exactly');

    const download1=page.waitForEvent('download');await page.locator('#download-svg').click();
    const svg=await download1;await svg.saveAs('artifacts/drawing.svg');
    const svgText=await fs.readFile('artifacts/drawing.svg','utf8');
    assert.ok(svgText.includes('<polyline'));assert.ok(svgText.includes('fishdraw'));
    const download2=page.waitForEvent('download');await page.locator('#download-png').click();
    const png=await download2;await png.saveAs('artifacts/painting.png');
    const pngData=await fs.readFile('artifacts/painting.png');
    assert.equal(pngData.readUInt32BE(16),1200);assert.equal(pngData.readUInt32BE(20),720);
    await page.locator('#share').click();
    const copied=await page.evaluate(()=>navigator.clipboard.readText());
    assert.equal(new URL(copied).searchParams.get('seed'),'Nerina lucens');
    assert.equal(new URL(copied).searchParams.get('grain'),'80');
    const replay=await context.newPage();await replay.goto(copied);await ready(replay);
    assert.equal(await hashCanvas(replay,'line-canvas'),original,'share link must reproduce anatomy');
    assert.equal(await hashCanvas(replay,'paint-canvas'),cleanPainting,'share link must reproduce painting');
    await replay.close();
    for(const width of [320,390,768,1280]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal overflow at ${width}px`);
      assert.ok(await page.locator('#new-fish').isVisible());
      if(width===390) await page.screenshot({path:'artifacts/mobile.png',fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1100});
    const seed=await page.locator('#line-canvas').getAttribute('data-seed');
    await page.locator('#new-fish').click();
    await page.waitForFunction(seed=>document.querySelector('#paint-canvas').dataset.seed!==seed&&document.querySelector('#studies').getAttribute('aria-busy')==='false',seed,{timeout:30000});
    assert.notEqual(await hashCanvas(page,'line-canvas'),original,'New fish changes anatomy');
    assert.equal(await page.locator('#line-canvas').getAttribute('data-seed'),await page.locator('#paint-canvas').getAttribute('data-seed'));
    await page.locator('.seed-settings>summary').click();
    await page.locator('#seed-input').fill('Nerina lucens');await page.locator('#seed-form button').click();
    await page.waitForFunction(()=>document.querySelector('#paint-canvas').dataset.seed==='Nerina lucens'&&document.querySelector('#studies').getAttribute('aria-busy')==='false',null,{timeout:30000});
    assert.equal(await hashCanvas(page,'line-canvas'),original,'seed form reproduces anatomy after another specimen');
    await page.locator('#regions').check();
    const cleanDownload=page.waitForEvent('download');await page.locator('#download-png').click();
    const cleanPng=await cleanDownload;await cleanPng.saveAs('artifacts/painting-with-inspector.png');
    assert.deepEqual(await fs.readFile('artifacts/painting-with-inspector.png'),pngData,'PNG export must exclude region overlay');
    assert.deepEqual(errors,[],'no browser errors');
    console.log('Browser checks passed: both renderers, four palettes, pigment/grain, region inspection, exact shared-seed replay, new fish, seed form, SVG/PNG exports, and 320–1440px layouts.');
  } finally {
    if(context) await context.close();
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
