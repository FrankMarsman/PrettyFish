import './vendor/nonflowers.js';

export const PALETTES = {
  celadon: { back: [163,.30,.42], middle: [100,.24,.72], belly: [44,.10,.98], fin: [30,.38,.76], tip: [38,.16,.97], ink: [74,57,37] },
  vermilion: { back: [12,.62,.62], middle: [28,.50,.87], belly: [45,.12,.99], fin: [13,.52,.78], tip: [44,.25,.99], ink: [88,40,28] },
  indigo: { back: [214,.50,.41], middle: [195,.27,.72], belly: [42,.06,.99], fin: [217,.37,.68], tip: [194,.12,.96], ink: [34,54,69] },
  plum: { back: [293,.29,.45], middle: [340,.25,.76], belly: [35,.09,.99], fin: [338,.36,.74], tip: [26,.15,.98], ink: [67,43,59] }
};
export const REGION_COLORS = { body:'#688e70', head:'#c08358', pectoral:'#ac7495', dorsal:'#5a899a', pelvic:'#bd9c45', anal:'#b56e66', tail:'#8a80b0', finlet:'#719a9a', jaw:'#c08358', eye:'#c9ad66' };
export const REGION_NAMES = { body:'Body', head:'Head', pectoral:'Pectoral fin', dorsal:'Dorsal fin', pelvic:'Pelvic fin', anal:'Anal fin', tail:'Tail', finlet:'Finlets', jaw:'Jaw', eye:'Eye' };
const W=500, H=300;
function mix(a,b,t) { return a.map((v,i)=>v+(b[i]-v)*t); }
function clamp(v,lo=0,hi=1) { return Math.max(lo,Math.min(hi,v)); }
function path(ctx, points) {
  ctx.beginPath();
  if (!points.length) return;
  ctx.moveTo(...points[0]);
  for (let i=1;i<points.length;i++) ctx.lineTo(...points[i]);
  ctx.closePath();
}
function bounds(points) {
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return { x:Math.min(...xs), y:Math.min(...ys), w:Math.max(...xs)-Math.min(...xs), h:Math.max(...ys)-Math.min(...ys) };
}
function centre(points) { return points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]); }
export function frameFor(scene) {
  const b=scene.bounds;
  const scale=Math.min((W-42)/b.w,(H-46)/b.h);
  return { scale, x:(W-b.w*scale)/2-b.x*scale, y:(H-b.h*scale)/2-b.y*scale };
}
function transform(ctx,canvas,frame) {
  const ratio=canvas.width/W;
  ctx.setTransform(ratio*frame.scale,0,0,ratio*frame.scale,ratio*frame.x,ratio*frame.y);
}
function linePaths(ctx,lines,width,color) {
  ctx.beginPath();
  for (const pts of lines) {
    if(pts.length<2) continue;
    ctx.moveTo(...pts[0]);
    for(let i=1;i<pts.length;i++) ctx.lineTo(...pts[i]);
  }
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
export function drawOriginal(canvas,scene) {
  const ctx=canvas.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fbfaf6';ctx.fillRect(0,0,canvas.width,canvas.height);
  const frame=frameFor(scene);transform(ctx,canvas,frame);
  linePaths(ctx,scene.polylines,.52/frame.scale,'#302d27');
  ctx.setTransform(1,0,0,1,0,0);
}
function paintBody(ctx,region,nf,palette,pigment) {
  const {top,bottom}=region;
  ctx.save();path(ctx,region.outline);ctx.clip();
  // Like nonflowers' leaf(): a ribbon of small, coloured quadrilateral patches.
  // Here the two boundaries come from fishdraw instead of a leaf-width function.
  const rows=16;
  ctx.lineWidth=.7;
  for(let i=1;i<top.length;i++) {
    for(let j=0;j<rows;j++) {
      const u=j/rows,v=(j+1)/rows,t=(i-.5)/(top.length-1),m=(u+v)/2;
      const colour=m<.46?mix(palette.back,palette.middle,m/.46):mix(palette.middle,palette.belly,(m-.46)/.54);
      colour[2]=clamp(colour[2]+(nf.noise(t*7,m*6,4)-.5)*.09);
      const pts=[mix(top[i-1],bottom[i-1],u),mix(top[i],bottom[i],u),mix(top[i],bottom[i],v),mix(top[i-1],bottom[i-1],v)];
      nf.polygon({ctx,pts,col:nf.hsv(...colour,.5+pigment*.4),fil:true,str:true});
    }
  }
  ctx.restore();
}
function paintFin(ctx,region,nf,palette,pigment) {
  const b=bounds(region.outline);
  const root=centre(region.root.length?region.root:region.outline);
  let far=root,max=0;
  for(const p of region.outline) { const d=Math.hypot(p[0]-root[0],p[1]-root[1]);if(d>max){max=d;far=p;} }
  const grad=ctx.createLinearGradient(root[0],root[1],far[0]+.01,far[1]+.01);
  grad.addColorStop(0,nf.hsv(...palette.fin,.60+pigment*.27));
  grad.addColorStop(.5,nf.hsv(...mix(palette.fin,palette.tip,.55),.58+pigment*.17));
  grad.addColorStop(1,nf.hsv(...palette.tip,.45+pigment*.15));
  ctx.save();path(ctx,region.outline);ctx.clip();ctx.fillStyle=grad;ctx.fillRect(b.x-1,b.y-1,b.w+2,b.h+2);ctx.restore();
}
function paintHead(ctx,region,nf,palette,pigment) {
  const b=bounds(region.outline);
  const gradient=ctx.createLinearGradient(0,b.y,0,b.y+b.h+.1);
  gradient.addColorStop(0,nf.hsv(...mix(palette.back,palette.middle,.35),.88));
  gradient.addColorStop(.5,nf.hsv(...mix(palette.middle,palette.belly,.3),.92));
  gradient.addColorStop(1,nf.hsv(...palette.belly,.94));
  ctx.save();path(ctx,region.outline);ctx.clip();ctx.fillStyle=gradient;ctx.fillRect(b.x,b.y,b.w,b.h);
  const cheek=ctx.createRadialGradient(b.x+b.w*.68,b.y+b.h*.6,0,b.x+b.w*.68,b.y+b.h*.6,Math.max(b.w,b.h)*.52);
  cheek.addColorStop(0,nf.hsv(...palette.fin,.24+pigment*.16));cheek.addColorStop(1,nf.hsv(...palette.fin,0));
  ctx.fillStyle=cheek;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.restore();
}
function brushLines(ctx,lines,nf,color,alpha,width,frame) {
  const col=`rgba(${color.join(',')},${alpha})`;
  for(const pts of lines) nf.stroke({ctx,pts,col,wid:t=>width/frame.scale*(.35+.65*Math.sin(Math.PI*t))*(.75+nf.noise(t*11)*.25)});
}
export function drawPainting(canvas,scene,settings) {
  const {palette:paletteId='celadon',pigment=65,grain=45}=settings;
  const palette=PALETTES[paletteId]||PALETTES.celadon;
  const nf=Nonflowers.create(scene.seed+':painting');
  const ctx=canvas.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  const paper=nf.paper({col:[1,.985,.94],tex:grain*.32,spr:grain*.008});
  ctx.drawImage(paper,0,0,canvas.width,canvas.height);
  const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;
  const ink=layer.getContext('2d', { willReadFrequently: true }),frame=frameFor(scene),p=pigment/100;
  transform(ink,layer,frame);
  for(const region of scene.regions) {
    if(region.kind==='body') paintBody(ink,region,nf,palette,p);
    else if(region.kind==='fin') paintFin(ink,region,nf,palette,p);
    else if(region.kind==='head') paintHead(ink,region,nf,palette,p);
    else if(region.kind==='jaw') nf.polygon({ctx:ink,pts:region.outline,col:nf.hsv(...palette.belly,.95)});
    else if(region.kind==='eye') nf.polygon({ctx:ink,pts:region.outline,col:nf.hsv(44,.12,.99,.98)});
  }
  // Original nonflowers fade + wispy filters act on pigment before the ink pass.
  nf.filterLayer(ink,.76);
  ctx.globalCompositeOperation='multiply';ctx.drawImage(layer,0,0);ctx.globalCompositeOperation='source-over';
  ink.setTransform(1,0,0,1,0,0);ink.clearRect(0,0,layer.width,layer.height);transform(ink,layer,frame);
  brushLines(ink,scene.groups.shading,nf,palette.ink,.13,.18,frame);
  brushLines(ink,scene.groups.pattern,nf,palette.ink,.21,.21,frame);
  brushLines(ink,scene.groups.body,nf,palette.ink,.46,.27,frame);
  brushLines(ink,scene.groups.fins,nf,palette.ink,.53,.28,frame);
  brushLines(ink,scene.groups.head,nf,palette.ink,.64,.30,frame);
  // Quiet silhouette edges give the coloured patches a botanical-plate finish.
  for(const region of scene.regions) {
    if(!['body','fin'].includes(region.kind)) continue;
    const edge=region.kind==='body'?[...region.top]:region.outline;
    nf.stroke({ctx:ink,pts:edge,col:`rgba(${palette.ink.join(',')},.25)`,wid:t=>(.19/frame.scale)*(.5+.5*Math.sin(t*Math.PI))});
  }
  ctx.drawImage(layer,0,0);
}
export function drawRegions(canvas,scene) {
  const ctx=canvas.getContext('2d', { willReadFrequently: true }),frame=frameFor(scene);
  transform(ctx,canvas,frame);
  for(const region of scene.regions) {
    if(['eye','jaw'].includes(region.id)) continue;
    path(ctx,region.outline);ctx.fillStyle=REGION_COLORS[region.id]+'55';ctx.fill();
    ctx.strokeStyle=REGION_COLORS[region.id];ctx.lineWidth=1.05/frame.scale;ctx.stroke();
  }
  ctx.setTransform(1,0,0,1,0,0);
}
export function originalSVG(scene) {
  const frame=frameFor(scene),f=n=>Number(n.toFixed(3));
  const paths=scene.polylines.filter(p=>p.length>1).map(p=>`<polyline points="${p.map(([x,y])=>`${f(x)},${f(y)}`).join(' ')}"/>`).join('\n');
  const title=scene.seed.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="900" viewBox="0 0 500 300"><title>${title} — Pretty Fish</title><desc>Generated with fishdraw by Lingdong Huang, MIT license. https://github.com/LingDong-/fishdraw</desc><rect width="500" height="300" fill="#fbfaf6"/><g transform="translate(${f(frame.x)} ${f(frame.y)}) scale(${f(frame.scale)})" fill="none" stroke="#302d27" stroke-width="${f(.52/frame.scale)}" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}
