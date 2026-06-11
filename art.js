'use strict';
// ================= cartoon art engine =================
const TAU=Math.PI*2;
const OUT='#5a4632'; // warm brown outline (softer than black)
const INK='#3a2e22';
function toon(size,fn){
  const pad=Math.ceil(size*.34),S=size+pad*2;
  const t=document.createElement('canvas');t.width=t.height=S;
  const g=t.getContext('2d');
  g.translate(S/2,S/2);g.lineJoin='round';g.lineCap='round';
  fn(g,size/2);
  const o=document.createElement('canvas');o.width=o.height=S;
  const og=o.getContext('2d');
  og.drawImage(t,0,0);og.globalCompositeOperation='source-in';
  og.fillStyle='#fff';og.fillRect(0,0,S,S);
  const f=document.createElement('canvas');f.width=f.height=S;
  const fg=f.getContext('2d');
  fg.shadowColor='rgba(40,40,20,.25)';fg.shadowBlur=4;fg.shadowOffsetY=2;
  fg.drawImage(t,0,0);
  return {n:f,w:o,half:S/2};}
function el(g,x,y,rx,ry,col,lw){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);
  if(col){g.fillStyle=col;g.fill();}
  if(lw){g.strokeStyle=OUT;g.lineWidth=lw;g.stroke();}}
function poly2(g,pts,col,lw){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();
  if(col){g.fillStyle=col;g.fill();}
  if(lw){g.strokeStyle=OUT;g.lineWidth=lw;g.stroke();}}
// glossy cute eye: big dark pupil + double highlight
function cuteEye(g,x,y,er,o){o=o||{};
  el(g,x,y,er,er*1.06,'#fff',er*.15);
  el(g,x,y+er*.08,er*.74,er*.74,INK);
  el(g,x-er*.24,y-er*.18,er*.3,er*.3,'#fff');
  el(g,x+er*.3,y+er*.32,er*.13,er*.13,'#fff');
  if(o.lid){g.strokeStyle=OUT;g.lineWidth=er*.28;g.beginPath();
    g.moveTo(x-er*1.02,y-er*.6);g.lineTo(x+er*1.02,y-er*.6-o.lid*er*.5);g.stroke();}}
// mean eye for villains: white slanted + heavy brow
function meanEye(g,x,y,er,dir){
  el(g,x,y,er,er*.95,'#fff',er*.16);
  el(g,x+dir*er*.12,y+er*.1,er*.5,er*.5,INK);
  el(g,x+dir*er*.12-er*.16,y-er*.08,er*.16,er*.16,'#fff');
  g.strokeStyle=OUT;g.lineWidth=er*.34;g.beginPath();
  g.moveTo(x-er*.95,y-er*.85+(dir<0?er*.5:0));
  g.lineTo(x+er*.95,y-er*.85+(dir<0?0:er*.5));g.stroke();}
function dotEye(g,x,y,r){el(g,x,y,r,r,INK);el(g,x-r*.3,y-r*.3,r*.34,r*.34,'#fff');}
function blushy(g,x,y,r){g.globalAlpha=.5;el(g,x,y,r,r*.62,'#ffa3a3');g.globalAlpha=1;}
function fang(g,x,y,s){poly2(g,[[x-s*.5,y],[x+s*.5,y],[x,y+s]],'#fff',s*.22);}
function browAngry(g,x,y,w,dir,lw){g.strokeStyle=OUT;g.lineWidth=lw;
  g.beginPath();g.moveTo(x-w/2,y-dir*w*.3);g.lineTo(x+w/2,y+dir*w*.3);g.stroke();}
// ================= cats (CUTE, reference-style) =================
function makeCat(o){
  return toon(64,(g,r)=>{
    const lw=r*.08, base=o.base;
    // tail curl
    g.strokeStyle=OUT;g.lineWidth=r*.2+lw;g.beginPath();
    g.moveTo(r*.4,r*.74);g.quadraticCurveTo(r*.92,r*.66,r*.86,r*.26);g.stroke();
    g.strokeStyle=o.tailCol||base;g.lineWidth=r*.2;g.beginPath();
    g.moveTo(r*.4,r*.74);g.quadraticCurveTo(r*.92,r*.66,r*.86,r*.26);g.stroke();
    // ears (small, rounded)
    for(const s of[-1,1]){
      const ec=o.earCol?o.earCol[s<0?0:1]:base;
      g.beginPath();g.moveTo(s*r*.3,-r*.58);
      g.quadraticCurveTo(s*r*.6,-r*1.02,s*r*.76,-r*.5);
      g.quadraticCurveTo(s*r*.52,-r*.6,s*r*.3,-r*.58);g.closePath();
      g.fillStyle=ec;g.fill();g.strokeStyle=OUT;g.lineWidth=lw;g.stroke();
      g.beginPath();g.moveTo(s*r*.42,-r*.6);
      g.quadraticCurveTo(s*r*.58,-r*.84,s*r*.66,-r*.56);g.closePath();
      g.fillStyle='#ffb3c4';g.fill();}
    // body (stubby)
    el(g,0,r*.64,o.chubby?r*.56:r*.46,r*.32,base,lw);
    if(o.bodyDeco)o.bodyDeco(g,r);
    el(g,0,r*.68,o.chubby?r*.36:r*.27,r*.2,'#fff',0);
    el(g,-r*.17,r*.88,r*.13,r*.09,'#fff',lw*.75);
    el(g,r*.17,r*.88,r*.13,r*.09,'#fff',lw*.75);
    // head — WIDE & round (cute proportion)
    el(g,0,-r*.06,r*.96,r*.8,base,lw);
    if(o.deco)o.deco(g,r,lw);
    // muzzle blob
    el(g,0,r*.18,r*.34,r*.22,o.muzzle||'#fff',0);
    // eyes LOW & big & glossy
    cuteEye(g,-r*.36,-r*.04,r*.2,o.eye);
    cuteEye(g,r*.36,-r*.04,r*.2,o.eye);
    // tiny nose + ω mouth
    el(g,0,r*.14,r*.08,r*.06,'#ff8fa8',lw*.6);
    g.strokeStyle=OUT;g.lineWidth=r*.075;
    g.beginPath();g.moveTo(0,r*.2);g.quadraticCurveTo(0,r*.32,-r*.16,r*.3);
    g.moveTo(0,r*.2);g.quadraticCurveTo(0,r*.32,r*.16,r*.3);g.stroke();
    if(o.after)o.after(g,r,lw);
    // short whiskers (2/side)
    g.strokeStyle='rgba(90,70,50,.75)';g.lineWidth=r*.045;
    for(const s of[-1,1])for(let i=0;i<2;i++){
      g.beginPath();g.moveTo(s*r*.6,r*.08+i*r*.1);
      g.lineTo(s*r*.92,r*.04+i*r*.13);g.stroke();}
    blushy(g,-r*.6,r*.2,r*.16);blushy(g,r*.6,r*.2,r*.16);});}
