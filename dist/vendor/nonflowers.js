/*
 * Nonflowers painting primitives — Copyright (c) 2018 Lingdong Huang, MIT.
 * https://github.com/LingDong-/nonflowers
 * Extracted/adapted for Pretty Fish: Perlin noise, colour interpolation,
 * polygons, variable-width strokes, paper(), and fade/wispy pigment filters.
 * Changes: scoped RNG, explicit contexts, safe short paths, no prototype edits.
 * Full license: ../licenses/nonflowers.txt
 */
(function (root) {
'use strict';
function create(seed) {
  let state = 2166136261;
  for (const c of String(seed)) state = globalThis.Math.imul(state ^ c.charCodeAt(0), 16777619);
  const nativeMath = globalThis.Math;
  const Math = Object.create(nativeMath);
  Math.random = function () {
    state += 0x6D2B79F5;
    let t = nativeMath.imul(state ^ state >>> 15, 1 | state);
    t ^= t + nativeMath.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs;
  const CTX = null;
  function mapval(value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  }
//perlin noise adapted from p5.js
var Noise = new function(){
  var PERLIN_YWRAPB = 4; var PERLIN_YWRAP = 1<<PERLIN_YWRAPB;
  var PERLIN_ZWRAPB = 8; var PERLIN_ZWRAP = 1<<PERLIN_ZWRAPB;
  var PERLIN_SIZE = 4095;
  var perlin_octaves = 4;var perlin_amp_falloff = 0.5;
  var scaled_cosine = function(i) {return 0.5*(1.0-Math.cos(i*Math.PI));};
  var perlin;
  this.noise = function(x,y,z) {
    y = y || 0; z = z || 0;
    if (perlin == null) {
      perlin = new Array(PERLIN_SIZE + 1);
      for (var i = 0; i < PERLIN_SIZE + 1; i++) {
        perlin[i] = Math.random();
      }
    }
    if (x<0) { x=-x; } if (y<0) { y=-y; } if (z<0) { z=-z; }
    var xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z);
    var xf = x - xi; var yf = y - yi; var zf = z - zi;
    var rxf, ryf;
    var r=0; var ampl=0.5;
    var n1,n2,n3;
    for (var o=0; o<perlin_octaves; o++) {
      var of=xi+(yi<<PERLIN_YWRAPB)+(zi<<PERLIN_ZWRAPB);
      rxf = scaled_cosine(xf); ryf = scaled_cosine(yf);
      n1  = perlin[of&PERLIN_SIZE];
      n1 += rxf*(perlin[(of+1)&PERLIN_SIZE]-n1);
      n2  = perlin[(of+PERLIN_YWRAP)&PERLIN_SIZE];
      n2 += rxf*(perlin[(of+PERLIN_YWRAP+1)&PERLIN_SIZE]-n2);
      n1 += ryf*(n2-n1);
      of += PERLIN_ZWRAP;
      n2  = perlin[of&PERLIN_SIZE];
      n2 += rxf*(perlin[(of+1)&PERLIN_SIZE]-n2);
      n3  = perlin[(of+PERLIN_YWRAP)&PERLIN_SIZE];
      n3 += rxf*(perlin[(of+PERLIN_YWRAP+1)&PERLIN_SIZE]-n3);
      n2 += ryf*(n3-n2);
      n1 += scaled_cosine(zf)*(n2-n1);
      r += n1*ampl;
      ampl *= perlin_amp_falloff;
      xi<<=1; xf*=2; yi<<=1; yf*=2; zi<<=1; zf*=2;
      if (xf>=1.0) { xi++; xf--; }
      if (yf>=1.0) { yi++; yf--; }
      if (zf>=1.0) { zi++; zf--; }
    }
    return r;
  };
  this.noiseDetail = function(lod, falloff) {
    if (lod>0)     { perlin_octaves=lod; }
    if (falloff>0) { perlin_amp_falloff=falloff; }
  };
  this.noiseSeed = function(seed) {
    var lcg = (function() {
      var m = 4294967296, a = 1664525, c = 1013904223, seed, z;
      return {
        setSeed : function(val) {
          z = seed = (val == null ? Math.random() * m : val) >>> 0;
        },
        getSeed : function() {return seed;},
        rand : function() { z = (a * z + c) % m; return z / m;}
      };
    }());
    lcg.setSeed(seed);
    perlin = new Array(PERLIN_SIZE + 1);
    for (var i = 0; i < PERLIN_SIZE + 1; i++) {perlin[i] = lcg.rand();}
  };
}
// rgba to css color string
function rgba(r,g,b,a){
  r = (r != undefined) ? r:255;
  g = (g != undefined) ? g:r;
  b = (b != undefined) ? b:g;
  a = (a != undefined) ? a:1.0;
  return "rgba("+Math.floor(r)+","+Math.floor(g)+","+Math.floor(b)+","+a.toFixed(3)+")"
}
// hsv to css color string
function hsv(h,s,v,a){
    var c = v*s
    var x = c*(1-abs((h/60)%2-1))
    var m = v-c
    var [rv,gv,bv] = ([[c,x,0],[x,c,0],[0,c,x],
                       [0,x,c],[x,0,c],[c,0,x]])[Math.floor(h/60)]
    var [r,g,b] = [(rv+m)*255,(gv+m)*255,(bv+m)*255]
    return rgba(r,g,b,a)
}
// polygon for HTML canvas
function polygon(args){
  var args =(args != undefined) ? args : {};
  var ctx = (args.ctx != undefined) ? args.ctx : CTX;
  var xof = (args.xof != undefined) ? args.xof : 0;  
  var yof = (args.yof != undefined) ? args.yof : 0;  
  var pts = (args.pts != undefined) ? args.pts : [];
  var col = (args.col != undefined) ? args.col : "black";
  var fil = (args.fil != undefined) ? args.fil : true;
  var str = (args.str != undefined) ? args.str : !fil;

  ctx.beginPath();
  if (pts.length > 0){
    ctx.moveTo(pts[0][0]+xof,pts[0][1]+yof);
  }
  for (var i = 1; i < pts.length; i++){
    ctx.lineTo(pts[i][0]+xof,pts[i][1]+yof);
  }
  if (fil){
    ctx.fillStyle = col;
    ctx.fill();
  }
  if (str){
    ctx.strokeStyle = col;
    ctx.stroke();
  }
}
// lerp hue wrapping around 360 degs
function lerpHue(h0,h1,p){
  var methods = [
    [abs(h1-h0),     mapval(p,0,1,h0,h1)],
    [abs(h1+360-h0), mapval(p,0,1,h0,h1+360)],
    [abs(h1-360-h0), mapval(p,0,1,h0,h1-360)]
   ]
  methods.sort((x,y)=>(x[0]-y[0]))
  return (methods[0][1]+720)%360
}
// generate 2d tube shape from list of points
function tubify(args){
  var args = (args != undefined) ? args : {};
  var pts = (args.pts != undefined) ? args.pts : [];
  var wid = (args.wid != undefined) ? args.wid : (x)=>(10);
  var vtxlist0 = []
  var vtxlist1 = []
  for (var i = 1; i < pts.length-1; i++){
    var w = wid(i/pts.length)
    var a1 = Math.atan2(pts[i][1]-pts[i-1][1],pts[i][0]-pts[i-1][0]);
    var a2 = Math.atan2(pts[i][1]-pts[i+1][1],pts[i][0]-pts[i+1][0]);
    var a = (a1+a2)/2;
    if (a < a2){a+=PI}
    vtxlist0.push([pts[i][0]+w*cos(a),(pts[i][1]+w*sin(a))]);
    vtxlist1.push([pts[i][0]-w*cos(a),(pts[i][1]-w*sin(a))]);
  }
  var l = pts.length-1
  var a0 = Math.atan2(pts[1][1]-pts[0][1],pts[1][0]-pts[0][0]) - Math.PI/2;
  var a1 = Math.atan2(pts[l][1]-pts[l-1][1],pts[l][0]-pts[l-1][0]) - Math.PI/2;
  var w0 = wid(0)
  var w1 = wid(1)
  vtxlist0.unshift([pts[0][0]+w0*Math.cos(a0),(pts[0][1]+w0*Math.sin(a0))])
  vtxlist1.unshift([pts[0][0]-w0*Math.cos(a0),(pts[0][1]-w0*Math.sin(a0))])
  vtxlist0.push([pts[l][0]+w1*Math.cos(a1),(pts[l][1]+w1*Math.sin(a1))])
  vtxlist1.push([pts[l][0]-w1*Math.cos(a1),(pts[l][1]-w1*Math.sin(a1))])
  return [vtxlist0,vtxlist1]
}
// line work with weight function
function stroke(args){
  var args = (args != undefined) ? args : {};
  var pts = (args.pts != undefined) ? args.pts : [];
  var ctx = (args.ctx != undefined) ? args.ctx : CTX;
  var xof = (args.xof != undefined) ? args.xof : 0;
  var yof = (args.yof != undefined) ? args.yof : 0;
  var col = (args.col != undefined) ? args.col : "black";
  var wid = (args.wid != undefined) ? args.wid :
    (x)=>(1*sin(x*PI)*mapval(Noise.noise(x*10),0,1,0.5,1));

  var [vtxlist0,vtxlist1] = tubify({pts:pts,wid:wid})

  polygon({pts:vtxlist0.concat(vtxlist1.reverse()),
    ctx:ctx,fil:true,col:col,xof:xof,yof:yof})
  return [vtxlist0,vtxlist1]
}
// generate paper texture
function paper(args){
  var args =(args != undefined) ? args : {};
  var col = (args.col != undefined) ? args.col : [0.98,0.91,0.74];
  var tex = (args.tex != undefined) ? args.tex : 20;
  var spr = (args.spr != undefined) ? args.spr : 1;

  var canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  var ctx = canvas.getContext("2d");
  var reso = 512
  for (var i = 0; i < reso/2+1; i++){
    for (var j = 0; j < reso/2+1; j++){
      var c = (255-Noise.noise(i*0.1,j*0.1)*tex*0.5)
      c -= Math.random()*tex;
      var r = (c*col[0])
      var g = (c*col[1])
      var b = (c*col[2])
      if (Noise.noise(i*0.04,j*0.04,2)*Math.random()*spr>0.7 
       || Math.random()<0.005*spr){
        var r = (c*0.7)
        var g = (c*0.5)
        var b = (c*0.2)
      }
      ctx.fillStyle = rgba(r,g,b);
      ctx.fillRect(i,j,1,1);
      ctx.fillRect(reso-i,j,1,1);
      ctx.fillRect(i,reso-j,1,1);
      ctx.fillRect(reso-i,reso-j,1,1);
    }
  }
  return canvas
}
// collection of image filters
var Filter = new function(){
  this.wispy = function(x,y,r,g,b,a){
    var n = Noise.noise(x*0.2,y*0.2)
    var m = Noise.noise(x*0.5,y*0.5,2)
    return [r,g*mapval(m,0,1,0.95,1),b*mapval(m,0,1,0.9,1),a*mapval(n,0,1,0.5,1)]
  }
  this.fade = function(x,y,r,g,b,a){
    var n = Noise.noise(x*0.01,y*0.01)
    return [r,g,b,a*Math.min(Math.max(mapval(n,0,1,0,1),0),1)]
  }
}


  function filterLayer(ctx, strength = 1) {
    if (strength <= 0) return;
    const image = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      // Keep the grain scale consistent at different output resolutions.
      const x = (i / 4 % ctx.canvas.width) * 600 / ctx.canvas.width;
      const y = nativeMath.floor(i / 4 / ctx.canvas.width) * 600 / ctx.canvas.width;
      const before = [data[i], data[i+1], data[i+2], data[i+3]];
      const faded = Filter.fade(x, y, ...before);
      const after = Filter.wispy(x, y, ...faded);
      for (let k = 0; k < 4; k++) data[i+k] = before[k] + (after[k] - before[k]) * strength;
    }
    ctx.putImageData(image, 0, 0);
  }
  function safeStroke(args) {
    if (!args.pts || args.pts.length < 2) return;
    if (args.pts.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return;
    return stroke(args);
  }
  return { noise: Noise.noise, polygon, stroke: safeStroke, paper, hsv, rgba, lerpHue, Filter, filterLayer, random: Math.random };
}
root.Nonflowers = { create };
})(globalThis);

