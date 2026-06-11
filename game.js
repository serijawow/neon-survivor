'use strict';
// ================= canvas =================
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,zoom=1;
const IS_TOUCH0=matchMedia('(pointer:coarse)').matches;
function resize(){DPR=Math.min(devicePixelRatio||1,IS_TOUCH0?1.5:2);W=innerWidth;H=innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  // zoom out on small screens so the player sees more of the world around them
  zoom=Math.max(.58,Math.min(1,Math.min(W,H)/600));}
addEventListener('resize',resize);resize();
const $=id=>document.getElementById(id);
const _urlCache=new WeakMap();
function cvURL(c){let u=_urlCache.get(c);if(!u){u=c.toDataURL();_urlCache.set(c,u);}return u;}
const PCAP=IS_TOUCH0?300:480;  // cap particles lower on phones
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy};
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;

// ================= save / profile =================
const SVKEY='nyang_v3';
let SV={name:'',coins:0,owned:[],cat:'a',up:{hp:0,dmg:0,spd:0,mag:0,coin:0,luck:0},maxStage:1,clears:{},mute:false,master:false};
let masterSel=false;
(function(){
  try{const raw=localStorage.getItem(SVKEY);
    if(raw){const o=JSON.parse(raw);Object.assign(SV,o);SV.up=Object.assign({hp:0,dmg:0,spd:0,mag:0,coin:0,luck:0},o.up||{});}
    else{ // migrate v2
      SV.coins=+(localStorage.getItem('ns2_coins')||0);
      const ow=JSON.parse(localStorage.getItem('ns2_owned')||'[]');
      if(ow.length)SV.owned=ow;
      SV.mute=localStorage.getItem('ns_mute')==='1';}
  }catch(e){}})();
function save(){try{localStorage.setItem(SVKEY,JSON.stringify(SV));}catch(e){}}
function expCode(){const j=JSON.stringify(SV);let h=7;
  for(let i=0;i<j.length;i++)h=(h*31+j.charCodeAt(i))>>>0;
  return btoa(unescape(encodeURIComponent(j)))+'.'+h.toString(36);}
function impCode(s){try{const[b,c]=s.trim().split('.');
  const j=decodeURIComponent(escape(atob(b)));let h=7;
  for(let i=0;i<j.length;i++)h=(h*31+j.charCodeAt(i))>>>0;
  if(h.toString(36)!==c)return false;
  const o=JSON.parse(j);if(!o||typeof o.coins!=='number')return false;
  SV=Object.assign(SV,o);save();return true;}catch(e){return false;}}
function toast(msg){const t=$('toast');t.textContent=msg;t.style.opacity=1;
  clearTimeout(toast._t);toast._t=setTimeout(()=>t.style.opacity=0,1700);}

// ================= audio =================
let AC=null,master=null,musicG=null,sfxG=null,revG=null;
function ac(){if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=SV.mute?0:.6;master.connect(AC.destination);
  // gentle limiter so layered music never clips
  const comp=AC.createDynamicsCompressor();
  comp.threshold.value=-14;comp.knee.value=22;comp.ratio.value=8;comp.attack.value=.004;comp.release.value=.18;
  comp.connect(master);
  musicG=AC.createGain();musicG.gain.value=.42;musicG.connect(comp);
  sfxG=AC.createGain();sfxG.gain.value=1;sfxG.connect(comp);
  // reverb send — cheap feedback delay (was a 1.6s stereo Convolver: heavy on mobile)
  const dly=AC.createDelay(.6);dly.delayTime.value=.15;
  const fb=AC.createGain();fb.gain.value=.34;
  const damp=AC.createBiquadFilter();damp.type='lowpass';damp.frequency.value=2400;
  dly.connect(damp);damp.connect(fb);fb.connect(dly);
  revG=AC.createGain();revG.gain.value=.4;revG.connect(dly);dly.connect(comp);
  ac.nb=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
  const nd=ac.nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;}
  if(AC.state==='suspended')AC.resume();return AC;}
function tone(f,dur,type,vol,slide){try{const a=ac(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime;
  o.type=type;o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(1,slide),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(sfxG);o.start(t);o.stop(t+dur);}catch(e){}}
function noise(dur,vol,freq,type){try{const a=ac(),s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(),t=a.currentTime;
  s.buffer=ac.nb;s.loop=true;f.type=type||'highpass';f.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f);f.connect(g);g.connect(sfxG);s.start(t);s.stop(t+dur);}catch(e){}}
function sMeow(){try{const a=ac(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime;
  o.type='sine';o.frequency.setValueAtTime(470,t);
  o.frequency.linearRampToValueAtTime(840,t+.12);o.frequency.linearRampToValueAtTime(350,t+.3);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.22,t+.05);g.gain.linearRampToValueAtTime(.0001,t+.32);
  o.connect(g);g.connect(sfxG);o.start(t);o.stop(t+.33);}catch(e){}}
let lastShot=0,lastGem=0,gemStreak=0;
const sShot=()=>{const n=performance.now();if(n-lastShot<80)return;lastShot=n;tone(560,.05,'triangle',.06,360);};
const sHit=()=>noise(.04,.06,2600);
const sDie=()=>{noise(.09,.12,1200,'bandpass');tone(290,.1,'triangle',.1,90);};
const sBig=()=>{noise(.3,.2,400,'lowpass');tone(120,.3,'sawtooth',.16,40);};
const sGem=()=>{const n=performance.now();gemStreak=n-lastGem<400?Math.min(gemStreak+1,12):0;lastGem=n;
  tone(620+gemStreak*65,.07,'sine',.1);};
const sCoin=()=>{tone(988,.07,'triangle',.13);setTimeout(()=>tone(1319,.12,'triangle',.13),65);};
const sHurt=()=>{sMeow();noise(.14,.15,700,'lowpass');};
const sLevel=()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.16,'triangle',.14),i*70));
const sPick=()=>{tone(880,.09,'triangle',.15);setTimeout(()=>tone(1320,.15,'triangle',.15),75);};
const sHiss=()=>{noise(.25,.2,3000);tone(170,.22,'sawtooth',.08,70);};
const sZap=()=>{noise(.07,.11,4200);tone(1500,.07,'sawtooth',.06,200);};
const sWarn=()=>[0,190,380].forEach(d=>setTimeout(()=>tone(420,.15,'triangle',.18,320),d));
const sChest=()=>[659,784,1046,1318,1568].forEach((f,i)=>setTimeout(()=>tone(f,.18,'triangle',.14),i*85));
const sClear=()=>[523,659,784,1046,784,1046,1318,1568].forEach((f,i)=>setTimeout(()=>tone(f,.22,'triangle',.13),i*105));
const sDead=()=>{sMeow();setTimeout(()=>tone(360,.7,'sine',.16,85),200);};
const sJump=()=>tone(290,.13,'sine',.09,580);
const sThud=()=>{noise(.13,.16,300,'lowpass');tone(90,.16,'sine',.2,40);};
const sTele=()=>tone(900,.18,'sine',.11,1800);
// ================= real music engine =================
// note name -> freq
const NF=(()=>{const m={},names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  for(let o=1;o<=6;o++)for(let i=0;i<12;i++)m[names[i]+o]=440*Math.pow(2,(o*12+i-57)/12);return m;})();
function chord(root,type){const r=NF[root],q=type==='m'?[0,3,7]:type==='7'?[0,4,7,10]:type==='maj7'?[0,4,7,11]:type==='m7'?[0,3,7,10]:[0,4,7];
  return q.map(s=>r*Math.pow(2,s/12));}
// instrument voices ------------------------------------------------
function vLead(t,f,dur,vel){ // supersaw-ish pluck w/ reverb
  const g=AC.createGain(),fl=AC.createBiquadFilter();
  fl.type='lowpass';fl.frequency.setValueAtTime(4200,t);fl.frequency.exponentialRampToValueAtTime(1100,t+dur*.9);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vel,t+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  fl.connect(g);g.connect(musicG);
  const rv=AC.createGain();rv.gain.value=.35;g.connect(rv);rv.connect(revG);
  for(const det of[-6,0,6]){const o=AC.createOscillator();o.type='sawtooth';
    o.frequency.value=f;o.detune.value=det;o.connect(fl);o.start(t);o.stop(t+dur+.02);}
  const sub=AC.createOscillator();sub.type='triangle';sub.frequency.value=f/2;
  const sg=AC.createGain();sg.gain.value=.4;sub.connect(sg);sg.connect(fl);sub.start(t);sub.stop(t+dur+.02);}
function vBass(t,f,dur){const o=AC.createOscillator(),o2=AC.createOscillator(),g=AC.createGain(),fl=AC.createBiquadFilter();
  o.type='sawtooth';o2.type='square';o.frequency.value=f;o2.frequency.value=f;
  fl.type='lowpass';fl.frequency.setValueAtTime(420,t);fl.Q.value=6;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.32,t+.02);
  g.gain.setValueAtTime(.32,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(fl);o2.connect(fl);fl.connect(g);g.connect(musicG);
  o.start(t);o.stop(t+dur);o2.start(t);o2.stop(t+dur);}
function vPad(t,freqs,dur){const g=AC.createGain(),fl=AC.createBiquadFilter();
  fl.type='lowpass';fl.frequency.value=1600;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05,t+.4);
  g.gain.setValueAtTime(.05,t+dur*.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  fl.connect(g);g.connect(musicG);const rv=AC.createGain();rv.gain.value=.6;g.connect(rv);rv.connect(revG);
  for(const f of freqs){const o=AC.createOscillator();o.type='triangle';o.frequency.value=f;
    o.detune.value=rnd(-5,5);o.connect(fl);o.start(t);o.stop(t+dur+.05);}}
function vBell(t,f,dur,vel){const o=AC.createOscillator(),g=AC.createGain();
  o.type='sine';o.frequency.value=f;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vel||.12,t+.005);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(musicG);const rv=AC.createGain();rv.gain.value=.5;g.connect(rv);rv.connect(revG);
  o.start(t);o.stop(t+dur);
  const o2=AC.createOscillator(),g2=AC.createGain();o2.type='sine';o2.frequency.value=f*2.005;
  g2.gain.setValueAtTime((vel||.12)*.4,t);g2.gain.exponentialRampToValueAtTime(.0001,t+dur*.6);
  o2.connect(g2);g2.connect(musicG);o2.start(t);o2.stop(t+dur*.6);}
function dKick(t){const o=AC.createOscillator(),g=AC.createGain();
  o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);
  g.gain.setValueAtTime(.7,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);
  o.connect(g);g.connect(musicG);o.start(t);o.stop(t+.17);}
function dSnare(t){const s=AC.createBufferSource(),g=AC.createGain(),f=AC.createBiquadFilter();
  s.buffer=ac.nb;f.type='bandpass';f.frequency.value=1900;f.Q.value=.7;
  g.gain.setValueAtTime(.32,t);g.gain.exponentialRampToValueAtTime(.001,t+.13);
  s.connect(f);f.connect(g);g.connect(musicG);s.start(t);s.stop(t+.14);
  const o=AC.createOscillator(),og=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(330,t);
  og.gain.setValueAtTime(.18,t);og.gain.exponentialRampToValueAtTime(.001,t+.1);
  o.connect(og);og.connect(musicG);o.start(t);o.stop(t+.11);}