function clipHead(g,r,fn){g.save();g.beginPath();
  g.ellipse(0,-r*.06,r*.96,r*.8,0,0,TAU);g.clip();fn();g.restore();}
// 알파냥: chubby orange tabby
const CAT_A=makeCat({base:'#ffbe5c',chubby:true,tailCol:'#ffbe5c',
  deco:(g,r)=>clipHead(g,r,()=>{g.fillStyle='#ef9335';
    for(const x of[-r*.32,0,r*.32]){g.save();g.translate(x,-r*.66);g.rotate(x*.3/r);
      g.beginPath();g.ellipse(0,0,r*.085,r*.2,0,0,TAU);g.fill();g.restore();}
    el(g,-r*.93,-r*.04,r*.18,r*.09,'#ef9335',0);
    el(g,r*.93,-r*.04,r*.18,r*.09,'#ef9335',0);}),
  bodyDeco:(g,r)=>{el(g,-r*.42,r*.55,r*.08,r*.12,'#ef9335',0);
    el(g,r*.42,r*.55,r*.08,r*.12,'#ef9335',0);}});
// 까칠냥: calico, grumpy lids
const CAT_B=makeCat({base:'#fff',earCol:['#ffa53e','#9c6b4a'],tailCol:'#ffa53e',eye:{lid:.55},
  deco:(g,r)=>clipHead(g,r,()=>{
    el(g,-r*.66,-r*.5,r*.5,r*.42,'#ffa53e',0);
    el(g,r*.7,-r*.42,r*.44,r*.4,'#9c6b4a',0);})});
// 신사냥: tuxedo + one-eye mask + bowtie
const CAT_C=makeCat({base:'#fff',earCol:['#46464e','#46464e'],tailCol:'#46464e',
  deco:(g,r,lw)=>{clipHead(g,r,()=>{el(g,0,-r*.7,r*1,r*.42,'#46464e',0);});
    g.strokeStyle='#46464e';g.lineWidth=r*.08;
    g.beginPath();g.moveTo(-r*.78,-r*.2);g.lineTo(r*.02,-r*.16);g.stroke();
    el(g,r*.36,-r*.06,r*.34,r*.3,'#46464e',0);},
  after:(g,r,lw)=>{
    poly2(g,[[-r*.3,r*.46],[-r*.05,r*.55],[-r*.3,r*.64]],'#e8443c',lw*.6);
    poly2(g,[[r*.3,r*.46],[r*.05,r*.55],[r*.3,r*.64]],'#e8443c',lw*.6);
    el(g,0,r*.55,r*.07,r*.07,'#e8443c',lw*.5);}});
// 민첩냥: white, gray head-top & ears
const CAT_D=makeCat({base:'#fff',earCol:['#b9bdc4','#b9bdc4'],tailCol:'#b9bdc4',
  deco:(g,r)=>clipHead(g,r,()=>{el(g,0,-r*.58,r*.98,r*.46,'#b9bdc4',0);})});
// ================= villains (cute but MEAN) =================
function mouseFn(g,r,col){col=col||'#b9b9c4';const lw=r*.11;
  g.strokeStyle=OUT;g.lineWidth=lw*.8;
  g.beginPath();g.moveTo(-r*.6,r*.3);g.quadraticCurveTo(-r*1.05,r*.15,-r*.95,-r*.25);g.stroke();
  for(const s of[-1,1]){el(g,s*r*.5,-r*.55,r*.34,r*.34,col,lw);
    el(g,s*r*.5,-r*.55,r*.19,r*.19,'#ffb3c4',0);}
  el(g,0,r*.1,r*.74,r*.64,col,lw);
  meanEye(g,-r*.27,-r*.08,r*.15,-1);meanEye(g,r*.27,-r*.08,r*.15,1);
  el(g,0,r*.26,r*.1,r*.08,'#ff8fa8',lw*.6);
  g.fillStyle='#fff';g.fillRect(-r*.11,r*.33,r*.22,r*.16);
  g.strokeStyle=OUT;g.lineWidth=lw*.5;g.strokeRect(-r*.11,r*.33,r*.22,r*.16);
  g.beginPath();g.moveTo(0,r*.33);g.lineTo(0,r*.49);g.stroke();}
