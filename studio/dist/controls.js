const groups = [
 ['body','Body & surface',[
 ['body_curve_type','Contour',['Rounded','Tapered']],['body_curve_amount','Curvature',.5,.98],['body_length','Length',200,420],['body_height','Height',45,150],['scale_type','Scales',['Fine','Layered','Crosshatch','Linear']],['scale_scale','Scale size',.8,1.5],['pattern_type','Pattern',['None','Spots','Mottled','Stripes','Speckles']],['pattern_scale','Pattern size',.5,2]]],
 ['dorsal','Dorsal fin',[
 ['dorsal_texture_type','Texture',['Rays','Ribs']],['dorsal_type','Shape',['Arched','Swept']],['dorsal_length','Length',30,180],['dorsal_start','Start',7,16,true],['dorsal_end','End',19,28,true]]],
 ['pelvic','Pelvic fin',[
 ['pelvic_type','Shape',['Curved','Angled']],['pelvic_texture_type','Texture',['Rays','Ribs']],['pelvic_length','Length',30,140],['pelvic_start','Start',7,11,true],['pelvic_end','End',13,15,true]]],
 ['wing','Pectoral fin',[
 ['wing_type','Shape',['Fan','Swept']],['wing_texture_type','Texture',['Rays','Ribs']],['wing_length','Length',40,350],['wing_width','Width',7,50],['wing_y','Position',.45,.85],['wing_start','Top root',5,8,true],['wing_end','Bottom root',5,8,true]]],
 ['anal','Anal fin',[
 ['anal_type','Shape',['Curved','Angled']],['anal_texture_type','Texture',['Rays','Ribs']],['anal_length','Length',20,80],['anal_start','Start',16,23,true],['anal_end','End',25,31,true]]],
 ['tail','Tail',[
 ['tail_type','Shape',['Fan','Round','Fork','Flat','Swept','Crescent']],['tail_length','Length',50,180],['finlet_type','Finlets',['None','Small','Adipose','Secondary']]]],
 ['head','Head & details',[
 ['neck_type','Neck',['Low','High']],['nose_height','Nose height',-50,35],['head_length','Head length',20,35],['head_texture_amount','Texture',30,160,true],['mouth_size','Mouth',6,11,true],['eye_type','Eye',['Ring','Solid']],['eye_size','Eye size',8,28],['jaw_size','Jaw size',.7,1.4],['jaw_open','Jaw opening',0,1],['has_teeth','Teeth',['Off','On']],['teeth_length','Tooth length',5,15],['teeth_space','Tooth spacing',3,6],['has_moustache','Moustache',['Off','On']],['moustache_length','Moustache length',10,40,true],['has_beard','Beard',['Off','On']],['beard_length','Beard length',20,50,true]]]
];
const controls=groups.flatMap(([group,,items])=>items.map(([key,label,a,b,integer])=>{
 const options=Array.isArray(a)?a:null;
 const count=options?options.length:integer?Math.min(20,b-a+1):20;
 const values=options?options.map((_,i)=>i):Array.from({length:count},(_,i)=>integer?Math.round(a+(b-a)*i/(count-1)):+(a+(b-a)*i/(count-1)).toFixed(4));
 return {group,key,label,options,values,integer:!!integer,toggle:!!options&&options.length===2};
}));

export { groups, controls };

