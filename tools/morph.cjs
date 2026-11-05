// Geometry interpolation for repository samples. No raster blending is used.
const CONTINUOUS_KEYS = [
  'body_curve_amount','body_length','body_height','dorsal_length',
  'wing_length','wing_width','wing_y','pelvic_length','anal_length',
  'tail_length','nose_height','head_length','eye_size','jaw_size','jaw_open',
  'moustache_length','beard_length','teeth_length'
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function interpolateParams(from,to,t) {
  if(!Number.isFinite(t)||t<0||t>1) throw new RangeError('Morph position must be between zero and one');
  const result={...from};
  for(const key of CONTINUOUS_KEYS) {
    if(Number.isFinite(from[key])&&Number.isFinite(to[key])) result[key]=from[key]+(to[key]-from[key])*t;
  }
  return result;
}
function easedPosition(step,steps) {
  if(!Number.isInteger(steps)||steps<1||step<0||step>steps) throw new RangeError('Invalid morph step');
  return (1-Math.cos(Math.PI*step/steps))/2;
}
function sharedBounds(scenes) {
  const x=Math.min(...scenes.map(s=>s.bounds.x)),y=Math.min(...scenes.map(s=>s.bounds.y));
  const right=Math.max(...scenes.map(s=>s.bounds.x+s.bounds.w)),bottom=Math.max(...scenes.map(s=>s.bounds.y+s.bounds.h));
  return {x,y,w:right-x,h:bottom-y};
}
function playbackSequence(steps,hold=10) {
  return [...Array(hold).fill(0),...Array.from({length:steps},(_,i)=>i+1),
    ...Array(hold).fill(steps),...Array.from({length:steps},(_,i)=>steps-1-i)];
}
function endpointParams(base,index) {
  const wideFirst=index%2===1;
  const narrow={body_length:350+index%3*12,body_height:61+index%3*8,dorsal_length:64+index*4,
    wing_length:95+index%3*12,wing_width:clamp(base.wing_width,10,24),wing_y:.64,pelvic_length:52,
    anal_length:43,tail_length:82+index%3*6,eye_size:10,head_length:28,nose_height:0,jaw_open:.08};
  const broad={body_length:252+index%3*12,body_height:110+index%3*7,dorsal_length:125+index*3,
    wing_length:176+index%3*12,wing_width:clamp(base.wing_width*1.3,15,34),wing_y:.68,pelvic_length:87,
    anal_length:67,tail_length:137+index%3*6,eye_size:15,head_length:32,nose_height:-18,jaw_open:.17};
  return {from:{...base,...(wideFirst?broad:narrow)},to:{...base,...(wideFirst?narrow:broad)}};
}
module.exports={CONTINUOUS_KEYS,interpolateParams,easedPosition,sharedBounds,playbackSequence,endpointParams};
