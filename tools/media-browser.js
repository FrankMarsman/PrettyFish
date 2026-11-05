// Isolated export harness. The application renderer and UI remain unchanged.
import {drawPainting,drawOriginal,drawRegions} from '../dist/paint.js';
const createOriginal=Nonflowers.create;
let paper=null,paintSeed=null;
Nonflowers.create=seed=>{
  const nf=createOriginal(paintSeed||seed);
  if(paper) nf.paper=()=>paper;
  return nf;
};
function canvas(width,height) {const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
const exportCanvas=canvas(1200,720);
window.media={
  setPaper(seed,grain=45) {
    const nf=createOriginal(seed);
    paper=nf.paper({col:[1,.985,.94],tex:grain*.32,spr:grain*.008});
    paintSeed=null;
    return paper.toDataURL('image/png');
  },
  render(scene,settings,width=1200,height=720,fixedPaintSeed=null,mode='painting') {
    paintSeed=fixedPaintSeed;
    exportCanvas.width=width;exportCanvas.height=height;
    if(mode==='drawing')drawOriginal(exportCanvas,scene);
    else {drawPainting(exportCanvas,scene,settings);if(mode==='regions')drawRegions(exportCanvas,scene);}
    return exportCanvas.toDataURL('image/png');
  },
  comparison(scene,settings) {
    paintSeed=null;
    const c=canvas(1600,570),ctx=c.getContext('2d');
    ctx.fillStyle='#f5f2e9';ctx.fillRect(0,0,c.width,c.height);
    const left=canvas(1200,720),right=canvas(1200,720);
    drawOriginal(left,scene);drawPainting(right,scene,settings);
    ctx.fillStyle='#283b33';ctx.font='30px Georgia';ctx.fillText('The drawing',44,51);ctx.fillText('The painting',827,51);
    ctx.font='15px system-ui';ctx.fillStyle='#747b70';ctx.fillText('fishdraw · LingDong Huang',44,80);ctx.fillText('nonflowers painting routines · LingDong Huang',827,80);
    ctx.drawImage(left,44,107,730,438);ctx.drawImage(right,827,107,730,438);
    return c.toDataURL('image/png');
  },
  async overview(entries) {
    const c=canvas(1600,1120),ctx=c.getContext('2d');
    ctx.fillStyle='#f5f2e9';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#283b33';ctx.font='52px Georgia';ctx.fillText('Pretty Fish',46,76);
    ctx.font='18px system-ui';ctx.fillStyle='#747b70';ctx.fillText('Twelve imaginary specimens · Four palettes · fishdraw × nonflowers',47,111);
    for(let i=0;i<entries.length;i++) {
      const e=entries[i],im=new Image();im.src=e.data;await im.decode();
      const x=46+(i%4)*388,y=153+Math.floor(i/4)*313;
      ctx.drawImage(im,x,y,344,206.4);
      ctx.fillStyle='#283b33';ctx.font='italic 23px Georgia';ctx.fillText(e.name,x,y+240);
      ctx.fillStyle='#747b70';ctx.font='13px system-ui';ctx.fillText(e.paletteLabel.toUpperCase(),x,y+265);
    }
    ctx.fillStyle='#747b70';ctx.font='15px system-ui';ctx.fillText('Procedural forms and adapted painting routines by LingDong Huang · MIT licensed',47,1090);
    return c.toDataURL('image/png');
  }
};
