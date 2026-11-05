const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fixtures=require('./upstream-fixtures.json');
const randomBefore=Math.random;
const prototypeBefore=Object.getOwnPropertyNames(Array.prototype);
require('../dist/vendor/fishdraw.js');
require('../dist/vendor/nonflowers.js');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('region extraction preserves the original fishdraw line art',()=>{
  for(const fixture of fixtures) {
    const scene=FishDraw.createScene(fixture.seed);
    assert.equal(scene.polylines.length,fixture.lines,fixture.seed);
    assert.equal(digest(scene.polylines),fixture.sha256,fixture.seed);
  }
});

test('a shared seed reproduces the entire anatomy after other fish',()=>{
  const first=digest(FishDraw.createScene('Aurelia picta-73ad20'));
  FishDraw.createScene('An unrelated specimen');
  assert.equal(digest(FishDraw.createScene('Aurelia picta-73ad20')),first);
});

test('anatomical masks remain finite and contain the expected parts',()=>{
  const tails=new Set(),scales=new Set();
  for(let i=0;i<24;i++) {
    const scene=FishDraw.createScene('Region study '+i, { scale_type: i%4, tail_type: i%6, finlet_type: i%4 });
    tails.add(scene.params.tail_type);scales.add(scene.params.scale_type);
    for(const id of ['body','head','eye','jaw','dorsal','pectoral','pelvic','anal','tail']) {
      assert.ok(scene.regions.some(r=>r.id===id),`Missing ${id} in specimen ${i}`);
    }
    for(const region of scene.regions) {
      assert.ok(region.outline.length>=3,region.id);
      assert.ok(region.outline.every(p=>p.length===2&&p.every(Number.isFinite)),region.id);
      assert.ok(region.root.every(p=>p.length===2&&p.every(Number.isFinite)),region.id);
    }
    assert.ok(scene.polylines.length>20);
    assert.ok(scene.polylines.every(line=>line.every(p=>p.every(Number.isFinite))));
    assert.ok(scene.bounds.w>0&&scene.bounds.h>0);
  }
  assert.equal(tails.size,6,'exercise all six tail generators');
  assert.equal(scales.size,4,'exercise all four scale generators');
});

test('painting helpers use isolated reproducible randomness',()=>{
  const a=Nonflowers.create('paper'),b=Nonflowers.create('paper'),c=Nonflowers.create('different');
  assert.equal(a.noise(1.3,2.7),b.noise(1.3,2.7));
  assert.notEqual(a.noise(1.3,2.7),c.noise(1.3,2.7));
  assert.equal(Math.random,randomBefore);
  assert.deepEqual(Object.getOwnPropertyNames(Array.prototype),prototypeBefore);
});