function dHat(t,open){const s=AC.createBufferSource(),g=AC.createGain(),f=AC.createBiquadFilter();
  s.buffer=ac.nb;f.type='highpass';f.frequency.value=9000;
  const d=open?.14:.035;
  g.gain.setValueAtTime(open?.12:.09,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  s.connect(f);f.connect(g);g.connect(musicG);s.start(t);s.stop(t+d+.01);}
// per-stage song: chord loop + melodic phrase. Major=bright, minor=tense(boss/late)
const SONGS=[
  {bpm:112,prog:[['C4',''],['G3',''],['A3','m'],['F3','maj7']],
   mel:['E5','G5','C5','D5', 'E5','C5','D5','G4', 'A4','C5','E5','D5', 'C5','G4','E4','G4']},
  {bpm:120,prog:[['A3','m'],['F3',''],['C4',''],['G3','']],
   mel:['A4','C5','E5','C5', 'D5','C5','A4','E4', 'F4','A4','C5','A4', 'G4','E4','C4','E4']},
  {bpm:118,prog:[['D4','m'],['B3','b'],['F3',''],['C4','']],
   mel:['D5','F5','A5','F5', 'G5','F5','D5','A4', 'C5','E5','G5','E5', 'D5','A4','F4','A4']},
  {bpm:126,prog:[['E4','m'],['C4',''],['G3',''],['D4','']],
   mel:['E5','G5','B5','G5', 'A5','G5','E5','B4', 'C5','E5','G5','E5', 'D5','B4','G4','B4']},
  {bpm:122,prog:[['F3','maj7'],['A3','m'],['B3','b'],['C4','7']],
   mel:['A4','C5','F5','E5', 'C5','A4','G4','C5', 'D5','F5','A5','F5', 'E5','C5','A4','G4']},
  {bpm:128,prog:[['G3','m'],['D4','m'],['Eb4',''],['F4','']],
   mel:['G4','A#4','D5','A#4', 'C5','A#4','G4','D4', 'F4','G4','A#4','G4', 'F4','D4','A#3','D4']},
  {bpm:124,prog:[['A3','m'],['E4','m'],['F3',''],['G3','']],
   mel:['A4','C5','E5','A5', 'G5','E5','C5','E5', 'F5','E5','C5','A4', 'B4','E5','G#4','B4']},
  {bpm:134,prog:[['E4','m'],['C4','maj7'],['A3','m'],['B3','7']],
   mel:['E5','G5','B5','E6', 'D6','B5','G5','B5', 'C6','B5','G5','E5', 'F#5','D#5','B4','D#5']},
];
let mStep=0,mNext=0,mSong=0;
function setSong(i){mSong=clamp(i,0,SONGS.length-1);mStep=0;mNext=0;}
setInterval(()=>{
  if(!AC||SV.mute||(state!=='playing'&&state!=='cutscene'))return;
  const S=SONGS[mSong],SPB=60/S.bpm/4;
  if(mNext<AC.currentTime)mNext=AC.currentTime+.05;
  const tense=bossOn;  // shift darker/heavier during boss
  while(mNext<AC.currentTime+.16){
    const s=mStep%16,bar=(mStep/16|0)%4,t=mNext;
    const[croot,ctype]=S.prog[bar];
    const cf=chord(croot,ctype||'');
    // drums
    if(s%4===0)dKick(t);
    if(s===4||s===12)dSnare(t);
    if(tense&&s===10)dSnare(t);
    dHat(t,s%4===2);
    // bass: root on beat, fifth on offbeat
    if(s%2===0){const bf=cf[0]/2*(s%4===0?1:1);vBass(t,s%8===4?cf[2]/2:cf[0]/2,SPB*1.8);}
    // pad on bar start
    if(s===0)vPad(t,cf,SPB*16);
    // melody (skip notes during tense for syncopation handled by accent)
    const note=S.mel[mStep%16+(bar%2)*0];
    if(s%1===0){const n=S.mel[s];
      if(n){const f=NF[n];
        if(tense)vLead(t,f,SPB*1.8,.13);
        else vBell(t,f,SPB*3.2,.13);
        // octave sparkle every other bar when calm
        if(!tense&&bar%2===1&&s%4===0)vBell(t+SPB*.5,f*2,SPB*1.2,.05);}}
    // arpeggio shimmer (calm only)
    if(!tense&&s%2===1){const af=cf[(s/2|0)%cf.length]*2;vBell(t,af,SPB*1.1,.04);}
    mStep++;mNext+=SPB;}
},30);

// ================= cats =================
// each cat starts with a unique INNATE weapon (only they can use it). It is fully
// card-upgradeable like any weapon — e.g. 알파냥 gets piercing only via a card.
const CATS=[
  {key:'a',stk:'cat_a',name:'알파냥',innate:'paw',price:0,
   perk:'통통 노랑 줄무늬<br>🐾 냥냥펀치: 넓게 퍼지는 펀치',hp:105,spd:182,mod:p=>{}},
  {key:'b',stk:'cat_b',name:'까칠냥',innate:'claw',price:150,
   perk:'삼색 까칠보스<br>🩸 흡혈 발톱: 근접 광역+회복',hp:120,spd:196,mod:p=>{p.dmgBase*=1.1;}},
  {key:'c',stk:'cat_c',name:'신사냥',innate:'rose',price:300,
   perk:'가면의 신사<br>🌹 장미 저격: 묵직한 단발, 보스 특효',hp:92,spd:186,mod:p=>{}},
  {key:'d',stk:'cat_d',name:'민첩냥',innate:'rapid',price:500,
   perk:'바람의 회색 머리<br>💨 속사: 초고속 연사 + 빠른 발',hp:82,spd:226,mod:p=>{p.cdAcc*=.92;}},
];
// ================= meta upgrades =================
const UPS=[
  {k:'hp',icon:'❤️',name:'튼튼한 몸',d:'최대 HP +12',max:5,cost:l=>[40,90,160,260,400][l]},
  {k:'dmg',icon:'🔥',name:'날카로운 발톱',d:'공격력 +5%',max:5,cost:l=>[50,110,200,320,480][l]},
  {k:'spd',icon:'👟',name:'가벼운 발걸음',d:'이동속도 +4%',max:5,cost:l=>[40,90,160,260,400][l]},
  {k:'mag',icon:'🧲',name:'간식 레이더',d:'흡수 범위 +18%',max:5,cost:l=>[30,70,120,200,300][l]},
  {k:'coin',icon:'🪙',name:'알뜰 살림',d:'코인 획득 +20%',max:3,cost:l=>[60,140,260][l]},
  {k:'luck',icon:'🍀',name:'고양이 운',d:'카드 등급 운 UP',max:3,cost:l=>[80,180,340][l]},
];
// ================= weapons & creative variants =================
// paw/claw/rose/rapid are INNATE (each cat starts with one, only they use it).
// yarn/fish/bolt/nova are shared — gained via "new weapon" cards.
const WDEF={
  paw:{name:'냥냥펀치',icon:'paw',innate:1,base:{cd:.5,dmg:8}},
  claw:{name:'흡혈 발톱',icon:'claw',innate:1,base:{cd:.46,dmg:9}},
  rose:{name:'장미 저격',icon:'rose',innate:1,base:{cd:1.25,dmg:28}},
  rapid:{name:'속사',icon:'rapid',innate:1,base:{cd:.2,dmg:5}},
  yarn:{name:'털뭉치 폭탄',icon:'yarn',base:{cd:1.7,dmg:15}},
  fish:{name:'빙글 생선',icon:'fish',base:{cd:0,dmg:7}},
  bolt:{name:'정전기 찌릿',icon:'bolt',base:{cd:2.0,dmg:12}},
  nova:{name:'대왕 하악질',icon:'nova',base:{cd:3.2,dmg:14}},
};
// each card variant bumps w.lvl. When lvl>=5 and not evolved, the two SSS
// evolutions (EVOS) become offerable — pick ONE to dramatically transform.
const VARS={
  paw:[
    {t:'C',n:'단단한 발바닥',d:'펀치 공격력 +18%',fx:w=>w.dmg+=.18},
    {t:'C',n:'빠른 잽',d:'펀치 연사 +14%',fx:w=>w.rate+=.14},
    {t:'B',n:'냥냥 더블',d:'펀치 +1발',fx:w=>w.n+=1},
    {t:'B',n:'관통권',d:'펀치가 적을 1번 더 관통',fx:w=>w.pierce+=1},
    {t:'B',n:'큰 손바닥',d:'펀치 크기 +30%',fx:w=>w.size+=.3},
    {t:'A',n:'냥냥 러시',d:'펀치 +2발 & 연사 +10%',fx:w=>{w.n+=2;w.rate+=.1;}},
    {t:'A',n:'분노의 발바닥',d:'공격력 +45% & 관통 +1',fx:w=>{w.dmg+=.45;w.pierce+=1;}},
    {t:'S',n:'왕발바닥',d:'크기 +70% & 관통 +2 & 공격력 +25%',fx:w=>{w.size+=.7;w.pierce+=2;w.dmg+=.25;}},
  ],
  claw:[
    {t:'C',n:'날카로운 손톱',d:'발톱 공격력 +18%',fx:w=>w.dmg+=.18},
    {t:'C',n:'빠른 손놀림',d:'발톱 속도 +16%',fx:w=>w.rate+=.16},
    {t:'B',n:'넓은 휘두름',d:'발톱 범위 +30%',fx:w=>w.size+=.3},
    {t:'B',n:'흡혈 강화',d:'흡혈량 2배',fx:w=>w.sp.life=(w.sp.life||1)+1},
    {t:'B',n:'양손 할퀴기',d:'앞뒤 양쪽 동시 공격',fx:w=>w.sp.both=1},
    {t:'A',n:'광폭 발톱',d:'공격력 +45% & 범위 +20%',fx:w=>{w.dmg+=.45;w.size+=.2;}},
    {t:'A',n:'피의 갈증',d:'흡혈 2배 & 공격력 +20%',fx:w=>{w.sp.life=(w.sp.life||1)+1;w.dmg+=.2;}},
    {t:'S',n:'야수화',d:'범위 +60% & 공격력 +30% & 흡혈↑',fx:w=>{w.size+=.6;w.dmg+=.3;w.sp.life=(w.sp.life||1)+1;}},
  ],
  rose:[
    {t:'C',n:'잘 벼린 가시',d:'저격 공격력 +20%',fx:w=>w.dmg+=.2},
    {t:'C',n:'빠른 장전',d:'저격 쿨다운 -14%',fx:w=>w.rate+=.14},
    {t:'B',n:'관통탄',d:'장미가 적을 관통',fx:w=>w.pierce+=2},
    {t:'B',n:'쌍권총',d:'장미 +1발',fx:w=>w.n+=1},
    {t:'B',n:'헤드샷',d:'보스 추가 피해 +50%',fx:w=>w.bossMul=(w.bossMul||1.7)+.5},
    {t:'A',n:'대구경',d:'공격력 +50% & 크기 +30%',fx:w=>{w.dmg+=.5;w.size+=.3;}},
    {t:'A',n:'속사 저격',d:'쿨다운 -25% & +1발',fx:w=>{w.rate+=.28;w.n+=1;}},
    {t:'S',n:'장미 대포',d:'공격력 +60% & 관통 & 보스 특효↑',fx:w=>{w.dmg+=.6;w.pierce+=2;w.bossMul=(w.bossMul||1.7)+.6;}},
  ],
  rapid:[
    {t:'C',n:'경량 탄',d:'속사 공격력 +18%',fx:w=>w.dmg+=.18},
    {t:'C',n:'트리거 해킹',d:'발사 속도 +16%',fx:w=>w.rate+=.16},
    {t:'B',n:'쌍열 발사',d:'탄환 +1줄',fx:w=>w.n+=1},
    {t:'B',n:'예리한 탄',d:'관통 +1',fx:w=>w.pierce+=1},
    {t:'B',n:'정밀 조준',d:'탄퍼짐 감소 & 공격력 +12%',fx:w=>{w.dmg+=.12;w.sp.tight=1;}},
    {t:'A',n:'난사',d:'탄환 +2줄 & 속도 +10%',fx:w=>{w.n+=2;w.rate+=.1;}},
    {t:'A',n:'철갑탄',d:'공격력 +40% & 관통 +1',fx:w=>{w.dmg+=.4;w.pierce+=1;}},
    {t:'S',n:'탄막 살포',d:'탄환 +3줄 & 속도 +20%',fx:w=>{w.n+=3;w.rate+=.2;}},
  ],
  yarn:[
    {t:'C',n:'꽉 감은 털실',d:'털뭉치 공격력 +18%',fx:w=>w.dmg+=.18},
    {t:'C',n:'펑펑 털실',d:'폭발 범위 +28%',fx:w=>w.size+=.28},
    {t:'B',n:'털뭉치 +1',d:'털뭉치 +1개',fx:w=>w.n+=1},
    {t:'B',n:'찰떡 유도',d:'유도 & 속도 UP',fx:w=>w.rate+=.22},
    {t:'A',n:'털뭉치 +2',d:'털뭉치 +2개',fx:w=>w.n+=2},
    {t:'A',n:'빨간 털뭉치',d:'공격력 +55%, 새빨개진다!',fx:w=>{w.dmg+=.55;w.sp.red=1;}},
    {t:'S',n:'왕털뭉치',d:'크기 +80% & 공격력 +35%',fx:w=>{w.size+=.8;w.dmg+=.35;}},
  ],
  fish:[
    {t:'C',n:'싱싱한 생선',d:'생선 공격력 +18%',fx:w=>w.dmg+=.18},
    {t:'C',n:'회오리 회전',d:'회전 속도 +16%',fx:w=>w.rate+=.16},
    {t:'B',n:'생선 +1',d:'생선 +1마리',fx:w=>w.n+=1},
    {t:'B',n:'대왕 생선',d:'생선 크기 +28%',fx:w=>w.size+=.28},
    {t:'A',n:'생선 +2',d:'생선 +2마리',fx:w=>w.n+=2},
    {t:'A',n:'가시 돋친 생선',d:'공격력 +45% & 적 칠 때 가시',fx:w=>{w.dmg+=.45;w.sp.spike=1;}},
    {t:'S',n:'상어 진화',d:'크기 +60% & 공격력 +40%',fx:w=>{w.size+=.6;w.dmg+=.4;w.sp.shark=1;}},
  ],
  bolt:[
    {t:'C',n:'찌릿 강화',d:'번개 공격력 +18%',fx:w=>w.dmg+=.18},
    {t:'C',n:'골골 충전',d:'번개 쿨다운 -14%',fx:w=>w.rate+=.14},
    {t:'B',n:'연쇄 +1',d:'번개 연쇄 +1',fx:w=>w.n+=1},
    {t:'B',n:'마비 전류',d:'맞은 적 0.4초 마비',fx:w=>w.sp.stun=1},
    {t:'A',n:'연쇄 +2',d:'번개 연쇄 +2',fx:w=>w.n+=2},
    {t:'A',n:'고압 전류',d:'공격력 +45% & 폭발',fx:w=>{w.dmg+=.45;w.sp.boom=1;}},
    {t:'S',n:'과부하',d:'공격력 +60% & 쿨다운 -18% & 연쇄 +1',fx:w=>{w.dmg+=.6;w.rate+=.18;w.n+=1;}},
  ],
  nova:[
    {t:'C',n:'하악 강화',d:'하악질 공격력 +18%',fx:w=>w.dmg+=.18},
    {t:'C',n:'분노 충전',d:'하악질 쿨다운 -14%',fx:w=>w.rate+=.14},
    {t:'B',n:'우렁찬 하악',d:'범위 +22%',fx:w=>w.size+=.22},
    {t:'B',n:'밀어내기',d:'강한 넉백 & 공격력 +12%',fx:w=>{w.dmg+=.12;w.sp.knock=1;}},
    {t:'A',n:'대형 하악',d:'범위 +30% & 공격력 +22%',fx:w=>{w.size+=.3;w.dmg+=.22;}},
    {t:'A',n:'속사포 하악',d:'쿨다운 -28%',fx:w=>w.rate+=.28},
    {t:'S',n:'분노 폭발',d:'범위 +40% & 공격력 +30%',fx:w=>{w.size+=.4;w.dmg+=.3;}},
  ],
};
// dual SSS final evolutions — pick ONE, weapon transforms dramatically & locks.
const EVOS={
  paw:[
    {id:'million',n:'⭐백만냥 펀치',d:'발사마다 360° 펀치 폭풍! 화면을 펀치로 도배',fx:w=>{w.sp.ring=2;w.dmg+=.5;w.rate+=.2;}},
    {id:'titan',n:'⭐타이탄 권왕',d:'거대한 한 방 펀치! 모두 관통하는 초대형 주먹',fx:w=>{w.sp.titan=1;w.size+=2.2;w.pierce+=20;w.dmg+=2;}},
  ],
  claw:[
    {id:'reaper',n:'⭐피의 회오리',d:'휘두를 때마다 360° 회전 베기 + 강력 흡혈',fx:w=>{w.sp.spin=1;w.sp.life=(w.sp.life||1)+2;w.size+=.5;}},
    {id:'thousand',n:'⭐천수난무',d:'사방으로 수많은 발톱 칼날이 날아간다',fx:w=>{w.sp.thousand=1;w.dmg+=.4;}},
  ],
  rose:[
    {id:'thorn',n:'⭐가시 덩굴포',d:'모든 것을 꿰뚫는 가시 일직선! 보스 즉살급',fx:w=>{w.sp.thorn=1;w.pierce+=30;w.dmg+=1;w.bossMul=(w.bossMul||1.7)+1;}},
    {id:'storm',n:'⭐장미 폭풍',d:'유도하는 장미 꽃잎을 한가득 흩뿌린다',fx:w=>{w.sp.storm=1;w.n+=8;}},
  ],
  rapid:[
    {id:'gatling',n:'⭐개틀링냥',d:'미친 연사력! 정면으로 탄알 폭포',fx:w=>{w.sp.gatling=1;w.rate+=1.5;w.n+=2;}},
    {id:'homing',n:'⭐유도 미사일냥',d:'모든 탄이 적을 자동으로 추적',fx:w=>{w.sp.homing=1;w.dmg+=.4;w.n+=1;}},
  ],
  yarn:[
    {id:'turret',n:'⭐털뭉치 포탑군단',d:'터지는 자리마다 자동포탑이 솟아난다',fx:w=>{w.sp.turret=1;w.n+=1;}},
    {id:'meteor',n:'⭐대털뭉치',d:'초거대 털뭉치가 튕기며 연쇄 폭발!',fx:w=>{w.sp.giant=1;w.size+=1.6;w.dmg+=1;}},
  ],
  fish:[
    {id:'parade',n:'⭐바다친구 대행진',d:'생선 군단이 빙글빙글, 끊임없이 가시 발사',fx:w=>{w.sp.parade=1;w.n+=4;w.rate+=.4;w.sp.spike=1;}},
    {id:'whale',n:'⭐바다의 수레바퀴',d:'거대 고래가 천천히 돌며 모두 짓밟는다',fx:w=>{w.sp.whale=1;w.size+=1.8;w.dmg+=1.2;}},
  ],
  bolt:[
    {id:'sky',n:'⭐천벌',d:'하늘에서 굵은 벼락! 강력한 단일 광역 낙뢰',fx:w=>{w.sp.sky=1;w.dmg+=1.5;}},
    {id:'mage',n:'⭐번개술사',d:'주변 적을 자동 감전시키는 번개 갈래가 사방에',fx:w=>{w.sp.mage=1;w.n+=3;w.rate+=.5;}},
  ],
  nova:[
    {id:'echo',n:'⭐메아리 군주',d:'하악질이 메아리치며 3연속 폭발!',fx:w=>{w.sp.echo=1;w.sp.dbl=1;}},
    {id:'aura',n:'⭐분노의 오라',d:'몸 주위에 상시 분노 장막, 닿는 적은 녹는다',fx:w=>{w.sp.aura=1;w.size+=.4;}},
  ],
};
const PV={spd:{C:.08,B:.12,A:.18,S:.28,SS:.45},mag:{C:.25,B:.4,A:.6,S:.9,SS:1.4},
  hp:{C:15,B:25,A:40,S:60,SS:90},dmg:{C:.1,B:.15,A:.25,S:.38,SS:.6},cd:{C:.06,B:.1,A:.15,S:.22,SS:.32}};
const PASS={spd:{icon:'spd',name:'캣닙 질주',d:t=>'이동속도 +'+Math.round(PV.spd[t]*100)+'%'},
  mag:{icon:'mag',name:'참치캔 자석',d:t=>'흡수 범위 +'+Math.round(PV.mag[t]*100)+'%'},
  hp:{icon:'hp',name:'아홉 목숨',d:t=>'최대 HP +'+PV.hp[t]+(t==='S'||t==='SS'?' & 풀회복':' & 회복')},
  dmg:{icon:'dmg',name:'매운맛 발톱',d:t=>'모든 공격력 +'+Math.round(PV.dmg[t]*100)+'%'},
  cd:{icon:'cd',name:'꾹꾹이 오버클럭',d:t=>'모든 쿨다운 -'+Math.round(PV.cd[t]*100)+'%'}};
const TCOL={C:'#9aa39b',B:'#4f9bff',A:'#b66dff',S:'#ffb02f',SS:'#ff4f8a'};
function rollTier(boost){
  // higher r → higher tier, so luck/boost ADD to r (was subtracting = made cards worse)
  let r=Math.random()+SV.up.luck*.05+((player&&player.luck||0)*.045)+(boost||0);
  return r<.45?'C':r<.74?'B':r<.9?'A':r<.975?'S':'SS';}
// ================= dopamine drop-skills (powerful, brief, consumable) =================
const SKILLS={
  rage:{stk:'it_rage',name:'폭주',uses:1,dur:7,buff:'berserk',d:'7초간 공격속도·공격력 폭발!'},
  nocd:{stk:'it_nocd',name:'쿨타임 해제',uses:1,dur:6,buff:'nocd',d:'6초간 모든 쿨타임 무제한!'},
  inv:{stk:'it_inv',name:'무적냥',uses:1,dur:5,buff:'invinc',d:'5초간 완전 무적!'},
  clone:{stk:'it_clone',name:'분신술',uses:1,dur:9,buff:'clone',d:'9초간 분신 2마리 소환!'},
  bolt:{stk:'it_bolt',name:'천벌',uses:2,instant:'bolt',d:'모든 적에게 즉시 낙뢰!'},
  nuke:{stk:'it_nuke',name:'묘신의 주먹',uses:1,instant:'nuke',d:'맵 전체 초강력 폭발!'},
  hole:{stk:'it_hole',name:'참치 블랙홀',uses:1,instant:'hole',d:'적을 빨아들여 대폭발!'},
};
const SKILL_KEYS=Object.keys(SKILLS);
// ================= stages =================
// waves: time-gated composition phases. Each {t, rate, pool}. Director picks the
// last wave whose t<=gTime → enemies arrive in escalating, varied stages.
const STAGES=[
  {n:'동네 풀밭',icon:'🌼',shape:{k:'rect',w:1600,h:1200},bg:0,boss:'boar',elite:'slime',mid:'weasel',bossAt:78,
   d:'포근한 풀밭. 낮잠 자기 딱 좋은데…',vil:'boar',vline:'꿀꿀! 여긴 이제 멧돼지님 구역이다!',cline:'낮잠 방해한 죄… 무겁다냥!',
   waves:[{t:0,rate:.85,pool:[['mouse',5]]},{t:22,rate:.62,pool:[['mouse',4],['slime',3]]},
     {t:46,rate:.46,pool:[['mouse',3],['slime',3],['frog',2]]},{t:64,rate:.36,pool:[['slime',3],['frog',3],['hedge',2]]}],
   surges:[34,60]},
  {n:'골목 주차장',icon:'🅿️',shape:{k:'rect',w:1900,h:1000},bg:1,boss:'topgun',elite:'pigeon',mid:'sparrow',bossAt:82,
   d:'비둘기파가 점령한 주차장.',vil:'topgun',vline:'구구! 여긴 비둘기파 구역이다!',cline:'주차위반이다냥. 견인해주마!',
   waves:[{t:0,rate:.8,pool:[['mouse',4],['fly',3]]},{t:22,rate:.58,pool:[['fly',3],['pigeon',3],['mouse',2]]},
     {t:46,rate:.44,pool:[['pigeon',3],['mosq',3],['fly',2]]},{t:66,rate:.34,pool:[['pigeon',3],['mosq',3],['dande',2],['fly',2]]}],
   surges:[36,64]},
  {n:'놀이터 모래밭',icon:'🏖️',shape:{k:'circ',R:780},bg:2,boss:'toad',elite:'pebble',mid:'mole',bossAt:84,
   d:'모래밭이 끈적끈적해졌다…!',vil:'toad',vline:'두껍아 두껍아~ 새 집 내놔라 개굴!',cline:'모래밭은 모두의 것이다냥!',
   waves:[{t:0,rate:.8,pool:[['ant',4],['pebble',2]]},{t:24,rate:.56,pool:[['ant',4],['pebble',3],['wasp',2]]},
     {t:48,rate:.42,pool:[['ant',4],['pebble',3],['mosq',2]]},{t:68,rate:.33,pool:[['ant',4],['pebble',3],['wasp',2],['mosq',2]]}],
   surges:[38,66]},
  {n:'시장 골목',icon:'🧺',shape:{k:'rect',w:2200,h:760},bg:3,boss:'duo',elite:'wasp',mid:'firefly',bossAt:86,
   d:'좁고 긴 골목. 도망칠 곳이 없다!',vil:'flyB',vline:'위이잉~ 시장 보호비 내놔라!',cline:'양아치들은 퇴치한다냥!',
   waves:[{t:0,rate:.78,pool:[['mouse',4],['fly',3]]},{t:24,rate:.55,pool:[['mouse',3],['hedge',2],['mosq',3]]},
     {t:48,rate:.4,pool:[['hedge',3],['mosq',3],['wasp',2],['fly',2]]},{t:70,rate:.31,pool:[['hedge',3],['wasp',3],['pigeon',2],['mosq',2]]}],
   surges:[40,68]},
  {n:'아파트 옥상',icon:'🌆',shape:{k:'rect',w:1200,h:1200},bg:4,boss:'racc',elite:'dande',mid:'waspU',bossAt:88,
   d:'노을 지는 옥상. 쓰레기 냄새가 난다.',vil:'racc',vline:'크큭, 내 보물(쓰레기)들을 노리러 왔나?',cline:'분리수거 해주마냥!',
   waves:[{t:0,rate:.78,pool:[['pigeon',3],['fly',3]]},{t:24,rate:.54,pool:[['pigeon',3],['dande',2],['wasp',2]]},
     {t:50,rate:.4,pool:[['pigeon',3],['wasp',3],['dande',2],['hedge',2]]},{t:72,rate:.3,pool:[['wasp',3],['hedge',3],['dande',2],['mosq',2]]}],
   surges:[42,70]},
  {n:'하수도',icon:'🕳️',shape:{k:'ring',R:820,r:300},bg:5,boss:'frogq',elite:'mouse',mid:'bigslime',bossAt:90,
   d:'빙글 도는 둥근 하수도. 미끌미끌!',vil:'frogq',vline:'개굴~ 이 하수도는 슬라임 여왕 거다!',cline:'으, 미끌거린다냥! 빨리 끝내자!',
   waves:[{t:0,rate:.76,pool:[['mouse',3],['fly',3],['slime',2]]},{t:24,rate:.52,pool:[['slime',3],['mosq',3],['snake',1]]},
     {t:50,rate:.39,pool:[['slime',3],['snake',2],['wasp',2],['mosq',2]]},{t:74,rate:.29,pool:[['snake',2],['wasp',3],['hedge',2],['slime',2]]}],
   surges:[44,72]},
  {n:'뒷산 오솔길',icon:'🌲',shape:{k:'rect',w:2400,h:700},bg:6,boss:'dogB',elite:'hedge',mid:'badger',bossAt:92,
   d:'정상으로 가는 마지막 길목.',vil:'dogB',vline:'멍멍! 이 길은 못 지나간다!',cline:'산책 중이다냥. 비켜라!',
   waves:[{t:0,rate:.74,pool:[['hedge',3],['frog',2]]},{t:24,rate:.5,pool:[['hedge',3],['frog',3],['wasp',2]]},
     {t:52,rate:.38,pool:[['hedge',3],['snake',2],['wasp',3],['frog',2]]},{t:76,rate:.28,pool:[['hedge',3],['snake',2],['wasp',3],['dande',2],['mosq',2]]}],
   surges:[46,74]},
  {n:'뒷산 정상',icon:'🌙',shape:{k:'circ',R:740},bg:7,boss:'mage',elite:'snake',mid:'golem',bossAt:98,
   d:'모든 악당의 우두머리가 기다린다…',vil:'mage',vline:'찍찍… 용케 왔군. 이 몸이 동네의 새 주인이다!',cline:'동네는 못 넘본다냥. 끝장이다냥!!',
   waves:[{t:0,rate:.72,pool:[['mouse',3],['wasp',2],['hedge',2]]},{t:24,rate:.48,pool:[['wasp',3],['hedge',3],['snake',1.5]]},
     {t:52,rate:.36,pool:[['hedge',3],['snake',2],['dande',2],['wasp',2],['mosq',2]]},{t:78,rate:.26,pool:[['hedge',3],['snake',2.5],['wasp',3],['dande',2],['mosq',2],['frog',2]]}],
   surges:[40,66,88],elite2:'wasp'},
];
const MOB={
  mouse:{stk:'mouse',r:14,hp:9,sp:70,xp:1,dmg:7,beh:'chase'},
  slime:{stk:'slime',r:16,hp:13,sp:62,xp:1,dmg:8,beh:'split'},
  slimeS:{stk:'slimeS',r:10,hp:5,sp:100,xp:1,dmg:6,beh:'chase'},
  fly:{stk:'fly',r:11,hp:5,sp:116,xp:1,dmg:6,beh:'chase'},
  mosq:{stk:'mosq',r:12,hp:7,sp:138,xp:1,dmg:8,beh:'dart'},
  pigeon:{stk:'pigeon',r:14,hp:11,sp:0,xp:1,dmg:9,beh:'swoop'},
  frog:{stk:'frog',r:16,hp:15,sp:0,xp:2,dmg:10,beh:'hop'},
  wasp:{stk:'wasp',r:13,hp:9,sp:120,xp:1,dmg:10,beh:'fuse'},
  hedge:{stk:'hedge',r:15,hp:17,sp:76,xp:2,dmg:12,beh:'rush'},
  snake:{stk:'snake',r:18,hp:28,sp:60,xp:3,dmg:12,beh:'eat',coin:2},
  dande:{stk:'dande',r:17,hp:18,sp:0,xp:2,dmg:9,beh:'turret'},
  ant:{stk:'ant',r:13,hp:8,sp:104,xp:1,dmg:7,beh:'dart'},        // 놀이터 개미
  pebble:{stk:'pebble',r:16,hp:24,sp:46,xp:2,dmg:11,beh:'chase'},// 놀이터 돌멩이
  boar:{stk:'boar',r:36,hp:340,sp:60,xp:10,dmg:16,beh:'boar',boss:'돌격대장 멧돼지'},
  topgun:{stk:'topgun',r:32,hp:430,sp:0,xp:10,dmg:14,beh:'topgun',boss:'탑건 비둘기'},
  frogq:{stk:'frogq',r:40,hp:520,sp:0,xp:12,dmg:16,beh:'frogq',boss:'슬라임퀸 개구리'},
  flyB:{stk:'flyB',r:30,hp:340,sp:84,xp:8,dmg:13,beh:'flyB',boss:'파리형님'},
  mosqB:{stk:'mosqB',r:28,hp:300,sp:0,xp:8,dmg:12,beh:'mosqB',boss:'모기아우'},
  racc:{stk:'racc',r:38,hp:640,sp:48,xp:14,dmg:15,beh:'racc',boss:'쓰레기왕 너구리'},
  snakeK:{stk:'snakeK',r:42,hp:760,sp:54,xp:16,dmg:15,beh:'snakeK',boss:'구렁이왕'},
  dogB:{stk:'dogB',r:40,hp:840,sp:64,xp:16,dmg:16,beh:'dogB',boss:'들개대장 불독'},
  mage:{stk:'mage',r:38,hp:1080,sp:40,xp:20,dmg:15,beh:'mage',boss:'대마법사 생쥐'},
  // reassigned boss: 모래밭 = 두꺼비(독안개)
  toad:{stk:'toad',r:40,hp:540,sp:0,xp:13,dmg:16,beh:'toad',boss:'새집 탐내는 두꺼비'},
  // ===== midbosses (mid:true — strong but don't end the stage) =====
  weasel:{stk:'weasel',r:30,hp:170,sp:118,xp:6,dmg:13,beh:'weasel',boss:'앞잡이 족제비',mid:1},
  sparrow:{stk:'sparrow',r:18,hp:75,sp:0,xp:3,dmg:11,beh:'sparrow',boss:'참새 3인방',mid:1},
  mole:{stk:'mole',r:34,hp:210,sp:60,xp:6,dmg:13,beh:'mole',boss:'두더지 두목',mid:1},
  firefly:{stk:'firefly',r:30,hp:210,sp:46,xp:6,dmg:13,beh:'dung',boss:'친구없는 개똥벌레',mid:1},
  waspU:{stk:'wasp',r:30,hp:230,sp:78,xp:6,dmg:13,beh:'flyB',boss:'말벌집 말벌아저씨',mid:1},
  bigslime:{stk:'slime',r:34,hp:240,sp:50,xp:6,dmg:12,beh:'split',boss:'끈적 대슬라임',mid:1},
  badger:{stk:'badger',r:32,hp:220,sp:96,xp:7,dmg:14,beh:'ninja',boss:'오솔길 오소리',mid:1},
  golem:{stk:'golem',r:42,hp:300,sp:34,xp:8,dmg:16,beh:'golem',boss:'돌탑 골렘',mid:1},
};
// ================= run state =================
let state='menu',stage=1,ST=STAGES[0];
let gTime=0,kills=0,combo=0,comboT=0,maxCombo=0,lastMile=0,runCoins=0;
let player=null,enemies=[],bullets=[],ebullets=[],gems=[],coinDrops=[],drops=[],parts=[],floaters=[],fxs=[],banners=[],zones=[],turrets=[],obstacles=[];
let cam={x:0,y:0},shake=0,freezeT=0,slowT=0,flashR=0,flashW=0;
let spawnT=0,pendingLv=0,levelDelay=0,fishAng=0,walkT=0,tutT=4;
let bossOn=false,bossDone=false,eliteDone=false,midDone=false,midOn=false,frzT=0,skillCd=0,cdT=0,lastCdN=0,echoQ=[];
const MID_AT=120,BOSS_AT=240; // fixed: midboss at 2:00, final boss at 4:00
let midLoot=0; // pending count of luck-boosted level-ups (midboss reward)
let surged=[],hitStop=0,masterMode=false;
let joy={on:false,id:-1,ax:0,ay:0,dx:0,dy:0};
const keys={};
function curCat(){return CATS.find(c=>c.key===SV.cat)||CATS[0];}
function resetRun(){
  const c=curCat();
  player={x:0,y:0,hp:c.hp+SV.up.hp*12,maxhp:c.hp+SV.up.hp*12,r:14,
    speed:c.spd*(1+SV.up.spd*.04),baseSpeed:c.spd*(1+SV.up.spd*.04),
    magnet:95*(1+SV.up.mag*.18),dmgMul:1,dmgBase:1+SV.up.dmg*.05,cdMul:1,cdAcc:1,
    level:1,xp:0,xpNext:5,iT:0,face:1,fx:1,fy:0,shieldT:0,innT:0,
    weapons:{},pass:{spd:0,mag:0,dmg:0},passN:{},skill:null,stk:c.stk,innate:c.innate,
    dodge:0,block:0,reflect:0,revive:0,luck:0,buffs:{}};
  c.mod(player);newWeapon(c.innate);recompute();
  enemies=[];bullets=[];ebullets=[];gems=[];coinDrops=[];drops=[];parts=[];floaters=[];fxs=[];banners=[];zones=[];turrets=[];
  gTime=0;kills=0;combo=0;comboT=0;maxCombo=0;lastMile=0;runCoins=0;
  cam={x:0,y:0};shake=0;freezeT=0;slowT=0;flashR=0;flashW=0;spawnT=.5;
  pendingLv=0;levelDelay=0;walkT=0;tutT=4;gemStreak=0;
  bossOn=false;bossDone=false;eliteDone=false;midDone=false;midOn=false;midLoot=0;frzT=0;skillCd=0;echoQ=[];
  surged=[];hitStop=0;clones=[];holeT=0;window.__e2=false;genObstacles();}
function recompute(){
  player.speed=player.baseSpeed*(1+player.pass.spd);
  player.magnet=95*(1+SV.up.mag*.18)*(1+player.pass.mag);
  player.dmgMul=player.dmgBase*(1+player.pass.dmg);
  player.cdMul=player.cdAcc;}
// ================= helpers =================
function burst(x,y,cols,n,sp){if(parts.length>PCAP)return;
  if(IS_TOUCH0)n=Math.ceil(n*.7);
  for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(1,sp||7);
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.5,1),col:cols[(Math.random()*cols.length)|0],sz:rnd(3,6)});}}
function puff(x,y,n){if(parts.length>PCAP)return;
  for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(.5,3);
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-.5,life:rnd(.4,.9),col:'#ffffff',sz:rnd(5,10),puff:1});}}
function floater(x,y,txt,col,big){if(floaters.length<70)floaters.push({x,y,txt,col,t:1,big});}
function banner(txt,col,dur){banners.push({txt,col,t:0,dur:dur||1.5});}
function nearTgt(maxD){let best=null,bd=maxD*maxD;
  for(const e of enemies){const d=dist2(player.x,player.y,e.x,e.y);if(d<bd){bd=d;best=e;}}return best;}
