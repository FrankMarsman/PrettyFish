const {chromium}=require('@playwright/test');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const base=process.env.STUDIO_URL||'http://127.0.0.1:4184/';
(async()=>{
 await fs.mkdir('artifacts',{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const checked=[];
 try{
  for(const fallback of [false,true]){
   const context=await browser.newContext({viewport:{width:1280,height:1000}});
   if(fallback)await context.addInitScript(()=>{window.OffscreenCanvas=undefined;});
   const page=await context.newPage();
   await page.goto(base);
   await page.waitForFunction(()=>window.prettyFishStudio?.getLastRender()?.quality==='final'&&document.querySelector('#artboard').getAttribute('aria-busy')==='false');
   // The reported profile: original Aurelia seed, maximum body length and minimum curvature.
   await page.evaluate(()=>{
    for(const [key,index]of [['body_curve_amount',0],['body_length',19]]){const e=document.querySelector('#control-'+key);e.value=index;e.dispatchEvent(new Event('input',{bubbles:true}));}
   });
   await page.waitForFunction(()=>prettyFishStudio.getLastRender()?.revision===prettyFishStudio.getRevision()&&prettyFishStudio.getLastRender()?.quality==='final'&&document.querySelector('#artboard').getAttribute('aria-busy')==='false');
   const results=await page.evaluate(async()=>{
    await import('./vendor/frankfish-fast.js');const {frameFor}=await import('./painter.js');
    const state=prettyFishStudio.getState(),scene=FrankFish.sceneFor(state.seed,state.params);
    const canvas=document.querySelector('#fish-canvas'),box=document.querySelector('#artboard').getBoundingClientRect();
    const f=frameFor(scene,canvas.width,canvas.height,canvas.width/box.width),x=canvas.getContext('2d',{willReadFrequently:true});
    function sample(point,radius=0){const px=Math.round(f.x+point[0]*f.s),py=Math.round(f.y+point[1]*f.s);const data=x.getImageData(px-radius,py-radius,radius*2+1,radius*2+1).data;let alpha=0;for(let i=3;i<data.length;i+=4)alpha=Math.max(alpha,data[i]);return{point,alpha};}
    const body=scene.regions.find(r=>r.id==='body');
    return{mode:prettyFishStudio.getLastRender().mode,forehead:[[25,120],[35,118],[45,112]].map(p=>sample(p,1)),edge:sample(body.top[1],2),head:sample([55,150]),body:sample([180,145]),
     clip:{x:box.x+(f.x+10*f.s)*box.width/canvas.width,y:box.y+(f.y+90*f.s)*box.height/canvas.height,width:120*f.s*box.width/canvas.width,height:120*f.s*box.height/canvas.height}};
   });
   console.log(JSON.stringify(results));
   await page.screenshot({path:`artifacts/head-${process.env.HEAD_CAPTURE||'fixed'}-${fallback?'fallback':'worker'}.png`,clip:results.clip});
   for(const point of results.forehead)assert.equal(point.alpha,0,'No paint outside the forehead at '+point.point);
   assert.equal(results.edge.alpha,0,'No generic body-edge stroke above the head');
   assert.ok(results.head.alpha>20,'Actual head still has pigment');assert.ok(results.body.alpha>20,'Body still has pigment');
   const {clip,...samples}=results;checked.push(samples);
   await context.close();
  }
  await fs.writeFile('docs/head-clipping-verification.json',JSON.stringify({seed:'Aurelia elegans-e11143',overrides:{body_length:420,body_curve_amount:.5},checks:'Transparent forehead and body-edge pixels; retained head/body pigment; worker and canvas fallback',results:checked},null,2)+'\n');
  console.log('Head clipping regression passed in worker and canvas fallback.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
