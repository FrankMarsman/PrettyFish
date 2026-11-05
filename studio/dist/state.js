import { controls } from './controls.js';
export const PALETTE_IDS=['celadon','vermilion','indigo','plum'];
export function normaliseParams(input,defaults={}) {
  return Object.fromEntries(controls.map(c=>{
    const raw=Number(input?.[c.key]??defaults[c.key]??c.values[0]);
    const value=Number.isFinite(raw)?raw:Number(defaults[c.key]??c.values[0]);
    return [c.key,c.values.reduce((best,v)=>Math.abs(v-value)<Math.abs(best-value)?v:best,c.values[0])];
  }));
}
export function appearance(input={}) {
  const number=(value,fallback)=>value!==undefined&&Number.isFinite(Number(value))?Math.round(Math.min(100,Math.max(0,Number(value)))/5)*5:fallback;
  return {palette:PALETTE_IDS.includes(input.palette)?input.palette:'celadon',pigment:number(input.pigment,65),grain:number(input.grain,45)};
}
export function encodeState(state) {
  const value=JSON.stringify({v:1,seed:state.seed,params:state.params,appearance:state.appearance});
  return btoa(String.fromCharCode(...new TextEncoder().encode(value))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodeState(encoded) {
  if(!encoded||encoded.length>14000)return null;
  try {
    const value=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));
    if(value.v!==1||typeof value.seed!=='string'||!value.params||typeof value.params!=='object')return null;
    return {seed:value.seed.trim().slice(0,120)||'Aurelia elegans',params:normaliseParams(value.params),appearance:appearance(value.appearance)};
  }catch{return null;}
}
export function randomSeed() {
  const first=['Aurelia','Nerina','Pelagia','Luminata','Corallia','Velaria','Rosella','Ondina'];
  const last=['elegans','lucens','picta','rosea','lunaris','serena','argentea','gracilis'];
  const v=crypto.getRandomValues(new Uint32Array(3));
  return `${first[v[0]%first.length]} ${last[v[1]%last.length]}-${v[2].toString(16).padStart(8,'0').slice(-6)}`;
}
export function shapeKey(seed,params){return seed+'\0'+JSON.stringify(params);}
