import {groups,controls} from './controls.js';
import {normaliseParams,appearance,encodeState,decodeState,randomSeed} from './state.js';
import {createPaper,createPainter} from './painter.js';
const $=id=>document.getElementById(id),nodes=new Map();
const query=new URLSearchParams(location.search),saved=decodeState(query.get('s'));
const state=saved||{seed:(query.get('seed')||'Aurelia elegans-e11143').trim().slice(0,120),params:null,appearance:appearance(Object.fromEntries(query))};
const paperCanvas=$('paper-canvas'),backdropCanvas=$('backdrop-canvas'),fishCanvas=$('fish-canvas'),artboard=$('artboard'),fishView=$('fish-view');
let revision=0,epoch=0,nextId=0,inFlight=null,pending=null,settleTimer=null,urlTimer=null,paperRAF=null,worker=null,paramsRequest=0,loadingParams=false;
let layout={width:0,height:0,displayWidth:0,key:''},lastRender=null,lastQuality='',backdropKey='',mainPainter=null,mainScene=null,mainSceneKey='',paper=null,zoom=1,pan={x:0,y:0},drag=null;
const metrics=[],renderInWorker=typeof OffscreenCanvas==='function';
const format=n=>Number.isInteger(n)?String(n):Number(n.toFixed(2)).toString();
function tell(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function updateButtons(){const busy=loadingParams||!!inFlight||!!pending||!!settleTimer;$('status-dot').classList.toggle('busy',busy);artboard.setAttribute('aria-busy',String(busy));$('download').disabled=!lastRender||loadingParams||lastRender.revision!==revision||lastQuality!=='final'||busy;$('share').disabled=!state.params||loadingParams;}
function busyLabel(){if(loadingParams)$('render-status').textContent='Discovering a fish…';else if(inFlight||pending||settleTimer)$('render-status').textContent='Updating painting…';else $('render-status').textContent='Ready';updateButtons();}
function urlForState(){const u=new URL(location.href);u.search='';u.searchParams.set('s',encodeState(state));return u;}
function saveURL(){clearTimeout(urlTimer);urlTimer=setTimeout(()=>{if(state.params)history.replaceState(null,'',urlForState());},180);}
function view(){fishView.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;$('zoom-value').value=Math.round(zoom*100)+'%';artboard.style.touchAction=zoom>1?'none':'pan-y';}
function fit(){zoom=1;pan={x:0,y:0};view();}
function renderPaper(){paperRAF=null;if(!paper||!layout.width)return;paper.draw(paperCanvas,state.appearance.grain);paperCanvas.dataset.grain=String(state.appearance.grain);}
function queuePaper(){if(paperRAF===null)paperRAF=requestAnimationFrame(renderPaper);}
function resize(){const rect=artboard.getBoundingClientRect();if(rect.width<1||rect.height<1)return;const width=Math.min(1800,Math.max(800,Math.round(rect.width*Math.min(2,Math.max(1.5,devicePixelRatio||1))))),height=Math.round(width*rect.height/rect.width),key=width+'x'+height;
 if(key===layout.key)return;layout={width,height,displayWidth:rect.width,key};paperCanvas.width=backdropCanvas.width=fishCanvas.width=width;paperCanvas.height=backdropCanvas.height=fishCanvas.height=height;backdropKey='';renderPaper();if(state.params)requestRender('final');}
function disabledDetails(){const active={teeth_length:!!state.params?.has_teeth,teeth_space:!!state.params?.has_teeth,moustache_length:!!state.params?.has_moustache,beard_length:!!state.params?.has_beard,pattern_scale:!!state.params&&state.params.pattern_type!==0};
 for(const [key,on]of Object.entries(active)){const n=nodes.get(key);n.field.classList.toggle('is-inactive',!on);for(const el of n.field.querySelectorAll('input,button,select'))el.disabled=!on||loadingParams;if(on&&n.kind==='range'){const c=controls.find(c=>c.key===key),index=c.values.indexOf(state.params?.[c.key]);n.less.disabled=loadingParams||index<=0;n.more.disabled=loadingParams||index>=c.values.length-1;}}}
function syncField(c){const n=nodes.get(c.key),value=state.params?.[c.key]??c.values[0],index=c.values.indexOf(value);n.output.value=c.options?c.options[value]:format(value);
 if(n.kind==='boolean'){n.input.checked=!!value;n.booleanText.textContent=value?'On':'Off';}
 else if(n.kind==='segments')for(const button of n.buttons)button.setAttribute('aria-pressed',String(Number(button.dataset.value)===value));
 else if(c.options)n.input.value=String(value);
 else{n.input.value=String(Math.max(0,index));n.input.setAttribute('aria-valuetext',format(value));n.less.disabled=index<=0||loadingParams;n.more.disabled=index>=c.values.length-1||loadingParams;}
}
function syncAll(){for(const c of controls)syncField(c);$('seed').value=state.seed;for(const key of ['palette','pigment','grain'])$(key).value=state.appearance[key];$('pigment-value').value=state.appearance.pigment+'%';$('grain-value').value=state.appearance.grain+'%';disabledDetails();}
function setControl(c,value){if(!state.params||loadingParams)return;state.params[c.key]=value;syncField(c);disabledDetails();revision++;requestRender('draft');clearTimeout(settleTimer);settleTimer=setTimeout(()=>{settleTimer=null;requestRender('final');},140);busyLabel();}
function buildControls(){
 for(const [group,title,items]of groups){
  const section=document.createElement('section');section.className='shape-group'+(['body','head'].includes(group)?' wide':'');section.dataset.group=group;section.setAttribute('aria-labelledby','group-'+group);
  const heading=document.createElement('div');heading.className='group-heading';const h=document.createElement('h3');h.id='group-'+group;h.textContent=title;const count=document.createElement('span');count.textContent=items.length+' CONTROLS';heading.append(h,count);const grid=document.createElement('div');grid.className='param-grid';
  for(const c of controls.filter(c=>c.group===group)){
   const field=document.createElement('div');field.className='field';field.dataset.control=c.key;field.dataset.search=(title+' '+c.label+' '+c.key).toLowerCase();const label=document.createElement('label');label.className='field-label';label.htmlFor='control-'+c.key;const name=document.createElement('span');name.textContent=c.label;const output=document.createElement('output');output.htmlFor='control-'+c.key;label.append(name,output);field.append(label);
   const n={field,output};if(c.options)output.hidden=true;
   if(c.options&&c.options[0]==='Off'&&c.options[1]==='On'){
    n.kind='boolean';const row=document.createElement('label');row.className='check-row';row.htmlFor='control-'+c.key;const input=document.createElement('input');input.type='checkbox';input.className='switch';input.id='control-'+c.key;input.setAttribute('role','switch');input.setAttribute('aria-label',title+' '+c.label);input.addEventListener('change',()=>setControl(c,input.checked?1:0));const text=document.createElement('span');row.append(text,input);field.append(row);n.input=input;n.booleanText=text;
   }else if(c.toggle){
    n.kind='segments';const row=document.createElement('div');row.className='segmented';row.setAttribute('role','group');row.setAttribute('aria-label',title+' '+c.label);n.buttons=c.options.map((option,i)=>{const b=document.createElement('button');b.type='button';b.dataset.value=i;b.textContent=option;b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',title+' '+c.label+': '+option);b.addEventListener('click',()=>setControl(c,i));row.append(b);return b;});field.append(row);label.removeAttribute('for');
   }else if(c.options){
    n.kind='select';const select=document.createElement('select');select.id='control-'+c.key;select.setAttribute('aria-label',title+' '+c.label);for(let i=0;i<c.options.length;i++){const option=document.createElement('option');option.value=i;option.textContent=c.options[i];select.append(option);}select.addEventListener('change',()=>setControl(c,Number(select.value)));field.append(select);n.input=select;
   }else{
    n.kind='range';const row=document.createElement('div');row.className='range-row';const input=document.createElement('input');input.type='range';input.id='control-'+c.key;input.min=0;input.max=c.values.length-1;input.step=1;input.setAttribute('aria-label',title+' '+c.label);input.addEventListener('input',()=>setControl(c,c.values[Number(input.value)]));
    for(const [key,dir,text]of [['less',-1,'−'],['more',1,'+']]){const b=document.createElement('button');b.type='button';b.className='nudge';b.textContent=text;b.setAttribute('aria-label',(dir<0?'Decrease ':'Increase ')+title+' '+c.label);b.addEventListener('click',()=>{const index=c.values.indexOf(state.params[c.key]);setControl(c,c.values[Math.max(0,Math.min(c.values.length-1,index+dir))]);});n[key]=b;}
    row.append(n.less,input,n.more);field.append(row);n.input=input;
   }
   nodes.set(c.key,n);grid.append(field);
  }
  section.append(heading,grid);$('control-groups').append(section);
 }
}
function pump(){if(inFlight||!pending)return;inFlight=pending;pending=null;inFlight.sentAt=performance.now();worker.postMessage(inFlight);busyLabel();}
function requestRender(quality='final'){
 if(!state.params||loadingParams||!layout.width)return;
 const width=quality==='draft'?Math.min(860,Math.max(400,Math.round(layout.displayWidth*.8))):layout.width,height=Math.round(width*layout.height/layout.width);
 pending={id:++nextId,action:'render',epoch,revision,quality,seed:state.seed,params:{...state.params},appearance:{...state.appearance},width,height,pixelRatio:width/layout.displayWidth,renderInWorker,layoutKey:layout.key};pump();busyLabel();
}
function loadParams(random,preserve=false){
 clearTimeout(settleTimer);settleTimer=null;epoch++;loadingParams=true;pending={id:++nextId,action:'params',seed:state.seed,random,epoch,preserve,previous:state.params?{...state.params}:null};paramsRequest=pending.id;
 for(const n of nodes.values())for(const e of n.field.querySelectorAll('input,select,button'))e.disabled=true;
 pump();busyLabel();
}
function receive(data){
 const job=inFlight;if(!job||data.id!==job.id){data.bitmap?.close();return;}inFlight=null;
 if(data.error){tell('This combination could not be painted. Adjust a control, reset, or choose New fish.',true);$('render-status').textContent='Try another shape';loadingParams=false;syncAll();pump();updateButtons();console.error(data.error);return;}
 if(data.action==='params'){
  if(data.id===paramsRequest){state.params=normaliseParams(data.params);if(job.preserve&&job.previous)for(const c of controls)if(c.options)state.params[c.key]=job.previous[c.key];loadingParams=false;revision++;for(const n of nodes.values())for(const e of n.field.querySelectorAll('input,select,button'))e.disabled=false;syncAll();requestRender('final');}
 }else if(job.epoch===epoch&&job.layoutKey===layout.key){
  let canvas=data.bitmap,backdrop=data.backdrop,paintMs=data.paintMs;
  if(data.mode==='main'){mainPainter??=createPainter();if(mainSceneKey!==data.key){mainScene=data.scene;mainSceneKey=data.key;}const result=mainPainter.render(mainScene,job.appearance,job.width,job.height,job.pixelRatio);canvas=result.canvas;backdrop=result.backdrop;paintMs=result.paintMs;}
  const nextBackdropKey=JSON.stringify(backdrop);if(backdropKey!==nextBackdropKey){paper.drawBackdrop(backdropCanvas,backdrop);backdropKey=nextBackdropKey;}
  const x=fishCanvas.getContext('2d',{willReadFrequently:true});x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,fishCanvas.width,fishCanvas.height);x.drawImage(canvas,0,0,fishCanvas.width,fishCanvas.height);data.bitmap?.close();
  lastQuality=job.quality;lastRender={id:job.id,revision:job.revision,quality:job.quality,seed:job.seed,params:data.params,appearance:job.appearance,backdrop,generationMs:data.generationMs,paintMs,totalMs:data.totalMs,latencyMs:performance.now()-job.sentAt,geometryCached:data.geometryCached,inkCached:data.inkCached,mode:data.mode,engine:data.engine};
  metrics.push(lastRender);if(metrics.length>200)metrics.shift();
  const name=job.seed.replace(/-[a-f0-9]{6}$/i,'');$('painting-title').textContent=name;artboard.setAttribute('aria-label',`Painted ${name}, in the ${job.appearance.palette} palette, on textured paper`);
  fishCanvas.dataset.revision=job.revision;fishCanvas.dataset.quality=job.quality;fishCanvas.dataset.seed=job.seed;fishCanvas.dataset.engine=data.engine;fishCanvas.dataset.layout=job.layoutKey;
  $('timing').textContent=Math.round(lastRender.latencyMs)+' ms';
  if(job.quality==='final'&&job.revision===revision){tell('Painting ready.');saveURL();}
  window.dispatchEvent(new CustomEvent('studio:rendered',{detail:lastRender}));
 }else data.bitmap?.close();
 pump();busyLabel();
}
function createWorker(){worker?.terminate();worker=new Worker(new URL('./render-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>receive(data);worker.onerror=error=>{inFlight=null;pending=null;loadingParams=false;clearTimeout(settleTimer);settleTimer=null;tell('The painting engine could not load. Reload the page to try again.',true);$('render-status').textContent='Unable to load';updateButtons();console.error(error.message);};}
function download(){if(!lastRender||$('download').disabled)return;if(paperRAF!==null){cancelAnimationFrame(paperRAF);renderPaper();}
 const c=document.createElement('canvas');c.width=paperCanvas.width;c.height=paperCanvas.height;const x=c.getContext('2d');x.drawImage(paperCanvas,0,0);x.drawImage(backdropCanvas,0,0);x.globalCompositeOperation='multiply';const ratio=c.width/layout.displayWidth;x.translate(c.width/2+pan.x*ratio,c.height/2+pan.y*ratio);x.scale(zoom,zoom);x.translate(-c.width/2,-c.height/2);x.drawImage(fishCanvas,0,0);
 c.toBlob(blob=>{if(!blob){tell('The image could not be saved. Please try again.',true);return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(state.seed.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'pretty-fish')+'-'+state.appearance.palette+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');
}
buildControls();createWorker();paper=createPaper();syncAll();new ResizeObserver(resize).observe(artboard);resize();
if(state.params){revision++;requestRender('final');}else loadParams(true);
for(const key of ['palette','pigment'])$(key).addEventListener(key==='palette'?'change':'input',()=>{state.appearance[key]=key==='palette'?$(key).value:Number($(key).value);$('pigment-value').value=state.appearance.pigment+'%';if(!state.params)return;revision++;requestRender('draft');clearTimeout(settleTimer);settleTimer=setTimeout(()=>{settleTimer=null;requestRender('final');},120);busyLabel();});
$('grain').addEventListener('input',()=>{state.appearance.grain=Number($('grain').value);$('grain-value').value=state.appearance.grain+'%';queuePaper();saveURL();});
$('new-fish').addEventListener('click',()=>{state.seed=randomSeed();$('seed').value=state.seed;fit();loadParams(true,true);});
$('reset').addEventListener('click',()=>{state.appearance=appearance();syncAll();queuePaper();fit();loadParams(false,false);});
$('seed-form').addEventListener('submit',event=>{event.preventDefault();const value=$('seed').value.trim().slice(0,120);if(!value)return;state.seed=value;epoch++;revision++;clearTimeout(settleTimer);settleTimer=null;requestRender('final');});
$('share').addEventListener('click',async()=>{if(!state.params)return;const url=urlForState().href;history.replaceState(null,'',url);try{await navigator.clipboard.writeText(url);tell('Link copied — all shape and painting settings are included.');}catch{tell('Your settings are in the address bar. Copy that link to share this fish.');}});
$('download').addEventListener('click',download);
$('control-search').addEventListener('input',()=>{const term=$('control-search').value.trim().toLowerCase();let count=0;for(const n of nodes.values()){n.field.hidden=!!term&&!term.split(/\s+/).every(t=>n.field.dataset.search.split(/[^a-z0-9]+/).some(word=>word.startsWith(t)));if(!n.field.hidden)count++;}for(const section of document.querySelectorAll('.shape-group'))section.hidden=![...section.querySelectorAll('[data-control]')].some(e=>!e.hidden);$('control-count').textContent=term?`${count} matching controls`:'49 controls · the painting stays in view';});
$('zoom-in').addEventListener('click',()=>{zoom=Math.min(3,zoom+.25);view();});$('zoom-out').addEventListener('click',()=>{zoom=Math.max(.5,zoom-.25);view();});$('fit').addEventListener('click',fit);
function fullscreenLabel(){const active=!!document.fullscreenElement;$('fullscreen').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');$('fullscreen').setAttribute('aria-pressed',String(active));$('fullscreen').firstChild.textContent=active?'Exit fullscreen ':'Fullscreen ';}
document.addEventListener('fullscreenchange',fullscreenLabel);fullscreenLabel();
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('preview').requestFullscreen();}catch{tell('Fullscreen is unavailable in this browser.');}});
artboard.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&zoom===1)return;drag={x:e.clientX,y:e.clientY,start:{...pan}};artboard.setPointerCapture(e.pointerId);artboard.classList.add('dragging');});
artboard.addEventListener('pointermove',e=>{if(!drag)return;pan={x:drag.start.x+e.clientX-drag.x,y:drag.start.y+e.clientY-drag.y};view();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])artboard.addEventListener(name,()=>{drag=null;artboard.classList.remove('dragging');});
window.prettyFishStudio={getState:()=>structuredClone(state),getLastRender:()=>structuredClone(lastRender),getMetrics:()=>structuredClone(metrics),getRevision:()=>revision,controls:controls.map(c=>({key:c.key,values:c.values,options:c.options,group:c.group})),normaliseParams};