function wingPair(g,r,y){g.globalAlpha=.6;
  for(const s of[-1,1]){g.save();g.translate(s*r*.4,y);g.rotate(s*.5);
    el(g,0,0,r*.42,r*.2,'#e8f1ff',r*.05);g.restore();}
  g.globalAlpha=1;}
function mosqFn(g,r){const lw=r*.12;
  wingPair(g,r,-r*.55);
  el(g,-r*.25,r*.15,r*.5,r*.4,'#9a93b8',lw);
  el(g,r*.3,-r*.25,r*.36,r*.34,'#9a93b8',lw);
  g.strokeStyle=OUT;g.lineWidth=lw*.8;
  g.beginPath();g.moveTo(r*.6,-r*.1);g.lineTo(r*1.1,r*.15);g.stroke();
  meanEye(g,r*.2,-r*.32,r*.11,-1);meanEye(g,r*.46,-r*.3,r*.11,1);}
function flyFn(g,r){const lw=r*.13;
  wingPair(g,r,-r*.5);
  el(g,0,r*.05,r*.68,r*.6,'#62626e',lw);
  el(g,-r*.28,-r*.12,r*.3,r*.32,'#e0564f',lw*.8);
  el(g,r*.28,-r*.12,r*.3,r*.32,'#e0564f',lw*.8);
  el(g,-r*.2,-r*.22,r*.1,r*.1,'#fff',0);el(g,r*.36,-r*.22,r*.1,r*.1,'#fff',0);
  browAngry(g,-r*.28,-r*.46,r*.4,-1,lw*.8);browAngry(g,r*.28,-r*.46,r*.4,1,lw*.8);
  g.beginPath();g.moveTo(-r*.16,r*.42);g.quadraticCurveTo(0,r*.3,r*.16,r*.42);
  g.strokeStyle=OUT;g.lineWidth=lw*.5;g.stroke();
  fang(g,-r*.07,r*.36,r*.12);fang(g,r*.07,r*.36,r*.12);}
function dandeFn(g,r){const lw=r*.1;
  g.strokeStyle='#4f9b3f';g.lineWidth=lw*1.5;
  g.beginPath();g.moveTo(0,r*.2);g.lineTo(0,r*.95);g.stroke();
  el(g,-r*.3,r*.7,r*.26,r*.12,'#5fae4a',lw*.5);
  el(g,r*.3,r*.82,r*.26,r*.12,'#5fae4a',lw*.5);
  for(let i=0;i<9;i++){const a=i/9*TAU;
    el(g,Math.cos(a)*r*.52,-r*.2+Math.sin(a)*r*.52,r*.24,r*.24,'#fff',lw*.5);}
  el(g,0,-r*.2,r*.42,r*.42,'#ffd23e',lw);
  meanEye(g,-r*.15,-r*.24,r*.1,-1);meanEye(g,r*.15,-r*.24,r*.1,1);
  g.beginPath();g.moveTo(-r*.12,-r*.02);g.quadraticCurveTo(0,r*.08,r*.12,-r*.02);
  g.strokeStyle=OUT;g.lineWidth=lw*.6;g.stroke();
  fang(g,0,r*.0,r*.1);}
function hedgeFn(g,r){const lw=r*.11;
  g.beginPath();
  for(let i=0;i<=12;i++){const a=Math.PI*1.1-i/12*Math.PI*1.25;
    const rr=i%2?r*.98:r*.6;
    const x=Math.cos(a)*rr,y=-r*.05+Math.sin(a)*-rr;
    if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}
  g.closePath();g.fillStyle='#8a5d3b';g.fill();
  g.strokeStyle=OUT;g.lineWidth=lw;g.stroke();
  el(g,r*.3,r*.25,r*.56,r*.42,'#edcb9d',lw);
  meanEye(g,r*.28,r*.12,r*.1,-1);meanEye(g,r*.58,r*.12,r*.1,1);
  el(g,r*.82,r*.3,r*.11,r*.09,INK,0);
  fang(g,r*.48,r*.42,r*.1);}
function frogFn(g,r,col){col=col||'#6fc24b';const lw=r*.11;
  for(const s of[-1,1]){el(g,s*r*.42,-r*.58,r*.3,r*.3,col,lw);
    el(g,s*r*.42,-r*.6,r*.2,r*.2,'#fff',lw*.6);
    el(g,s*r*.42,-r*.56,r*.1,r*.1,INK,0);
    browAngry(g,s*r*.42,-r*.86,r*.36,s,lw*.9);}
  el(g,0,r*.05,r*.85,r*.62,col,lw);
  el(g,0,r*.25,r*.55,r*.36,'#dff0c8',0);
  g.beginPath();g.moveTo(-r*.42,r*.02);g.quadraticCurveTo(0,r*.3,r*.42,r*.02);
  g.strokeStyle=OUT;g.lineWidth=lw*.7;g.stroke();
  fang(g,-r*.14,r*.14,r*.13);fang(g,r*.14,r*.14,r*.13);
  el(g,-r*.55,r*.5,r*.18,r*.12,col,lw*.7);
  el(g,r*.55,r*.5,r*.18,r*.12,col,lw*.7);
  blushy(g,-r*.55,r*.15,r*.13);blushy(g,r*.55,r*.15,r*.13);}