// arena
function clampArena(o,pr){const s=ST.shape;
  if(s.k==='rect'){o.x=clamp(o.x,-s.w/2+pr,s.w/2-pr);o.y=clamp(o.y,-s.h/2+pr,s.h/2-pr);}
  else if(s.k==='circ'){const d=Math.hypot(o.x,o.y);
    if(d>s.R-pr){o.x*=(s.R-pr)/d;o.y*=(s.R-pr)/d;}}
  else{let d=Math.hypot(o.x,o.y);
    if(d<1){o.x=s.r+pr;o.y=0;return;}
    if(d>s.R-pr){o.x*=(s.R-pr)/d;o.y*=(s.R-pr)/d;}
    else if(d<s.r+pr){o.x*=(s.r+pr)/d;o.y*=(s.r+pr)/d;}}}
// ===== map obstacles: themed props that block movement or slow you down =====
const OBSDEF={
  0:{n:7,type:'bush',r:[24,38],solid:1},      // 풀밭
  1:{n:8,type:'car',r:[46,62],solid:1},       // 주차장
  2:{n:6,type:'sand',r:[72,108],slow:.55},    // 모래밭
  3:{n:10,type:'crate',r:[24,38],solid:1},    // 시장
  4:{n:7,type:'vent',r:[32,48],solid:1},      // 옥상
  5:{n:6,type:'puddle',r:[64,96],slow:.5},    // 하수도
  6:{n:10,type:'rock',r:[28,46],solid:1},     // 오솔길
  7:{n:9,type:'rock',r:[30,50],solid:1},      // 정상
};
function genObstacles(){
  obstacles=[];const s=ST.shape;
  const D=OBSDEF[ST.bg]||OBSDEF[0];
  let cnt=D.n+(masterMode?3:0);
  let seed=ST.bg*131+stage*7+11;const sr=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<cnt;i++){let x=0,y=0,ok=false,tries=0;
    while(!ok&&tries++<25){
      if(s.k==='rect'){x=(sr()-.5)*(s.w-160);y=(sr()-.5)*(s.h-160);}
      else{const a=sr()*TAU,rr=s.k==='circ'?sr()*(s.R-120):(s.r+80)+sr()*(s.R-s.r-160);
        x=Math.cos(a)*rr;y=Math.sin(a)*rr;}
      ok=Math.hypot(x,y)>180;
      for(const o of obstacles)if(dist2(x,y,o.x,o.y)<(o.r+70)*(o.r+70))ok=false;}
    if(!ok)continue;
    const r=D.r[0]+sr()*(D.r[1]-D.r[0]);
    obstacles.push({x,y,r,type:D.type,solid:D.solid||0,slow:D.slow||0,rot:(sr()-.5)*.4,w:r*1.5,h:r});}
}
function resolveObstacles(o,pr){for(const ob of obstacles){if(!ob.solid)continue;
  let dx=o.x-ob.x,dy=o.y-ob.y,d=Math.hypot(dx,dy),min=ob.r+pr;
  if(d<min){if(d<.01){dx=1;dy=0;d=1;}o.x=ob.x+dx/d*min;o.y=ob.y+dy/d*min;}}}
function terrainMul(x,y){for(const ob of obstacles)if(ob.slow&&dist2(x,y,ob.x,ob.y)<ob.r*ob.r)return 1-ob.slow;return 1;}
function outOfArena(x,y,pr){const s=ST.shape;pr=pr||0;
  if(s.k==='rect')return x<-s.w/2+pr||x>s.w/2-pr||y<-s.h/2+pr||y>s.h/2-pr;
  const dd=Math.hypot(x,y);
  if(s.k==='circ')return dd>s.R-pr;
  return dd>s.R-pr||dd<s.r+pr;}
function arenaSpot(minD,maxD){const s=ST.shape;
  for(let i=0;i<24;i++){let x,y;
    if(s.k==='rect'){x=rnd(-s.w/2+40,s.w/2-40);y=rnd(-s.h/2+40,s.h/2-40);}
    else{const a=rnd(0,TAU),R=s.k==='circ'?rnd(0,s.R-40):rnd(s.r+40,s.R-40);
      x=Math.cos(a)*R;y=Math.sin(a)*R;}
    const d=Math.hypot(x-player.x,y-player.y);
    if(d>=minD&&d<=maxD)return{x,y};}
  return {x:player.x+rnd(-300,300),y:player.y+rnd(-300,300)};}
// ================= spawning =================
// difficulty: ramps with stage AND survived time so the back half gets hairy
function mobHpMul(){return (1+(stage-1)*.62)*(1+gTime*.010);}
function mobSpMul(){return 1+gTime*.0017+(stage-1)*.02;}
function spawnEnemy(type,ax,ay){
  if(enemies.length>170)return null;
  const d=MOB[type];let x=ax,y=ay;
  if(x===undefined){const p=arenaSpot(300,600);x=p.x;y=p.y;}
  const e={type,stk:d.stk,x,y,r:d.r,hp:d.hp*(d.boss?(1+(stage-1)*.16):mobHpMul()),
    maxhp:0,sp:d.sp*(d.boss?1:mobSpMul()),xp:d.xp,dmg:d.dmg,coin:d.coin||0,beh:d.beh,boss:d.boss||null,mid:d.mid||false,
    flash:0,bIT:0,wob:rnd(0,TAU),kx:0,ky:0,st:{},vx:0,vy:0,meals:0,scale:1,face:1,stun:0,elite:false,sq:0};
  if(masterMode){
    if(e.boss){e.hp*=1.5;e.dmg=Math.round(e.dmg*1.2);}
    else{e.hp*=1.7;e.dmg+=4;e.xp+=1;
      const m=Math.random();
      if(m<.3){e.sp*=1.3;e.mut='fast';}
      else if(m<.55){e.hp*=1.4;e.noKb=1;e.mut='tank';}
      else if(m<.78){e.dmg=Math.round(e.dmg*1.5);e.mut='fierce';}}}
  // never let a steadily-chasing mob outrun the player (must be escapable).
  // dash/charge attacks use their own literal speeds, so they're unaffected.
  if(player&&!e.boss)e.sp=Math.min(e.sp,player.speed*.9);
  e.maxhp=e.hp;clampArena(e,e.r);enemies.push(e);return e;}
function spawnElite(type){
  const e=spawnEnemy(type);if(!e)return;
  e.elite=true;e.hp*=12;e.maxhp=e.hp;e.scale=1.9;e.dmg+=5;e.xp=24;e.sp*=.88;e.coin+=4;
  sWarn();banner('👑 정예 몬스터 출현!','#ffd23e',1.6);return e;}
function spawnMid(){
  midDone=true;midOn=true;sWarn();flashW=.5;shake=8;
  const key=ST.mid;if(!key){midOn=false;return;}
  // clear jobmobs — midboss is a solo fight
  for(const o of enemies.slice())if(!o.boss){dropGem(o.x,o.y,o.xp);puff(o.x,o.y,3);
    enemies.splice(enemies.indexOf(o),1);}
  banner('⚔ 중간보스! '+MOB[key].boss,'#ff8c2f',2);
  if(key==='sparrow'){ // 참새 3인방 — 3 sparrows, each a different skill
    const skills=['dive','peck','poop'];
    for(let i=0;i<3;i++){const e=spawnEnemy('sparrow',player.x+rnd(-200,200),player.y-260+rnd(-40,40));
      if(e){e.st.skill=skills[i];e.coin=2;}}}
  else{const e=spawnEnemy(key,player.x,player.y-300);if(e){clampArena(e,e.r);}}}
function spawnBoss(){
  bossOn=true;midDone=true;sWarn();setSong(ST.bg);
  for(const o of enemies.slice())if(!o.boss||o.mid){dropGem(o.x,o.y,o.xp);puff(o.x,o.y,3);
    enemies.splice(enemies.indexOf(o),1);}
  const key=ST.boss;
  banner('👹 BOSS! '+(key==='duo'?'파리&모기 범죄듀오':MOB[key].boss),'#ff3860',2);
  flashW=.8;shake=12;
  if(key==='duo'){const a=spawnEnemy('flyB',player.x+260,player.y-120);
    const b=spawnEnemy('mosqB',player.x-260,player.y-120);if(a)a.st.sum=2;}
  else{const e=spawnEnemy(key,player.x,player.y-340);if(e)clampArena(e,e.r);}}
function curWave(){let w=ST.waves[0];
  for(const v of ST.waves)if(gTime>=v.t)w=v;return w;}
function doSurge(){
  sWarn();banner('⚠ 떼거지 출몰!! ⚠','#ff3860',1.5);shake=7;flashR=.4;
  const w=curWave(),n=10+stage*2+((gTime/26)|0);
  let tot=0;for(const[,wt]of w.pool)tot+=wt;
  setTimeout(()=>{if(state!=='playing'||bossOn)return;
    for(let i=0;i<n;i++){const a=i/n*TAU,s=ST.shape,
      R=(s.k==='rect'?Math.max(s.w,s.h)*.42:s.R*.82);
      let r=Math.random()*tot,pick=w.pool[0][0];
      for(const[k,wt]of w.pool){r-=wt;if(r<=0){pick=k;break;}}
      spawnEnemy(pick,player.x+Math.cos(a)*R,player.y+Math.sin(a)*R);}},950);}
function director(dt){
  if(bossDone||bossOn)return;
  if(gTime>=BOSS_AT){spawnBoss();return;}              // 4:00 boss
  if(!midDone&&ST.mid&&gTime>=MID_AT){spawnMid();return;} // 2:00 midboss
  if(midOn)return;                                      // solo midboss fight — no jobmobs
  // elites (before & after the midboss)
  if(!eliteDone&&gTime>=55){eliteDone=true;spawnElite(ST.elite);}
  if(!window.__e2&&gTime>=170){window.__e2=true;spawnElite(ST.elite2||ST.elite);}
  // surges — stage's own + fixed late-stage pressure
  for(const st of [40,80,160,205])if(gTime>=st&&!surged.includes(st)){surged.push(st);doSurge();}
  // steady stream by current wave (ramps up over the 4-min stage)
  spawnT-=dt;
  if(spawnT<=0){const w=curWave();
    const ramp=gTime>150?.62:gTime>90?.78:1;
    spawnT=Math.max(.12,w.rate*ramp*(0.78+0.22*Math.sin(gTime)));
    let tot=0;for(const[,wt]of w.pool)tot+=wt;
    let r=Math.random()*tot,pick=w.pool[0][0];
    for(const[k,wt]of w.pool){r-=wt;if(r<=0){pick=k;break;}}
    spawnEnemy(pick);
    // double / triple-spawn pressure late in the stage
    if(gTime>140&&Math.random()<.55)spawnEnemy(pick);
    if(gTime>200&&Math.random()<.4)spawnEnemy(pick);}}
// ================= combat =================
function damageEnemy(e,dmg,hx,hy){
  let mul=1;
  if(frzT>0)mul*=1.5;
  if(e.beh==='boar'&&e.st.ph==='dizzy')mul*=1.4;
  const crit=Math.random()<.1,v=Math.max(1,Math.round(dmg*mul*(crit?2:1)));
  e.hp-=v;e.flash=1;e.sq=Math.min(1,(e.sq||0)+(crit?.9:.55));sHit();
  // hit spark + floating number (numbers scale-pop)
  hitSpark(hx!==undefined?(hx+e.x)/2:e.x,hy!==undefined?(hy+e.y)/2:e.y,crit);
  floater(e.x+rnd(-8,8),e.y-e.r*e.scale-6,crit?v+'!':''+v,crit?'#ffd23e':'#fff',crit);
  if(hx!==undefined&&!e.boss&&!e.noKb){const d=Math.sqrt(dist2(hx,hy,e.x,e.y))||1;
    e.kx+=(e.x-hx)/d*88;e.ky+=(e.y-hy)/d*88;}
  // micro hit-stop scales with damage → weight/impact
  if(v>=18)hitStop=Math.max(hitStop,crit?.05:.035);
  if(e.hp<=0)killEnemy(e);}
function hitSpark(x,y,big){
  fxs.push({kind:'spark',x,y,t:0,rot:rnd(0,TAU),big:big?1:0});
  if(parts.length<480)for(let i=0;i<(big?6:3);i++){const a=rnd(0,TAU),v=rnd(3,big?9:6);
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.25,.5),col:big?'#ffd23e':'#fff',sz:rnd(2,4)});}}
function killEnemy(e){
  const i=enemies.indexOf(e);if(i<0)return;enemies.splice(i,1);
  kills++;combo++;comboT=1.7;maxCombo=Math.max(maxCombo,combo);
  puff(e.x,e.y,e.boss?14:4);
  burst(e.x,e.y,['#ffb02f','#ff5f3c','#7ec8ff','#ffe066'],e.boss?36:9,e.boss?11:6);
  if(e.boss||e.elite){sBig();freezeT=Math.max(freezeT,e.boss?.12:.08);shake=Math.max(shake,e.boss?14:11);
    fxs.push({kind:'shock',x:e.x,y:e.y,t:0,max:e.boss?160:90,col:'#ffe066'});flashW=Math.max(flashW,e.boss?.6:.3);}
  else{sDie();shake=Math.max(shake,1.6);hitStop=Math.max(hitStop,.02);}
  if(e.beh==='split')for(let k=0;k<(e.elite?4:2);k++)spawnEnemy('slimeS',e.x+rnd(-14,14),e.y+rnd(-14,14));
  if(e.beh==='fuse')explode(e.x,e.y,86,14);
  dropGem(e.x,e.y,e.xp);
  let c=e.coin;if(!c&&Math.random()<.03)c=1;
  for(let k=0;k<c;k++)if(coinDrops.length<50)coinDrops.push({x:e.x+rnd(-14,14),y:e.y+rnd(-14,14),t:0});
  if(e.elite){dropItem(e.x,e.y,SKILL_KEYS[(Math.random()*SKILL_KEYS.length)|0]);
    openChest();}
  else if(!e.boss){const pity=player.hp<player.maxhp*.35?2.2:1;
    if(Math.random()<.02*pity)dropItem(e.x,e.y,'chicken');
    else if(Math.random()<.006)dropItem(e.x,e.y,SKILL_KEYS[(Math.random()*SKILL_KEYS.length)|0]);}
  if(e.boss&&e.mid){ // midboss(es) down → resume jobmobs + a high-tier level-up
    if(!enemies.some(x=>x.mid)){midOn=false;
      midLoot+=1;pendingLv++;
      dropItem(e.x,e.y,SKILL_KEYS[(Math.random()*SKILL_KEYS.length)|0]);
      banner('⚔ 중간보스 격파! 좋은 카드 등장!','#ffd23e',1.8);sLevel();}}
  if(e.boss&&!e.mid){
    for(const o of enemies)if(o.boss&&!o.mid)o.st.rage=true;
    if(!enemies.some(x=>x.boss&&!x.mid))stageCleared();}
  const M={12:'연쇄냥!',25:'학살냥!!',50:'폭풍냥냥!!!',90:'전설의 발톱!!!'};
  if(M[combo]&&lastMile!==combo){lastMile=combo;banner(combo+'콤보 '+M[combo],'#ffd23e',1.1);
    freezeT=Math.max(freezeT,.04);sLevel();}}
function explode(x,y,R,pdmg){
  fxs.push({kind:'nova',x,y,r:10,max:R,t:0,col:'#ff9e2c'});
  burst(x,y,['#ff9e2c','#ffe066'],18,9);sThud();shake=Math.max(shake,5);
  for(const e of enemies.slice())if(dist2(x,y,e.x,e.y)<R*R)damageEnemy(e,22,x,y);
  if(pdmg&&player.iT<=0&&dist2(x,y,player.x,player.y)<(R*.85)*(R*.85))hurtPlayer(pdmg);}
function dropGem(x,y,v){
  if(gems.length>=150){gems[(Math.random()*gems.length)|0].v+=v;return;}
  gems.push({x:x+rnd(-6,6),y:y+rnd(-6,6),v,t:0});}
function dropItem(x,y,kind){if(drops.length>24)return;
  drops.push({x,y,kind,t:rnd(0,3)});}
function hurtPlayer(dmg){
  if(player.iT>0||state!=='playing')return;
  if(player.buffs&&player.buffs.invinc){floater(player.x,player.y-30,'무적!','#ffd23e',true);return;}
  if(player.shieldT>0){floater(player.x,player.y-30,'무적!','#ffd23e',true);return;}
  if(player.dodge&&Math.random()<player.dodge){player.iT=.35;
    floater(player.x,player.y-30,'회피!','#7ec8ff',true);tone(900,.08,'sine',.1,1400);
    for(let i=0;i<6;i++)parts.push({x:player.x,y:player.y,vx:rnd(-3,3),vy:rnd(-3,3),life:.4,col:'#7ec8ff',sz:4});
    return;}
  dmg=Math.round(dmg||8);
  const before=player.hp;
  player.hp-=dmg;player.iT=.95;sHurt();shake=Math.min(9+dmg*.45,16);flashR=1;combo=0;lastMile=0;
  hitStop=Math.max(hitStop,.06);
  floater(player.x+rnd(-8,8),player.y-32,'-'+dmg,'#ff3860',true);
  burst(player.x,player.y,['#ff5f3c','#fff'],16,9);
  fxs.push({kind:'shock',x:player.x,y:player.y,t:0,max:60,col:'#ff3860'});
  for(const e of enemies){if(e.boss)continue;
    const d=Math.sqrt(dist2(e.x,e.y,player.x,player.y));
    if(d<160){e.kx+=(e.x-player.x)/d*250;e.ky+=(e.y-player.y)/d*250;}}
  // 가시 갑옷 반사
  if(player.reflect){const R=120+player.reflect*40;
    fxs.push({kind:'nova',x:player.x,y:player.y,r:14,max:R,t:0,col:'#ff7a4f'});
    for(const e of enemies.slice())if(dist2(player.x,player.y,e.x,e.y)<R*R)
      damageEnemy(e,(18+player.reflect*14)*player.dmgMul,player.x,player.y);}
  const TH=player.maxhp*.25;
  if(player.hp<=TH&&before>TH&&player.hp>0){slowT=.45;banner('☠ 위험!!','#ff3860',1);}
  if(player.hp<=0){
    if(player.revive>0){player.revive--;player.hp=player.maxhp;player.iT=2.2;player.shieldT=2;
      banner('✨ 아홉번째 목숨! 부활!','#ffd23e',2);sLevel();flashW=1;shake=18;
      fxs.push({kind:'nova',x:player.x,y:player.y,r:20,max:300,t:0,col:'#ffd23e'});
      for(const e of enemies.slice())if(dist2(player.x,player.y,e.x,e.y)<300*300)damageEnemy(e,200,player.x,player.y);
      return;}
    player.hp=0;gameOver(false);}}
function efire(x,y,vx,vy,spr,r,life,dmg,o){
  if(ebullets.length>120)return;
  ebullets.push(Object.assign({x,y,vx,vy,spr,r:r||8,life:life||5,dmg:dmg||9,
    spin:rnd(-4,4),rot:rnd(0,TAU)},o||{}));}
function addZone(x,y,r,warn,burn,dmg){
  if(zones.length>26)return;
  zones.push({x,y,r,warn,burn:burn||0,dmg:dmg||10,max:warn});}
function addBeam(x,y,ang,len,wd,warn,dmg){ // red telegraph beam → damage line
  fxs.push({kind:'beam',x,y,ang,len,wd,t:0,warn,dmg});}
function distSeg(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,L2=dx*dx+dy*dy||1;
  let t=((px-x1)*dx+(py-y1)*dy)/L2;t=clamp(t,0,1);
  return Math.hypot(px-(x1+dx*t),py-(y1+dy*t));}
// ================= items / skills =================
function pickupDrop(kind){
  if(kind==='chicken'){const heal=30;
    player.hp=Math.min(player.maxhp,player.hp+heal);
    floater(player.x,player.y-34,'+'+heal+' ❤','#52c84a',true);
    burst(player.x,player.y,['#52c84a','#fff'],9,5);
    tone(523,.11,'sine',.14);setTimeout(()=>tone(784,.16,'sine',.14),85);return;}
  const sk=SKILLS[kind];if(!sk)return;
  if(player.skill&&player.skill.key===kind)player.skill.uses+=sk.uses;
  else player.skill={key:kind,uses:sk.uses};
  sChest();flashW=.5;
  banner('🆕 '+sk.name+' ×'+player.skill.uses,'#fff',1.5);
  floater(player.x,player.y-34,(IS_TOUCH?'왼쪽 버튼':'스페이스')+'로 사용!','#ffe066',true);}
function useSkill(){
  if(state!=='playing'||!player.skill||skillCd>0)return;
  skillCd=.5;const key=player.skill.key,S=SKILLS[key];
  player.skill.uses--;if(player.skill.uses<=0)player.skill=null;
  if(S.buff){player.buffs[S.buff]=S.dur;sLevel();flashW=.8;
    const labels={berserk:'😤 폭주!! 미쳐 날뛴다!',nocd:'♾️ 쿨타임 무제한!!',invinc:'✨ 무적냥!!',clone:'👯 분신술!!'};
    banner(labels[S.buff]||S.name,'#ffd23e',1.6);
    if(S.buff==='clone'){clones=[{a:0},{a:Math.PI}];}
    return;}
  if(key==='nuke'){flashW=1;shake=16;freezeT=Math.max(freezeT,.1);sBig();sMeow();
    banner('💥 묘신의 주먹!!','#ff5f3c',1.3);
    fxs.push({kind:'nova',x:player.x,y:player.y,r:40,max:Math.max(W,H),t:0,col:'#ff5f3c'});
    for(const e of enemies.slice())damageEnemy(e,420,player.x,player.y);}
  else if(key==='bolt'){sZap();flashW=.7;banner('⚡ 천벌!!','#ffd23e',1.3);
    for(const e of enemies.slice()){fxs.push({kind:'bolt',x1:e.x,y1:e.y-260,x2:e.x,y2:e.y,t:0});
      fxs.push({kind:'sky',x:e.x,y:e.y,t:0});e.stun=Math.max(e.stun,.8);damageEnemy(e,220);}
    shake=12;}
  else if(key==='hole'){noise(.6,.2,800,'bandpass');banner('🌀 참치 블랙홀!!','#7ec8ff',1.3);
    for(const e of enemies){if(e.boss)continue;
      const a=Math.atan2(e.y-player.y,e.x-player.x);
      e.x=player.x+Math.cos(a)*110;e.y=player.y+Math.sin(a)*110;}
    for(const g of gems)g.vac=1;for(const g of coinDrops)g.vac=1;for(const g of drops)g.vac=1;
    holeT=.45;}}
