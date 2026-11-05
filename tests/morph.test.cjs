const test=require('node:test'),assert=require('node:assert/strict');
const {interpolateParams,easedPosition,sharedBounds,playbackSequence}=require('../tools/morph.cjs');
test('morph changes proportions while holding categorical choices and integer attachment points',()=>{
 const from={body_length:300,body_height:60,tail_type:1,scale_type:2,dorsal_start:8,mouth_size:8};
 const to={body_length:200,body_height:120,tail_type:4,scale_type:0,dorsal_start:12,mouth_size:10};
 assert.deepEqual(interpolateParams(from,to,.5),{...from,body_length:250,body_height:90});
 assert.deepEqual(interpolateParams(from,to,0),from);
 assert.equal(interpolateParams(from,to,1).body_height,to.body_height);
 assert.throws(()=>interpolateParams(from,to,NaN),RangeError);
});
test('camera encloses both endpoints and every intermediate frame',()=>{
 const result=sharedBounds([{bounds:{x:-10,y:20,w:100,h:40}},{bounds:{x:5,y:-30,w:120,h:110}}]);
 assert.deepEqual(result,{x:-10,y:-30,w:135,h:110});
});
test('loop returns to the exact first frame, holds both endpoints and eases monotonically',()=>{
 const steps=36,seq=playbackSequence(steps,10);
 assert.equal(seq.length,92);assert.equal(seq[0],0);assert.equal(seq.at(-1),0);
 assert.equal(Math.max(...seq),steps);assert.ok(seq.filter(i=>i===steps).length>=10);
 const t=Array.from({length:steps+1},(_,i)=>easedPosition(i,steps));
 assert.equal(t[0],0);assert.equal(t.at(-1),1);assert.ok(t.every((v,i)=>!i||v>t[i-1]));
});