function slimeFn(g,r){const lw=r*.12;
  g.beginPath();g.moveTo(-r*.78,r*.4);
  g.quadraticCurveTo(-r*.92,-r*.55,0,-r*.62);
  g.quadraticCurveTo(r*.92,-r*.55,r*.78,r*.4);
  g.quadraticCurveTo(r*.4,r*.56,0,r*.48);
  g.quadraticCurveTo(-r*.4,r*.58,-r*.78,r*.4);g.closePath();
  g.fillStyle='#7fd45e';g.fill();g.strokeStyle=OUT;g.lineWidth=lw;g.stroke();
  el(g,-r*.32,-r*.32,r*.18,r*.1,'rgba(255,255,255,.6)',0);
  meanEye(g,-r*.26,-r*.08,r*.13,-1);meanEye(g,r*.26,-r*.08,r*.13,1);
  g.beginPath();g.moveTo(-r*.18,r*.22);g.quadraticCurveTo(0,r*.34,r*.18,r*.22);
  g.strokeStyle=OUT;g.lineWidth=lw*.5;g.stroke();
  fang(g,-r*.09,r*.26,r*.11);fang(g,r*.09,r*.26,r*.11);}
function waspFn(g,r){const lw=r*.12;
  wingPair(g,r,-r*.5);
  poly2(g,[[-r*.82,0],[-r*1.08,-r*.1],[-r*1.08,r*.1]],INK,0);
  el(g,-r*.15,r*.05,r*.62,r*.42,'#ffcf3e',lw);
  g.save();g.beginPath();g.ellipse(-r*.15,r*.05,r*.62,r*.42,0,0,TAU);g.clip();
  g.fillStyle='#46464e';g.fillRect(-r*.48,-r*.45,r*.2,r);g.fillRect(-r*.12,-r*.45,r*.2,r);
  g.restore();
  el(g,r*.52,-r*.05,r*.3,r*.28,'#ffcf3e',lw);
  meanEye(g,r*.42,-r*.1,r*.09,-1);meanEye(g,r*.62,-r*.1,r*.09,1);}
function snakeFn(g,r,col){col=col||'#6db45c';const lw=r*.11;
  el(g,0,r*.15,r*.74,r*.56,col,lw);
  g.strokeStyle='#4f8f43';g.lineWidth=lw*.9;
  g.beginPath();g.arc(0,r*.15,r*.46,-.5,2.4);g.stroke();
  g.beginPath();g.arc(0,r*.18,r*.22,.5,3.1);g.stroke();
  el(g,r*.1,-r*.5,r*.44,r*.32,col,lw);
  meanEye(g,-r*.06,-r*.56,r*.11,-1);meanEye(g,r*.26,-r*.56,r*.11,1);
  fang(g,r*.32,-r*.32,r*.11);
  g.strokeStyle='#ff5f5f';g.lineWidth=lw*.5;
  g.beginPath();g.moveTo(r*.52,-r*.42);g.lineTo(r*.8,-r*.36);
  g.moveTo(r*.8,-r*.36);g.lineTo(r*.94,-r*.44);
  g.moveTo(r*.8,-r*.36);g.lineTo(r*.94,-r*.28);g.stroke();}
function pigeonFn(g,r){const lw=r*.11;
  el(g,-r*.05,r*.1,r*.7,r*.52,'#aeb6c2',lw);
  el(g,-r*.2,r*.22,r*.4,r*.3,'#cfd5dd',0);
  el(g,-r*.25,0,r*.42,r*.26,'#98a1ae',lw*.8);
  el(g,r*.42,-r*.38,r*.32,r*.3,'#aeb6c2',lw);
  el(g,r*.3,-r*.12,r*.17,r*.2,'#5fae8f',0);
  poly2(g,[[r*.7,-r*.42],[r*.98,-r*.34],[r*.68,-r*.26]],'#ff9b2f',lw*.6);
  meanEye(g,r*.45,-r*.44,r*.1,1);
  g.strokeStyle='#ff9b2f';g.lineWidth=lw*.7;
  g.beginPath();g.moveTo(-r*.1,r*.6);g.lineTo(-r*.1,r*.85);g.moveTo(r*.15,r*.6);g.lineTo(r*.15,r*.85);g.stroke();}
// ---- bosses ----
function boarFn(g,r){const lw=r*.1;
  g.beginPath();
  for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI;
    const rr=i%2?r*.94:r*.74;
    g.lineTo(Math.cos(a)*rr,-r*.1+Math.sin(a)*rr*.8);}
  g.closePath();g.fillStyle='#6e4a31';g.fill();g.strokeStyle=OUT;g.lineWidth=lw;g.stroke();
  el(g,0,r*.05,r*.86,r*.66,'#9c6b4a',lw);
  for(const s of[-1,1])poly2(g,[[s*r*.7,-r*.45],[s*r*.96,-r*.7],[s*r*.88,-r*.3]],'#9c6b4a',lw*.8);
  el(g,0,r*.36,r*.4,r*.27,'#ffb3c4',lw);
  el(g,-r*.13,r*.36,r*.06,r*.09,'#d87f96',0);el(g,r*.13,r*.36,r*.06,r*.09,'#d87f96',0);
  for(const s of[-1,1])poly2(g,[[s*r*.44,r*.44],[s*r*.74,r*.08],[s*r*.58,r*.52]],'#fff',lw*.7);
  meanEye(g,-r*.32,-r*.1,r*.16,-1);meanEye(g,r*.32,-r*.1,r*.16,1);
  g.strokeStyle='#ff3860';g.lineWidth=lw*1.2;
  g.beginPath();g.moveTo(r*.6,-r*.8);g.lineTo(r*.72,-r*.62);g.moveTo(r*.78,-r*.88);g.lineTo(r*.9,-r*.7);g.stroke();}
function frogqFn(g,r){frogFn(g,r,'#5fb858');
  poly2(g,[[-r*.34,-r*.8],[-r*.3,-r*1.08],[-r*.15,-r*.88],[0,-r*1.12],[r*.15,-r*.88],[r*.3,-r*1.08],[r*.34,-r*.8]],'#ffd23e',r*.07);
  el(g,-r*.17,-r*.9,r*.05,r*.05,'#ff5f5f',0);
  el(g,r*.17,-r*.9,r*.05,r*.05,'#ff5f5f',0);}