let holeT=0,clones=[];
// ================= weapons fire =================
function newWeapon(key){player.weapons[key]={dmg:1,rate:1,n:0,size:1,pierce:0,sp:{},t:0,pow:0,lvl:0,evo:null};}
// defensive / utility cards (not weapons)
const DEFS={
  dodge:{name:'날렵한 몸놀림',icon:'spd',max:5,col:'#7ec8ff',
    d:p=>'회피율 +9% (현재 '+Math.round((p.dodge||0)*100)+'%)',fx:p=>p.dodge=Math.min(.55,(p.dodge||0)+.09)},
  block:{name:'참치캔 방패',icon:'mag',max:4,col:'#5aa843',
    d:p=>'투사체 차단 +12% (현재 '+Math.round((p.block||0)*100)+'%)',fx:p=>p.block=Math.min(.55,(p.block||0)+.12)},
  reflect:{name:'가시 갑옷',icon:'dmg',max:3,col:'#ff7a4f',
    d:p=>'피격 시 주변에 가시 반격 (Lv.'+((p.reflect||0)+1)+')',fx:p=>p.reflect=(p.reflect||0)+1},
  luck:{name:'네잎클로버',icon:'luck',max:5,col:'#5aa843',
    d:p=>'카드 등급 운 UP! (Lv.'+((p.luck||0)+1)+')',fx:p=>p.luck=(p.luck||0)+1},
  haste:{name:'바람 방울',icon:'spd',max:4,col:'#7ec8ff',
    d:p=>'이동속도 +8%',fx:p=>{p.baseSpeed*=1.08;recompute();}},
  revive:{name:'아홉번째 목숨',icon:'hp',max:1,col:'#ffd23e',sss:1,
    d:p=>'쓰러져도 1번 부활 + 폭발! (전설)',fx:p=>p.revive=(p.revive||0)+1},
};
function updateWeapons(dt){
  const wp=player.weapons,bf=player.buffs;
  // dopamine buffs scale fire-rate / kill cooldowns
  const rateB=(bf.berserk?2.4:1);
  const cdScale=(bf.nocd?0.06:1)/rateB;
  const WD=(k,w)=>WDEF[k].base.dmg*w.dmg*player.dmgMul*(bf.rage?1.6:1);
  // ---------- 냥냥펀치 ----------
  if(wp.paw){const w=wp.paw,cd=WDEF.paw.base.cd/w.rate*player.cdMul*cdScale;
    w.t-=dt;if(w.t<=0){const tgt=nearTgt(740);
      if(tgt){w.t=cd;const base=Math.atan2(tgt.y-player.y,tgt.x-player.x);
        if(w.sp.titan){
          bullets.push({kind:'paw',x:player.x,y:player.y,vx:Math.cos(base)*360,vy:Math.sin(base)*360,
            dmg:WD('paw',w)*2.4,r:24*w.size,life:1.6,pierce:w.pierce,rot:base,spr:'paw',scale:w.size,glow:3,gcol:'#ff5a9e',big:1});
          shake=Math.max(shake,3);}
        else{const n=1+w.n;
          for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.15;
            bullets.push({kind:'paw',x:player.x,y:player.y,vx:Math.cos(a)*540,vy:Math.sin(a)*540,
              dmg:WD('paw',w),r:7*w.size,life:1.3,pierce:w.pierce,rot:a,spr:'paw',scale:w.size,glow:w.lvl,gcol:'#ff8ab0'});}
          const ring=w.sp.ring?(w.sp.ring>=2?12:8):0;
          for(let i=0;i<ring;i++){const a=i/ring*TAU+gTime;
            bullets.push({kind:'paw',x:player.x,y:player.y,vx:Math.cos(a)*460,vy:Math.sin(a)*460,
              dmg:WD('paw',w)*.55,r:6*w.size,life:.95,pierce:w.sp.ring>=2?1:0,rot:a,spr:'paw',scale:w.size*.85,glow:w.lvl,gcol:'#ff8ab0'});}}
        sShot();}else w.t=.1;}}
  // ---------- 흡혈 발톱 (melee) ----------
  if(wp.claw){const w=wp.claw,cd=WDEF.claw.base.cd/w.rate*player.cdMul*cdScale;
    w.t-=dt;if(w.t<=0){const tgt=nearTgt(160);
      const baseA=tgt?Math.atan2(tgt.y-player.y,tgt.x-player.x):Math.atan2(player.fy,player.fx);
      const angs=w.sp.spin?[0,1,2,3,4,5].map(i=>baseA+i/6*TAU):(w.sp.both?[baseA,baseA+Math.PI]:[baseA]);
      const R=92*w.size,arc=w.sp.spin?TAU:1.25;let hit=0;
      for(const a of angs)for(const e of enemies){
        if(dist2(player.x,player.y,e.x,e.y)>R*R)continue;
        let da=Math.abs(Math.atan2(e.y-player.y,e.x-player.x)-a);da=Math.min(da,TAU-da);
        if(da<arc/2&&!e._clawT){const dm=WD('claw',w);damageEnemy(e,dm,player.x,player.y);
          e._clawT=1;hit++;player.hp=Math.min(player.maxhp,player.hp+dm*.07*(w.sp.life||1));}}
      for(const e of enemies)e._clawT=0;
      for(const a of angs)fxs.push({kind:'claw',x:player.x,y:player.y,ang:a,t:0,r:R,full:w.sp.spin});
      if(w.sp.thousand)for(let i=0;i<8;i++){const a=i/8*TAU;
        bullets.push({kind:'blade',x:player.x,y:player.y,vx:Math.cos(a)*460,vy:Math.sin(a)*460,
          dmg:WD('claw',w)*.6,r:9,life:.8,pierce:2,rot:a,spr:'blade',glow:1,gcol:'#ff5a6a'});}
      if(hit||tgt){w.t=cd;noise(.05,.07,3000);}else w.t=.08;}}
  // ---------- 장미 저격 ----------
  if(wp.rose){const w=wp.rose,cd=WDEF.rose.base.cd/w.rate*player.cdMul*cdScale;
    w.t-=dt;if(w.t<=0){const tgt=nearTgt(900);
      if(tgt){w.t=cd;const base=Math.atan2(tgt.y-player.y,tgt.x-player.x);
        if(w.sp.thorn){
          bullets.push({kind:'rose',x:player.x,y:player.y,vx:Math.cos(base)*900,vy:Math.sin(base)*900,
            dmg:WD('rose',w)*1.6,r:13*w.size,life:1.1,pierce:99,rot:base,spr:'rose',bossMul:w.bossMul||1.7,glow:3,gcol:'#ff3c6e',thorn:1});
          shake=Math.max(shake,4);}
        else if(w.sp.storm){for(let i=0;i<2+w.n;i++){const a=base+rnd(-.5,.5);
          bullets.push({kind:'rose',x:player.x,y:player.y,vx:Math.cos(a)*460,vy:Math.sin(a)*460,
            dmg:WD('rose',w)*.5,r:7*w.size,life:1.6,pierce:0,rot:a,spr:'rose',bossMul:w.bossMul||1.7,
            tgt:enemies[(Math.random()*enemies.length)|0],homing:1,glow:2,gcol:'#ff6a9e'});}}
        else{const n=1+w.n;for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.1;
          bullets.push({kind:'rose',x:player.x,y:player.y,vx:Math.cos(a)*760,vy:Math.sin(a)*760,
            dmg:WD('rose',w),r:9*w.size,life:1.4,pierce:w.pierce,rot:a,spr:'rose',bossMul:w.bossMul||1.7,glow:w.lvl,gcol:'#ff6a9e'});}}
        tone(840,.08,'triangle',.1,420);}else w.t=.1;}}
  // ---------- 속사 ----------
  if(wp.rapid){const w=wp.rapid,gat=w.sp.gatling,cd=WDEF.rapid.base.cd/w.rate*player.cdMul*cdScale*(gat?.45:1);
    w.t-=dt;if(w.t<=0){const tgt=nearTgt(720);
      if(tgt){w.t=cd;const base=Math.atan2(tgt.y-player.y,tgt.x-player.x),n=1+w.n;
        const spread=w.sp.tight?.05:.12;
        for(let i=0;i<n;i++){const a=base+(n>1?(i-(n-1)/2)*spread:0)+rnd(-spread,spread)*.5;
          bullets.push({kind:'rapid',x:player.x,y:player.y,vx:Math.cos(a)*680,vy:Math.sin(a)*680,
            dmg:WD('rapid',w),r:5*Math.min(1.4,w.size),life:1.2,pierce:w.pierce,rot:a,spr:'rapid',
            homing:w.sp.homing?1:0,tgt:w.sp.homing?tgt:null,glow:w.lvl});}
        sShot();}else w.t=.08;}}
  // ---------- 털뭉치 폭탄 ----------
  if(wp.yarn){const w=wp.yarn,cd=WDEF.yarn.base.cd/w.rate*player.cdMul*cdScale;
    w.t-=dt;if(w.t<=0&&enemies.length){w.t=cd;
      const cnt=w.sp.giant?1:1+w.n;
      for(let i=0;i<cnt;i++){const a=rnd(0,TAU);
        bullets.push({kind:'yarn',x:player.x,y:player.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,
          dmg:WD('yarn',w),r:(w.sp.giant?22:9)*w.size,life:w.sp.giant?3.2:2.3,
          tgt:enemies[(Math.random()*enemies.length)|0],rot:0,spr:w.sp.red?'yarnR':'yarn',
          scale:w.size,aoe:(w.sp.giant?120:55)*w.size,turret:w.sp.turret,giant:w.sp.giant?3:0,
          glow:w.lvl,gcol:w.sp.red?'#ff6a6a':'#ffd23e'});}
      tone(460,.1,'triangle',.07,820);}}
  // ---------- 빙글 생선 ----------
  if(wp.fish){const w=wp.fish;fishAng+=dt*(2.5*w.rate)*rateB;
    const n=(w.sp.whale?1:2+w.n+(w.sp.parade?0:0)),R=(w.sp.whale?96:82)+8*w.n;
    for(let i=0;i<n;i++){const a=fishAng+i/n*TAU,
      bx=player.x+Math.cos(a)*R,by=player.y+Math.sin(a)*R;
      for(const e of enemies)if(e.bIT<=0&&dist2(bx,by,e.x,e.y)<((w.sp.whale?30:16)*w.size+e.r*e.scale)**2){
        e.bIT=.32;damageEnemy(e,WD('fish',w)*(w.sp.whale?2.2:1),player.x,player.y);
        if(w.sp.spike&&bullets.length<150)for(let k=0;k<4;k++){const sa=rnd(0,TAU);
          bullets.push({kind:'rapid',x:bx,y:by,vx:Math.cos(sa)*420,vy:Math.sin(sa)*420,
            dmg:4*w.dmg*player.dmgMul,r:4,life:.5,pierce:0,rot:sa,spr:'rapid'});}}}}
  // ---------- 정전기 / 천벌 / 번개술사 ----------
  if(wp.bolt){const w=wp.bolt,cd=WDEF.bolt.base.cd/w.rate*player.cdMul*cdScale;
    w.t-=dt;if(w.t<=0){
      if(w.sp.sky){const tgt=nearTgt(620);
        if(tgt){w.t=cd;sZap();shake=Math.max(shake,6);
          fxs.push({kind:'sky',x:tgt.x,y:tgt.y,t:0});
          const R=84*Math.min(2,w.size+.6);
          fxs.push({kind:'nova',x:tgt.x,y:tgt.y,r:14,max:R,t:0,col:'#cfe6ff'});
          for(const e of enemies.slice())if(dist2(tgt.x,tgt.y,e.x,e.y)<R*R)
            damageEnemy(e,WD('bolt',w)*2.4,tgt.x,tgt.y);}else w.t=.15;}
      else if(w.sp.mage){w.t=cd*.6;const targs=[];let pool=enemies.slice().sort((a,b)=>dist2(player.x,player.y,a.x,a.y)-dist2(player.x,player.y,b.x,b.y));
        for(const e of pool){if(dist2(player.x,player.y,e.x,e.y)<420*420)targs.push(e);if(targs.length>=3+w.n)break;}
        if(targs.length){sZap();for(const e of targs){fxs.push({kind:'bolt',x1:player.x,y1:player.y,x2:e.x,y2:e.y,t:0});
          damageEnemy(e,WD('bolt',w)*.9);if(w.sp.stun)e.stun=Math.max(e.stun,.4);}}else w.t=.12;}
      else{const first=nearTgt(500);
        if(first){w.t=cd;sZap();const chain=[first];let cur=first;
          for(let i=0;i<2+w.n;i++){let nx=null,bd=300*300;
            for(const e of enemies)if(!chain.includes(e)){const d=dist2(cur.x,cur.y,e.x,e.y);if(d<bd){bd=d;nx=e;}}
            if(!nx)break;chain.push(nx);cur=nx;}
          let px=player.x,py=player.y;
          for(const e of chain){fxs.push({kind:'bolt',x1:px,y1:py,x2:e.x,y2:e.y,t:0});
            damageEnemy(e,WD('bolt',w));if(w.sp.stun)e.stun=Math.max(e.stun,.4);
            if(w.sp.boom){fxs.push({kind:'nova',x:e.x,y:e.y,r:6,max:44,t:0,col:'#ffd23e'});
              for(const o of enemies)if(o!==e&&dist2(e.x,e.y,o.x,o.y)<44*44)damageEnemy(o,8*w.dmg*player.dmgMul);}
            px=e.x;py=e.y;}}else w.t=.15;}}}
  // ---------- 대왕 하악질 ----------
  if(wp.nova){const w=wp.nova,cd=WDEF.nova.base.cd/w.rate*player.cdMul*cdScale;
    if(w.sp.aura){w.t-=dt;if(w.t<=0){w.t=.3;const R=(95+30*w.size);
      let any=0;for(const e of enemies)if(dist2(player.x,player.y,e.x,e.y)<R*R){damageEnemy(e,WD('nova',w)*.4,player.x,player.y);any=1;}
      if(any&&Math.random()<.4)fxs.push({kind:'nova',x:player.x,y:player.y,r:R*.7,max:R,t:0,col:'#ff8ad8'});}}
    else{w.t-=dt;if(w.t<=0){w.t=cd;fireNova(w,1);
      if(w.sp.dbl)echoQ.push({x:player.x,y:player.y,t:.25,w,mul:1});
      if(w.sp.echo){echoQ.push({x:player.x,y:player.y,t:.55,w,mul:1.2});echoQ.push({x:player.x,y:player.y,t:1.05,w,mul:1.5});}}}}
  // turrets (yarn SS)
  for(let i=turrets.length-1;i>=0;i--){const tu=turrets[i];
    tu.t-=dt;tu.cd-=dt;
    if(tu.cd<=0){const tgt=nearTgt2(tu.x,tu.y,420);
      if(tgt){tu.cd=.38;const a=Math.atan2(tgt.y-tu.y,tgt.x-tu.x);
        bullets.push({kind:'paw',x:tu.x,y:tu.y,vx:Math.cos(a)*500,vy:Math.sin(a)*500,
          dmg:6*player.dmgMul,r:6,life:1,pierce:0,rot:a,spr:'paw',scale:.8});}}
    if(tu.t<=0)turrets.splice(i,1);}
  // echo novas
  for(let i=echoQ.length-1;i>=0;i--){const e=echoQ[i];e.t-=dt;
    if(e.t<=0){echoQ.splice(i,1);
      const w=e.w,R=110*w.size*(e.mul||1.2);
      fxs.push({kind:'nova',x:e.x,y:e.y,r:14,max:R,t:0,col:'#ff8ad8'});
      sHiss();
      for(const en of enemies.slice())if(dist2(e.x,e.y,en.x,en.y)<R*R)
        damageEnemy(en,WDEF.nova.base.dmg*w.dmg*.8*player.dmgMul*(player.buffs.rage?1.6:1),e.x,e.y);}}}
function fireNova(w,mul){
  const R=110*w.size*mul;
  fxs.push({kind:'nova',x:player.x,y:player.y,r:14,max:R,t:0,col:'#ff8ad8'});
  fxs.push({kind:'hiss',x:player.x,y:player.y,t:0});
  sHiss();shake=Math.max(shake,5);
  for(const e of enemies.slice())if(dist2(player.x,player.y,e.x,e.y)<R*R){
    damageEnemy(e,WDEF.nova.base.dmg*w.dmg*player.dmgMul,player.x,player.y);
    if(w.sp.knock&&!e.boss){const d=Math.sqrt(dist2(player.x,player.y,e.x,e.y))||1;
      e.kx+=(e.x-player.x)/d*240;e.ky+=(e.y-player.y)/d*240;}}}
function nearTgt2(x,y,maxD){let best=null,bd=maxD*maxD;
  for(const e of enemies){const d=dist2(x,y,e.x,e.y);if(d<bd){bd=d;best=e;}}return best;}
