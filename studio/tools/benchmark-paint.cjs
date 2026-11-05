const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('@playwright/test');
(async()=>{
 const source=await fs.readFile(path.join(__dirname,'../tests/fixtures/pretty-painter.js'),'utf8');
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1050}});
 try{
  const page=await context.newPage();await page.goto(process.env.STUDIO_URL||'http://127.0.0.1:4184/');
  await page.waitForFunction(()=>window.prettyFishStudio?.getLastRender()?.quality==='final'&&document.querySelector('#artboard').getAttribute('aria-busy')==='false');
  const results=await page.evaluate(async source=>{
   await import('./vendor/frankfish-fast.js');const {createPainter}=await import('./painter.js');
   const url=URL.createObjectURL(new Blob([source.replace("import './vendor/nonflowers.js';",'')],{type:'text/javascript'}));
   const old=await import(url);URL.revokeObjectURL(url);
   const oldCanvas=document.createElement('canvas');oldCanvas.width=1200;oldCanvas.height=720;
   const fast=createPainter(),settings={palette:'celadon',pigment:65,grain:45},results=[];
   const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
   for(let style=0;style<4;style++){
    const before=[],after=[];
    for(let i=0;i<4;i++){
     const params={...FrankFish.default_params(),scale_type:style,body_height:75+i*5,has_teeth:0,has_moustache:0};
     const scene=FrankFish.sceneFor('Painting performance',params);
     const t=performance.now();old.drawPainting(oldCanvas,scene,settings);const ms=performance.now()-t;
     const result=fast.render(scene,settings,1200,720,1.2);
     if(i){before.push(ms);after.push(result.paintMs);}
    }
    const prettyFishMs=median(before),studioMs=median(after);
    results.push({style:['Fine','Layered','Crosshatch','Linear'][style],prettyFishMs:+prettyFishMs.toFixed(2),studioMs:+studioMs.toFixed(2),speedup:+(prettyFishMs/studioMs).toFixed(2)});
   }
   return{method:'Same browser, same Fast-generated region geometry, same 1200 × 720 size and palette. One warm-up per style, medians of three changing-anatomy paintings. Studio uses its cached texture and paper; original Pretty Fish recreates paper and filters every image. Geometry generation excluded; new ink masks are calculated for every sample.',userAgent:navigator.userAgent,results};
  },source);
  await fs.writeFile('docs/painting-performance.json',JSON.stringify({date:'2026-11-05',...results},null,2)+'\n');console.log(results);
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