function topgunFn(g,r){pigeonFn(g,r);const lw=r*.1;
  el(g,r*.32,-r*.45,r*.16,r*.12,'#23232a',lw*.5);
  el(g,r*.6,-r*.43,r*.16,r*.12,'#23232a',lw*.5);
  el(g,r*.28,-r*.49,r*.05,r*.03,'#9fb6c8',0);
  poly2(g,[[r*.16,-r*.08],[0,r*.2],[r*.3,r*.1]],'#e0564f',lw*.5);}
function flyBFn(g,r){flyFn(g,r);const lw=r*.1;
  g.fillStyle='#8a5d3b';g.fillRect(r*.42,r*.28,r*.5,r*.36);
  g.strokeStyle=OUT;g.lineWidth=lw*.7;g.strokeRect(r*.42,r*.28,r*.5,r*.36);
  g.beginPath();g.moveTo(r*.56,r*.28);g.quadraticCurveTo(r*.67,r*.14,r*.78,r*.28);g.stroke();
  g.fillStyle='#ffd23e';g.fillRect(r*.62,r*.42,r*.09,r*.08);}
function mosqBFn(g,r){mosqFn(g,r);const lw=r*.1;
  g.save();g.beginPath();g.ellipse(r*.3,-r*.25,r*.36,r*.34,0,0,TAU);g.clip();
  g.fillStyle='#e0564f';g.fillRect(-r*.1,-r*.64,r,r*.3);g.restore();
  el(g,-r*.1,-r*.44,r*.2,r*.09,'#e0564f',lw*.6);}
function raccFn(g,r){const lw=r*.1;
  el(g,r*.74,r*.42,r*.36,r*.2,'#aab0b8',lw);
  g.strokeStyle='#5d6168';g.lineWidth=lw*1.3;
  g.beginPath();g.moveTo(r*.62,r*.32);g.lineTo(r*.7,r*.52);g.moveTo(r*.84,r*.3);g.lineTo(r*.92,r*.48);g.stroke();
  for(const s of[-1,1])poly2(g,[[s*r*.4,-r*.5],[s*r*.76,-r*.86],[s*r*.7,-r*.34]],'#5d6168',lw);
  el(g,0,-r*.02,r*.82,r*.68,'#aab0b8',lw);
  g.save();g.beginPath();g.ellipse(0,-r*.02,r*.82,r*.68,0,0,TAU);g.clip();
  el(g,0,-r*.16,r*.84,r*.27,'#46464e',0);g.restore();
  el(g,0,r*.3,r*.36,r*.26,'#fff',0);
  meanEye(g,-r*.3,-r*.14,r*.15,-1);meanEye(g,r*.3,-r*.14,r*.15,1);
  el(g,0,r*.22,r*.12,r*.09,INK,0);
  fang(g,-r*.1,r*.36,r*.12);fang(g,r*.1,r*.36,r*.12);}
function snakeKFn(g,r){snakeFn(g,r*1.02,'#5da868');
  poly2(g,[[-r*.22,-r*.72],[-r*.19,-r*.96],[-r*.08,-r*.78],[r*.04,-r*1],[r*.14,-r*.78],[r*.24,-r*.94],[r*.26,-r*.7]],'#ffd23e',r*.06);}
function dogBFn(g,r){const lw=r*.1;
  // bulldog: wide tan head, jowls, underbite, spiked collar
  for(const s of[-1,1])poly2(g,[[s*r*.55,-r*.55],[s*r*.85,-r*.4],[s*r*.6,-r*.18]],'#b88a5e',lw*.9);
  el(g,0,r*.55,r*.55,r*.3,'#c89a6a',lw); // body
  // collar
  g.fillStyle='#e0564f';g.fillRect(-r*.5,r*.32,r,r*.16);
  g.strokeStyle=OUT;g.lineWidth=lw*.7;g.strokeRect(-r*.5,r*.32,r,r*.16);
  for(const x of[-r*.3,0,r*.3])poly2(g,[[x-r*.06,r*.32],[x+r*.06,r*.32],[x,r*.18]],'#cfd5dd',lw*.4);
  el(g,0,-r*.08,r*.88,r*.7,'#c89a6a',lw); // head
  el(g,0,r*.22,r*.5,r*.34,'#e8cfa8',0);  // muzzle area
  el(g,0,r*.1,r*.14,r*.1,INK,0);          // nose
  g.strokeStyle=OUT;g.lineWidth=lw*.6;
  g.beginPath();g.moveTo(-r*.3,r*.34);g.quadraticCurveTo(0,r*.22,r*.3,r*.34);g.stroke(); // frown
  fang(g,-r*.26,r*.3,-r*.14);fang(g,r*.26,r*.3,-r*.14); // underbite (up fangs)
  poly2(g,[[-r*.26-r*.07,r*.3],[-r*.26+r*.07,r*.3],[-r*.26,r*.16]],'#fff',lw*.4);
  poly2(g,[[r*.26-r*.07,r*.3],[r*.26+r*.07,r*.3],[r*.26,r*.16]],'#fff',lw*.4);
  meanEye(g,-r*.32,-r*.18,r*.15,-1);meanEye(g,r*.32,-r*.18,r*.15,1);
  blushy(g,-r*.62,r*.05,r*.13);blushy(g,r*.62,r*.05,r*.13);}