// ================= enemy AI =================
function updateEnemy(e,dt){
  if(frzT>0){e.flash*=Math.pow(.001,dt);
    if(Math.random()<dt*.05)floater(e.x+rnd(-8,8),e.y-e.r,'💤','#fff',false);
    return;}
  if(e.sq>0)e.sq=Math.max(0,e.sq-dt*5);
  if(e.stun>0){e.stun-=dt;e.flash=Math.max(e.flash,.3);return;}
  e.wob+=dt*3;e.bIT-=dt;e.flash*=Math.pow(.001,dt);
  const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
  e.face=dx<0?-1:1;
  const S=e.st;
  // ===== boss PHASE 2: rage at 50% HP — bigger, redder, faster, extra attacks =====
  if(e.boss&&!S.rage&&e.hp<e.maxhp*.5){S.rage=true;e.rage=1;
    e.scale*=1.16;e.sp*=1.16;e.dmg=Math.round(e.dmg*1.25);
    banner('💢 '+e.boss+' 분노!!','#ff3860',1.7);sWarn();sBig();
    shake=Math.max(shake,10);flashR=.5;slowT=.35;
    fxs.push({kind:'nova',x:e.x,y:e.y,r:18,max:200,t:0,col:'#ff3860'});
    puff(e.x,e.y,10);
    // emergency burst: ring of bullets + summon adds
    for(let i=0;i<14;i++){const a=i/14*TAU;efire(e.x,e.y,Math.cos(a)*180,Math.sin(a)*180,'orb',8,4.5,e.dmg);}
    for(let i=0;i<3;i++){const add=spawnEnemy(stage<=2?'mouse':'wasp',e.x+rnd(-50,50),e.y+rnd(-50,50));}}
  if(e.rage){e.rageGlow=(e.rageGlow||0)+dt;
    if(Math.random()<dt*4&&parts.length<460)parts.push({x:e.x+rnd(-e.r,e.r),y:e.y-e.r,vx:rnd(-.6,.6),vy:-rnd(.6,1.6),life:.6,col:'#ff5a5a',sz:rnd(4,7),puff:1});}
  switch(e.beh){
    case 'chase':e.x+=(dx/d*e.sp+Math.cos(e.wob)*12)*dt;e.y+=(dy/d*e.sp+Math.sin(e.wob)*12)*dt;break;
    case 'dart':{const sp=e.sp*(.5+.8*Math.abs(Math.sin(e.wob)));
      e.x+=(dx/d*sp+Math.cos(e.wob*1.7)*28)*dt;e.y+=(dy/d*sp+Math.sin(e.wob*1.7)*28)*dt;break;}
    case 'turret':{S.t=(S.t||rnd(1,2))-dt;
      if(S.t<=0&&d<600){S.t=2.5;sShot();
        efire(e.x,e.y,dx/d*190,dy/d*190,'thorn',7,4,9);puff(e.x,e.y-10,2);}break;}
    case 'rush':
      if(!S.ph)S.ph='walk';
      if(S.ph==='walk'){e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;
        if(d<250){S.ph='aim';S.t=.6;S.ang=Math.atan2(dy,dx);
          addBeam(e.x,e.y,S.ang,330,40,.6,0);}}
      else if(S.ph==='aim'){S.t-=dt;
        if(S.t<=0){S.ph='dash';S.t=.7;sJump();}}
      else if(S.ph==='dash'){S.t-=dt;
        e.x+=Math.cos(S.ang)*480*dt;e.y+=Math.sin(S.ang)*480*dt;
        if(S.t<=0){S.ph='tired';S.t=1;}}
      else{S.t-=dt;if(S.t<=0)S.ph='walk';}
      break;
    case 'hop':
      if(!S.ph){S.ph='idle';S.t=rnd(.4,1);}
      if(S.ph==='idle'){S.t-=dt;
        if(S.t<=0&&d<500){S.ph='air';S.t=.5;S.x0=e.x;S.y0=e.y;
          const jd=Math.min(d,210);S.x1=e.x+dx/d*jd;S.y1=e.y+dy/d*jd;sJump();
          addZone(S.x1,S.y1,58,.5,0,10);}}
      else{S.t-=dt;const pr=1-S.t/.5;
        e.x=S.x0+(S.x1-S.x0)*pr;e.y=S.y0+(S.y1-S.y0)*pr;
        e.air=Math.sin(pr*Math.PI)*40;
        if(S.t<=0){S.ph='idle';S.t=rnd(.7,1.2);e.air=0;sThud();}}
      break;
    case 'split':e.x+=(dx/d*e.sp+Math.cos(e.wob)*10)*dt;e.y+=(dy/d*e.sp+Math.sin(e.wob)*10)*dt;
      e.scale=(e.elite?1.9:1)*(1+Math.sin(e.wob*2)*.07);break;
    case 'fuse':
      if(S.fuse===undefined)S.fuse=-1;
      if(S.fuse<0){e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;if(d<68)S.fuse=.5;}
      else{S.fuse-=dt;
        if(S.fuse<=0){const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);
          explode(e.x,e.y,88,15);return;}}
      break;
    case 'eat':{
      let prey=null,pd=460*460;
      for(const o of enemies)if(o!==e&&!o.boss&&o.beh!=='eat'){
        const dd=dist2(e.x,e.y,o.x,o.y);if(dd<pd){pd=dd;prey=o;}}
      if(prey&&e.meals<5){const pdx=prey.x-e.x,pdy=prey.y-e.y,pl=Math.hypot(pdx,pdy)||1;
        e.face=pdx<0?-1:1;
        e.x+=pdx/pl*(e.sp+16)*dt;e.y+=pdy/pl*(e.sp+16)*dt;
        if(pl<e.r*e.scale+prey.r){enemies.splice(enemies.indexOf(prey),1);
          e.meals++;e.hp+=prey.maxhp*.5;e.maxhp+=prey.maxhp*.5;
          e.scale=Math.min(2.4,e.scale*1.12);
          floater(e.x,e.y-e.r-10,'냠!','#ffd23e',true);puff(e.x,e.y,3);}}
      else{e.x+=dx/d*e.sp*.8*dt;e.y+=dy/d*e.sp*.8*dt;}
      break;}
    case 'swoop':
      if(S.vx===undefined){S.vx=rnd(-90,90);S.vy=rnd(-90,90);}
      S.vx+=dx/d*150*dt;S.vy+=dy/d*150*dt;
      {const v=Math.hypot(S.vx,S.vy);if(v>225){S.vx*=225/v;S.vy*=225/v;}}
      e.face=S.vx<0?-1:1;e.x+=S.vx*dt;e.y+=S.vy*dt;break;
    // ======== bosses ========
    case 'boar':
      if(!S.ph){S.ph='stalk';S.t=1.4;S.n=0;}
      if(S.ph==='stalk'){S.t-=dt;e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;
        if(S.t<=0){S.n++;
          if(S.n%3===0){S.ph='stompW';S.t=.75;addZone(e.x,e.y,150,.75,0,16);sWarn();}
          else{S.ph='aim';S.t=.7;S.ang=Math.atan2(dy,dx);
            addBeam(e.x,e.y,S.ang,560,72,.7,0);}}}
      else if(S.ph==='aim'){S.t-=dt;
        if(S.t<=0){S.ph='charge';S.t=1;sJump();shake=Math.max(shake,5);}}
      else if(S.ph==='charge'){S.t-=dt;
        e.x+=Math.cos(S.ang)*560*dt;e.y+=Math.sin(S.ang)*560*dt;
        if(parts.length<460)parts.push({x:e.x+rnd(-10,10),y:e.y+rnd(-10,10),vx:0,vy:0,life:.4,col:'#d8cfc2',sz:7,puff:1});
        if(S.t<=0){S.ph='dizzy';S.t=1.6;sThud();shake=Math.max(shake,8);}}
      else if(S.ph==='stompW'){S.t-=dt;
        if(S.t<=0){S.ph='stalk';S.t=1.2;sThud();shake=Math.max(shake,9);
          if(e.hp<e.maxhp*.55)for(let k=0;k<2;k++)spawnEnemy('mouse',e.x+rnd(-50,50),e.y+rnd(-50,50));}}
      else{S.t-=dt;if(S.t<=0){S.ph='stalk';S.t=1.2;}}
      break;
    case 'topgun':{
      if(S.ang===undefined){S.ang=rnd(0,TAU);S.mode='orbit';S.t=3;S.volley=2.2;S.vt=0;}
      S.t-=dt;
      if(S.mode==='orbit'){
        S.ang+=dt*(S.rage?2.3:1.7);
        const R=240,tx=player.x+Math.cos(S.ang)*R,ty=player.y+Math.sin(S.ang)*R;
        e.x+=(tx-e.x)*Math.min(1,dt*4);e.y+=(ty-e.y)*Math.min(1,dt*4);
        S.volley-=dt;
        if(S.volley<=0){S.vt++;
          if(S.vt%2){S.volley=3.6;sShot();
            for(let i=0;i<10;i++){const a=i/10*TAU;
              efire(e.x,e.y,Math.cos(a)*155,Math.sin(a)*155,'dart',7,4,10);}}
          else{S.volley=3.6;S.spiral=12;S.spT=0;S.spA=Math.atan2(dy,dx);}}
        if(S.spiral>0){S.spT-=dt;
          if(S.spT<=0){S.spT=.06;S.spiral--;S.spA+=.5;
            efire(e.x,e.y,Math.cos(S.spA)*180,Math.sin(S.spA)*180,'dart',7,4,10);}}
        if(S.t<=0){S.mode='aim';S.t=.55;S.ang2=Math.atan2(dy,dx);
          addBeam(e.x,e.y,S.ang2,720,64,.55,0);}}
      else if(S.mode==='aim'){S.t-=dt;
        if(S.t<=0){S.mode='dash';S.t=.85;sJump();S.eggd=0;}}
      else{S.t-=dt;
        e.x+=Math.cos(S.ang2)*620*dt;e.y+=Math.sin(S.ang2)*620*dt;
        S.eggd+=dt;
        if(S.eggd>.28){S.eggd=0;addZone(e.x,e.y,62,.85,0,12);}
        if(S.t<=0){S.mode='orbit';S.t=3;}}
      break;}
    case 'frogq':
      if(!S.ph){S.ph='hop';S.t=.7;S.spit=4;S.hops=0;}
      S.spit-=dt;
      if(S.spit<=0){S.spit=5.5;
        spawnEnemy('slimeS',e.x+rnd(-22,22),e.y+rnd(-22,22));
        spawnEnemy('slimeS',e.x+rnd(-22,22),e.y+rnd(-22,22));puff(e.x,e.y,3);}
      if(S.ph==='hop'){S.t-=dt;
        if(S.t<=0){S.hops++;
          if(S.hops%4===0){S.ph='tongueW';S.t=.65;
            S.tx=player.x;S.ty=player.y;
            const a=Math.atan2(S.ty-e.y,S.tx-e.x);
            addBeam(e.x,e.y,a,380,56,.65,0);S.ta=a;sWarn();}
          else if(S.hops%4===2){S.ph='bigjump';S.t=.95;S.tx=player.x;S.ty=player.y;
            addZone(S.tx,S.ty,112,.95,0,17);sWarn();S.x0=e.x;S.y0=e.y;}
          else{S.ph='air';S.t=.45;S.x0=e.x;S.y0=e.y;
            const jd=Math.min(d,190);S.x1=e.x+dx/d*jd;S.y1=e.y+dy/d*jd;sJump();}}}
      else if(S.ph==='air'){S.t-=dt;const pr=1-S.t/.45;
        e.x=S.x0+(S.x1-S.x0)*pr;e.y=S.y0+(S.y1-S.y0)*pr;e.air=Math.sin(pr*Math.PI)*46;
        if(S.t<=0){S.ph='hop';S.t=.8;e.air=0;sThud();}}
      else if(S.ph==='bigjump'){S.t-=dt;const pr=1-S.t/.95;
        e.x=S.x0+(S.tx-S.x0)*pr;e.y=S.y0+(S.ty-S.y0)*pr;e.air=Math.sin(pr*Math.PI)*140;
        if(S.t<=0){S.ph='hop';S.t=1;e.air=0;sThud();shake=Math.max(shake,9);}}
      else if(S.ph==='tongueW'){S.t-=dt;
        if(S.t<=0){
          const x2=e.x+Math.cos(S.ta)*380,y2=e.y+Math.sin(S.ta)*380;
          fxs.push({kind:'tongue',x1:e.x,y1:e.y,x2,y2,t:0});
          if(player.iT<=0&&distSeg(player.x,player.y,e.x,e.y,x2,y2)<34)hurtPlayer(15);
          S.ph='hop';S.t=.9;}}
      break;
    case 'flyB':{
      const want=290,m=(d-want)/Math.abs(d-want||1);
      e.x+=dx/d*e.sp*m*dt+Math.cos(e.wob)*28*dt;
      e.y+=dy/d*e.sp*m*dt+Math.sin(e.wob)*28*dt;
      S.sum=(S.sum===undefined?3:S.sum)-dt;
      if(S.sum<=0){S.sum=S.rage?4:6.5;
        for(let i=0;i<3;i++)spawnEnemy('fly',e.x+rnd(-30,30),e.y+rnd(-30,30));
        floater(e.x,e.y-e.r-10,'쫄따구들!','#fff',true);puff(e.x,e.y,3);}
      S.goo=(S.goo===undefined?3.5:S.goo)-dt;
      if(S.goo<=0){S.goo=S.rage?3.6:6;sShot();
        const base=Math.atan2(dy,dx);
        for(let i=0;i<5;i++){const a=base+(i-2)*.24;
          efire(e.x,e.y,Math.cos(a)*175,Math.sin(a)*175,'goo',8,4,11);}}
      S.lob=(S.lob===undefined?7:S.lob)-dt;
      if(S.lob<=0){S.lob=9;for(let i=0;i<2;i++)
        addZone(player.x+rnd(-90,90),player.y+rnd(-90,90),70,1,0,13);}
      break;}
    case 'mosqB':
      if(!S.ph){S.ph='orbit';S.t=2.4;S.ang=rnd(0,TAU);S.chain=0;}
      if(S.ph==='orbit'){S.t-=dt;S.ang+=dt*(S.rage?2.5:1.8);
        const R=200,tx=player.x+Math.cos(S.ang)*R,ty=player.y+Math.sin(S.ang)*R;
        e.x+=(tx-e.x)*Math.min(1,dt*4.5);e.y+=(ty-e.y)*Math.min(1,dt*4.5);
        if(S.t<=0){S.ph='aim';S.t=.5;S.ang2=Math.atan2(dy,dx);
          addBeam(e.x,e.y,S.ang2,460,52,.5,0);}}
      else if(S.ph==='aim'){S.t-=dt;
        if(S.t<=0){S.ph='dash';S.t=.6;sJump();}}
      else{S.t-=dt;
        e.x+=Math.cos(S.ang2)*540*dt;e.y+=Math.sin(S.ang2)*540*dt;
        if(player.iT<=0&&d<e.r+player.r+6){hurtPlayer(12);
          e.hp=Math.min(e.maxhp,e.hp+e.maxhp*.08);
          floater(e.x,e.y-e.r-10,'🩸 흡혈!','#ff3860',true);}
        if(S.t<=0){S.chain++;
          if(S.chain<2&&Math.random()<.6){S.ph='aim';S.t=.4;S.ang2=Math.atan2(player.y-e.y,player.x-e.x);
            addBeam(e.x,e.y,S.ang2,460,52,.4,0);}
          else{S.chain=0;S.ph='orbit';S.t=S.rage?1.7:2.4;}}}
      break;
    case 'racc':{
      e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;
      S.orb=(S.orb||0)+dt*2.7;
      S.orbR=88+Math.sin((S.spin||0))*0;
      if(S.spinT===undefined)S.spinT=8;
      S.spinT-=dt;
      if(S.spinT<=0){S.spinT=10;S.spinD=2;}
      if(S.spinD>0){S.spinD-=dt;S.orbR=88+Math.sin((2-S.spinD)*Math.PI)*52;S.orb+=dt*3;}
      for(let i=0;i<3;i++){const a=S.orb+i/3*TAU,
        tx=e.x+Math.cos(a)*S.orbR,ty=e.y+Math.sin(a)*S.orbR;
        if(player.iT<=0&&dist2(tx,ty,player.x,player.y)<(17+player.r)*(17+player.r))hurtPlayer(13);}
      S.lob=(S.lob===undefined?3:S.lob)-dt;
      if(S.lob<=0){S.lob=6;sWarn();
        for(let i=0;i<3;i++)addZone(player.x+rnd(-100,100),player.y+rnd(-100,100),76,1.05,0,14);}
      S.lid=(S.lid===undefined?5:S.lid)-dt;
      if(S.lid<=0){S.lid=7;sShot();
        for(const off of[-.3,.3]){const a=Math.atan2(dy,dx)+off;
          efire(e.x,e.y,Math.cos(a)*250,Math.sin(a)*250,'lid',10,2.2,12,{boom:.8});}}
      break;}
    case 'snakeK':{
      if(!S.ph){S.ph='slither';S.t=2;}
      const ph2=e.hp<e.maxhp*.5;
      if(S.ph==='slither'){S.t-=dt;
        e.x+=(dx/d*e.sp+Math.cos(e.wob*2)*40)*dt;e.y+=(dy/d*e.sp+Math.sin(e.wob*2)*40)*dt;
        if(S.t<=0){const r=Math.random();
          if(r<.35){S.ph='dashW';S.t=.6;S.ang=Math.atan2(dy,dx);
            addBeam(e.x,e.y,S.ang,620,76,.6,0);sWarn();}
          else if(r<.65){S.ph='venom';S.t=.4;}
          else if(r<.85){S.ph='poison';S.t=.4;}
          else{S.ph='summon';S.t=.4;}}}
      else if(S.ph==='dashW'){S.t-=dt;
        if(S.t<=0){S.ph='dash';S.t=.8;sJump();}}
      else if(S.ph==='dash'){S.t-=dt;
        e.x+=Math.cos(S.ang)*(ph2?640:560)*dt;e.y+=Math.sin(S.ang)*(ph2?640:560)*dt;
        if(S.t<=0){S.ph='slither';S.t=rnd(1.4,2.2);}}
      else if(S.ph==='venom'){S.t-=dt;
        if(S.t<=0){sShot();const n=ph2?14:10;
          for(let i=0;i<n;i++){const a=i/n*TAU+e.wob;
            efire(e.x,e.y,Math.cos(a)*150,Math.sin(a)*150,'venom',8,5,12);}
          S.ph='slither';S.t=rnd(1.6,2.4);}}
      else if(S.ph==='poison'){S.t-=dt;
        if(S.t<=0){sWarn();
          for(let i=0;i<(ph2?4:3);i++)addZone(player.x+rnd(-120,120),player.y+rnd(-120,120),80,.9,2,11);
          S.ph='slither';S.t=rnd(1.6,2.4);}}
      else{S.t-=dt;
        if(S.t<=0){for(let k=0;k<2;k++)spawnEnemy('snake',e.x+rnd(-60,60),e.y+rnd(-60,60));
          floater(e.x,e.y-e.r-12,'나와라 부하들!','#7fd45e',true);
          S.ph='slither';S.t=2.2;}}
      break;}
    case 'dogB':{
      if(!S.ph){S.ph='stalk';S.t=1.6;}
      if(S.ph==='stalk'){S.t-=dt;e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;
        if(S.t<=0){const r=Math.random();
          if(r<.4){S.ph='tripleW';S.t=.6;S.cn=0;S.ang=Math.atan2(dy,dx);
            addBeam(e.x,e.y,S.ang,520,68,.6,0);sWarn();}
          else if(r<.7){S.ph='barkW';S.t=.8;addZone(e.x,e.y,175,.8,0,15);sWarn();}
          else{S.ph='bone';S.t=.35;}}}
      else if(S.ph==='tripleW'){S.t-=dt;
        if(S.t<=0){S.ph='triple';S.t=.6;sJump();}}
      else if(S.ph==='triple'){S.t-=dt;
        e.x+=Math.cos(S.ang)*560*dt;e.y+=Math.sin(S.ang)*560*dt;
        if(S.t<=0){S.cn++;
          if(S.cn<3){S.ph='tripleW';S.t=.42;S.ang=Math.atan2(player.y-e.y,player.x-e.x);
            addBeam(e.x,e.y,S.ang,520,68,.42,0);}
          else{S.ph='stalk';S.t=1.6;}}}
      else if(S.ph==='barkW'){S.t-=dt;
        if(S.t<=0){sBig();shake=Math.max(shake,10);
          fxs.push({kind:'nova',x:e.x,y:e.y,r:20,max:175,t:0,col:'#c89a6a'});
          if(e.hp<e.maxhp*.6)for(let k=0;k<2;k++)spawnEnemy('mouse',e.x+rnd(-50,50),e.y+rnd(-50,50));
          S.ph='stalk';S.t=1.4;}}
      else{S.t-=dt;
        if(S.t<=0){sShot();
          for(const off of[-.25,.25]){const a=Math.atan2(dy,dx)+off;
            efire(e.x,e.y,Math.cos(a)*260,Math.sin(a)*260,'bone',10,2.4,12,{boom:.85});}
          S.ph='stalk';S.t=1.7;}}
      break;}
    case 'mage':{
      if(!S.act){S.act='idle';S.t=1;S.cycle=0;}
      const ph2=e.hp<e.maxhp*.5;
      if(S.act==='idle'){
        e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;S.t-=dt;
        if(S.t<=0){S.cycle++;
          S.act=['ring','meteor','tele','summon'][S.cycle%4];S.t=.4;}}
      else if(S.act==='ring'){S.t-=dt;
        if(S.t<=0){sZap();const n=ph2?20:13;
          for(let i=0;i<n;i++){const a=i/n*TAU+S.cycle;
            efire(e.x,e.y,Math.cos(a)*(ph2?165:130),Math.sin(a)*(ph2?165:130),'orb',7,6,12);}
          if(ph2)setTimeout(()=>{if(state!=='playing'||e.hp<=0)return;
            for(let i=0;i<13;i++){const a=i/13*TAU+S.cycle+.24;
              efire(e.x,e.y,Math.cos(a)*145,Math.sin(a)*145,'orb',7,6,12);}},420);
          S.act='idle';S.t=ph2?2:2.8;}}
      else if(S.act==='meteor'){S.t-=dt;
        if(S.t<=0){sWarn();S.met=ph2?8:6;S.metT=0;S.act='meting';}}
      else if(S.act==='meting'){S.metT-=dt;
        if(S.metT<=0){S.metT=.13;S.met--;
          addZone(player.x+rnd(-150,150),player.y+rnd(-150,150),66,.85,0,13);
          if(S.met<=0){S.act='idle';S.t=2.6;}}}
      else if(S.act==='tele'){S.t-=dt;
        if(S.t<=0){sTele();puff(e.x,e.y,8);
          const a=rnd(0,TAU);e.x=player.x+Math.cos(a)*290;e.y=player.y+Math.sin(a)*290;
          clampArena(e,e.r);puff(e.x,e.y,8);S.act='idle';S.t=1.4;}}
      else{S.t-=dt;
        if(S.t<=0){for(let i=0;i<4;i++)spawnEnemy('mouse',e.x+rnd(-40,40),e.y+rnd(-40,40));
          floater(e.x,e.y-e.r-12,'나와라 부하들!','#b66dff',true);
          S.act='idle';S.t=2.6;}}
      break;}
    // ===== midbosses =====
    case 'weasel':
      if(!S.ph){S.ph='run';S.t=rnd(.5,1);}
      if(S.ph==='run'){S.t-=dt;e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;
        if(S.t<=0){S.ph='aim';S.t=.38;S.ang=Math.atan2(dy,dx);addBeam(e.x,e.y,S.ang,420,46,.38,0);}}
      else if(S.ph==='aim'){S.t-=dt;if(S.t<=0){S.ph='dash';S.t=.5;sJump();}}
      else{S.t-=dt;e.x+=Math.cos(S.ang)*640*dt;e.y+=Math.sin(S.ang)*640*dt;
        if(parts.length<460&&Math.random()<.6)parts.push({x:e.x,y:e.y,vx:0,vy:0,life:.3,col:'#d89a5a',sz:6,puff:1});
        if(S.t<=0){S.ph='run';S.t=rnd(.45,.85);}}
      break;
    case 'sparrow':{
      S.ang=(S.ang===undefined?rnd(0,TAU):S.ang)+dt*1.3;
      if(S.ph!=='dive'){const R=200,tx=player.x+Math.cos(S.ang)*R,ty=player.y+Math.sin(S.ang)*R;
        e.x+=(tx-e.x)*Math.min(1,dt*3.2);e.y+=(ty-e.y)*Math.min(1,dt*3.2);}
      S.t=(S.t===undefined?rnd(1,2.2):S.t)-dt;
      if(S.ph==='dive'){e.x+=Math.cos(S.da)*560*dt;e.y+=Math.sin(S.da)*560*dt;
        if(S.t<=0)S.ph='orbit';}
      else if(S.t<=0){S.t=2.6;
        if(S.skill==='dive'){S.ph='dive';S.t=.6;S.da=Math.atan2(dy,dx);sJump();addBeam(e.x,e.y,S.da,420,40,.001,0);}
        else if(S.skill==='peck'){sShot();const b=Math.atan2(dy,dx);
          for(let i=0;i<3;i++)efire(e.x,e.y,Math.cos(b+(i-1)*.3)*230,Math.sin(b+(i-1)*.3)*230,'feather',7,3.5,e.dmg);}
        else{addZone(player.x,player.y,72,1,0,e.dmg);}}
      break;}
    case 'mole': // 두더지 두목 — surfaces to throw dirt, then burrows & pops up near you
      if(!S.ph){S.ph='up';S.t=2.4;}
      if(S.ph==='up'){S.t-=dt;e.invis=0;
        e.x+=Math.cos(e.wob)*22*dt;e.y+=Math.sin(e.wob)*22*dt;
        S.fire=(S.fire===undefined?.7:S.fire)-dt;
        if(S.fire<=0){S.fire=e.rage?.7:1.1;sShot();const a=Math.atan2(dy,dx);
          for(let i=-1;i<=1;i++)efire(e.x,e.y-10,Math.cos(a+i*.22)*210,Math.sin(a+i*.22)*210,'dirt',9,4,e.dmg);}
        if(S.t<=0){S.ph='dig';S.t=1.5;e.invis=1;sThud();puff(e.x,e.y,8);
          for(let i=0;i<2;i++)spawnEnemy('ant',e.x+rnd(-20,20),e.y+rnd(-20,20));}}
      else{S.t-=dt;e.invis=1;
        e.x+=dx/d*e.sp*1.35*dt;e.y+=dy/d*e.sp*1.35*dt;
        if(Math.random()<dt*6&&parts.length<PCAP)parts.push({x:e.x,y:e.y,vx:0,vy:0,life:.5,col:'#8a6a4a',sz:6,puff:1});
        if(S.t<=0){e.invis=0;S.ph='up';S.t=e.rage?1.7:2.6;puff(e.x,e.y,10);sThud();shake=Math.max(shake,4);
          fxs.push({kind:'nova',x:e.x,y:e.y,r:10,max:90,t:0,col:'#a07a4a'});
          if(player.iT<=0&&dist2(e.x,e.y,player.x,player.y)<90*90)hurtPlayer(e.dmg);}}
      break;
    case 'dung':
      e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;
      S.t=(S.t===undefined?2:S.t)-dt;
      if(S.t<=0){S.t=3.4;sThud();const a=Math.atan2(dy,dx);
        efire(e.x,e.y,Math.cos(a)*160,Math.sin(a)*160,'dung',17,5.5,e.dmg);
        floater(e.x,e.y-e.r-10,'데구르르~','#8a6a3a',true);}
      break;
    case 'ninja':
      if(!S.ph){S.ph='stalk';S.t=1.3;}
      if(S.ph==='stalk'){S.t-=dt;e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;
        if(S.t<=0){const r=Math.random();
          if(r<.45){S.ph='throw';S.t=.35;}
          else if(r<.72){S.ph='vanish';S.t=1.8;e.invis=1;sTele();puff(e.x,e.y,6);}
          else{S.ph='tele';S.t=.25;}}}
      else if(S.ph==='throw'){S.t-=dt;if(S.t<=0){sShot();
        const star=8+(e.rage?4:0);for(let i=0;i<star;i++){const a=i/star*TAU+e.wob;
          efire(e.x,e.y,Math.cos(a)*250,Math.sin(a)*250,'shuriken',8,3.2,e.dmg);}
        S.ph='stalk';S.t=1.1;}}
      else if(S.ph==='vanish'){S.t-=dt;e.x+=dx/d*e.sp*1.5*dt;e.y+=dy/d*e.sp*1.5*dt;
        if(S.t<=0){e.invis=0;puff(e.x,e.y,6);S.ph='throw';S.t=.3;}}
      else{S.t-=dt;if(S.t<=0){const a=rnd(0,TAU);e.x=player.x+Math.cos(a)*230;e.y=player.y+Math.sin(a)*230;
        clampArena(e,e.r);puff(e.x,e.y,6);sTele();S.ph='throw';S.t=.3;}}
      break;
    case 'golem':
      e.x+=dx/d*e.sp*dt;e.y+=dy/d*e.sp*dt;
      S.t=(S.t===undefined?2.4:S.t)-dt;
      if(S.t<=0){S.t=e.rage?2:3;sThud();shake=Math.max(shake,5);
        const n=e.rage?3:2;for(let k=0;k<n;k++){const a=Math.atan2(dy,dx)+rnd(-.3,.3);
          efire(e.x,e.y,Math.cos(a)*210,Math.sin(a)*210,'rock',14,6,e.dmg,{split:1});}}
      if(!S.st2)S.st2=4;S.st2-=dt;
      if(S.st2<=0){S.st2=6;addZone(e.x,e.y,150,.7,0,e.dmg);}
      break;
    case 'toad':
      if(!S.ph){S.ph='hop';S.t=.8;S.fog=3.5;}
      S.fog-=dt;
      if(S.fog<=0){S.fog=e.rage?3.5:5;sHiss();
        for(let i=0;i<(e.rage?4:3);i++)addZone(player.x+rnd(-140,140),player.y+rnd(-140,140),92,.85,3.2,12);
        floater(e.x,e.y-e.r-12,'독안개!','#7fae3e',true);}
      if(S.ph==='hop'){S.t-=dt;
        if(S.t<=0){S.hops=(S.hops||0)+1;
          if(S.hops%3===0){S.ph='tongueW';S.t=.6;S.ta=Math.atan2(dy,dx);addBeam(e.x,e.y,S.ta,400,54,.6,0);sWarn();}
          else{S.ph='air';S.t=.5;S.x0=e.x;S.y0=e.y;const jd=Math.min(d,200);
            S.x1=e.x+dx/d*jd;S.y1=e.y+dy/d*jd;sJump();}}}
      else if(S.ph==='air'){S.t-=dt;const pr=1-S.t/.5;
        e.x=S.x0+(S.x1-S.x0)*pr;e.y=S.y0+(S.y1-S.y0)*pr;e.air=Math.sin(pr*Math.PI)*48;
        if(S.t<=0){S.ph='hop';S.t=.8;e.air=0;sThud();
          for(let i=0;i<2;i++)spawnEnemy('slimeS',e.x+rnd(-20,20),e.y+rnd(-20,20));}}
      else{S.t-=dt;if(S.t<=0){const x2=e.x+Math.cos(S.ta)*400,y2=e.y+Math.sin(S.ta)*400;
        fxs.push({kind:'tongue',x1:e.x,y1:e.y,x2,y2,t:0});
        if(player.iT<=0&&distSeg(player.x,player.y,e.x,e.y,x2,y2)<36)hurtPlayer(e.dmg);
        S.ph='hop';S.t=.7;}}
      break;
  }
  e.x+=e.kx*dt;e.y+=e.ky*dt;
  e.kx*=Math.pow(.002,dt);e.ky*=Math.pow(.002,dt);
  clampArena(e,e.r*e.scale*.7);
  if(obstacles.length&&!e.boss&&!e.air)resolveObstacles(e,e.r*e.scale*.55);
  const dd=Math.hypot(player.x-e.x,player.y-e.y);
  if(player.iT<=0&&!e.air&&!e.invis&&dd<e.r*e.scale+player.r)hurtPlayer(e.dmg+(e.meals||0)*2);}
// ================= flow =================
function stageCleared(){
  bossDone=true;state='clear';sClear();slowT=.9;
  let bonus=Math.round((15+stage*6)*(1+SV.up.coin*.2));
  if(masterMode)bonus=Math.round(bonus*2.2);
  runCoins+=bonus;SV.coins+=bonus;
  const ck=(masterMode?'m':'')+stage;
  const prev=SV.clears[ck];
  if(!prev||gTime<prev)SV.clears[ck]=Math.round(gTime);
  if(!masterMode&&stage>=SV.maxStage&&stage<STAGES.length)SV.maxStage=stage+1;
  const justUnlockedMaster=!SV.master&&!masterMode&&stage>=STAGES.length;
  if(justUnlockedMaster)SV.master=true;
  save();
  burst(player.x,player.y,['#ffe066','#7ec8ff','#ff8ad8'],80,12);
  banner('🏆 스테이지 클리어!!','#ffe066',2.2);
  setTimeout(()=>{
    $('rTitle').textContent=masterMode?'달인 클리어! 🔥':'클리어! 🏆';
    $('rSub').textContent=ST.icon+' '+ST.n+(stage<STAGES.length?' → 다음 동네가 열렸다!':' — 동네 평정 완료!!');
    $('rTime').textContent=fmtT(gTime);$('rKills').textContent=kills;
    $('rLv').textContent=player.level;$('rCoins').textContent=runCoins;
    $('rHint').innerHTML=justUnlockedMaster?'🎉 <b>모든 스테이지 클리어!</b> 🔥<b>달인 고양이 모드</b> 해금!! (스테이지 선택에서 ON)'
      :stage>=STAGES.length?'🎉 <b>동네 평정!</b> 당신은 전설의 고양이!':'클리어 보너스 🪙'+bonus+' 획득!';
    $('rNext').classList.toggle('hidden',stage>=STAGES.length);
    hide('hudBtns');show('results');state='results';},1600);}
function gameOver(){
  state='dead';sDead();slowT=.8;shake=15;save();
  burst(player.x,player.y,['#7ec8ff','#ff8ad8','#fff'],60,12);puff(player.x,player.y,10);
  setTimeout(()=>{
    $('rTitle').textContent='냥... 😵';
    $('rSub').textContent=ST.icon+' '+ST.n+' — '+(bossOn?'보스에게 당했다!':'악당들에게 당했다!');
    $('rTime').textContent=fmtT(gTime);$('rKills').textContent=kills;
    $('rLv').textContent=player.level;$('rCoins').textContent=runCoins;
    $('rHint').innerHTML='모은 코인으로 <b>능력 업그레이드</b> 하고 재도전하자!';
    $('rNext').classList.add('hidden');
    hide('hudBtns');show('results');state='results';},1100);}
