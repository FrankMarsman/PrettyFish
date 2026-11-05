// Reproducible repository artwork: npm run render:samples
// Needs Chrome, the existing Playwright dev dependency, Python/Pillow and FFmpeg.
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path');
const http=require('node:http'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('@playwright/test');
const {interpolateParams,easedPosition,sharedBounds,playbackSequence,endpointParams,CONTINUOUS_KEYS}=require('./morph.cjs');
require('../dist/vendor/fishdraw.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'samples');
const work=path.join(root,'artifacts','media-frames');
const argument=new Set(process.argv.slice(2));
const renderStills=!argument.has('--animations-only')&&!argument.has('--diagram-only');
const renderAnimations=!argument.has('--stills-only')&&!argument.has('--diagram-only');
const paletteLabels={celadon:'Celadon & ochre',vermilion:'Vermilion & gold',indigo:'Indigo & pearl',plum:'Plum & rose'};
const spec=[
 ['aurelia-elegans','Aurelia elegans-e11143','celadon'],
 ['nerina-lucens','Nerina lucens','celadon'],
 ['luminata-aureata','Luminata aureata','vermilion'],
 ['pelagia-rosea','Pelagia rosea','plum'],
 ['caerula-argentea','Caerula argentea','indigo'],
 ['florina-viridis','Florina viridis','celadon'],
 ['velaria-lunaris','Velaria lunaris','indigo'],
 ['mirabilis-picta','Mirabilis picta','vermilion'],
 ['corallia-serena','Corallia serena','plum'],
 ['silvana-gracilis','Silvana gracilis','celadon'],
 ['ondina-florens','Ondina florens','vermilion'],
 ['rosella-velata','Rosella velata','plum']
];
const loops=[
 ['celadon-layered','celadon',1,0],['vermilion-fine','vermilion',0,1],
 ['indigo-crosshatch','indigo',2,2],['plum-linear','plum',3,3],
 ['celadon-fine','celadon',0,4],['vermilion-layered','vermilion',1,3],
 ['indigo-linear','indigo',3,1],['plum-crosshatch','plum',2,0]
];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const png=url=>Buffer.from(url.slice(url.indexOf(',')+1),'base64');
const writePNG=(file,url)=>fs.writeFileSync(file,png(url));
function serve() {
  return http.createServer(async(req,res)=>{
    try {
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(pathname==='/render') {res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body><script type="module" src="/tools/media-browser.js"></script></body></html>');return;}
      if(!pathname.startsWith('/dist/')&&pathname!=='/tools/media-browser.js'&&pathname!=='/docs/pipeline.svg') {res.writeHead(404).end();return;}
      const file=path.resolve(root,'.'+decodeURIComponent(pathname));
      if(!file.startsWith(path.join(root,'dist')+path.sep)&&file!==path.join(root,'tools','media-browser.js')&&file!==path.join(root,'docs','pipeline.svg')) {res.writeHead(403).end();return;}
      const data=await fsp.readFile(file);
      res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});res.end(data);
    }catch {res.writeHead(404).end();}
  });
}
async function main() {
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'stills'),{recursive:true});fs.mkdirSync(path.join(out,'animations'),{recursive:true});fs.mkdirSync(work,{recursive:true});
  const server=serve();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try { browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}); }
  catch(error) { await new Promise(resolve=>server.close(resolve));throw error; }
  const context=await browser.newContext(),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const manifest={formatVersion:1,width:480,height:288,sourceWidth:640,sourceHeight:384,fps:20,steps:36,holdFrames:10,
    source:{fishdraw:sha(fs.readFileSync(path.join(root,'dist/vendor/fishdraw.js'))),nonflowers:sha(fs.readFileSync(path.join(root,'dist/vendor/nonflowers.js'))),painter:sha(fs.readFileSync(path.join(root,'dist/paint.js')))},
    reference:'https://github.com/FrankMarsman/FrankFish/tree/main/samples',
    description:'Generated geometry at every step. One fixed paper canvas, one pigment noise seed, one shared camera, and one global GIF palette per loop. No cross-fade.',stills:[],animations:[]};
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/render`);await page.waitForFunction(()=>window.media);
    if(renderStills) {
      await page.evaluate(()=>media.setPaper('Pretty Fish specimen paper v1',45));
      const overview=[];
      for(const [slug,seed,palette]of spec) {
        const scene=FishDraw.createScene(seed),settings={palette,pigment:65,grain:45};
        const data=await page.evaluate(({scene,settings})=>media.render(scene,settings),{scene,settings});
        writePNG(path.join(out,'stills',slug+'.png'),data);
        overview.push({data,name:scene.name,paletteLabel:paletteLabels[palette]});
        manifest.stills.push({file:'stills/'+slug+'.png',seed,name:scene.name,settings,params:scene.params,width:1200,height:720});
        if(slug==='aurelia-elegans') {
          writePNG(path.join(out,'drawing-and-painting.png'),await page.evaluate(({scene,settings})=>media.comparison(scene,settings),{scene,settings}));
          writePNG(path.join(work,'pipeline-regions.png'),await page.evaluate(({scene,settings})=>media.render(scene,settings,640,384,null,'regions'),{scene,settings}));
        }
        console.log('Still: '+slug+' · '+palette);
      }
      writePNG(path.join(out,'gallery.png'),await page.evaluate(entries=>media.overview(entries),overview));
      fs.writeFileSync(path.join(out,'stills.json'),JSON.stringify(manifest.stills,null,2)+'\n');
    } else manifest.stills=JSON.parse(fs.readFileSync(path.join(out,'stills.json'),'utf8'));
    if(renderAnimations) {
      const steps=manifest.steps,sequence=playbackSequence(steps,manifest.holdFrames);
      for(let index=0;index<loops.length;index++) {
        const [slug,palette,scale_type,pattern_type]=loops[index],seed='Pretty Fish morph '+slug;
        const base=FishDraw.createScene(seed,{scale_type,pattern_type,has_teeth:0,has_moustache:0,has_beard:0,finlet_type:0,tail_type:index%6}).params;
        const {from,to}=endpointParams(base,index),scenes=[],geometry=[];
        for(let step=0;step<=steps;step++) {
          const scene=FishDraw.createScene(seed,interpolateParams(from,to,easedPosition(step,steps)));
          scenes.push(scene);geometry.push({step,position:easedPosition(step,steps),paths:scene.polylines.length,sha256:sha(JSON.stringify(scene.polylines))});
          if(step%12===0)console.log(slug+': generated '+step+'/'+steps);
        }
        const bounds=sharedBounds(scenes),frameDir=path.join(work,slug);fs.mkdirSync(frameDir,{recursive:true});
        const paperSeed='Pretty Fish fixed paper '+slug,paintSeed=seed+':stable-pigment';
        const paper=await page.evaluate(({paperSeed})=>media.setPaper(paperSeed,45),{paperSeed});
        writePNG(path.join(frameDir,'paper.png'),paper);
        const settings={palette,pigment:75,grain:45},hashes=[];
        for(let step=0;step<=steps;step++) {
          scenes[step].bounds=bounds;
          const data=await page.evaluate(({scene,settings,paintSeed})=>media.render(scene,settings,640,384,paintSeed),{scene:scenes[step],settings,paintSeed});
          const file=path.join(frameDir,'unique-'+String(step).padStart(3,'0')+'.png');writePNG(file,data);hashes.push(sha(png(data)));
          if(step%12===0)console.log(slug+': painted '+step+'/'+steps);
        }
        sequence.forEach((frame,i)=>fs.copyFileSync(path.join(frameDir,'unique-'+String(frame).padStart(3,'0')+'.png'),path.join(frameDir,String(i).padStart(3,'0')+'.png')));
        const file=path.join(out,'animations',slug+'.gif');
        execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','20','-i',path.join(frameDir,'%03d.png'),'-filter_complex','[0:v]scale=480:288:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle','-gifflags','+offsetting+transdiff','-loop','0',file],{stdio:'inherit'});
        const entry={file:'animations/'+slug+'.gif',seed,settings,from,to,scale_type,pattern_type,
          fixed:{paperSeed,paintSeed,paperSHA256:sha(png(paper)),bounds,palette:'one global palette for the entire loop',dither:'none'},
          interpolation:{keys:CONTINUOUS_KEYS,easing:'(1 - cos(pi * step / steps)) / 2',steps},
          sequence,durationMs:sequence.length*50,geometry,frameHashes:hashes,bytes:fs.statSync(file).size};
        manifest.animations.push(entry);
        fs.writeFileSync(path.join(out,'animations.json'),JSON.stringify(manifest.animations,null,2)+'\n');
        console.log('Loop complete: '+slug+' · '+Math.round(entry.bytes/1024)+' KiB');
      }
    } else if(fs.existsSync(path.join(out,'animations.json')))manifest.animations=JSON.parse(fs.readFileSync(path.join(out,'animations.json'),'utf8'));
    if(errors.length)throw new Error(errors.join('\n'));
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    execFileSync('python3',[path.join(__dirname,'finalize-samples.py')],{stdio:'inherit'});
    await page.goto(`http://127.0.0.1:${server.address().port}/docs/pipeline.svg`);
    await page.locator('svg').screenshot({path:path.join(root,'artifacts','pipeline.png')});
    console.log('Rendering complete: '+manifest.stills.length+' stills, '+manifest.animations.length+' loops.');
  } finally {
    await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
