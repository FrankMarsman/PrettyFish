import { drawOriginal, drawPainting, drawRegions, originalSVG, REGION_COLORS, REGION_NAMES, PALETTES } from './paint.js';

const $=id=>document.getElementById(id);
const lineCanvas=$('line-canvas'),paintCanvas=$('paint-canvas');
const params=new URLSearchParams(location.search);
const settings={
  palette:Object.hasOwn(PALETTES,params.get('palette'))?params.get('palette'):'celadon',
  pigment:parseSetting(params.get('pigment'),65),
  grain:parseSetting(params.get('grain'),45)
};
let scene=null,plate=0,worker=null,requestId=0,pending=null,paintTimer=null,lastPainting=null;
const status=$('status');
function parseSetting(value,fallback) { return value!==null&&value.trim()!==''&&Number.isFinite(Number(value))?Math.max(0,Math.min(100,Math.round(Number(value)/5)*5)):fallback; }
function randomSeed() {
  const first=['Aurelia','Nerina','Luminata','Pelagia','Caerula','Florina','Velaria','Mirabilis','Corallia','Silvana','Ondina','Rosella'];
  const last=['lucens','serena','aureata','elegans','viridis','rosea','lunaris','picta','gracilis','argentea','florens','velata'];
  const n=crypto.getRandomValues(new Uint32Array(3));
  return `${first[n[0]%first.length]} ${last[n[1]%last.length]}-${n[2].toString(16).padStart(8,'0').slice(0,6)}`;
}
function setStatus(message,error=false) { status.textContent=message;status.classList.toggle('error',error); }
function setBusy(value) {
  $('studies').setAttribute('aria-busy',String(value));
  $('new-fish').disabled=value;
  for(const id of ['download-svg','share']) $(id).disabled=value||!scene;
  $('download-png').disabled=value||!lastPainting;
}
function syncControls() {
  $('palette').value=settings.palette;
  for(const key of ['pigment','grain']) { $(key).value=settings[key];$(key+'-value').value=settings[key]+'%'; }
}
function shareURL() {
  const url=new URL(location.href);url.search='';
  url.searchParams.set('seed',scene.seed);
  url.searchParams.set('palette',settings.palette);
  url.searchParams.set('pigment',settings.pigment);
  url.searchParams.set('grain',settings.grain);
  return url;
}
function updateURL() { if(scene) history.replaceState(null,'',shareURL()); }
function repaint() {
  if(!scene) return;
  try {
    drawPainting(paintCanvas,scene,settings);
    lastPainting=paintCanvas.getContext('2d').getImageData(0,0,paintCanvas.width,paintCanvas.height);
    if($('regions').checked) drawRegions(paintCanvas,scene);
    updateURL();
    setStatus(`${scene.regions.filter(r=>!['eye','jaw'].includes(r.id)).length} regions · Same anatomy, a different medium.`);
    paintCanvas.dataset.seed=scene.seed;
    paintCanvas.dataset.palette=settings.palette;
    paintCanvas.dataset.pigment=String(settings.pigment);
    paintCanvas.dataset.grain=String(settings.grain);
    window.dispatchEvent(new CustomEvent('prettyfish:painted',{detail:{seed:scene.seed,settings:{...settings}}}));
  } catch(error) { setStatus('The painting could not be completed. '+error.message,true);console.error(error); }
}
function showLegend() {
  const legend=$('region-legend');legend.replaceChildren();legend.hidden=!$('regions').checked;
  if(!scene) return;
  for(const region of scene.regions) {
    if(['eye','jaw'].includes(region.id)) continue;
    const item=document.createElement('li'),swatch=document.createElement('span');
    swatch.className='swatch';swatch.style.setProperty('--region',REGION_COLORS[region.id]);swatch.setAttribute('aria-hidden','true');
    item.append(swatch,document.createTextNode(REGION_NAMES[region.id]));legend.append(item);
  }
}
function createWorker() {
  worker?.terminate();worker=new Worker(new URL('./fish-worker.js',import.meta.url));
  worker.onmessage=({data})=>{
    if(data.id!==requestId) return;
    clearTimeout(pending);pending=null;
    if(data.error) {setBusy(false);setStatus('This specimen could not be drawn. Try another seed or New fish.',true);console.error(data.error);return;}
    scene=data.scene;lastPainting=null;plate++;
    $('plate').textContent='PLATE '+String(plate).padStart(3,'0');
    $('specimen-name').textContent=scene.name;
    $('seed-input').value=scene.seed;
    lineCanvas.setAttribute('aria-label',`Fine line drawing of ${scene.name}`);
    paintCanvas.setAttribute('aria-label',`The same ${scene.name}, painted in colour on textured paper`);
    lineCanvas.dataset.seed=scene.seed;
    drawOriginal(lineCanvas,scene);repaint();showLegend();setBusy(false);
  };
  worker.onerror=error=>{clearTimeout(pending);pending=null;setBusy(false);setStatus('The drawing engine could not load. Please reload the page.',true);console.error(error.message);};
}
function generate(seed) {
  clearTimeout(paintTimer);clearTimeout(pending);
  if(pending) createWorker();
  requestId++;setBusy(true);setStatus('Discovering a fish. Mixing its colours…');
  worker.postMessage({id:requestId,seed});
  pending=setTimeout(()=>{worker.terminate();pending=null;setBusy(false);setStatus('This specimen took too long to draw. Try New fish or a different seed.',true);createWorker();},20000);
}
function download(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function filename() {return scene.seed.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'pretty-fish';}
$('new-fish').addEventListener('click',()=>generate(randomSeed()));
$('seed-form').addEventListener('submit',event=>{event.preventDefault();const seed=$('seed-input').value.trim();if(seed) generate(seed.slice(0,120));});
$('palette').addEventListener('change',()=>{settings.palette=$('palette').value;clearTimeout(paintTimer);repaint();});
for(const key of ['pigment','grain']) $(key).addEventListener('input',()=>{
  settings[key]=Number($(key).value);$(key+'-value').value=settings[key]+'%';
  clearTimeout(paintTimer);paintTimer=setTimeout(()=>{paintTimer=null;repaint();},120);
});
$('regions').addEventListener('change',()=>{
  if(!scene||!lastPainting) return;
  paintCanvas.getContext('2d').putImageData(lastPainting,0,0);
  if($('regions').checked) drawRegions(paintCanvas,scene);
  showLegend();
});
$('download-svg').addEventListener('click',()=>{if(scene) download(new Blob([originalSVG(scene)],{type:'image/svg+xml'}),filename()+'-drawing.svg');});
$('download-png').addEventListener('click',()=>{
  if(paintTimer) { clearTimeout(paintTimer);paintTimer=null;repaint(); }
  if(!scene||!lastPainting) return;
  // Export the clean painting even while the anatomical overlay is visible.
  const clean=document.createElement('canvas');clean.width=paintCanvas.width;clean.height=paintCanvas.height;
  clean.getContext('2d').putImageData(lastPainting,0,0);
  clean.toBlob(blob=>{if(blob) download(blob,filename()+'-'+settings.palette+'.png');else setStatus('The PNG could not be saved. Please try again.',true);},'image/png');
});
$('share').addEventListener('click',async()=>{
  if(!scene) return;
  const url=shareURL().href;
  try {await navigator.clipboard.writeText(url);setStatus('Specimen link copied — its fish, palette and texture are saved.');}
  catch {updateURL();setStatus('Copy the address in your browser to share this specimen.');}
});
syncControls();createWorker();generate((params.get('seed')||randomSeed()).trim().slice(0,120)||randomSeed());
