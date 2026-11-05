const fs=require('node:fs'),path=require('node:path');
require('../dist/vendor/fishdraw.js');
const scene=FishDraw.createScene('Nerina lucens'),b=scene.bounds;
const scale=Math.min(255/b.w,117/b.h),tx=127.5-(b.x+b.w/2)*scale,ty=58.5-(b.y+b.h/2)*scale;
const f=n=>Number(n.toFixed(2));
const lines=scene.polylines.filter(p=>p.length>1).map(p=>'<polyline points="'+p.map(([x,y])=>f(x)+','+f(y)).join(' ')+'"/>').join('');
const regionColors={dorsal:'#b8c9c5',pelvic:'#d3c28e',anal:'#cfb3a0',tail:'#c7bdcd',body:'#b7c9b0',pectoral:'#d6c3ce',head:'#d2c4a8',jaw:'#e2d9be',eye:'#f5edda'};
function regionPaths(mode) {return scene.regions.map(r=>{const fill=mode==='paint'?(r.id==='body'?'url(#body-wash)':r.id==='head'?'url(#head-wash)':r.id==='eye'?'#f5edda':'url(#fin-wash)'):(regionColors[r.id]||'#c6ccbe');return '<polygon points="'+r.outline.map(([x,y])=>f(x)+','+f(y)).join(' ')+'" fill="'+fill+'"/>';}).join('');}
function fish(x,y,mode) {
 return '<g transform="translate('+x+' '+y+')"><g transform="translate('+f(tx)+' '+f(ty)+') scale('+f(scale)+')">'+(mode!=='line'?regionPaths(mode):'')+'<g fill="none" stroke="#465346" stroke-opacity="'+(mode==='line'?'.8':'.38')+'" stroke-width="'+f(.52/scale)+'" stroke-linejoin="round">'+lines+'</g></g></g>';
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="425" viewBox="0 0 1200 425" role="img" aria-labelledby="title description">
<title id="title">Pretty Fish: from drawing to painting</title>
<desc id="description">A seed and proportions go to fishdraw, which generates anatomy and fine lines. Body, head and fin regions are preserved, then nonflowers routines add colour washes, tapered ink, pigment variation and a fixed paper background.</desc>
<defs><linearGradient id="body-wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#839b88"/><stop offset=".5" stop-color="#bcccb0"/><stop offset="1" stop-color="#f2ecd8"/></linearGradient><linearGradient id="head-wash" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a7b79a"/><stop offset="1" stop-color="#eee5c9"/></linearGradient><linearGradient id="fin-wash"><stop stop-color="#c6b399"/><stop offset="1" stop-color="#eee5d3"/></linearGradient><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="#8b9685"/></marker></defs>
<rect width="1200" height="425" fill="#f5f2e9"/>
<text x="36" y="45" fill="#283b33" font-family="Georgia,serif" font-size="27">From an imaginary fish to a painted specimen</text>
<g font-family="Arial,sans-serif" fill="#747b70" font-size="13"><text x="37" y="72">One anatomy throughout · original forms and painting routines by LingDong Huang</text></g>
<g stroke="#8b9685" stroke-width="1.4" fill="none" marker-end="url(#arrow)"><path d="M365 236H410"/><path d="M762 236H807"/></g>
<g font-family="Arial,sans-serif" fill="#747b70" font-size="12" letter-spacing="1.2"><text x="36" y="113">01 / GENERATE THE DRAWING</text><text x="433" y="113">02 / KEEP THE REGIONS</text><text x="830" y="113">03 / PAINT THE SAME FISH</text></g>
<g font-family="Georgia,serif" fill="#283b33" font-size="26"><text x="36" y="150">fishdraw</text><text x="433" y="150">Body, head &amp; fins</text><text x="830" y="150">nonflowers routines</text></g>
${fish(62,176,'line')}${fish(459,176,'regions')}${fish(856,176,'paint')}
<g font-family="Arial,sans-serif" fill="#596650" font-size="15"><text x="36" y="331">Seed + proportions → anatomy + ink</text><text x="433" y="331">Retain the fill masks and detail paths</text><text x="830" y="331">Colour washes → pigment → fine ink</text></g>
<path d="M36 356H1164" stroke="#d8dacd"/>
<g font-family="Arial,sans-serif" fill="#747b70" font-size="14"><text x="36" y="387">For a morph: interpolate proportions, regenerate the fish, and paint every frame over one fixed sheet of paper.</text></g>
</svg>`;
fs.writeFileSync(path.join(__dirname,'../docs/pipeline.svg'),svg+'\n');
console.log('Created docs/pipeline.svg');