function mageFn(g,r){
  mouseFn(g,r*.94,'#bdbdc8');
  const lw=r*.09;
  poly2(g,[[-r*.42,-r*.66],[r*.42,-r*.66],[r*.06,-r*1.16]],'#8b5fe0',lw);
  el(g,0,-r*.66,r*.58,r*.13,'#7b4fd0',lw);
  g.fillStyle='#ffd23e';
  poly2(g,[[r*.02,-r*1],[r*.07,-r*.9],[r*.17,-r*.9],[r*.09,-r*.83],[r*.12,-r*.73],[r*.02,-r*.79],[-r*.08,-r*.73],[-r*.05,-r*.83],[-r*.13,-r*.9],[-r*.03,-r*.9]],'#ffd23e',0);}
// ================= projectiles / items =================
function pawSpr(size,col,col2){return toon(size,(g,r)=>{
  const lw=r*.14;
  el(g,0,r*.25,r*.5,r*.42,col,lw);
  el(g,-r*.52,-r*.22,r*.22,r*.26,col,lw);
  el(g,0,-r*.4,r*.22,r*.26,col,lw);
  el(g,r*.52,-r*.22,r*.22,r*.26,col,lw);
  if(col2){el(g,0,r*.28,r*.28,r*.22,col2,0);}});}
function yarnSpr(size,col,col2){return toon(size,(g,r)=>{
  el(g,0,0,r*.8,r*.8,col,r*.14);
  g.strokeStyle=col2;g.lineWidth=r*.13;
  g.beginPath();g.arc(0,0,r*.5,.3,2.6);g.stroke();
  g.beginPath();g.arc(0,r*.1,r*.3,3.4,5.8);g.stroke();
  g.beginPath();g.moveTo(r*.6,r*.5);g.quadraticCurveTo(r*1.05,r*.6,r*1,r*.95);g.stroke();});}
const fishSpr=(size,col)=>toon(size,(g,r)=>{
  const lw=r*.13;col=col||'#7ec8ff';
  el(g,-r*.1,0,r*.62,r*.42,col,lw);
  poly2(g,[[r*.4,0],[r*.92,-r*.4],[r*.92,r*.4]],col,lw);
  dotEye(g,-r*.36,-r*.08,r*.1);
  g.strokeStyle=OUT;g.lineWidth=lw*.5;
  g.beginPath();g.arc(-r*.55,0,r*.16,-.8,.8);g.stroke();});
const roseSpr=toon(20,(g,r)=>{
  el(g,0,-r*.15,r*.55,r*.55,'#e8443c',r*.13);
  g.strokeStyle='#a82c28';g.lineWidth=r*.12;
  g.beginPath();g.arc(0,-r*.15,r*.3,0,4.5);g.stroke();
  g.strokeStyle='#4f9b3f';g.lineWidth=r*.14;
  g.beginPath();g.moveTo(0,r*.3);g.lineTo(0,r*.95);g.stroke();
  el(g,r*.25,r*.6,r*.2,r*.1,'#5fae4a',0);});
const boneSpr=toon(22,(g,r)=>{
  g.strokeStyle=OUT;g.lineWidth=r*.5+r*.16;
  g.beginPath();g.moveTo(-r*.5,0);g.lineTo(r*.5,0);g.stroke();
  g.strokeStyle='#f5f0e0';g.lineWidth=r*.5;
  g.beginPath();g.moveTo(-r*.5,0);g.lineTo(r*.5,0);g.stroke();
  for(const s of[-1,1])for(const v of[-1,1])
    el(g,s*r*.55,v*r*.22,r*.26,r*.26,'#f5f0e0',r*.14);});
function badge(emoji,size){ // item pickup badge: white circle + emoji
  return toon(size,(g,r)=>{
    el(g,0,0,r*.95,r*.95,'#fff',r*.16);
    g.font=(r*1.15)+'px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    g.textAlign='center';g.textBaseline='middle';
    g.fillText(emoji,0,r*.08);});}
// ---- card icons (drawn, for level-up cards) ----
function iconCanvas(fn){const c=document.createElement('canvas');c.width=c.height=56;
  const g=c.getContext('2d');g.translate(28,28);g.lineJoin='round';g.lineCap='round';
  fn(g,24);return c;}
