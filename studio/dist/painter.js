import './vendor/nonflowers.js';
export const PALETTES={
 celadon:{back:[163,.30,.42],middle:[100,.24,.72],belly:[44,.10,.98],fin:[30,.38,.76],tip:[38,.16,.97],ink:[74,57,37]},
 vermilion:{back:[12,.62,.62],middle:[28,.50,.87],belly:[45,.12,.99],fin:[13,.52,.78],tip:[44,.25,.99],ink:[88,40,28]},
 indigo:{back:[214,.50,.41],middle:[195,.27,.72],belly:[42,.06,.99],fin:[217,.37,.68],tip:[194,.12,.96],ink:[34,54,69]},
 plum:{back:[293,.29,.45],middle:[340,.25,.76],belly:[35,.09,.99],fin:[338,.36,.74],tip:[26,.15,.98],ink:[67,43,59]}
};
export function surface(w,h){
 if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);
 const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function ctx(c){return c.getContext('2d');}
function reset(c,w,h){if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;const x=ctx(c);x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-over';x.clearRect(0,0,w,h);return x;}
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const clamp=v=>Math.max(0,Math.min(1,v));
function path(x,points){x.beginPath();if(!points.length)return;x.moveTo(...points[0]);for(let i=1;i<points.length;i++)x.lineTo(...points[i]);x.closePath();}
function bounds(points){let x=Infinity,y=Infinity,r=-Infinity,b=-Infinity;for(const p of points){x=Math.min(x,p[0]);y=Math.min(y,p[1]);r=Math.max(r,p[0]);b=Math.max(b,p[1]);}return{x,y,w:r-x,h:b-y};}
function centre(points){return points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);}
// The body envelope extends behind the head. Subtract the same extended head
// mask used by FrankFish's ink clipping, including the empty area above its face.
function excludeHead(x,body){
 if(!body.headCutout?.length)return;
 const b=bounds(body.outline);x.beginPath();x.rect(b.x-4,b.y-4,b.w+8,b.h+8);
 const points=body.headCutout;x.moveTo(...points[0]);for(let i=1;i<points.length;i++)x.lineTo(...points[i]);x.closePath();
 x.clip('evenodd');
}
export function frameFor(scene,w,h,ratio=1){const b=scene.bounds,s=Math.min((w-60*ratio)/b.w,(h-48*ratio)/b.h);return{s,x:(w-b.w*s)/2-b.x*s,y:(h-b.h*s)/2-b.y*s};}
function transform(x,f){x.setTransform(f.s,0,0,f.s,f.x,f.y);}