function fmtT(t){return ((t/60)|0)+':'+String((t%60)|0).padStart(2,'0');}
// ================= update =================
function gainXP(v){
  player.xp+=v;
  while(player.xp>=player.xpNext){
    player.xp-=player.xpNext;player.level++;
    player.xpNext=Math.floor(5+player.level*3.4+player.level*player.level*.26);
    pendingLv++;}
  if(pendingLv>0&&state==='playing'&&levelDelay<=0){
    levelDelay=.4;sLevel();flashW=.6;
    banner('🐾 LEVEL UP!','#ffe066',.9);
    burst(player.x,player.y,['#ffe066','#7ec8ff'],24,9);shake=Math.max(shake,4);}}
function update(dt){
  gTime+=dt;tutT-=dt;
  let mx=0,my=0;
  if(keys.ArrowLeft||keys.a)mx--;if(keys.ArrowRight||keys.d)mx++;
  if(keys.ArrowUp||keys.w)my--;if(keys.ArrowDown||keys.s)my++;
  if(joy.on&&(joy.dx||joy.dy)){mx=joy.dx;my=joy.dy;}
  const ml=Math.hypot(mx,my);
  if(ml>0){mx/=ml;my/=ml;player.fx=mx;player.fy=my;
    if(Math.abs(mx)>.2)player.face=mx<0?-1:1;
    const tm=obstacles.length?terrainMul(player.x,player.y):1;
    if(tm<1&&Math.random()<dt*8)parts.push({x:player.x+rnd(-10,10),y:player.y+12,vx:rnd(-1,1),vy:-rnd(.5,1.5),life:.4,col:'#e0c896',sz:rnd(3,6),puff:1});
    player.x+=mx*player.speed*tm*dt;player.y+=my*player.speed*tm*dt;walkT+=dt;}
  clampArena(player,player.r);
  if(obstacles.length)resolveObstacles(player,player.r);
  player.iT-=dt;player.shieldT-=dt;frzT-=dt;skillCd-=dt;
  // dopamine buff timers
  for(const k in player.buffs){player.buffs[k]-=dt;if(player.buffs[k]<=0)delete player.buffs[k];}
  if(player.buffs.invinc)player.iT=Math.max(player.iT,.1);
  // 분신술 clones — orbit & auto-fire
  if(player.buffs.clone){
    for(let ci=0;ci<clones.length;ci++){const cl=clones[ci];cl.a+=dt*1.4;
      cl.x=player.x+Math.cos(cl.a)*70;cl.y=player.y+Math.sin(cl.a)*70;
      cl.t=(cl.t||0)-dt;
      if(cl.t<=0){const tg=nearTgt2(cl.x,cl.y,640);
        if(tg){cl.t=.32;const a=Math.atan2(tg.y-cl.y,tg.x-cl.x);
          bullets.push({kind:'paw',x:cl.x,y:cl.y,vx:Math.cos(a)*560,vy:Math.sin(a)*560,
            dmg:14*player.dmgMul,r:8,life:1.1,pierce:1,rot:a,spr:'paw',scale:.95,glow:2,gcol:'#9ad0ff'});}}}}
  else if(clones.length)clones=[];
  if(holeT>0){holeT-=dt;if(holeT<=0){explode(player.x,player.y,220,0);shake=14;flashW=.8;
    for(const e of enemies.slice())if(dist2(player.x,player.y,e.x,e.y)<260*260)damageEnemy(e,260,player.x,player.y);}}
  // camera clamp to arena
  cam.x+=(player.x-cam.x)*Math.min(1,dt*5);
  cam.y+=(player.y-cam.y)*Math.min(1,dt*5);
  const s=ST.shape,bw=s.k==='rect'?s.w/2:s.R,bh=s.k==='rect'?s.h/2:s.R;
  const mX=Math.max(0,bw+60-(W/2)/zoom),mY=Math.max(0,bh+60-(H/2)/zoom);
  cam.x=clamp(cam.x,-mX,mX);cam.y=clamp(cam.y,-mY,mY);
  director(dt);
  updateWeapons(dt);
  for(const e of enemies.slice())updateEnemy(e,dt);
  // player bullets
  for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];
    b.life-=dt;if(b.life<=0){
      if(b.kind==='yarn')yarnBoom(b);
      bullets.splice(i,1);continue;}
    if(b.kind==='yarn'){
      if(!b.tgt||b.tgt.hp<=0||!enemies.includes(b.tgt))b.tgt=enemies.length?enemies[(Math.random()*enemies.length)|0]:null;
      if(b.tgt){const dx=b.tgt.x-b.x,dy=b.tgt.y-b.y,d=Math.hypot(dx,dy)||1;
        b.vx+=(dx/d*880)*dt;b.vy+=(dy/d*880)*dt;
        const v=Math.hypot(b.vx,b.vy);if(v>350){b.vx*=350/v;b.vy*=350/v;}}
      b.rot+=dt*9;}
    else if(b.homing){
      if(!b.tgt||b.tgt.hp<=0||!enemies.includes(b.tgt))b.tgt=nearTgt2(b.x,b.y,600);
      if(b.tgt){const dx=b.tgt.x-b.x,dy=b.tgt.y-b.y,d=Math.hypot(dx,dy)||1,sp=Math.hypot(b.vx,b.vy)||1;
        b.vx+=(dx/d*sp-b.vx)*Math.min(1,dt*6);b.vy+=(dy/d*sp-b.vy)*Math.min(1,dt*6);}
      b.rot=Math.atan2(b.vy,b.vx);}
    else b.rot=Math.atan2(b.vy,b.vx);
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    for(const e of enemies){if(dist2(b.x,b.y,e.x,e.y)<(b.r+e.r*e.scale)*(b.r+e.r*e.scale)){
      if(b.kind==='yarn'){yarnBoom(b);bullets.splice(i,1);break;}
      let dm=b.dmg;if(b.bossMul&&e.boss)dm*=b.bossMul;
      damageEnemy(e,dm,b.x,b.y);burst(b.x,b.y,['#ffe066','#fff'],3,4);
      if(b.pierce>0)b.pierce--;else bullets.splice(i,1);
      break;}}}
  // hostile bullets
  for(let i=ebullets.length-1;i>=0;i--){const b=ebullets[i];
    if(frzT>0)continue;
    b.life-=dt;b.rot+=b.spin*dt;
    if(b.boom!==undefined){b.boom-=dt;if(b.boom<=0){b.boom=99;b.vx*=-1;b.vy*=-1;}}
    if(b.life<=0){ebullets.splice(i,1);continue;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    // golem rock: split into shards when it hits the arena wall
    if(b.split&&outOfArena(b.x,b.y,8)){ebullets.splice(i,1);
      sThud();shake=Math.max(shake,3);puff(b.x,b.y,4);clampArena(b,8);
      for(let k=0;k<4;k++){const a=k/4*TAU+rnd(-.3,.3);
        efire(b.x,b.y,Math.cos(a)*220,Math.sin(a)*220,'rock',8,3,Math.round(b.dmg*.6));}
      continue;}
    if(player.iT<=0&&dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)*(b.r+player.r)){
      ebullets.splice(i,1);
      if(player.block&&Math.random()<player.block){floater(player.x,player.y-28,'막음!','#5aa843',false);
        tone(700,.06,'square',.08);for(let k=0;k<5;k++)parts.push({x:b.x,y:b.y,vx:rnd(-3,3),vy:rnd(-3,3),life:.3,col:'#5aa843',sz:3});}
      else hurtPlayer(b.dmg);}}
  // zones
  for(let i=zones.length-1;i>=0;i--){const z=zones[i];
    if(frzT>0)continue;
    if(z.warn>0){z.warn-=dt;
      if(z.warn<=0){sThud();shake=Math.max(shake,4);
        fxs.push({kind:'nova',x:z.x,y:z.y,r:12,max:z.r,t:0,col:'#ff5a5a'});
        if(player.iT<=0&&dist2(z.x,z.y,player.x,player.y)<z.r*z.r)hurtPlayer(z.dmg);
        if(z.burn<=0){zones.splice(i,1);continue;}}}
    else{z.burn-=dt;
      if(player.iT<=0&&dist2(z.x,z.y,player.x,player.y)<z.r*z.r)hurtPlayer(z.dmg);
      if(z.burn<=0)zones.splice(i,1);}}
  // beams resolve
  for(const f of fxs)if(f.kind==='beam'&&!f.done){
    f.warn-=dt;
    if(f.warn<=0){f.done=true;
      if(f.dmg>0){const x2=f.x+Math.cos(f.ang)*f.len,y2=f.y+Math.sin(f.ang)*f.len;
        if(player.iT<=0&&distSeg(player.x,player.y,f.x,f.y,x2,y2)<f.wd/2)hurtPlayer(f.dmg);}}}
  // pickups
  const pull=(g,d,spd)=>{g.x+=(player.x-g.x)/d*spd*dt;g.y+=(player.y-g.y)/d*spd*dt;};
  for(let i=gems.length-1;i>=0;i--){const g=gems[i];g.t+=dt;
    const d=Math.sqrt(dist2(g.x,g.y,player.x,player.y));
    if(g.vac)pull(g,d,950);
    else if(d<player.magnet)pull(g,d,(1-d/player.magnet)*600+150);
    if(d<24){gems.splice(i,1);sGem();gainXP(g.v);}}
  for(let i=coinDrops.length-1;i>=0;i--){const g=coinDrops[i];g.t+=dt;
    const d=Math.sqrt(dist2(g.x,g.y,player.x,player.y));
    if(g.vac)pull(g,d,950);
    else if(d<player.magnet)pull(g,d,(1-d/player.magnet)*600+150);
    if(d<26){coinDrops.splice(i,1);sCoin();
      const v=Math.round(1*(1+SV.up.coin*.2));
      runCoins+=v;SV.coins+=v;save();
      floater(player.x,player.y-30,'🪙+'+v,'#ffd75a',false);}}
  for(let i=drops.length-1;i>=0;i--){const g=drops[i];g.t+=dt;
    const d=Math.sqrt(dist2(g.x,g.y,player.x,player.y));
    if(g.vac)pull(g,d,950);
    else if(d<player.magnet)pull(g,d,(1-d/player.magnet)*600+150);
    if(d<28){drops.splice(i,1);pickupDrop(g.kind);}}
  // fx & cosmetics
  for(let i=fxs.length-1;i>=0;i--){const f=fxs[i];f.t+=dt;
    if(f.kind==='nova')f.r+=(f.max-f.r)*dt*9;
    const dur=f.kind==='bolt'?.14:f.kind==='beam'?(f.warn>0?99:.18):f.kind==='tongue'?.2:f.kind==='hiss'?.5:f.kind==='claw'?.22:f.kind==='spark'?.18:f.kind==='shock'?.4:.45;
    if(f.t>dur&&!(f.kind==='beam'&&f.warn>0))fxs.splice(i,1);}
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];
    p.x+=p.vx;p.y+=p.vy;p.vx*=.94;p.vy*=.94;p.life-=dt*1.7;if(p.life<=0)parts.splice(i,1);}
  for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];
    f.y-=dt*46;f.t-=dt*1.25;if(f.t<=0)floaters.splice(i,1);}
  for(let i=banners.length-1;i>=0;i--){const b=banners[i];
    b.t+=dt;if(b.t>b.dur)banners.splice(i,1);}
  comboT-=dt;if(comboT<=0&&combo>0){combo=0;lastMile=0;}
  if(chestDelay>0){chestDelay-=dt;if(chestDelay<=0){if(pendingLv>0)chestDelay=.12;else openChestNow();}}
  if(pendingLv>0){levelDelay-=dt;
    if(levelDelay<=0){pendingLv--;showLevelup();}}}
function yarnBoom(b){
  const R=b.aoe||55;
  fxs.push({kind:'nova',x:b.x,y:b.y,r:8,max:R,t:0,col:b.spr==='yarnR'?'#ff6a6a':'#ffd23e'});
  noise(.16,.12,650,'lowpass');shake=Math.max(shake,3);
  for(const e of enemies.slice())if(dist2(b.x,b.y,e.x,e.y)<R*R)damageEnemy(e,b.dmg,b.x,b.y);
  if(b.turret&&turrets.length<4)turrets.push({x:b.x,y:b.y,t:3,cd:.2});}
// ================= draw =================
// ---- cached scene gradients (sky depth + vignette lighting) ----
function shade(hex,amt){const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=clamp(r+amt,0,255);g=clamp(g+amt,0,255);b=clamp(b+amt,0,255);
  return 'rgb('+r+','+g+','+b+')';}
let _skyG=null,_skyKey='',_vigG=null,_vigKey='';
function skyGrad(){const k=ST.bg+'_'+W+'_'+H;if(k!==_skyKey){_skyKey=k;
  const c=SKYS[ST.bg];_skyG=ctx.createLinearGradient(0,0,0,H);
  _skyG.addColorStop(0,shade(c,30));_skyG.addColorStop(.5,c);_skyG.addColorStop(1,shade(c,-26));}
  return _skyG;}
function vignetteGrad(){const k=W+'_'+H;if(k!==_vigKey){_vigKey=k;
  _vigG=ctx.createRadialGradient(W*.5,H*.44,Math.min(W,H)*.28,W*.5,H*.52,Math.max(W,H)*.7);
  _vigG.addColorStop(0,'rgba(0,0,0,0)');_vigG.addColorStop(.7,'rgba(15,12,28,.12)');
  _vigG.addColorStop(1,'rgba(15,12,28,.42)');}
  return _vigG;}
function drawArena(){
  // assumes world transform (cam + zoom) is already applied
  const s=ST.shape;
  ctx.save();
  ctx.beginPath();
  if(s.k==='rect')roundRectPath(-s.w/2,-s.h/2,s.w,s.h,34);
  else{ctx.arc(0,0,s.R,0,TAU);
    if(s.k==='ring')ctx.arc(0,0,s.r,0,TAU,true);}
  ctx.save();ctx.clip();
  const bg=BGS[ST.bg];
  // tile bg over the visible WORLD region (depends on cam + zoom)
  const hw=(W/2)/zoom+420,hh=(H/2)/zoom+420;
  const x0=Math.floor((cam.x-hw)/420)*420,y0=Math.floor((cam.y-hh)/420)*420;
  const x1=cam.x+hw,y1=cam.y+hh;
  for(let x=x0;x<x1;x+=420)for(let y=y0;y<y1;y+=420)ctx.drawImage(bg,x,y);
  // inner edge shading
  ctx.lineWidth=44;ctx.strokeStyle='rgba(0,0,0,.13)';
  ctx.beginPath();
  if(s.k==='rect')roundRectPath(-s.w/2,-s.h/2,s.w,s.h,34);
  else{ctx.arc(0,0,s.R,0,TAU);if(s.k==='ring')ctx.arc(0,0,s.r,0,TAU,true);}
  ctx.stroke();
  ctx.restore();
  // wall border + posts
  ctx.lineWidth=14;ctx.strokeStyle=WALLS[ST.bg];
  ctx.beginPath();
  if(s.k==='rect')roundRectPath(-s.w/2,-s.h/2,s.w,s.h,34);
  else{ctx.arc(0,0,s.R,0,TAU);}
  ctx.stroke();
  if(s.k==='ring'){ctx.beginPath();ctx.arc(0,0,s.r,0,TAU);ctx.stroke();}
  ctx.fillStyle=WALLS[ST.bg];
  if(s.k==='rect'){
    for(let x=-s.w/2;x<=s.w/2;x+=130){dot(x,-s.h/2);dot(x,s.h/2);}
    for(let y=-s.h/2;y<=s.h/2;y+=130){dot(-s.w/2,y);dot(s.w/2,y);}}
  else{const n=Math.round(s.R/55);
    for(let i=0;i<n;i++){const a=i/n*TAU;dot(Math.cos(a)*s.R,Math.sin(a)*s.R);}
    if(s.k==='ring'){const n2=Math.round(s.r/55);
      for(let i=0;i<n2;i++){const a=i/n2*TAU;dot(Math.cos(a)*s.r,Math.sin(a)*s.r);}}}
  ctx.restore();
  function dot(x,y){ctx.beginPath();ctx.arc(x,y,9,0,TAU);ctx.fill();}}
function roundRectPath(x,y,w,h,r){
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawStk(s,x,y,rot,scale,flip){
  ctx.save();ctx.translate(x,y);
  if(rot)ctx.rotate(rot);
  ctx.scale((flip?-1:1)*(scale||1),scale||1);
  ctx.drawImage(s.n,-s.half,-s.half);ctx.restore();}
function drawObstacle(ob){
  const x=ob.x,y=ob.y,r=ob.r;
  if(ob.slow){ // sand pit / puddle — clearly readable "slow here" patch
    const pud=ob.type==='puddle';
    ctx.fillStyle=pud?'#3f6f80':'#caa45e';
    ctx.beginPath();ctx.ellipse(x,y,r,r*.82,ob.rot,0,TAU);ctx.fill();
    ctx.fillStyle=pud?'#5a8fa0':'#e0bd72';
    ctx.beginPath();ctx.ellipse(x,y,r*.74,r*.56,ob.rot,0,TAU);ctx.fill();
    // dashed rim so the boundary is obvious
    ctx.save();ctx.setLineDash([10,7]);ctx.lineWidth=4;ctx.strokeStyle=pud?'#2c5460':'#9a7838';
    ctx.beginPath();ctx.ellipse(x,y,r,r*.82,ob.rot,0,TAU);ctx.stroke();ctx.restore();
    // ripples / footprints texture
    ctx.globalAlpha=.5;ctx.strokeStyle=pud?'#7fb0c0':'#b89456';ctx.lineWidth=2.5;
    for(let i=1;i<=2;i++){ctx.beginPath();ctx.ellipse(x,y,r*(.3*i),r*.24*i,ob.rot,0,TAU);ctx.stroke();}
    ctx.globalAlpha=.85;ctx.font='bold '+Math.round(r*.42)+'px Jua,sans-serif';
    ctx.fillStyle=pud?'#dff':'#6a4a1a';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(pud?'💧':'🐢',x,y);ctx.textBaseline='alphabetic';ctx.globalAlpha=1;return;}
  // shadow
  ctx.globalAlpha=.2;ctx.fillStyle='#1c3206';
  ctx.beginPath();ctx.ellipse(x,y+r*.5,r*.95,r*.34,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
  ctx.save();ctx.translate(x,y);ctx.rotate(ob.rot);ctx.lineJoin='round';
  const L='#5a4632';
  if(ob.type==='car'){
    const w=r*1.7,h=r*1.05;
    ctx.fillStyle=['#e85a5a','#5a9be8','#ffd23e','#7ec85e','#b888e8'][(x*7+y)&3||0];
    ctx.strokeStyle=L;ctx.lineWidth=4;
    rr(-w/2,-h/2,w,h,10);ctx.fill();ctx.stroke();
    ctx.fillStyle='#cfe6ff';rr(-w*.32,-h*.34,w*.64,h*.32,5);ctx.fill();ctx.stroke();
    ctx.fillStyle='#3a2e22';ctx.beginPath();ctx.arc(-w*.3,h*.5,r*.22,0,TAU);ctx.arc(w*.3,h*.5,r*.22,0,TAU);ctx.fill();
  }else if(ob.type==='bush'){
    ctx.fillStyle='#5fa343';ctx.strokeStyle='#3a6b1e';ctx.lineWidth=3.5;
    ctx.beginPath();for(let i=0;i<7;i++){const a=i/7*TAU,rr2=r*(.8+.2*Math.sin(i*3));
      ctx.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2*.85);}ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#6fb851';ctx.beginPath();ctx.arc(-r*.2,-r*.2,r*.4,0,TAU);ctx.fill();
    ctx.fillStyle='#ff8ab0';for(const p of[[-.3,.1],[.4,-.1],[.1,.3]]){ctx.beginPath();ctx.arc(p[0]*r,p[1]*r,r*.12,0,TAU);ctx.fill();}
  }else if(ob.type==='crate'){
    ctx.fillStyle='#c89a5e';ctx.strokeStyle=L;ctx.lineWidth=4;
    rr(-r,-r,r*2,r*2,6);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-r,-r);ctx.lineTo(r,r);ctx.moveTo(r,-r);ctx.lineTo(-r,r);ctx.stroke();
  }else if(ob.type==='vent'){
    ctx.fillStyle='#9aa0a8';ctx.strokeStyle=L;ctx.lineWidth=4;
    rr(-r,-r*.8,r*2,r*1.6,6);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#6a6f78';ctx.lineWidth=3;
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(-r*.8,i*r*.3);ctx.lineTo(r*.8,i*r*.3);ctx.stroke();}
  }else{ // rock
    ctx.fillStyle='#9a928a';ctx.strokeStyle='#6a625a';ctx.lineWidth=4;
    ctx.beginPath();for(let i=0;i<7;i++){const a=i/7*TAU,rr2=r*(.78+.22*Math.sin(i*2.3));
      ctx.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#b0a89e';ctx.beginPath();ctx.arc(-r*.25,-r*.25,r*.4,0,TAU);ctx.fill();
    ctx.fillStyle='#5fae4a';ctx.beginPath();ctx.ellipse(r*.2,-r*.5,r*.3,r*.14,0,0,TAU);ctx.fill();
  }
  ctx.restore();
  function rr(bx,by,bw,bh,rad){ctx.beginPath();
    ctx.moveTo(bx+rad,by);ctx.arcTo(bx+bw,by,bx+bw,by+bh,rad);ctx.arcTo(bx+bw,by+bh,bx,by+bh,rad);
    ctx.arcTo(bx,by+bh,bx,by,rad);ctx.arcTo(bx,by,bx+bw,by,rad);ctx.closePath();}}
