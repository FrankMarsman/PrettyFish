const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=process.env.STUDIO_URL||'http://127.0.0.1:4184/';
const wait=page=>page.waitForFunction(()=>window.prettyFishStudio&&prettyFishStudio.getLastRender()?.revision===prettyFishStudio.getRevision()&&prettyFishStudio.getLastRender()?.quality==='final'&&document.querySelector('#artboard').getAttribute('aria-busy')==='false',null,{timeout:30000});
const hash=(page,id)=>page.locator('#'+id).evaluate(c=>{const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let h=2166136261;for(const v of d)h=Math.imul(h^v,16777619);return(h>>>0).toString(16);});
const show=async locator=>locator.evaluate(el=>el.scrollIntoView({block:'center'}));
async function range(page,key,index){const input=page.locator('#control-'+key);await input.evaluate((e,index)=>{e.value=index;e.dispatchEvent(new Event('input',{bubbles:true}));},index);await wait(page);}
async function on(page,key){const box=page.locator('#control-'+key);await show(box);await box.check();await wait(page);}
(async()=>{
 await fs.mkdir('artifacts',{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
 const errors=[],requests=[];
 try{
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message)});page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>requests.push(r.url()));
  await page.goto(base);await wait(page);
  assert.equal(await page.locator('[data-control]').count(),49);
  assert.equal(await page.locator('#line-canvas').count(),0,'only a painted preview');
  assert.equal(await page.evaluate(()=>prettyFishStudio.getLastRender().engine),'FrankFish Fast');
  assert.equal(await page.evaluate(()=>prettyFishStudio.getLastRender().mode),'worker');
  assert.ok(requests.every(u=>!u.endsWith('/fishdraw.js')),'the original generator is not loaded');
  const paper=await hash(page,'paper-canvas'),first=await hash(page,'fish-canvas');
  await page.screenshot({path:'artifacts/studio-desktop.png',fullPage:true});
  await page.screenshot({path:'docs/studio-preview.jpg',type:'jpeg',quality:90});

  // Real keyboard and nudge controls, as well as a continuous burst of input.
  const length=page.locator('#control-body_length');await show(length);await length.focus();await length.press('ArrowRight');await wait(page);
  assert.notEqual(await hash(page,'fish-canvas'),first);
  const beforeNudge=await page.evaluate(()=>prettyFishStudio.getState().params.body_height);
  await page.getByRole('button',{name:'Increase Body & surface Height',exact:true}).click();await wait(page);
  assert.notEqual(await page.evaluate(()=>prettyFishStudio.getState().params.body_height),beforeNudge);
  const beforeDrag=await page.evaluate(()=>prettyFishStudio.getMetrics().length);
  await page.evaluate(async()=>{const input=document.querySelector('#control-body_length');for(let i=0;i<20;i++){input.value=i;input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,16));}});
  await wait(page);
  const drag=await page.evaluate(before=>({state:prettyFishStudio.getState(),render:prettyFishStudio.getLastRender(),frames:prettyFishStudio.getMetrics().slice(before)}),beforeDrag);
  assert.equal(drag.state.params.body_length,420);assert.equal(drag.render.params.body_length,420,'latest slider state wins');
  assert.ok(drag.frames.filter(m=>m.quality==='draft').length>=2,'painting updates during the drag');
  assert.equal(await hash(page,'paper-canvas'),paper,'shape changes leave paper pixels untouched');

  // Every original control is interactive and reaches the worker.
  const catalogue=await page.evaluate(()=>prettyFishStudio.controls);
  for(const c of catalogue){
   const input=page.locator('#control-'+c.key);
   const parent={teeth_length:'has_teeth',teeth_space:'has_teeth',moustache_length:'has_moustache',beard_length:'has_beard'}[c.key];
   if(parent&&await input.isDisabled())await on(page,parent);
   if(c.key==='pattern_scale'&&await input.isDisabled()){await page.locator('#control-pattern_type').selectOption('1');await wait(page);}
   const current=await page.evaluate(key=>prettyFishStudio.getState().params[key],c.key);
   const index=c.values.indexOf(current),next=(index+1)%c.values.length,value=c.values[next];
   if(c.options&&c.options[0]==='Off') {await show(input);await input.setChecked(!!value);await wait(page);}
   else if(c.options&&c.options.length===2){const b=page.locator(`[data-control="${c.key}"] .segmented button[data-value="${value}"]`);await show(b);await b.click();await wait(page);}
   else if(c.options){await show(input);await input.selectOption(String(value));await wait(page);}
   else await range(page,c.key,next);
   assert.equal(await page.evaluate(key=>prettyFishStudio.getLastRender().params[key],c.key),value,c.key+' reaches the generator');
  }
  assert.equal(await hash(page,'paper-canvas'),paper);
  console.log('All 49 control interactions passed.');

  // Appearance controls reuse geometry; paper changes do not repaint the fish.
  const shape=await page.evaluate(()=>prettyFishStudio.getState().params);
  for(const palette of ['vermilion','indigo','plum','celadon']){
   const old=await hash(page,'fish-canvas');await page.locator('#palette').selectOption(palette);await wait(page);
   assert.notEqual(await hash(page,'fish-canvas'),old);
   assert.equal(await page.evaluate(()=>prettyFishStudio.getLastRender().geometryCached),true);
   assert.equal(await page.evaluate(()=>prettyFishStudio.getLastRender().generationMs),0);
   assert.deepEqual(await page.evaluate(()=>prettyFishStudio.getState().params),shape);
  }
  await page.locator('#pigment').evaluate(e=>{e.value=85;e.dispatchEvent(new Event('input',{bubbles:true}));});await wait(page);
  const imageBeforeGrain=await hash(page,'fish-canvas'),renderCount=await page.evaluate(()=>prettyFishStudio.getMetrics().length);
  await page.locator('#grain').evaluate(e=>{e.value=80;e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('#paper-canvas').dataset.grain==='80');
  assert.notEqual(await hash(page,'paper-canvas'),paper);assert.equal(await hash(page,'fish-canvas'),imageBeforeGrain);
  assert.equal(await page.evaluate(()=>prettyFishStudio.getMetrics().length),renderCount,'paper is independent of generation and paint');
  await page.locator('#grain').evaluate(e=>{e.value=45;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForFunction(()=>document.querySelector('#paper-canvas').dataset.grain==='45');
  assert.equal(await hash(page,'paper-canvas'),paper,'the same grain restores exact pixels');

  // Search, sticky preview, zoom and panning never regenerate anatomy.
  await page.locator('#control-search').fill('tail');assert.equal(await page.locator('[data-control]:visible').count(),3);await page.locator('#control-search').fill('');
  await show(page.locator('#group-head'));
  assert.ok(await page.locator('#artboard').evaluate(e=>{const b=e.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;}),'painted fish remains visible while editing the bottom controls');
  const metricCount=await page.evaluate(()=>prettyFishStudio.getMetrics().length);
  await page.locator('#zoom-in').click();assert.equal(await page.locator('#zoom-value').evaluate(e=>e.value),'125%');
  const box=await page.locator('#artboard').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+35,box.y+box.height/2+20);await page.mouse.up();
  const moved=await page.locator('#fish-view').evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return{x:m.e,y:m.f};});
  assert.ok(Math.abs(moved.x-35)<1&&Math.abs(moved.y-20)<1,'pan changes only the view transform');
  await page.locator('#fit').click();assert.equal(await page.locator('#zoom-value').evaluate(e=>e.value),'100%');
  assert.equal(await page.evaluate(()=>prettyFishStudio.getMetrics().length),metricCount);
  if(await page.evaluate(()=>document.fullscreenEnabled)){await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await wait(page);await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);await wait(page);}

  const download=page.waitForEvent('download');await page.locator('#download').click();const png=await download;await png.saveAs('artifacts/studio-export.png');
  const data=await fs.readFile('artifacts/studio-export.png');assert.ok(data.readUInt32BE(16)>=1000);assert.ok(data.readUInt32BE(20)>=300);
  const sharedState=await page.evaluate(()=>prettyFishStudio.getState());await page.locator('#share').click();const copied=await page.evaluate(()=>navigator.clipboard.readText());
  const replay=await context.newPage();await replay.goto(copied);await wait(replay);assert.deepEqual(await replay.evaluate(()=>prettyFishStudio.getState()),sharedState);
  assert.deepEqual(await replay.evaluate(()=>prettyFishStudio.getLastRender().params),sharedState.params);
  await replay.close();
  const oldSeed=sharedState.seed,styles=Object.fromEntries(catalogue.filter(c=>c.options).map(c=>[c.key,sharedState.params[c.key]]));
  await page.locator('#new-fish').click();await wait(page);
  assert.notEqual(await page.evaluate(()=>prettyFishStudio.getState().seed),oldSeed);
  for(const [key,value]of Object.entries(styles))assert.equal(await page.evaluate(key=>prettyFishStudio.getState().params[key],key),value,'New fish preserves '+key);
  assert.deepEqual(await page.evaluate(()=>prettyFishStudio.getState().appearance),sharedState.appearance);
  await page.locator('#reset').click();await wait(page);
  assert.deepEqual(await page.evaluate(()=>prettyFishStudio.getState().appearance),{palette:'celadon',pigment:65,grain:45});
  await page.locator('#seed').fill('Étoile 金魚');await page.locator('#seed-form button').click();await wait(page);
  assert.equal(await page.evaluate(()=>prettyFishStudio.getLastRender().seed),'Étoile 金魚');
  for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:900});await page.waitForFunction(()=>document.querySelector('#fish-canvas').dataset.layout===document.querySelector('#fish-canvas').width+'x'+document.querySelector('#fish-canvas').height&&document.querySelector('#artboard').getAttribute('aria-busy')==='false');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow at '+width);
   await page.evaluate(()=>scrollTo(0,0));if(width===390)await page.screenshot({path:'artifacts/studio-mobile.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);
  const report={date:'2026-11-05',checks:'49 controls, rapid latest-wins input, four palettes, geometry/ink caches, independent fixed paper, search, sticky preview, zoom/pan/fullscreen, PNG export, complete state links, New fish style retention, reset, Unicode seeds and 320–1440px layouts',drag:{updates:20,displayedFrames:drag.frames.length,draftFrames:drag.frames.filter(f=>f.quality==='draft').length,medianUpdateMs:drag.frames.map(f=>f.latencyMs).sort((a,b)=>a-b)[Math.floor(drag.frames.length/2)]},samples:(await page.evaluate(()=>prettyFishStudio.getMetrics())).slice(-16).map(({generationMs,paintMs,latencyMs,quality,geometryCached,mode})=>({generationMs,paintMs,latencyMs,quality,geometryCached,mode}))};
  report.timingMethod='Worker request dispatch to displayed frame; pending queue wait and final-render debounce are excluded.';
  await fs.writeFile('docs/browser-verification.json',JSON.stringify(report,null,2)+'\n');
  console.log('Browser checks passed. Drag: '+report.drag.displayedFrames+' displayed frames; median '+report.drag.medianUpdateMs.toFixed(1)+' ms.');

  const fallback=await browser.newContext({viewport:{width:1100,height:900}});await fallback.addInitScript(()=>{window.OffscreenCanvas=undefined;});
  const legacy=await fallback.newPage();await legacy.goto(base);await wait(legacy);assert.equal(await legacy.evaluate(()=>prettyFishStudio.getLastRender().mode),'main');
  await range(legacy,'body_height',15);assert.equal(await legacy.evaluate(()=>prettyFishStudio.getLastRender().params.body_height),127.8947);await fallback.close();
  report.fallback={mode:'main',controlUpdated:true};await fs.writeFile('docs/browser-verification.json',JSON.stringify(report,null,2)+'\n');
  console.log('Canvas fallback also passed.');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
