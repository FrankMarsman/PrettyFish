const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'fixtures/frankfish-upstream.js'),'utf8');
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
let api,controls,normalise;
const ready=(async()=>{await import('../dist/vendor/frankfish-fast.js');api=globalThis.FrankFish;controls=(await import('../dist/controls.js')).controls;normalise=(await import('../dist/state.js')).normaliseParams;})();

test('all 49 FrankFish parameters have exactly one complete control',async()=>{
 await ready;assert.equal(controls.length,49);assert.equal(new Set(controls.map(c=>c.key)).size,49);
 assert.deepEqual(controls.map(c=>c.key).sort(),Object.keys(api.default_params()).sort());
});
test('region extraction preserves upstream Fast geometry for all four scale styles',async()=>{
 await ready;
 for(let scale=0;scale<4;scale++){
  const seed='Studio compatibility '+scale,params=normalise({...api.default_params(),scale_type:scale,pattern_type:scale%5});
  const context={module:{exports:{}},require:{main:null},seed,params:{...params}};vm.createContext(context);vm.runInContext(source,context);
  const expected=vm.runInContext('jsr=str_to_seed(seed)||1;perlin=undefined;fish({...params})',context);
  assert.equal(digest(api.sceneFor(seed,params).polylines),digest(expected),'scale '+scale);
 }
});
test('the same seed and parameters reproduce all regions after unrelated fish',async()=>{
 await ready;const params=normalise(api.paramsForSeed('Aurelia elegans'));
 const first=digest(api.sceneFor('Aurelia elegans',params));api.sceneFor('Another fish',api.default_params());
 assert.equal(digest(api.sceneFor('Aurelia elegans',params)),first);
});
test('every slider extreme and categorical option produces finite painted regions',async()=>{
 await ready;const defaults=normalise(api.default_params());let checked=0;
 for(const c of controls)for(const value of [...new Set(c.options?c.values:[c.values[0],c.values.at(-1)])]){
  const scene=api.sceneFor('Studio parameter boundaries',{...defaults,[c.key]:value});
  assert.ok(scene.polylines.length>20,c.key+' '+value);
  for(const region of scene.regions)assert.ok(region.outline.every(p=>p.every(Number.isFinite)),c.key+' '+value+' '+region.id);
  assert.ok(scene.polylines.every(p=>p.every(q=>q.every(Number.isFinite))),c.key+' '+value);
  for(const name of ['body','head','eye','jaw','dorsal','pectoral','pelvic','anal','tail'])assert.ok(scene.regions.some(r=>r.id===name),c.key+' '+value+' '+name);
  checked++;
 }
 console.log('Validated '+checked+' parameter boundary/option combinations.');
});
test('combined extreme settings and mixed random profiles keep every region finite',async()=>{
 await ready;
 const profiles=[Object.fromEntries(controls.map(c=>[c.key,c.values[0]])),Object.fromEntries(controls.map(c=>[c.key,c.values.at(-1)]))];
 for(let i=0;i<8;i++)profiles.push(normalise(api.paramsForSeed('Compound studio profile '+i)));
 for(let i=0;i<profiles.length;i++){
  const scene=api.sceneFor('Compound profile '+i,profiles[i]);
  assert.ok(scene.polylines.length>20);
  assert.ok(scene.polylines.every(line=>line.every(p=>p.every(Number.isFinite))),'profile '+i);
  assert.ok(scene.regions.every(r=>r.outline.every(p=>p.every(Number.isFinite))),'regions '+i);
 }
});