const ICONS={
  paw:iconCanvas((g,r)=>{el(g,0,r*.3,r*.52,r*.44,'#ff8ab0',r*.13);
    el(g,-r*.55,-r*.2,r*.24,r*.28,'#ff8ab0',r*.13);
    el(g,0,-r*.42,r*.24,r*.28,'#ff8ab0',r*.13);
    el(g,r*.55,-r*.2,r*.24,r*.28,'#ff8ab0',r*.13);}),
  yarn:iconCanvas((g,r)=>{el(g,0,0,r*.82,r*.82,'#ffd23e',r*.13);
    g.strokeStyle='#e8a51f';g.lineWidth=r*.13;
    g.beginPath();g.arc(0,0,r*.5,.3,2.6);g.stroke();
    g.beginPath();g.arc(0,r*.1,r*.3,3.4,5.8);g.stroke();}),
  fish:iconCanvas((g,r)=>{el(g,-r*.12,0,r*.6,r*.4,'#7ec8ff',r*.12);
    poly2(g,[[r*.36,0],[r*.9,-r*.4],[r*.9,r*.4]],'#7ec8ff',r*.12);
    dotEye(g,-r*.36,-r*.08,r*.1);}),
  bolt:iconCanvas((g,r)=>{poly2(g,[[r*.1,-r*.9],[-r*.5,r*.15],[-r*.08,r*.15],[-r*.25,r*.9],[r*.5,-r*.18],[r*.05,-r*.18]],'#ffd23e',r*.12);}),
  claw:iconCanvas((g,r)=>{g.strokeStyle='#ff5a6a';g.lineWidth=r*.16;g.lineCap='round';
    for(const o of[-.34,0,.34]){g.beginPath();g.arc(-r*.2,o*r,r*.85,-.55,.55);g.stroke();}}),
  rose:iconCanvas((g,r)=>{el(g,0,-r*.1,r*.5,r*.5,'#e8443c',r*.12);
    g.strokeStyle='#a82c28';g.lineWidth=r*.1;g.beginPath();g.arc(0,-r*.1,r*.26,0,4.5);g.stroke();
    g.strokeStyle='#4f9b3f';g.lineWidth=r*.13;g.beginPath();g.moveTo(0,r*.32);g.lineTo(0,r*.9);g.stroke();
    el(g,r*.22,r*.58,r*.18,r*.09,'#5fae4a',0);}),
  rapid:iconCanvas((g,r)=>{g.fillStyle='#ffd23e';g.strokeStyle=OUT;g.lineWidth=r*.1;
    for(const o of[-.3,.3]){g.beginPath();g.ellipse(o*r*.5,0,r*.8,r*.28,0,0,TAU);g.fill();g.stroke();}}),
  nova:iconCanvas((g,r)=>{g.fillStyle='#ff6a8a';g.strokeStyle=OUT;g.lineWidth=r*.11;
    g.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU,rr=i%2?r*.45:r*.9;
      g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();g.stroke();
    el(g,0,0,r*.3,r*.3,'#fff',0);}),
  spd:iconCanvas((g,r)=>{g.font='38px "Segoe UI Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('🌿',0,2);}),
  mag:iconCanvas((g,r)=>{g.font='38px "Segoe UI Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('🥫',0,2);}),
  hp:iconCanvas((g,r)=>{g.font='38px "Segoe UI Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('❤️',0,2);}),
  dmg:iconCanvas((g,r)=>{g.font='38px "Segoe UI Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('🔥',0,2);}),
  cd:iconCanvas((g,r)=>{g.font='38px "Segoe UI Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('⏩',0,2);}),
};
// ================= sprite registry =================
const STK={
  cat_a:CAT_A,cat_b:CAT_B,cat_c:CAT_C,cat_d:CAT_D,
  mouse:toon(36,(g,r)=>mouseFn(g,r)),
  mosq:toon(32,(g,r)=>mosqFn(g,r)),
  fly:toon(28,(g,r)=>flyFn(g,r)),
  dande:toon(46,(g,r)=>dandeFn(g,r)),
  hedge:toon(40,(g,r)=>hedgeFn(g,r)),
  frog:toon(40,(g,r)=>frogFn(g,r)),
  slime:toon(38,(g,r)=>slimeFn(g,r)),
  slimeS:toon(24,(g,r)=>slimeFn(g,r)),
  wasp:toon(34,(g,r)=>waspFn(g,r)),
  snake:toon(46,(g,r)=>snakeFn(g,r)),
  pigeon:toon(36,(g,r)=>pigeonFn(g,r)),
  boar:toon(84,(g,r)=>boarFn(g,r)),
  topgun:toon(76,(g,r)=>topgunFn(g,r)),
  frogq:toon(92,(g,r)=>frogqFn(g,r)),
  flyB:toon(70,(g,r)=>flyBFn(g,r)),
  mosqB:toon(70,(g,r)=>mosqBFn(g,r)),
  racc:toon(86,(g,r)=>raccFn(g,r)),
  snakeK:toon(94,(g,r)=>snakeKFn(g,r)),
  dogB:toon(88,(g,r)=>dogBFn(g,r)),
  mage:toon(90,(g,r)=>mageFn(g,r)),
  // player shots
  paw:pawSpr(20,'#ffd9e8','#ff8ab0'),
  wave:pawSpr(34,'rgba(255,170,200,.85)','#ff8ab0'),
  yarn:yarnSpr(24,'#ffd23e','#e8a51f'),
  yarnR:yarnSpr(26,'#ff6a6a','#d83c3c'),
  fish:fishSpr(30),
  shark:fishSpr(38,'#8aa8c8'),
  rose:roseSpr,
  bone:boneSpr,
  blade:toon(18,(g,r)=>{g.fillStyle='#ff5a6a';g.strokeStyle='#fff';g.lineWidth=r*.18;
    g.beginPath();g.arc(0,0,r*.9,-.7,.7);g.arc(r*.5,0,r*.7,.7,-.7,true);g.closePath();g.fill();g.stroke();}),
  // items
  coin:badge('🪙',24),chicken:badge('🍗',30),
  it_nuke:badge('💥',30),it_bolt:badge('⚡',30),it_frz:badge('💤',30),it_hole:badge('🌀',30),
  it_rage:badge('😤',30),it_gat:badge('🔫',30),it_clone:badge('👯',30),it_inv:badge('✨',30),it_nocd:badge('♾️',30),
};
// ================= stage backgrounds (muted, no clutter) =================
function mkBg(base,fn){const c=document.createElement('canvas');c.width=c.height=420;
  const g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,420,420);
  let seed=99;const sr=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  fn(g,sr);return c;}
const BGS=[
  mkBg('#86c163',(g,sr)=>{ // 1 풀밭
    g.strokeStyle='rgba(70,130,50,.35)';g.lineWidth=2;
    for(let i=0;i<46;i++){const x=sr()*420,y=sr()*420;
      g.beginPath();g.moveTo(x-3,y);g.lineTo(x,y-6);g.lineTo(x+3,y);g.stroke();}
    g.fillStyle='rgba(255,255,255,.05)';
    for(let i=0;i<6;i++){g.beginPath();g.ellipse(sr()*420,sr()*420,40,24,sr()*3,0,TAU);g.fill();}}),
  mkBg('#a6abb4',(g,sr)=>{ // 2 주차장
    g.fillStyle='rgba(0,0,0,.05)';for(let i=0;i<160;i++)g.fillRect(sr()*420,sr()*420,2,2);
    g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=6;
    g.beginPath();g.moveTo(0,105);g.lineTo(140,105);g.moveTo(0,315);g.lineTo(140,315);
    g.moveTo(280,0);g.lineTo(280,140);g.moveTo(280,280);g.lineTo(280,420);g.stroke();
    g.strokeStyle='rgba(60,60,65,.18)';g.lineWidth=2;
    for(let i=0;i<4;i++){g.beginPath();let x=sr()*420,y=sr()*420;g.moveTo(x,y);
      for(let j=0;j<4;j++){x+=sr()*46-23;y+=sr()*46-23;g.lineTo(x,y);}g.stroke();}}),
  mkBg('#e3cb96',(g,sr)=>{ // 3 모래밭
    g.fillStyle='rgba(160,120,60,.12)';for(let i=0;i<200;i++)g.fillRect(sr()*420,sr()*420,2.5,2.5);
    g.strokeStyle='rgba(180,140,80,.25)';g.lineWidth=3;
    for(let i=0;i<5;i++){g.beginPath();g.arc(sr()*420,sr()*420,30+sr()*40,sr()*3,sr()*3+2);g.stroke();}
    g.fillStyle='rgba(255,255,255,.08)';
    for(let i=0;i<5;i++){g.beginPath();g.ellipse(sr()*420,sr()*420,30,18,sr()*3,0,TAU);g.fill();}}),
  mkBg('#c2a382',(g,sr)=>{ // 4 시장골목
    g.strokeStyle='rgba(90,70,50,.18)';g.lineWidth=2;
    for(let x=0;x<=420;x+=70){g.beginPath();g.moveTo(x,0);g.lineTo(x,420);g.stroke();}
    for(let y=0;y<=420;y+=70){g.beginPath();g.moveTo(0,y);g.lineTo(420,y);g.stroke();}
    g.fillStyle='rgba(0,0,0,.05)';
    for(let i=0;i<7;i++)g.fillRect((sr()*6|0)*70+4,(sr()*6|0)*70+4,62,62);}),
  mkBg('#939aad',(g,sr)=>{ // 5 옥상
    g.strokeStyle='rgba(60,65,85,.25)';g.lineWidth=3;
    for(let x=0;x<=420;x+=105){g.beginPath();g.moveTo(x,0);g.lineTo(x,420);g.stroke();}
    for(let y=0;y<=420;y+=105){g.beginPath();g.moveTo(0,y);g.lineTo(420,y);g.stroke();}
    g.fillStyle='rgba(255,220,160,.08)';
    for(let i=0;i<5;i++){g.beginPath();g.ellipse(sr()*420,sr()*420,34,20,0,0,TAU);g.fill();}}),
  mkBg('#6e8585',(g,sr)=>{ // 6 하수도
    g.strokeStyle='rgba(40,60,60,.3)';g.lineWidth=3;
    for(let y=0;y<=420;y+=52){g.beginPath();g.moveTo(0,y);g.lineTo(420,y);g.stroke();}
    for(let i=0;i<28;i++){const x=(sr()*8|0)*52,y=(sr()*8|0)*52;
      g.beginPath();g.moveTo(x+26,y);g.lineTo(x+26,y+52);g.stroke();}
    g.fillStyle='rgba(120,200,180,.07)';
    for(let i=0;i<6;i++){g.beginPath();g.ellipse(sr()*420,sr()*420,40,14,0,0,TAU);g.fill();}}),
  mkBg('#6a9456',(g,sr)=>{ // 7 오솔길
    g.fillStyle='rgba(140,110,70,.25)';
    g.beginPath();g.ellipse(210,210,200,60,0,0,TAU);g.fill();
    g.strokeStyle='rgba(50,90,40,.3)';g.lineWidth=2;
    for(let i=0;i<40;i++){const x=sr()*420,y=sr()*420;
      g.beginPath();g.moveTo(x-3,y);g.lineTo(x,y-6);g.lineTo(x+3,y);g.stroke();}
    g.fillStyle='rgba(35,60,35,.18)';
    for(let i=0;i<5;i++){const x=sr()*420,y=sr()*420,s=16+sr()*8;
      g.beginPath();g.moveTo(x-s*.6,y);g.lineTo(x,y-s*1.5);g.lineTo(x+s*.6,y);g.closePath();g.fill();}}),
  mkBg('#5e6a82',(g,sr)=>{ // 8 정상 (보랏빛 밤)
    g.fillStyle='rgba(0,0,0,.08)';
    for(let i=0;i<7;i++){g.beginPath();g.ellipse(sr()*420,sr()*420,40,26,sr()*3,0,TAU);g.fill();}
    g.fillStyle='rgba(255,255,255,.5)';
    for(let i=0;i<14;i++){const x=sr()*420,y=sr()*420;g.fillRect(x,y,2,2);}
    g.fillStyle='rgba(150,120,200,.1)';
    for(let i=0;i<4;i++){g.beginPath();g.ellipse(sr()*420,sr()*420,50,30,0,0,TAU);g.fill();}}),
];
const SKYS=['#5e9447','#7d828c','#c4a878','#9c7f64','#6b7186','#4c5e5e','#4d7040','#454e63'];
const WALLS=['#5a8a3f','#62666e','#c49a5e','#8a6a4a','#5c6276','#3c5252','#4a6638','#343b4e'];
