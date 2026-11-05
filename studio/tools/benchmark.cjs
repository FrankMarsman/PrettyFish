const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),os=require('node:os'),crypto=require('node:crypto');
const original=fs.readFileSync(path.join(__dirname,'../tests/fixtures/fishdraw-original.js'),'utf8');
const fast=fs.readFileSync(path.join(__dirname,'../tests/fixtures/frankfish-upstream.js'),'utf8');
function engine(source){
 const isolated=source.replace('  lip1s = [lip1];','  let lip1s = [lip1];');
 const api=new Function('module','require',"'use strict';\n"+isolated+'\nreturn {defaults:default_params,generate(seed,params){jsr=str_to_seed(seed)||1;perlin=undefined;return fish({...params});}};')(undefined,undefined);
 return {defaults:api.defaults,run(seed,params){const t=performance.now(),lines=api.generate(seed,params);return {ms:performance.now()-t,lines};}};
}
const slow=engine(original),quick=engine(fast);
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const results=[];
for(let scale=0;scale<4;scale++){
 const seed='Pretty Fish Studio performance',params=quick.defaults();params.scale_type=scale;params.pattern_type=3;params.has_teeth=0;params.has_moustache=0;
 assert.equal(hash(slow.run(seed,params).lines),hash(quick.run(seed,params).lines));
 for(let i=0;i<3;i++){quick.run(seed,params);slow.run(seed,params);}
 const fastMs=median(Array.from({length:7},()=>quick.run(seed,params).ms));
 const originalMs=median(Array.from({length:3},()=>slow.run(seed,params).ms));
 const row={scale,style:['Fine','Layered','Crosshatch','Linear'][scale],fastMs:+fastMs.toFixed(2),originalMs:+originalMs.toFixed(2),speedup:+(originalMs/fastMs).toFixed(2)};
 results.push(row);console.log(row);
}
fs.mkdirSync(path.join(__dirname,'../docs'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'../docs/generation-performance.json'),JSON.stringify({date:'2026-11-05',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,method:'Isolated function closures on the same runtime, matching polylines, three warm-ups, medians of seven Fast and three original geometry generations. Painting and region adaptation excluded.',results},null,2)+'\n');