function drawEb(b){ // hostile bullet: red halo + core
  ctx.globalAlpha=.4+.15*Math.sin(performance.now()/90);
  ctx.fillStyle='#ff3c3c';
  ctx.beginPath();ctx.arc(b.x,b.y,b.r+7,0,TAU);ctx.fill();
  ctx.globalAlpha=1;
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);
  if(b.spr==='thorn'){ctx.fillStyle='#5a4632';
    ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU,rr=i%2?b.r*.55:b.r*1.1;
      ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();
    ctx.fillStyle='#8a7558';ctx.beginPath();ctx.arc(0,0,b.r*.4,0,TAU);ctx.fill();}
  else if(b.spr==='dart'){ctx.fillStyle='#46464e';
    ctx.beginPath();ctx.ellipse(0,0,b.r*1.3,b.r*.5,0,0,TAU);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-b.r*.4,0,b.r*.3,b.r*.2,0,0,TAU);ctx.fill();}
  else if(b.spr==='goo'){ctx.fillStyle='#6fae3e';
    ctx.beginPath();ctx.arc(0,0,b.r,0,TAU);ctx.fill();
    ctx.fillStyle='#9fd45e';ctx.beginPath();ctx.arc(-b.r*.25,-b.r*.25,b.r*.4,0,TAU);ctx.fill();}
  else if(b.spr==='orb'){ctx.fillStyle='#9b5fe0';
    ctx.beginPath();ctx.arc(0,0,b.r,0,TAU);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();}
  else if(b.spr==='venom'){ctx.fillStyle='#4f9b3f';
    ctx.beginPath();ctx.arc(0,0,b.r,0,TAU);ctx.fill();
    ctx.strokeStyle='#2c5e22';ctx.lineWidth=2.5;ctx.stroke();}
  else if(b.spr==='lid'){ctx.fillStyle='#8e949c';
    ctx.beginPath();ctx.arc(0,0,b.r,0,TAU);ctx.fill();
    ctx.strokeStyle='#5d6168';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,b.r*.55,0,TAU);ctx.stroke();}
  else if(b.spr==='bone'){ctx.drawImage(STK.bone.n,-STK.bone.half,-STK.bone.half);}
  else if(b.spr==='rock'){ctx.drawImage(STK.rock.n,-STK.rock.half,-STK.rock.half);}
  else if(b.spr==='shuriken'){ctx.rotate(performance.now()/60);ctx.drawImage(STK.shuriken.n,-STK.shuriken.half,-STK.shuriken.half);}
  else if(b.spr==='dung'){ctx.rotate(performance.now()/120);ctx.drawImage(STK.dung.n,-STK.dung.half,-STK.dung.half);}
  else if(b.spr==='feather'){ctx.fillStyle='#aeb6c2';
    ctx.beginPath();ctx.ellipse(0,0,b.r*1.2,b.r*.5,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#6a727e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-b.r,0);ctx.lineTo(b.r,0);ctx.stroke();}
  else if(b.spr==='sandp'){ctx.fillStyle='#d6b478';
    ctx.beginPath();ctx.arc(0,0,b.r,0,TAU);ctx.fill();
    ctx.fillStyle='#b8945a';ctx.beginPath();ctx.arc(-b.r*.3,-b.r*.3,b.r*.4,0,TAU);ctx.fill();}
  else if(b.spr==='dirt'){ctx.fillStyle='#7a5a3a';
    ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU,rr=i%2?b.r*.6:b.r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();
    ctx.fillStyle='#9a7a52';ctx.beginPath();ctx.arc(-b.r*.25,-b.r*.25,b.r*.35,0,TAU);ctx.fill();}
  else{ctx.fillStyle='#c0392b';ctx.beginPath();ctx.arc(0,0,b.r,0,TAU);ctx.fill();}
  ctx.restore();}
function draw(){
  // sky gradient (screen space — depth from light top to darker ground)
  ctx.fillStyle=skyGrad();ctx.fillRect(0,0,W,H);
  ctx.save();
  if(shake>.4)ctx.translate(rnd(-shake,shake),rnd(-shake,shake));
  // world transform: center on camera, zoomed out on small screens
  ctx.translate(W/2,H/2);ctx.scale(zoom,zoom);ctx.translate(-cam.x,-cam.y);
  drawArena();
  // map obstacles (under everything)
  for(const ob of obstacles)drawObstacle(ob);
  // zones — solid translucent red
  for(const z of zones){
    if(z.warn>0){const pr=1-z.warn/z.max;
      ctx.fillStyle='rgba(255,50,50,.3)';
      ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(255,90,90,.35)';
      ctx.beginPath();ctx.arc(z.x,z.y,z.r*pr,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.stroke();}
    else{ctx.fillStyle=`rgba(255,50,50,${.3+.1*Math.sin(performance.now()/90)})`;
      ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.fill();}}
  // beams — translucent red rect
  for(const f of fxs)if(f.kind==='beam'&&f.warn>0){
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.ang);
    ctx.fillStyle=`rgba(255,50,50,${.28+.14*Math.sin(performance.now()/80)})`;
    ctx.fillRect(0,-f.wd/2,f.len,f.wd);
    ctx.fillStyle='rgba(255,255,255,.5)';
    ctx.fillRect(0,-1.5,f.len,3);ctx.restore();}
  // gems
  for(const g of gems){const t=g.v>=8?'#ffd75a':g.v>=3?'#ff8ad8':'#7ec8ff';
    const b=1+Math.sin(g.t*6)*.15,r=(g.v>=8?9:g.v>=3?7:5.5)*b;
    ctx.save();ctx.translate(g.x,g.y);ctx.rotate(.785);
    ctx.fillStyle='#fff';ctx.fillRect(-r-2,-r-2,r*2+4,r*2+4);
    ctx.fillStyle=t;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();}
  // items: gold rotating ring
  for(const g of coinDrops){const b=1+Math.sin(g.t*7)*.1;
    drawStk(STK.coin,g.x,g.y,Math.sin(g.t*4)*.3,b);}
  for(const g of drops){const sp=g.kind==='chicken'?STK.chicken:STK[SKILLS[g.kind].stk];
    ctx.save();ctx.translate(g.x,g.y);
    ctx.rotate(g.t*1.6);
    ctx.strokeStyle='rgba(255,200,60,.85)';ctx.lineWidth=3.5;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,0,24,i*1.57,i*1.57+.9);ctx.stroke();}
    ctx.restore();
    drawStk(sp,g.x,g.y-Math.abs(Math.sin(g.t*3))*6,0,1);}
  // turrets
  for(const tu of turrets){
    ctx.globalAlpha=Math.min(1,tu.t);
    drawStk(STK.yarn,tu.x,tu.y,performance.now()/300,1.1);
    ctx.globalAlpha=1;}
  // novas
  for(const f of fxs)if(f.kind==='nova'){
    ctx.globalAlpha=Math.max(0,1-f.t/.45);
    ctx.strokeStyle=f.col;ctx.lineWidth=6;
    ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.stroke();
    ctx.globalAlpha*=.22;ctx.fillStyle=f.col;ctx.fill();ctx.globalAlpha=1;}
  // enemies
  for(const e of enemies){
    ctx.globalAlpha=.16;ctx.fillStyle='#1c3206';
    ctx.beginPath();ctx.ellipse(e.x,e.y+e.r*e.scale*.75,e.r*e.scale*.8,e.r*e.scale*.3,0,0,TAU);ctx.fill();
    ctx.globalAlpha=1;}
  for(const e of enemies){const sp=STK[e.stk];
    const yy=e.y-(e.air||0);
    let rot=Math.sin(e.wob*2)*.1,sc=e.scale;
    if((e.beh==='rush'||e.beh==='boar')&&e.st.ph==='aim')rot=Math.sin(performance.now()/30)*.16;
    if(e.st&&e.st.fuse>=0&&e.st.fuse!==undefined)sc*=1+Math.sin(performance.now()/50)*.12;
    // squash & stretch on hit
    const sq=e.sq||0,sx=sc*(1+sq*.32),sy=sc*(1-sq*.26);
    if(e.elite){ctx.globalAlpha=.5+.2*Math.sin(performance.now()/160);
      ctx.strokeStyle='#ffd23e';ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(e.x,yy,e.r*sc+12,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
    if(e.rage){ctx.globalAlpha=.35+.18*Math.sin(performance.now()/100);
      ctx.strokeStyle='#ff2b40';ctx.lineWidth=5;
      ctx.beginPath();ctx.arc(e.x,yy,e.r*sc+10,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
    ctx.save();ctx.translate(e.x,yy);ctx.rotate(rot);
    if(e.invis)ctx.globalAlpha=.2+.1*Math.sin(performance.now()/120);
    ctx.scale((e.face===-1?-1:1)*sx,sy);ctx.drawImage(sp.n,-sp.half,-sp.half);
    if(e.invis)ctx.globalAlpha=1;
    if(e.flash>.08){ctx.globalAlpha=e.flash*.9;ctx.drawImage(sp.w,-sp.half,-sp.half);ctx.globalAlpha=1;}
    if(e.rage){ctx.globalAlpha=.3+.12*Math.sin(performance.now()/90);
      ctx.globalCompositeOperation='source-atop';ctx.fillStyle='#ff2b40';
      ctx.fillRect(-sp.half,-sp.half,sp.half*2,sp.half*2);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
    ctx.restore();
    if(e.beh==='boar'&&e.st.ph==='dizzy'){
      ctx.font='20px Jua,sans-serif';ctx.textAlign='center';
      ctx.fillText('💫',e.x+Math.cos(e.wob*4)*14,yy-e.r-16);}
    if(e.beh==='racc'){const o=e.st.orb||0,R=e.st.orbR||88;
      for(let i=0;i<3;i++){const a=o+i/3*TAU,tx=e.x+Math.cos(a)*R,ty=yy+Math.sin(a)*R;
        ctx.fillStyle='rgba(255,50,50,.3)';
        ctx.beginPath();ctx.arc(tx,ty,20,0,TAU);ctx.fill();
        ctx.save();ctx.translate(tx,ty);ctx.rotate(a+1.2);
        ctx.fillStyle='#8e949c';ctx.fillRect(-9,-11,18,22);
        ctx.strokeStyle='#46464e';ctx.lineWidth=3;ctx.strokeRect(-9,-11,18,22);ctx.restore();}}
    if(e.boss){const bw=96;
      ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(e.x-bw/2,yy-e.r*sc-22,bw,9);
      ctx.fillStyle='#ff3860';ctx.fillRect(e.x-bw/2+1.5,yy-e.r*sc-20.5,(bw-3)*Math.max(0,e.hp/e.maxhp),6);}
    else if(e.elite){const bw=64;
      ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(e.x-bw/2,yy-e.r*sc-18,bw,7);
      ctx.fillStyle='#ffd23e';ctx.fillRect(e.x-bw/2+1,yy-e.r*sc-17,(bw-2)*Math.max(0,e.hp/e.maxhp),5);}
    else if(e.meals>0){ctx.font='900 11px Jua,sans-serif';ctx.textAlign='center';
      ctx.fillStyle='#ffd23e';ctx.fillText('×'+e.meals+'냠',e.x,yy-e.r*sc-8);}}
  // fish orbit
  if(player.weapons.fish){const w=player.weapons.fish,n=2+w.n,R=82+8*w.n;
    for(let i=0;i<n;i++){const a=fishAng+i/n*TAU;
      drawStk(w.sp.shark?STK.shark:STK.fish,player.x+Math.cos(a)*R,player.y+Math.sin(a)*R,
        a+Math.PI/2,w.size,false);}}
  // bullets (player) — streak + glow that grows with weapon power
  for(const b of bullets){
    const gl=b.glow||0;
    // power trail
    const tl=.035+gl*.014;
    ctx.globalAlpha=.35;ctx.strokeStyle=gl>=2?(b.gcol||'#fff'):'#fff';ctx.lineWidth=3+gl*.6;
    ctx.beginPath();ctx.moveTo(b.x-b.vx*tl,b.y-b.vy*tl);ctx.lineTo(b.x,b.y);ctx.stroke();
    // glow halo (pulses), only when upgraded
    if(gl>=2){const pr=(b.r||7)*(b.scale||1)+6+gl*1.4;
      ctx.globalAlpha=.18+.1*Math.sin(performance.now()/120+b.x);
      ctx.fillStyle=b.gcol||'#ffd23e';ctx.beginPath();ctx.arc(b.x,b.y,pr,0,TAU);ctx.fill();}
    ctx.globalAlpha=1;
    if(b.spr==='rapid'){ctx.fillStyle='#fffbe0';ctx.strokeStyle=OUT;ctx.lineWidth=2;
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);
      ctx.beginPath();ctx.ellipse(0,0,7,3.5,0,0,TAU);ctx.fill();ctx.stroke();ctx.restore();}
    else drawStk(STK[b.spr],b.x,b.y,b.rot,(b.scale||1)*(1+Math.min(gl,6)*.04));
    // sparkle orbiters on very high power
    if(gl>=5){const a=performance.now()/90+b.x;
      ctx.fillStyle='#fff';ctx.globalAlpha=.8;
      for(let k=0;k<3;k++){const aa=a+k*2.1;
        ctx.beginPath();ctx.arc(b.x+Math.cos(aa)*(b.r*b.scale+9),b.y+Math.sin(aa)*(b.r*b.scale+9),2,0,TAU);ctx.fill();}
      ctx.globalAlpha=1;}}
  for(const b of ebullets)drawEb(b);
  // bolts
  ctx.lineWidth=4;
  for(const f of fxs)if(f.kind==='bolt'){
    ctx.globalAlpha=Math.max(0,1-f.t/.14);ctx.strokeStyle='#ffd23e';ctx.lineWidth=4;ctx.beginPath();
    const seg=5;ctx.moveTo(f.x1,f.y1);
    for(let i=1;i<seg;i++){const t=i/seg;
      ctx.lineTo(f.x1+(f.x2-f.x1)*t+rnd(-12,12),f.y1+(f.y2-f.y1)*t+rnd(-12,12));}
    ctx.lineTo(f.x2,f.y2);ctx.stroke();}
  // 천벌 sky strike — thick jagged bolt from above + flash
  for(const f of fxs)if(f.kind==='sky'){
    const a=Math.max(0,1-f.t/.4);ctx.globalAlpha=a;
    ctx.strokeStyle='#dff0ff';ctx.lineWidth=9;ctx.beginPath();
    let yx=f.x;ctx.moveTo(yx,f.y-460);
    for(let y=f.y-460;y<f.y;y+=46){yx=f.x+rnd(-16,16);ctx.lineTo(yx,y);}
    ctx.lineTo(f.x,f.y);ctx.stroke();
    ctx.strokeStyle='#9ad0ff';ctx.lineWidth=4;ctx.stroke();
    ctx.globalAlpha=a*.5;ctx.fillStyle='#dff0ff';
    ctx.beginPath();ctx.ellipse(f.x,f.y,40*(1-a)+10,14,0,0,TAU);ctx.fill();}
  // tongue
  for(const f of fxs)if(f.kind==='tongue'){
    ctx.globalAlpha=Math.max(0,1-f.t/.2);
    ctx.strokeStyle='#ff7a9a';ctx.lineWidth=18;
    ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();
    ctx.fillStyle='#ff7a9a';ctx.beginPath();ctx.arc(f.x2,f.y2,14,0,TAU);ctx.fill();}
  // claw
  for(const f of fxs)if(f.kind==='claw'){
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.ang);
    ctx.globalAlpha=Math.max(0,1-f.t/.22);
    ctx.strokeStyle='#fff';ctx.lineWidth=5;
    for(const off of[-.4,0,.4]){
      ctx.beginPath();ctx.arc(0,off*30,72,-.5+off*.2,.5+off*.2);ctx.stroke();}
    ctx.restore();}
  // hit sparks — quick white/gold cross-flash
  for(const f of fxs)if(f.kind==='spark'){
    const k=f.t/.18,a=Math.max(0,1-k),sz=(f.big?16:11)*(.6+k*1.1);
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);ctx.globalAlpha=a;
    ctx.fillStyle=f.big?'#ffe066':'#fff';
    for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(sz*.34,-sz);ctx.lineTo(sz*.7,0);ctx.lineTo(sz*.34,sz);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=a*.9;ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(0,0,sz*.4,0,TAU);ctx.fill();ctx.restore();}
  // shock rings (skill upgrades / heavy hits)
  for(const f of fxs)if(f.kind==='shock'){
    const k=f.t/.4;ctx.globalAlpha=Math.max(0,1-k);
    ctx.strokeStyle=f.col||'#fff';ctx.lineWidth=5*(1-k);
    ctx.beginPath();ctx.arc(f.x,f.y,f.max*k,0,TAU);ctx.stroke();}
  ctx.globalAlpha=1;
  // hiss text
  for(const f of fxs)if(f.kind==='hiss'){
    ctx.globalAlpha=Math.max(0,1-f.t/.5);
    ctx.font='900 24px Jua,sans-serif';ctx.textAlign='center';
    ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=5;
    ctx.strokeText('하악-!!',f.x,f.y-46);ctx.fillStyle='#ff8ad8';ctx.fillText('하악-!!',f.x,f.y-46);
    ctx.globalAlpha=1;}
  // 분신술 clones (drawn translucent behind)
  if(player.buffs.clone)for(const cl of clones){if(cl.x===undefined)continue;
    ctx.globalAlpha=.5;const ps=STK[player.stk];
    ctx.save();ctx.translate(cl.x,cl.y);ctx.scale(.85,.85);
    ctx.drawImage(ps.n,-ps.half,-ps.half);ctx.restore();
    ctx.globalAlpha=1;}
  // player
  if(state!=='dead'){
    ctx.globalAlpha=.18;ctx.fillStyle='#1c3206';
    ctx.beginPath();ctx.ellipse(player.x,player.y+16,16,6,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
    // buff aura
    const bf=player.buffs;
    if(bf.berserk||bf.invinc||bf.nocd||bf.rage){
      const col=bf.invinc?'#ffd75a':bf.berserk?'#ff5f3c':'#9ad0ff';
      ctx.globalAlpha=.3+.15*Math.sin(performance.now()/70);
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(player.x,player.y,30,0,TAU);ctx.fill();
      ctx.globalAlpha=1;}
    const bob=Math.abs(Math.sin(walkT*11))*4;
    ctx.save();ctx.translate(player.x,player.y-bob);
    if(player.iT>0&&!player.buffs.invinc&&((player.iT*14)|0)%2===0)ctx.globalAlpha=.35;
    ctx.rotate(Math.sin(walkT*11)*.07);
    ctx.scale(player.face===-1?-1:1,1);
    const ps=STK[player.stk];ctx.drawImage(ps.n,-ps.half,-ps.half);
    ctx.restore();
    if(player.shieldT>0||player.buffs.invinc){
      ctx.globalAlpha=.55+.25*Math.sin(performance.now()/90);
      ctx.strokeStyle='#ffd75a';ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(player.x,player.y-4,30,0,TAU);ctx.stroke();ctx.globalAlpha=1;}}
  // particles
  for(const p of parts){ctx.globalAlpha=Math.max(0,p.life)*(p.puff?.7:1);
    ctx.fillStyle=p.col;
    if(p.puff){ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,TAU);ctx.fill();}
    else ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);}
  ctx.globalAlpha=1;
  ctx.textAlign='center';
  for(const f of floaters){ctx.globalAlpha=Math.max(0,f.t);
    ctx.font=`900 ${f.big?18:12.5}px Jua,sans-serif`;
    ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=3;
    ctx.strokeText(f.txt,f.x,f.y);
    ctx.fillStyle=f.col;ctx.fillText(f.txt,f.x,f.y);}
  ctx.globalAlpha=1;
  ctx.restore();
  // vignette — depth/atmosphere (desktop only; skip on phones to save fill-rate)
  if(!IS_TOUCH0){ctx.fillStyle=vignetteGrad();ctx.fillRect(0,0,W,H);}
  if(flashR>.02){ctx.fillStyle=`rgba(255,40,60,${flashR*.3})`;ctx.fillRect(0,0,W,H);}
  if(flashW>.02){ctx.fillStyle=`rgba(255,255,210,${flashW*.3})`;ctx.fillRect(0,0,W,H);}
  if(player.hp<=player.maxhp*.25&&player.hp>0&&state==='playing'){
    ctx.globalAlpha=.25+.2*Math.sin(performance.now()/130);
    ctx.strokeStyle='#ff2b4d';ctx.lineWidth=12;ctx.strokeRect(0,0,W,H);ctx.globalAlpha=1;}
  if(frzT>0){ctx.fillStyle='rgba(120,180,255,.1)';ctx.fillRect(0,0,W,H);}
  drawHUD();
  if(player.skill&&(state==='playing'||state==='paused')){
    const b={x:66,y:H-92,r:44},sk=SKILLS[player.skill.key];
    ctx.globalAlpha=.92;
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);
    ctx.fillStyle='#fff8e8';ctx.fill();
    ctx.lineWidth=4;ctx.strokeStyle=skillCd>0?'#c9c4b4':'#ff9b2f';ctx.stroke();
    if(skillCd<=0){ctx.globalAlpha=.4+.2*Math.sin(performance.now()/200);
      ctx.beginPath();ctx.arc(b.x,b.y,b.r+6,0,TAU);ctx.strokeStyle='#ffe066';ctx.stroke();}
    ctx.globalAlpha=1;
    drawStk(STK[sk.stk],b.x,b.y,0,1.15);
    ctx.beginPath();ctx.arc(b.x+b.r*.68,b.y-b.r*.68,13,0,TAU);
    ctx.fillStyle='#ff5f3c';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#fff';ctx.stroke();
    ctx.font='900 13px Jua,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#fff';ctx.fillText('×'+player.skill.uses,b.x+b.r*.68,b.y-b.r*.68+1);
    ctx.textBaseline='alphabetic';
    if(!IS_TOUCH){ctx.font='900 10px Jua,sans-serif';
      ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=2;
      ctx.strokeText('SPACE',b.x,b.y+b.r+14);ctx.fillStyle='#fff';ctx.fillText('SPACE',b.x,b.y+b.r+14);}}
  if(joy.on){ctx.globalAlpha=.3;ctx.strokeStyle='#fff';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(joy.ax,joy.ay,52,0,TAU);ctx.stroke();
    ctx.globalAlpha=.55;ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(joy.ax+joy.dx*40,joy.ay+joy.dy*40,20,0,TAU);ctx.fill();ctx.globalAlpha=1;}
  for(const b of banners){
    const inT=Math.min(1,b.t*5),outT=clamp((b.dur-b.t)*3,0,1);
    const sc=.4+.6*(1-Math.pow(1-inT,3));
    ctx.save();ctx.translate(W/2,H*.3);ctx.scale(sc,sc);
    ctx.globalAlpha=Math.min(inT,outT);
    ctx.font=`900 ${Math.min(W*.062,34)}px Jua,sans-serif`;ctx.textAlign='center';
    ctx.lineWidth=8;ctx.strokeStyle='rgba(50,35,15,.8)';ctx.strokeText(b.txt,0,0);
    ctx.fillStyle=b.col;ctx.fillText(b.txt,0,0);ctx.restore();}
  if(tutT>0&&state==='playing'&&gTime<5){
    ctx.globalAlpha=Math.min(1,tutT);ctx.font='900 15px Jua,sans-serif';ctx.textAlign='center';
    ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=4;
    const msg=IS_TOUCH?'누르고 끌어서 이동! 공격은 자동 🐾':'WASD/방향키 이동! 공격은 자동 🐾';
    ctx.strokeText(msg,W/2,H*.68);ctx.fillStyle='#fff';ctx.fillText(msg,W/2,H*.68);
    ctx.globalAlpha=1;}}
function drawHUD(){
  if(state==='menu'||!player)return;
  const pad=14,top=16;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,0,W,6);
  ctx.fillStyle='#ffe066';ctx.fillRect(0,0,W*clamp(player.xp/player.xpNext,0,1),6);
  ctx.font='900 12px Jua,sans-serif';ctx.textAlign='left';
  ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=3;
  ctx.strokeText('Lv.'+player.level,pad,top+10);
  ctx.fillStyle='#ffe066';ctx.fillText('Lv.'+player.level,pad,top+10);
  const hbw=124,hfrac=clamp(player.hp/player.maxhp,0,1);
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(pad,top+16,hbw,15);
  ctx.fillStyle=hfrac>.5?'#52c84a':hfrac>.25?'#ffb02f':'#ff3860';
  ctx.fillRect(pad+2,top+18,(hbw-4)*hfrac,11);
  ctx.font='900 10.5px Jua,sans-serif';ctx.textAlign='center';
  ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2.5;
  const htxt=Math.ceil(player.hp)+' / '+player.maxhp;
  ctx.strokeText(htxt,pad+hbw/2,top+27);
  ctx.fillStyle='#fff';ctx.fillText(htxt,pad+hbw/2,top+27);
  // stage + timer/boss
  ctx.font='900 12px Jua,sans-serif';
  const label=(masterMode?'🔥달인 ':'')+stage+'. '+ST.n;
  ctx.strokeText(label,W/2,top+6);
  ctx.fillStyle=masterMode?'#ff9a4c':'#fff';
  ctx.fillText(label,W/2,top+6);
  if(!bossOn&&!midOn){
    const toMid=!midDone&&gTime<MID_AT, left=Math.max(0,(toMid?MID_AT:BOSS_AT)-gTime);
    ctx.font='900 22px Jua,sans-serif';
    const tstr=(toMid?'⚔ ':'👹 ')+fmtT(left);
    ctx.strokeText(tstr,W/2,top+30);ctx.fillStyle=toMid?'#ffb02f':'#fff';ctx.fillText(tstr,W/2,top+30);}
  ctx.textAlign='right';ctx.font='900 14px Jua,sans-serif';
  ctx.strokeText('💀 '+kills,W-pad,top+10);ctx.fillStyle='#fff';ctx.fillText('💀 '+kills,W-pad,top+10);
  ctx.strokeText('🪙 '+runCoins,W-pad,top+28);ctx.fillStyle='#ffe066';ctx.fillText('🪙 '+runCoins,W-pad,top+28);
  if(combo>2){ctx.font=`900 ${Math.min(18+combo*.4,30)}px Jua,sans-serif`;
    ctx.strokeText(combo+' 콤보',W-pad,top+56);
    ctx.fillStyle=combo>=25?'#ffe066':'#fff';ctx.fillText(combo+' 콤보',W-pad,top+56);}
  let by=top+44;
  for(const e of enemies)if(e.boss){
    const bw=Math.min(W*.56,300);
    ctx.textAlign='center';ctx.font='900 12px Jua,sans-serif';
    ctx.strokeText(e.boss,W/2,by+8);ctx.fillStyle='#fff';ctx.fillText(e.boss,W/2,by+8);
    ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(W/2-bw/2,by+13,bw,10);
    ctx.fillStyle='#ff3860';ctx.fillRect(W/2-bw/2+1.5,by+14.5,(bw-3)*Math.max(0,e.hp/e.maxhp),7);
    by+=28;}}
// ================= loop =================
let last=0;
function loop(t){
  requestAnimationFrame(loop);
  let dt=Math.min(.04,(t-last)/1000)||0;last=t;
  shake*=Math.pow(.0001,dt);flashR*=Math.pow(.01,dt);flashW*=Math.pow(.01,dt);
  if(state==='countdown'){
    cdT-=dt;
    if(cdT<=0)state='playing';
    else{const n=Math.ceil(cdT);
      if(n!==lastCdN){lastCdN=n;tone(n===1?880:660,.12,'triangle',.18);}}
    draw();
    ctx.fillStyle='rgba(125,125,125,.55)';ctx.fillRect(0,0,W,H);
    if(cdT>0){const n=Math.ceil(cdT),frac=cdT-Math.floor(cdT);
      ctx.save();ctx.translate(W/2,H/2);ctx.scale(1+frac*.4,1+frac*.4);
      ctx.font='900 110px Jua,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=10;ctx.strokeStyle='rgba(40,40,40,.8)';ctx.strokeText(n,0,0);
      ctx.fillStyle='#fff';ctx.fillText(n,0,0);ctx.restore();ctx.textBaseline='alphabetic';}
    return;}
  if(state==='menu'||state==='cutscene'){drawMenuScene(t);return;}
  if(freezeT>0){freezeT-=dt;draw();return;}
  if(hitStop>0){hitStop-=dt;draw();return;}
  let ts=1;
  if(slowT>0){slowT-=dt;ts=.3;}
  if(state==='playing')update(dt*ts);
  draw();}