// The original fade/wispy alpha operations are evaluated once, not once per pixel
// on every slider event. Canvas applies this stable field to each new pigment layer.
function pigmentMask(nf){
 const c=surface(600,360),x=ctx(c),image=x.createImageData(600,360),d=image.data,strength=.76;
 for(let i=0;i<d.length;i+=4){const px=i/4%600,py=Math.floor(i/4/600);const faded=nf.Filter.fade(px,py,255,255,255,255);const wispy=nf.Filter.wispy(px,py,...faded);d[i]=d[i+1]=d[i+2]=255;d[i+3]=255*(1-strength)+wispy[3]*strength;}
 x.putImageData(image,0,0);return c;
}
function bodyWash(x,r,nf,palette,pigment){
 const top=r.top,bottom=r.bottom,rows=16;
 x.save();path(x,r.outline);x.clip();excludeHead(x,r);
 for(let i=1;i<top.length;i++)for(let j=0;j<rows;j++){
  const u=j/rows,v=(j+1)/rows,t=(i-.5)/(top.length-1),m=(u+v)/2;
  const colour=m<.46?mix(palette.back,palette.middle,m/.46):mix(palette.middle,palette.belly,(m-.46)/.54);
  colour[2]=clamp(colour[2]+(nf.noise(t*7,m*6,4)-.5)*.09);
  nf.polygon({ctx:x,pts:[mix(top[i-1],bottom[i-1],u),mix(top[i],bottom[i],u),mix(top[i],bottom[i],v),mix(top[i-1],bottom[i-1],v)],col:nf.hsv(...colour,.5+pigment*.4),fil:true,str:true});
 }
 x.restore();
}
function finWash(x,r,nf,palette,pigment){
 const b=bounds(r.outline),root=centre(r.root.length?r.root:r.outline);let far=root,dist=0;
 for(const p of r.outline){const d=Math.hypot(p[0]-root[0],p[1]-root[1]);if(d>dist){far=p;dist=d;}}
 const gradient=x.createLinearGradient(...root,far[0]+.01,far[1]+.01);
 gradient.addColorStop(0,nf.hsv(...palette.fin,.60+pigment*.27));gradient.addColorStop(.5,nf.hsv(...mix(palette.fin,palette.tip,.55),.58+pigment*.17));gradient.addColorStop(1,nf.hsv(...palette.tip,.45+pigment*.15));
 x.save();path(x,r.outline);x.clip();x.fillStyle=gradient;x.fillRect(b.x-1,b.y-1,b.w+2,b.h+2);x.restore();
}
function headWash(x,r,nf,palette,pigment){
 const b=bounds(r.outline),g=x.createLinearGradient(0,b.y,0,b.y+b.h+.1);
 g.addColorStop(0,nf.hsv(...mix(palette.back,palette.middle,.35),.88));g.addColorStop(.5,nf.hsv(...mix(palette.middle,palette.belly,.3),.92));g.addColorStop(1,nf.hsv(...palette.belly,.94));
 x.save();path(x,r.outline);x.clip();x.fillStyle=g;x.fillRect(b.x,b.y,b.w,b.h);
 const blush=x.createRadialGradient(b.x+b.w*.68,b.y+b.h*.6,0,b.x+b.w*.68,b.y+b.h*.6,Math.max(b.w,b.h)*.52);
 blush.addColorStop(0,nf.hsv(...palette.fin,.24+pigment*.16));blush.addColorStop(1,nf.hsv(...palette.fin,0));x.fillStyle=blush;x.fillRect(b.x,b.y,b.w,b.h);x.restore();
}
function brush(x,lines,nf,alpha,width,f,ratio){
 for(const pts of lines)nf.stroke({ctx:x,pts,col:`rgba(0,0,0,${alpha})`,wid:t=>width*ratio/f.s*(.35+.65*Math.sin(Math.PI*t))*(.75+nf.noise(t*11)*.25)});
}
export function createPainter(){
 const nf=Nonflowers.create('Pretty Fish Studio pigment v1'),mask=pigmentMask(nf);
 const pigment=surface(1,1),ink=surface(1,1),output=surface(1,1),inkCache=new Map();let currentScene=null;
 return{
  render(scene,settings,w,h,ratio=1){
   const started=performance.now(),palette=PALETTES[settings.palette]||PALETTES.celadon,f=frameFor(scene,w,h,ratio),p=settings.pigment/100;
   if(scene!==currentScene){currentScene=scene;inkCache.clear();}
   const key=w+'x'+h+':'+ratio;
   let raw=inkCache.get(key),inkCached=!!raw;
   if(!raw){
    raw=surface(w,h);const x=ctx(raw);transform(x,f);
    brush(x,scene.groups.shading,nf,.13,.18,f,ratio);brush(x,scene.groups.pattern,nf,.21,.21,f,ratio);
    brush(x,scene.groups.body,nf,.46,.27,f,ratio);brush(x,scene.groups.fins,nf,.53,.28,f,ratio);brush(x,scene.groups.head,nf,.64,.30,f,ratio);
    for(const r of scene.regions)if(['body','fin'].includes(r.kind)){x.save();if(r.kind==='body')excludeHead(x,r);nf.stroke({ctx:x,pts:r.kind==='body'?r.top:r.outline,col:'rgba(0,0,0,.25)',wid:t=>(.19*ratio/f.s)*(.5+.5*Math.sin(t*Math.PI))});x.restore();}
    if(inkCache.size>=2)inkCache.delete(inkCache.keys().next().value);inkCache.set(key,raw);
   }
   const x=reset(pigment,w,h);transform(x,f);x.lineWidth=.7*ratio/f.s;
   for(const r of scene.regions){
    if(r.kind==='body')bodyWash(x,r,nf,palette,p);
    else if(r.kind==='fin')finWash(x,r,nf,palette,p);
    else if(r.kind==='head')headWash(x,r,nf,palette,p);
    else if(r.kind==='jaw')nf.polygon({ctx:x,pts:r.outline,col:nf.hsv(...palette.belly,.95)});
    else if(r.kind==='eye')nf.polygon({ctx:x,pts:r.outline,col:nf.hsv(44,.12,.99,.98)});
   }
   x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='destination-in';x.drawImage(mask,0,0,w,h);x.globalCompositeOperation='source-over';
   const ix=reset(ink,w,h);ix.drawImage(raw,0,0);ix.globalCompositeOperation='source-in';ix.fillStyle=`rgb(${palette.ink.join(',')})`;ix.fillRect(0,0,w,h);ix.globalCompositeOperation='source-over';
   const ox=reset(output,w,h);ox.drawImage(pigment,0,0);ox.drawImage(ink,0,0);
   return{canvas:output,paintMs:performance.now()-started,inkCached};
  }
 };
}
export function createPaper(){
 const nf=Nonflowers.create('Pretty Fish Studio paper v1');
 const master=nf.paper({col:[1,.985,.94],tex:32,spr:.8}),source=ctx(master).getImageData(0,0,512,512),tile=surface(512,512),tx=ctx(tile),image=tx.createImageData(512,512),base=[255,251,239];
 let last=-1;
 return{draw(target,grain){
  const t=grain/100;
  if(last!==grain){for(let i=0;i<image.data.length;i+=4){for(let j=0;j<3;j++)image.data[i+j]=base[j]+(source.data[i+j]-base[j])*t;image.data[i+3]=255;}tx.putImageData(image,0,0);last=grain;}
  const x=target.getContext('2d',{willReadFrequently:true});x.setTransform(1,0,0,1,0,0);x.drawImage(tile,0,0,target.width,target.height);
 }};
}
