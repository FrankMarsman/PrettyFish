const test=require('node:test'),assert=require('node:assert/strict');
test('a share link round-trips all parameters, painting settings and Unicode seeds',async()=>{
 const {encodeState,decodeState,normaliseParams}=await import('../dist/state.js');
 const state={seed:'Étoile 金魚',params:normaliseParams({body_length:321,eye_type:1,tail_type:5}),appearance:{palette:'plum',pigment:75,grain:25}};
 assert.deepEqual(decodeState(encodeState(state)),state);
});
test('invalid links and out-of-range values are handled without corrupting controls',async()=>{
 const {decodeState,normaliseParams,appearance}=await import('../dist/state.js');
 assert.equal(decodeState('broken state'),null);assert.equal(decodeState('a'.repeat(20000)),null);
 const p=normaliseParams({body_length:Infinity,tail_type:100,body_height:-100});
 assert.equal(p.tail_type,5);assert.equal(p.body_height,45);assert.ok(Number.isFinite(p.body_length));
 assert.deepEqual(appearance({palette:'unknown',pigment:999,grain:-10}),{palette:'celadon',pigment:100,grain:0});
});