requestAnimationFrame(loop);
// pleasant storybook backdrop behind menus
let menuClouds=null;
function drawMenuScene(t){
  const tt=t/1000;
  // sky
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#bfe8ff');g.addColorStop(.55,'#dff3c8');g.addColorStop(1,'#9ad36b');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // sun
  ctx.fillStyle='#ffe27a';ctx.beginPath();ctx.arc(W*.82,H*.18,42,0,TAU);ctx.fill();
  ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(W*.82,H*.18,56,0,TAU);ctx.fill();ctx.globalAlpha=1;
  // clouds
  if(!menuClouds){menuClouds=[];let s=5;const sr=()=>{s=(s*16807)%2147483647;return s/2147483647;};
    for(let i=0;i<5;i++)menuClouds.push({x:sr(),y:sr()*.4,s:.7+sr()*.7,sp:.004+sr()*.006});}
  ctx.fillStyle='rgba(255,255,255,.92)';
  for(const c of menuClouds){const cx=((c.x+tt*c.sp)%1.2-.1)*W,cy=c.y*H+30;
    const s=c.s;ctx.beginPath();
    ctx.ellipse(cx,cy,38*s,22*s,0,0,TAU);ctx.ellipse(cx+30*s,cy+6*s,28*s,18*s,0,0,TAU);
    ctx.ellipse(cx-30*s,cy+6*s,26*s,16*s,0,0,TAU);ctx.fill();}
  // rolling hills
  for(let i=0;i<3;i++){ctx.fillStyle=['#86c95f','#73b94e','#5fa83f'][i];
    const baseY=H*(.66+i*.12);
    ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,baseY);
    for(let x=0;x<=W;x+=40)ctx.lineTo(x,baseY+Math.sin(x*.01+i*2)*16);
    ctx.lineTo(W,H);ctx.closePath();ctx.fill();}
  // grass tufts
  ctx.strokeStyle='rgba(70,120,45,.5)';ctx.lineWidth=2;
  for(let i=0;i<14;i++){const x=(i/14+.03)*W,y=H*(.82+(i%3)*.05);
    ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x,y-8);ctx.moveTo(x,y);ctx.lineTo(x,y-10);
    ctx.moveTo(x+3,y);ctx.lineTo(x+4,y-7);ctx.stroke();}
  // the chosen cat, bobbing happily
  if(state==='menu'){const ps=STK[curCat().stk],sc=Math.min(W,H)/200+.4,bob=Math.sin(tt*2.4)*8;
    ctx.globalAlpha=.2;ctx.fillStyle='#3a6b1e';
    ctx.beginPath();ctx.ellipse(W/2,H*.78+18,46*sc,14*sc,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
    ctx.save();ctx.translate(W/2,H*.78-bob);ctx.scale(sc,sc);ctx.rotate(Math.sin(tt*2.4)*.04);
    ctx.drawImage(ps.n,-ps.half,-ps.half);ctx.restore();
    // sparkles
    for(let i=0;i<4;i++){const a=tt*1.2+i*1.57,r=70*sc+Math.sin(tt*3+i)*8;
      ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='16px serif';ctx.textAlign='center';
      ctx.fillText('✦',W/2+Math.cos(a)*r,H*.7+Math.sin(a)*r*.5);}}
}
// ================= level up cards =================
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}
function genCard(boost){
  const tier=rollTier(boost);
  const owned=Object.keys(player.weapons);
  const nonInn=owned.filter(k=>!WDEF[k].innate);
  const opts=[];
  // EVOLUTIONS (highest priority): weapon invested enough & not evolved
  for(const k of owned){const w=player.weapons[k];
    if(w.lvl>=5&&!w.evo&&EVOS[k])for(const ev of EVOS[k])
      opts.push({kind:'evo',key:k,ev,tier:'SS',disp:'SSS',wgt:3.2});}
  // new shared weapons (innates are auto-owned, never offered as "new")
  if(nonInn.length<3)for(const k in WDEF)if(!WDEF[k].innate&&!player.weapons[k])
    opts.push({kind:'new',key:k,tier,wgt:2});
  else for(const k in WDEF)if(!WDEF[k].innate&&!player.weapons[k])
    opts.push({kind:'new',key:k,tier,wgt:.45});
  // variants — SYNERGY: invested weapons weighted higher (build-focusing)
  for(const k of owned){const w=player.weapons[k];if(w.evo)continue;
    for(const v of VARS[k])if(v.t===tier)
      opts.push({kind:'var',key:k,v,tier,wgt:2.6*(1+(w.lvl||0)*.22)});}
  // passives
  for(const k in PASS)if((player.passN[k]||0)<6)
    opts.push({kind:'pass',key:k,tier,wgt:1.5});
  // defensive (revive only at SS roll)
  for(const k in DEFS){const D=DEFS[k];if((player.defN&&player.defN[k]||0)>=D.max)continue;
    if(D.sss){if(tier==='SS')opts.push({kind:'def',key:k,tier:'SS',disp:'SSS',wgt:5});}
    else opts.push({kind:'def',key:k,tier,wgt:1.15});}
  if(!opts.length)return null;
  let tot=0;for(const o of opts)tot+=o.wgt;
  let r=Math.random()*tot;
  for(const o of opts){r-=o.wgt;if(r<=0)return o;}
  return opts[0];}
function cardHTML(p){
  let icon,name,cl,desc;
  if(p.kind==='evo'){const D=WDEF[p.key];
    icon=`<img src="${cvURL(ICONS[D.icon])}">`;
    name=p.ev.n;cl='✦ 최종 진화 ✦';desc=p.ev.d;}
  else if(p.kind==='new'){const D=WDEF[p.key];
    icon=`<img src="${cvURL(ICONS[D.icon])}">`;
    name=D.name;cl='✨ 새 무기!';desc='새로운 무기를 장착한다!';}
  else if(p.kind==='var'){const D=WDEF[p.key];
    icon=`<img src="${cvURL(ICONS[D.icon])}">`;
    name=p.v.n;cl=D.name;desc=p.v.d;}
  else if(p.kind==='def'){const D=DEFS[p.key];
    icon=`<img src="${cvURL(ICONS[D.icon])}">`;
    name=D.name;cl='🛡 방어';desc=D.d(player);}
  else{const D=PASS[p.key];
    icon=`<img src="${cvURL(ICONS[D.icon])}">`;
    name=D.name;cl=p.tier==='SS'?'초월 강화!':p.tier==='S'?'대폭 강화!':'강화';desc=D.d(p.tier);}
  const tb=p.disp||p.tier;
  return `<div class="tb t${p.tier}">${tb}</div>
    <div class="ci">${icon}</div><div class="cn">${name}</div>
    <div class="cl">${cl}</div><div class="cd">${desc}</div>`;}
function applyCard(p){
  if(p.kind==='evo'){const w=player.weapons[p.key];p.ev.fx(w);w.evo=p.ev.id;w.lvl+=4;
    banner(p.ev.n+' 진화!','#ff4f8a',1.6);}
  else if(p.kind==='new'){newWeapon(p.key);
    const w=player.weapons[p.key];
    if(p.tier==='B')w.dmg+=.1;if(p.tier==='A')w.dmg+=.25;
    if(p.tier==='S')w.dmg+=.4;if(p.tier==='SS'){w.dmg+=.4;w.n+=1;}}
  else if(p.kind==='var'){const w=player.weapons[p.key];p.v.fx(w);
    w.lvl=(w.lvl||0)+1;w.pow=(w.pow||0)+({C:1,B:1,A:2,S:3,SS:4}[p.tier]||1);}
  else if(p.kind==='def'){player.defN=player.defN||{};
    player.defN[p.key]=(player.defN[p.key]||0)+1;DEFS[p.key].fx(player);}
  else{const v=PV[p.key][p.tier];
    player.passN[p.key]=(player.passN[p.key]||0)+1;
    if(p.key==='hp'){player.maxhp+=v;
      player.hp=(p.tier==='S'||p.tier==='SS')?player.maxhp:Math.min(player.maxhp,player.hp+v);}
    else if(p.key==='cd')player.cdAcc*=(1-v);
    else player.pass[p.key]+=v;
    recompute();}}
function showLevelup(){
  state='levelup';
  const wrap=$('luCards');wrap.innerHTML='';
  const lucky=midLoot>0;if(lucky)midLoot--;          // midboss reward: boosted tiers
  const lt=document.querySelector('#levelup .lutitle');
  if(lt)lt.textContent=lucky?'⚔ 중간보스 전리품!':'🐾 LEVEL UP!';
  const boost=lucky?.4:0;
  const picks=[],used=new Set();
  const idOf=p=>p.kind+p.key+(p.v?p.v.n:'')+(p.ev?p.ev.id:'');
  for(let i=0;i<3;i++){let p=null;
    for(let tr=0;tr<10;tr++){p=genCard(boost);
      if(p&&!used.has(idOf(p))){used.add(idOf(p));break;}}
    if(p)picks.push(p);}
  if(!picks.length){state='playing';return;}
  picks.forEach((p,i)=>{
    const el=document.createElement('div');
    el.className='card t'+p.tier;
    el.style.animationDelay=(i*.09)+'s';
    el.innerHTML=cardHTML(p);
    el.onclick=()=>{applyCard(p);hide('levelup');sPick();
      if(p.tier==='S'||p.tier==='SS'){sChest();flashW=.7;}
      state='playing';ac();
      if(pendingLv>0)levelDelay=.3;};
    wrap.appendChild(el);});
  show('levelup');}
// ================= chest: pick 1 of 3 face-down =================
let chestPicks=null,chestChosen=null,chestDelay=0;
function openChest(){chestDelay=.7;}
function openChestNow(){
  (function(){
    state='chest';sChest();hide('hudBtns');
    $('chestRow').classList.add('hidden');$('chestClaim').classList.add('hidden');
    $('chestBox').style.display='block';
    show('chest');
    setTimeout(()=>{
      $('chestBox').style.display='none';
      chestPicks=[];chestChosen=null;
      const used=new Set();
      for(let i=0;i<3;i++){
        const tier=Math.random()<.55?'A':Math.random()<.75?'S':'SS';
        let p=null;
        for(let tr=0;tr<8;tr++){p=genCard();
          if(p){p.tier=tier;
            if(p.kind==='var'){ // re-pick variant matching the high tier
              const cand=VARS[p.key].filter(v=>v.t===tier);
              if(cand.length)p.v=cand[(Math.random()*cand.length)|0];
              else p={kind:'pass',key:Object.keys(PASS)[(Math.random()*5)|0],tier};}
            const id=p.kind+p.key+(p.v?p.v.n:'');
            if(!used.has(id)){used.add(id);break;}}}
        if(p)chestPicks.push(p);}
      const row=$('chestRow');row.innerHTML='';
      chestPicks.forEach((p,i)=>{
        const el=document.createElement('div');
        el.className='card back';el.style.animationDelay=(i*.09)+'s';
        el.innerHTML='🐾';
        el.onclick=()=>{if(chestChosen!==null)return;
          chestChosen=i;sPick();
          el.className='card t'+p.tier;el.innerHTML=cardHTML(p);
          setTimeout(()=>{
            chestPicks.forEach((q,j)=>{if(j!==i){
              const o=row.children[j];
              o.className='card dim t'+q.tier;o.innerHTML=cardHTML(q);}});
            $('chestClaim').classList.remove('hidden');},420);};
        row.appendChild(el);});
      row.classList.remove('hidden');},900);})();}
$('chestClaim').onclick=()=>{
  if(chestChosen===null)return;
  applyCard(chestPicks[chestChosen]);
  hide('chest');show('hudBtns');sChest();state='playing';ac();};
// ================= cutscene =================
let cutDone=null;
function showCutscene(){
  state='cutscene';
  const c=$('cutCanvas'),g=c.getContext('2d');
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,480,250);
  // sky+ground
  g.fillStyle=SKYS[ST.bg];g.fillRect(0,0,480,250);
  g.globalAlpha=.9;g.drawImage(BGS[ST.bg],0,60,420,420,0,60,480,190);g.globalAlpha=1;
  g.fillStyle='rgba(255,255,255,.7)';
  g.beginPath();g.ellipse(80,40,34,14,0,0,TAU);g.ellipse(110,44,26,11,0,0,TAU);g.fill();
  g.beginPath();g.ellipse(360,30,30,12,0,0,TAU);g.fill();
  // ribbon
  g.fillStyle='#5a4632';g.fillRect(0,0,480,30);
  g.fillStyle='#fff';g.font='900 15px Jua,sans-serif';g.textAlign='center';
  g.fillText('STAGE '+stage+' · '+ST.icon+' '+ST.n,240,20);
  // actors
  const catS=STK[curCat().stk],vilS=STK[ST.vil];
  g.save();g.translate(105,185);g.scale(1.5,1.5);
  g.drawImage(catS.n,-catS.half,-catS.half);g.restore();
  g.save();g.translate(375,178);g.scale(-1.7,1.7);
  g.drawImage(vilS.n,-vilS.half,-vilS.half);g.restore();
  // bubbles
  bubble(g,255,62,205,46,ST.vline,340,108,'#fff');
  bubble(g,18,98,195,44,ST.cline,95,150,'#fff8d8');
  function bubble(g,x,y,w,h,txt,tx,ty,col){
    g.fillStyle=col;g.strokeStyle='#5a4632';g.lineWidth=3;
    g.beginPath();
    const r=12;
    g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
    g.fill();g.stroke();
    g.beginPath();g.moveTo(tx-8,y+h-2);g.lineTo(tx+8,y+h-2);g.lineTo(tx,ty);g.closePath();
    g.fill();g.strokeStyle='#5a4632';g.stroke();
    g.fillStyle='#4a3b2a';g.font='800 12.5px Jua,sans-serif';g.textAlign='center';
    wrapText(g,txt,x+w/2,y+h/2-2,w-16,15);}
  function wrapText(g,txt,x,y,maxW,lh){
    const words=txt.split(' ');let line='',lines=[];
    for(const w of words){const t=line?line+' '+w:w;
      if(g.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;}
    lines.push(line);
    const y0=y-(lines.length-1)*lh/2+4;
    lines.forEach((l,i)=>g.fillText(l,x,y0+i*lh));}
  show('cut');}
$('cut').addEventListener('pointerdown',()=>{
  if(state!=='cutscene')return;
  hide('cut');state='playing';ac();sMeow();
  banner('STAGE '+stage+' · '+ST.n+' '+ST.icon,'#fff',1.8);
  if(masterMode)setTimeout(()=>{if(state==='playing')banner('🔥 달인 고양이 모드!! 조심하라냥','#ff5f3c',2);},700);
  if(cutDone){cutDone();cutDone=null;}});
// ================= run start =================
function startStage(n){
  stage=n;ST=STAGES[n-1];
  masterMode=masterSel&&SV.master;
  resetRun();ac();
  hide('menu');hide('results');show('hudBtns');
  setSong(ST.bg);
  showCutscene();}
// ================= menu =================
function nav(scr){
  for(const s of['scrHome','scrStage','scrShop','scrCats','scrCode'])hide(s);
  show(scr);refreshMenu();}
function refreshMenu(){
  $('nickLabel').textContent='🐱 '+(SV.name||'고양이')+'냥';
  for(const id of['coinLabel','coinLabel2','coinLabel3','coinLabel4'])
    $(id).textContent='🪙 '+SV.coins;
  // home cat preview
  const hc=$('homeCat');hc.innerHTML='';
  const img=document.createElement('img');
  img.src=cvURL(STK[curCat().stk].n);img.width=84;img.height=84;
  hc.appendChild(img);
  $('btnPlay').disabled=!SV.owned.length;
  $('btnPlay').textContent=SV.owned.length?'▶ 모험 떠나기':'먼저 고양이를 영입하자!';
  // master-mode toggle (after clearing all 8)
  let mt=$('masterToggle');
  if(SV.master){
    if(!mt){mt=document.createElement('button');mt.id='masterToggle';mt.className='big';
      $('stageGrid').parentNode.insertBefore(mt,$('stageGrid'));}
    mt.style.display='block';
    mt.textContent=masterSel?'🔥 달인 고양이 모드: ON (몹 진화·장애물 강화)':'😺 일반 모드 (탭해서 달인 모드)';
    mt.style.background=masterSel?'linear-gradient(180deg,#ff5f3c,#c0392b)':'';
    mt.onclick=()=>{masterSel=!masterSel;sPick();refreshMenu();};
  }else if(mt)mt.style.display='none';
  // stages
  const sg=$('stageGrid');sg.innerHTML='';
  STAGES.forEach((st,i)=>{
    const n=i+1,unlocked=n<=SV.maxStage;
    const ck=(masterSel?'m':'')+n;
    const el=document.createElement('div');
    el.className='stg'+(unlocked?'':' lock')+(n===stage?' cur':'');
    el.innerHTML=`<div class="si">${unlocked?st.icon:'🔒'}</div>
      <div class="sn">${n}. ${st.n}</div>
      <div class="sc">${SV.clears[ck]?'✔ '+fmtT(SV.clears[ck]):''}</div>`;
    el.onclick=()=>{if(!unlocked){sHiss();toast('이전 스테이지를 먼저 클리어!');return;}
      stage=n;ST=STAGES[n-1];sPick();refreshMenu();
      $('stageDesc').innerHTML='<b>'+st.icon+' '+st.n+'</b> — '+st.d+'<br>👹 보스: '+(st.boss==='duo'?'파리&모기 범죄듀오':MOB[st.boss].boss);};
    sg.appendChild(el);});
  $('stageDesc').innerHTML='<b>'+ST.icon+' '+ST.n+'</b> — '+ST.d+'<br>👹 보스: '+(ST.boss==='duo'?'파리&모기 범죄듀오':MOB[ST.boss].boss);
  // shop
  const sl=$('shopList');sl.innerHTML='';
  for(const u of UPS){
    const lv=SV.up[u.k]||0,maxed=lv>=u.max,cost=maxed?0:u.cost(lv);
    const row=document.createElement('div');row.className='uprow';
    let pips='';for(let i=0;i<u.max;i++)pips+=`<div class="pip${i<lv?' on':''}"></div>`;
    row.innerHTML=`<div class="ui">${u.icon}</div>
      <div class="ut"><div class="un">${u.name}</div><div class="ud">${u.d}</div>
      <div class="pips">${pips}</div></div>`;
    const btn=document.createElement('button');
    btn.textContent=maxed?'MAX':'🪙'+cost;
    btn.disabled=maxed||SV.coins<cost;
    btn.onclick=()=>{if(maxed||SV.coins<cost)return;
      SV.coins-=cost;SV.up[u.k]=lv+1;save();sCoin();refreshMenu();};
    row.appendChild(btn);sl.appendChild(row);}
  // cats
  const cg=$('catGrid');cg.innerHTML='';
  for(const c of CATS){
    const has=SV.owned.includes(c.key);
    const el=document.createElement('div');
    el.className='cat'+(SV.cat===c.key&&has?' sel':'')+(has?'':' locked');
    el.innerHTML=`<img src="${cvURL(STK[c.stk].n)}" width="64" height="64">
      <div class="cn2">${c.name}</div><div class="cp">${c.perk}</div>
      <div class="price">${has?(SV.cat===c.key?'✔ 출전 중':'선택'):(c.price?'🪙'+c.price:'무료 영입!')}</div>`;
    el.onclick=()=>{ac();
      if(has){SV.cat=c.key;save();sPick();refreshMenu();}
      else if(SV.coins>=c.price){SV.coins-=c.price;SV.owned.push(c.key);SV.cat=c.key;save();
        sChest();refreshMenu();toast(c.name+' 영입 완료! 🎉');}
      else{sHiss();toast('코인 부족! 🪙'+(c.price-SV.coins)+' 더 필요');}};
    cg.appendChild(el);}
  $('codeText').value=expCode();}
$('btnPlay').onclick=()=>nav('scrStage');
$('btnShop').onclick=()=>nav('scrShop');
$('btnCats').onclick=()=>nav('scrCats');
$('btnCode').onclick=()=>nav('scrCode');
for(const b of document.querySelectorAll('.backBtn'))b.onclick=()=>nav('scrHome');
$('stageGo').onclick=()=>{if(!SV.owned.length){toast('먼저 고양이를 영입하자!');nav('scrCats');return;}
  startStage(stage);};
$('btnInvite').onclick=async()=>{
  const txt='🐱 냥냥 서바이버 — 귀여운 고양이로 동네 악당을 혼내주는 게임! 같이 하자냥 → '+location.href;
  try{if(navigator.share){await navigator.share({text:txt});return;}
    await navigator.clipboard.writeText(txt);toast('초대 링크 복사 완료! 📋');}catch(e){}};
$('codeCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('codeText').value);
  toast('코드 복사 완료! 📋');}catch(e){}};
$('codeImport').onclick=()=>{
  if(impCode($('codeInput').value)){toast('불러오기 성공! 🎉');refreshMenu();}
  else toast('코드가 올바르지 않아요 😿');};
// results buttons
$('rRetry').onclick=()=>{hide('results');startStage(stage);};
$('rNext').onclick=()=>{hide('results');startStage(Math.min(STAGES.length,stage+1));};
$('rHome').onclick=()=>{hide('results');show('menu');state='menu';nav('scrHome');};
// pause
function pauseGame(){if(state!=='playing')return;state='paused';show('pauseOv');}
function resumeGame(){if(state!=='paused')return;
  hide('pauseOv');ac();state='countdown';cdT=3;lastCdN=0;}
$('pResume').onclick=resumeGame;
$('pQuit').onclick=()=>{hide('pauseOv');hide('hudBtns');show('menu');state='menu';save();nav('scrHome');};
$('hudPause').onclick=()=>{if(state==='playing')pauseGame();};
function toggleMute(){SV.mute=!SV.mute;save();
  if(master)master.gain.value=SV.mute?0:.55;
  $('hudMute').textContent=SV.mute?'🔇':'🔊';}
$('hudMute').onclick=toggleMute;
$('hudMute').textContent=SV.mute?'🔇':'🔊';
// ================= input =================
addEventListener('keydown',e=>{keys[e.key]=true;
  if(e.key==='p'||e.key==='P'||e.key==='Escape'){if(state==='playing')pauseGame();else if(state==='paused')resumeGame();}
  if(e.key==='m'||e.key==='M')toggleMute();
  if(e.key===' '){e.preventDefault();useSkill();}});
addEventListener('keyup',e=>{keys[e.key]=false;});
cv.addEventListener('pointerdown',e=>{ac();
  if(state!=='playing')return;
  if(player.skill){const b={x:66,y:H-92,r:48};
    if(dist2(e.clientX,e.clientY,b.x,b.y)<b.r*b.r){useSkill();return;}}
  if(joy.id!==-1)return;
  joy.on=true;joy.id=e.pointerId;joy.ax=e.clientX;joy.ay=e.clientY;joy.dx=0;joy.dy=0;});
addEventListener('pointermove',e=>{
  if(!joy.on||e.pointerId!==joy.id)return;
  let dx=e.clientX-joy.ax,dy=e.clientY-joy.ay;const d=Math.hypot(dx,dy);
  if(d<8){joy.dx=0;joy.dy=0;return;}
  if(d>56){joy.ax=e.clientX-dx/d*56;joy.ay=e.clientY-dy/d*56;dx=dx/d*56;dy=dy/d*56;}
  joy.dx=dx/56;joy.dy=dy/56;});
const endJoy=e=>{if(e.pointerId===joy.id){joy.on=false;joy.id=-1;joy.dx=0;joy.dy=0;}};
addEventListener('pointerup',endJoy);addEventListener('pointercancel',endJoy);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state==='playing')pauseGame();save();}});
addEventListener('pagehide',save);
document.addEventListener('contextmenu',e=>e.preventDefault());
// ================= boot =================
resetRun(); // so draw() has a player even in menu
if(!SV.name){show('login');hide('menu');
  $('loginGo').onclick=()=>{const v=$('loginName').value.trim()||'알파';
    SV.name=v.slice(0,8);save();hide('login');show('menu');nav('scrHome');sMeow();ac();};}
else nav('scrHome');
