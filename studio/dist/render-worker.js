import './vendor/frankfish-fast.js';
import {createPainter} from './painter.js';
import {normaliseParams,shapeKey} from './state.js';
let scene=null,key='',painter=null;
const canPaint=typeof OffscreenCanvas==='function'&&!!new OffscreenCanvas(1,1).getContext('2d');
self.onmessage=({data})=>{
 try{
  if(data.action==='params'){
   const raw=FrankFish.paramsForSeed(data.seed,data.random!==false);
   postMessage({id:data.id,action:'params',params:normaliseParams(raw),engine:'FrankFish Fast'});return;
  }
  const started=performance.now(),params=normaliseParams(data.params),nextKey=shapeKey(data.seed,params);
  let generationMs=0,geometryCached=key===nextKey&&!!scene;
  if(!geometryCached){const t=performance.now();scene=FrankFish.sceneFor(data.seed,params);generationMs=performance.now()-t;key=nextKey;}
  const common={id:data.id,revision:data.revision,quality:data.quality,geometryCached,generationMs,engine:'FrankFish Fast',params,key};
  if(canPaint&&data.renderInWorker){
   painter??=createPainter();
   const result=painter.render(scene,data.appearance,data.width,data.height,data.pixelRatio);
   const bitmap=result.canvas.transferToImageBitmap();
   postMessage({...common,mode:'worker',bitmap,paintMs:result.paintMs,inkCached:result.inkCached,totalMs:performance.now()-started},[bitmap]);
  }else postMessage({...common,mode:'main',scene,totalMs:performance.now()-started});
 }catch(error){postMessage({id:data.id,revision:data.revision,error:error.message||String(error)});}
};
