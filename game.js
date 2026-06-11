'use strict';
// ================= canvas =================
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);}
addEventListener('resize',resize);resize();
const $=id=>document.getElementById(id);
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy};
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;

// ================= save / profile =================
const SVKEY='nyang_v3';
let SV={name:'',coins:0,owned:[],cat:'a',up:{hp:0,dmg:0,spd:0,mag:0,coin:0,luck:0},maxStage:1,clears:{},mute:false};
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
let AC=null,master=null,musicG=null;
function ac(){if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=SV.mute?0:.55;master.connect(AC.destination);
  musicG=AC.createGain();musicG.gain.value=.5;musicG.connect(master);
  ac.nb=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
  const d=ac.nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  if(AC.state==='suspended')AC.resume();return AC;}
function tone(f,dur,type,vol,slide){try{const a=ac(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime;
  o.type=type;o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(1,slide),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur);}catch(e){}}
function noise(dur,vol,freq,type){try{const a=ac(),s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(),t=a.currentTime;
  s.buffer=ac.nb;s.loop=true;f.type=type||'highpass';f.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur);}catch(e){}}
function sMeow(){try{const a=ac(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime;
  o.type='sine';o.frequency.setValueAtTime(470,t);
  o.frequency.linearRampToValueAtTime(840,t+.12);o.frequency.linearRampToValueAtTime(350,t+.3);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.22,t+.05);g.gain.linearRampToValueAtTime(.0001,t+.32);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+.33);}catch(e){}}
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
// --- happy village bgm ---
const MELO=[523,0,587,0,659,0,523,0, 659,0,587,0,523,0,392,0,
            440,0,523,0,587,0,659,0, 587,0,523,0,440,0,392,0];
const BROOT=[130.81,98,110,98];
let mStep=0,mNext=0;
setInterval(()=>{
  if(!AC||SV.mute||state!=='playing')return;
  const SPB=60/100/4;
  if(mNext<AC.currentTime)mNext=AC.currentTime+.05;
  while(mNext<AC.currentTime+.15){
    const s=mStep%32,t=mNext;
    if(s%8===0){const o=AC.createOscillator(),g=AC.createGain();o.type='sine';
      o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(50,t+.09);
      g.gain.setValueAtTime(.3,t);g.gain.exponentialRampToValueAtTime(.001,t+.11);
      o.connect(g);g.connect(musicG);o.start(t);o.stop(t+.12);}
    if(s%8===0||s%8===4){const o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();
      o.type='triangle';o.frequency.value=BROOT[(s/8|0)%4];
      f.type='lowpass';f.frequency.value=500;
      g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.26);
      o.connect(f);f.connect(g);g.connect(musicG);o.start(t);o.stop(t+.28);}
    if(s%4===2){const src=AC.createBufferSource(),g=AC.createGain(),f=AC.createBiquadFilter();
      src.buffer=ac.nb;f.type='highpass';f.frequency.value=9000;
      g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.001,t+.04);
      src.connect(f);f.connect(g);g.connect(musicG);src.start(t);src.stop(t+.05);}
    const m=MELO[s];
    if(m){const g=AC.createGain();
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.16,t+.03);
      g.gain.exponentialRampToValueAtTime(.001,t+.42);g.connect(musicG);
      const o=AC.createOscillator();o.type='sine';o.frequency.value=m;o.connect(g);o.start(t);o.stop(t+.45);
      const o2=AC.createOscillator(),g2=AC.createGain();o2.type='triangle';o2.frequency.value=m/2;
      g2.gain.value=.35;o2.connect(g2);g2.connect(g);o2.start(t);o2.stop(t+.45);}
    mStep++;mNext+=SPB;}
},30);

// ================= cats =================
const CATS=[
  {key:'a',stk:'cat_a',name:'알파냥',innate:'wave',price:0,
   perk:'통통 노랑 줄무늬<br>🐾 파동 펀치: 넓게 3발, 관통',hp:100,spd:180,mod:p=>{}},
  {key:'b',stk:'cat_b',name:'까칠냥',innate:'claw',price:150,
   perk:'삼색 까칠보스<br>🩸 흡혈 발톱: 근접 휘두르고 회복',hp:115,spd:195,mod:p=>{p.dmgBase*=1.1;}},
  {key:'c',stk:'cat_c',name:'신사냥',innate:'rose',price:300,
   perk:'가면의 신사<br>🌹 장미 저격: 한 발이 묵직, 보스 특효',hp:90,spd:185,mod:p=>{}},
  {key:'d',stk:'cat_d',name:'민첩냥',innate:'rapid',price:500,
   perk:'바람의 회색 머리<br>💨 속사: 빠른 연사 + 빠른 발',hp:80,spd:225,mod:p=>{p.cdAcc*=.92;}},
];
const INNATE={
  wave:{name:'파동 펀치',cd:.95,fire(p){const t=nearTgt(760);if(!t)return false;
    const base=Math.atan2(t.y-p.y,t.x-p.x);
    for(let i=-1;i<=1;i++){const a=base+i*.38;
      bullets.push({kind:'wave',x:p.x,y:p.y,vx:Math.cos(a)*300,vy:Math.sin(a)*300,
        dmg:(11+p.level*.6)*p.dmgMul,r:17,life:1.5,pierce:3,rot:a,spr:'wave'});}
    sShot();return true;}},
  claw:{name:'흡혈 발톱',cd:.5,fire(p){const t=nearTgt(120);
    const a=t?Math.atan2(t.y-p.y,t.x-p.x):Math.atan2(p.fy||0,p.fx||1);
    let hitN=0;
    for(const e of enemies)if(dist2(p.x,p.y,e.x,e.y)<88*88){
      const ea=Math.atan2(e.y-p.y,e.x-p.x);
      let da=Math.abs(ea-a);da=Math.min(da,TAU-da);
      if(da<1.15){const d=(9+p.level*.55)*p.dmgMul;damageEnemy(e,d,p.x,p.y);hitN++;
        p.hp=Math.min(p.maxhp,p.hp+d*.15);}}
    if(hitN||t){fxs.push({kind:'claw',x:p.x,y:p.y,ang:a,t:0});noise(.05,.07,3000);return true;}
    return false;}},
  rose:{name:'장미 저격',cd:1.3,fire(p){const t=nearTgt(820);if(!t)return false;
    const a=Math.atan2(t.y-p.y,t.x-p.x);
    bullets.push({kind:'rose',x:p.x,y:p.y,vx:Math.cos(a)*740,vy:Math.sin(a)*740,
      dmg:(30+p.level*1.6)*p.dmgMul,r:9,life:1.4,pierce:0,rot:a,spr:'rose',bossMul:1.7});
    tone(840,.08,'triangle',.1,420);return true;}},
  rapid:{name:'속사',cd:.2,fire(p){const t=nearTgt(700);if(!t)return false;
    const a=Math.atan2(t.y-p.y,t.x-p.x)+rnd(-.09,.09);
    bullets.push({kind:'rapid',x:p.x,y:p.y,vx:Math.cos(a)*640,vy:Math.sin(a)*640,
      dmg:(5+p.level*.32)*p.dmgMul,r:5,life:1.2,pierce:0,rot:a,spr:'rapid'});
    sShot();return true;}},
};
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
const WDEF={
  paw:{name:'냥냥펀치',icon:'paw',base:{cd:.5,dmg:8}},
  yarn:{name:'털뭉치 폭탄',icon:'yarn',base:{cd:1.7,dmg:15}},
  fish:{name:'빙글 생선',icon:'fish',base:{cd:0,dmg:7}},
  bolt:{name:'정전기 찌릿',icon:'bolt',base:{cd:2.0,dmg:12}},
  nova:{name:'대왕 하악질',icon:'nova',base:{cd:3.2,dmg:14}},
};
const VARS={
  paw:[
    {t:'C',n:'단단한 발바닥',d:'펀치 공격력 +15%',fx:w=>w.dmg+=.15},
    {t:'C',n:'빠른 잽',d:'펀치 연사 +12%',fx:w=>w.rate+=.12},
    {t:'B',n:'냥냥 더블',d:'펀치 +1발',fx:w=>w.n+=1},
    {t:'B',n:'관통권',d:'펀치 관통 +1',fx:w=>w.pierce+=1},
    {t:'A',n:'냥냥 러시',d:'펀치 +2발',fx:w=>w.n+=2},
    {t:'A',n:'분노의 발바닥',d:'펀치 공격력 +40%',fx:w=>w.dmg+=.4},
    {t:'S',n:'왕발바닥',d:'펀치 크기 +60% & 관통 +2',fx:w=>{w.size+=.6;w.pierce+=2;}},
    {t:'SS',n:'백만냥 펀치',d:'발사 때마다 360° 8연발 추가!',fx:w=>w.sp.ring=1},
  ],
  yarn:[
    {t:'C',n:'꽉 감은 털실',d:'털뭉치 공격력 +15%',fx:w=>w.dmg+=.15},
    {t:'C',n:'펑펑 털실',d:'폭발 범위 +25%',fx:w=>w.size+=.25},
    {t:'B',n:'털뭉치 +1',d:'털뭉치 +1개',fx:w=>w.n+=1},
    {t:'B',n:'찰떡 유도',d:'유도 성능 & 속도 UP',fx:w=>w.rate+=.2},
    {t:'A',n:'털뭉치 +2',d:'털뭉치 +2개',fx:w=>w.n+=2},
    {t:'A',n:'빨간 털뭉치',d:'공격력 +50%, 새빨개진다!',fx:w=>{w.dmg+=.5;w.sp.red=1;}},
    {t:'S',n:'왕털뭉치',d:'크기 +80% & 공격력 +30%',fx:w=>{w.size+=.8;w.dmg+=.3;}},
    {t:'SS',n:'털뭉치 포탑',d:'폭발 자리에 3초간 자동포탑 설치!',fx:w=>w.sp.turret=1},
  ],
  fish:[
    {t:'C',n:'싱싱한 생선',d:'생선 공격력 +15%',fx:w=>w.dmg+=.15},
    {t:'C',n:'회오리 회전',d:'회전 속도 +15%',fx:w=>w.rate+=.15},
    {t:'B',n:'생선 +1',d:'생선 +1마리',fx:w=>w.n+=1},
    {t:'B',n:'대왕 생선',d:'생선 크기 +25%',fx:w=>w.size+=.25},
    {t:'A',n:'생선 +2',d:'생선 +2마리',fx:w=>w.n+=2},
    {t:'A',n:'가시 돋친 생선',d:'생선 공격력 +40%',fx:w=>w.dmg+=.4},
    {t:'S',n:'상어 진화',d:'크기 +60% & 공격력 +40%',fx:w=>{w.size+=.6;w.dmg+=.4;w.sp.shark=1;}},
    {t:'SS',n:'가시복어',d:'생선이 적을 칠 때 가시 4발 발사!',fx:w=>w.sp.spike=1},
  ],
  bolt:[
    {t:'C',n:'찌릿 강화',d:'번개 공격력 +15%',fx:w=>w.dmg+=.15},
    {t:'C',n:'골골 충전',d:'번개 쿨다운 -12%',fx:w=>w.rate+=.12},
    {t:'B',n:'연쇄 +1',d:'번개 연쇄 +1',fx:w=>w.n+=1},
    {t:'B',n:'마비 전류',d:'맞은 적 0.4초 마비',fx:w=>w.sp.stun=1},
    {t:'A',n:'연쇄 +2',d:'번개 연쇄 +2',fx:w=>w.n+=2},
    {t:'A',n:'고압 전류',d:'번개 공격력 +40%',fx:w=>w.dmg+=.4},
    {t:'S',n:'과부하',d:'공격력 +60% & 쿨다운 -15%',fx:w=>{w.dmg+=.6;w.rate+=.15;}},
    {t:'SS',n:'천둥 군주',d:'타격 지점마다 낙뢰 폭발 추가!',fx:w=>w.sp.boom=1},
  ],
  nova:[
    {t:'C',n:'하악 강화',d:'하악질 공격력 +15%',fx:w=>w.dmg+=.15},
    {t:'C',n:'분노 충전',d:'하악질 쿨다운 -12%',fx:w=>w.rate+=.12},
    {t:'B',n:'우렁찬 하악',d:'범위 +20%',fx:w=>w.size+=.2},
    {t:'B',n:'밀어내기',d:'넉백 강화 & 공격력 +10%',fx:w=>{w.dmg+=.1;w.sp.knock=1;}},
    {t:'A',n:'대형 하악',d:'범위 +30% & 공격력 +20%',fx:w=>{w.size+=.3;w.dmg+=.2;}},
    {t:'A',n:'속사포 하악',d:'쿨다운 -25%',fx:w=>w.rate+=.25},
    {t:'S',n:'더블 하악',d:'하악질이 2연발로!',fx:w=>w.sp.dbl=1},
    {t:'SS',n:'메아리 하악',d:'1초 후 같은 자리에 1.5배 2차 폭발!',fx:w=>w.sp.echo=1},
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
function rollTier(){let r=Math.random()-SV.up.luck*.05;
  return r<.45?'C':r<.74?'B':r<.9?'A':r<.975?'S':'SS';}
// ================= skills (global actives) =================
const SKILLS={
  nuke:{stk:'it_nuke',name:'묘신의 주먹',uses:1,d:'맵 전체 대피해!'},
  bolt:{stk:'it_bolt',name:'천벌 냥뢰',uses:2,d:'모든 적에게 낙뢰!'},
  frz:{stk:'it_frz',name:'전국민 낮잠',uses:1,d:'8초 수면 + 받는 피해 1.5배'},
  hole:{stk:'it_hole',name:'참치 블랙홀',uses:1,d:'적을 빨아들여 폭발!'},
};
const SKILL_KEYS=Object.keys(SKILLS);
// ================= stages =================
const STAGES=[
  {n:'동네 풀밭',icon:'🌼',shape:{k:'rect',w:1500,h:1100},bg:0,mobs:[['mouse',5],['slime',2.5]],
   boss:'boar',elite:'slime',bossAt:40,d:'포근한 풀밭. 낮잠 자기 딱 좋은데…',
   vil:'boar',vline:'꿀꿀! 여긴 이제 멧돼지님 구역이다!',cline:'낮잠 방해한 죄… 무겁다냥!'},
  {n:'골목 주차장',icon:'🅿️',shape:{k:'rect',w:1800,h:900},bg:1,mobs:[['mouse',4],['pigeon',3],['fly',2.5]],
   boss:'topgun',elite:'pigeon',bossAt:42,d:'비둘기파가 점령한 주차장.',
   vil:'topgun',vline:'구구! 여긴 비둘기파 구역이다!',cline:'주차위반이다냥. 견인해주마!'},
  {n:'놀이터 모래밭',icon:'🏖️',shape:{k:'circ',R:720},bg:2,mobs:[['frog',3],['slime',3],['wasp',2]],
   boss:'frogq',elite:'frog',bossAt:45,d:'모래밭이 끈적끈적해졌다…!',
   vil:'frogq',vline:'개굴~ 모래성은 이 여왕님 것!',cline:'모래밭은 모두의 것이다냥!'},
  {n:'시장 골목',icon:'🧺',shape:{k:'rect',w:2100,h:680},bg:3,mobs:[['mouse',3],['hedge',2.5],['mosq',2.5],['fly',2]],
   boss:'duo',elite:'wasp',bossAt:48,d:'좁고 긴 골목. 도망칠 곳이 없다!',
   vil:'flyB',vline:'위이잉~ 시장 보호비 내놔라!',cline:'양아치들은 퇴치한다냥!'},
  {n:'아파트 옥상',icon:'🌆',shape:{k:'rect',w:1100,h:1100},bg:4,mobs:[['pigeon',3.5],['dande',2],['wasp',2.5]],
   boss:'racc',elite:'dande',bossAt:48,d:'노을 지는 옥상. 쓰레기 냄새가 난다.',
   vil:'racc',vline:'크큭, 내 보물(쓰레기)들을 노리러 왔나?',cline:'분리수거 해주마냥!'},
  {n:'하수도',icon:'🕳️',shape:{k:'ring',R:760,r:280},bg:5,mobs:[['slime',3],['snake',1.5],['fly',2.5],['mosq',2]],
   boss:'snakeK',elite:'mouse',bossAt:52,d:'빙글 도는 둥근 하수도. 미끌미끌!',
   vil:'snakeK',vline:'쉬익… 내 영역에 들어왔구나…',cline:'으, 미끌거린다냥! 빨리 끝내자!'},
  {n:'뒷산 오솔길',icon:'🌲',shape:{k:'rect',w:2300,h:620},bg:6,mobs:[['hedge',3],['frog',2.5],['snake',1.5],['wasp',2]],
   boss:'dogB',elite:'hedge',bossAt:52,d:'정상으로 가는 마지막 길목.',
   vil:'dogB',vline:'멍멍! 이 길은 못 지나간다!',cline:'산책 중이다냥. 비켜라!'},
  {n:'뒷산 정상',icon:'🌙',shape:{k:'circ',R:680},bg:7,mobs:[['mouse',3],['wasp',2.5],['hedge',2],['dande',1.5],['snake',1.5]],
   boss:'mage',elite:'snake',bossAt:55,d:'모든 악당의 우두머리가 기다린다…',
   vil:'mage',vline:'찍찍… 용케 왔군. 이 몸이 동네의 새 주인이다!',cline:'동네는 못 넘본다냥. 끝장이다냥!!'},
];
const MOB={
  mouse:{stk:'mouse',r:14,hp:8,sp:64,xp:1,dmg:7,beh:'chase'},
  slime:{stk:'slime',r:16,hp:11,sp:58,xp:1,dmg:8,beh:'split'},
  slimeS:{stk:'slimeS',r:10,hp:4,sp:92,xp:1,dmg:6,beh:'chase'},
  fly:{stk:'fly',r:11,hp:4,sp:104,xp:1,dmg:6,beh:'chase'},
  mosq:{stk:'mosq',r:12,hp:6,sp:124,xp:1,dmg:7,beh:'dart'},
  pigeon:{stk:'pigeon',r:14,hp:9,sp:0,xp:1,dmg:8,beh:'swoop'},
  frog:{stk:'frog',r:16,hp:12,sp:0,xp:2,dmg:9,beh:'hop'},
  wasp:{stk:'wasp',r:13,hp:8,sp:106,xp:1,dmg:9,beh:'fuse'},
  hedge:{stk:'hedge',r:15,hp:13,sp:68,xp:2,dmg:11,beh:'rush'},
  snake:{stk:'snake',r:18,hp:22,sp:54,xp:3,dmg:11,beh:'eat',coin:2},
  dande:{stk:'dande',r:17,hp:14,sp:0,xp:2,dmg:8,beh:'turret'},
  boar:{stk:'boar',r:36,hp:280,sp:55,xp:10,dmg:15,beh:'boar',boss:'돌격대장 멧돼지'},
  topgun:{stk:'topgun',r:32,hp:380,sp:0,xp:10,dmg:13,beh:'topgun',boss:'탑건 비둘기'},
  frogq:{stk:'frogq',r:40,hp:460,sp:0,xp:12,dmg:15,beh:'frogq',boss:'슬라임퀸 개구리'},
  flyB:{stk:'flyB',r:30,hp:300,sp:80,xp:8,dmg:12,beh:'flyB',boss:'파리형님'},
  mosqB:{stk:'mosqB',r:28,hp:260,sp:0,xp:8,dmg:11,beh:'mosqB',boss:'모기아우'},
  racc:{stk:'racc',r:38,hp:560,sp:44,xp:14,dmg:14,beh:'racc',boss:'쓰레기왕 너구리'},
  snakeK:{stk:'snakeK',r:42,hp:650,sp:50,xp:16,dmg:14,beh:'snakeK',boss:'구렁이왕'},
  dogB:{stk:'dogB',r:40,hp:720,sp:58,xp:16,dmg:15,beh:'dogB',boss:'들개대장 불독'},
  mage:{stk:'mage',r:38,hp:900,sp:38,xp:20,dmg:14,beh:'mage',boss:'대마법사 생쥐'},
};
// ================= run state =================
let state='menu',stage=1,ST=STAGES[0];
let gTime=0,kills=0,combo=0,comboT=0,maxCombo=0,lastMile=0,runCoins=0;
let player=null,enemies=[],bullets=[],ebullets=[],gems=[],coinDrops=[],drops=[],parts=[],floaters=[],fxs=[],banners=[],zones=[],turrets=[];
let cam={x:0,y:0},shake=0,freezeT=0,slowT=0,flashR=0,flashW=0;
let spawnT=0,pendingLv=0,levelDelay=0,fishAng=0,walkT=0,tutT=4;
let bossOn=false,bossDone=false,eliteDone=false,frzT=0,skillCd=0,cdT=0,lastCdN=0,echoQ=[];
let joy={on:false,id:-1,ax:0,ay:0,dx:0,dy:0};
const keys={};
function curCat(){return CATS.find(c=>c.key===SV.cat)||CATS[0];}
function resetRun(){
  const c=curCat();
  player={x:0,y:0,hp:c.hp+SV.up.hp*12,maxhp:c.hp+SV.up.hp*12,r:14,
    speed:c.spd*(1+SV.up.spd*.04),baseSpeed:c.spd*(1+SV.up.spd*.04),
    magnet:95*(1+SV.up.mag*.18),dmgMul:1,dmgBase:1+SV.up.dmg*.05,cdMul:1,cdAcc:1,
    level:1,xp:0,xpNext:5,iT:0,face:1,fx:1,fy:0,shieldT:0,innT:0,
    weapons:{},pass:{spd:0,mag:0,dmg:0},passN:{},skill:null,stk:c.stk,innate:c.innate};
  c.mod(player);recompute();
  enemies=[];bullets=[];ebullets=[];gems=[];coinDrops=[];drops=[];parts=[];floaters=[];fxs=[];banners=[];zones=[];turrets=[];
  gTime=0;kills=0;combo=0;comboT=0;maxCombo=0;lastMile=0;runCoins=0;
  cam={x:0,y:0};shake=0;freezeT=0;slowT=0;flashR=0;flashW=0;spawnT=.5;
  pendingLv=0;levelDelay=0;walkT=0;tutT=4;gemStreak=0;
  bossOn=false;bossDone=false;eliteDone=false;frzT=0;skillCd=0;echoQ=[];}
function recompute(){
  player.speed=player.baseSpeed*(1+player.pass.spd);
  player.magnet=95*(1+SV.up.mag*.18)*(1+player.pass.mag);
  player.dmgMul=player.dmgBase*(1+player.pass.dmg);
  player.cdMul=player.cdAcc;}
// ================= helpers =================
function burst(x,y,cols,n,sp){if(parts.length>480)return;
  for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(1,sp||7);
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.5,1),col:cols[(Math.random()*cols.length)|0],sz:rnd(3,6)});}}
function puff(x,y,n){if(parts.length>480)return;
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
function arenaSpot(minD,maxD){const s=ST.shape;
  for(let i=0;i<24;i++){let x,y;
    if(s.k==='rect'){x=rnd(-s.w/2+40,s.w/2-40);y=rnd(-s.h/2+40,s.h/2-40);}
    else{const a=rnd(0,TAU),R=s.k==='circ'?rnd(0,s.R-40):rnd(s.r+40,s.R-40);
      x=Math.cos(a)*R;y=Math.sin(a)*R;}
    const d=Math.hypot(x-player.x,y-player.y);
    if(d>=minD&&d<=maxD)return{x,y};}
  return {x:player.x+rnd(-300,300),y:player.y+rnd(-300,300)};}
// ================= spawning =================
function mobHpMul(){return 1+(stage-1)*.5+gTime*.006;}
function spawnEnemy(type,ax,ay){
  if(enemies.length>150)return null;
  const d=MOB[type];let x=ax,y=ay;
  if(x===undefined){const p=arenaSpot(280,560);x=p.x;y=p.y;}
  const e={type,stk:d.stk,x,y,r:d.r,hp:d.hp*(d.boss?(1+(stage-1)*.15):mobHpMul()),
    maxhp:0,sp:d.sp,xp:d.xp,dmg:d.dmg,coin:d.coin||0,beh:d.beh,boss:d.boss||null,
    flash:0,bIT:0,wob:rnd(0,TAU),kx:0,ky:0,st:{},vx:0,vy:0,meals:0,scale:1,face:1,stun:0,elite:false};
  e.maxhp=e.hp;clampArena(e,e.r);enemies.push(e);return e;}
function spawnElite(type){
  const e=spawnEnemy(type);if(!e)return;
  e.elite=true;e.hp*=10;e.maxhp=e.hp;e.scale=1.9;e.dmg+=4;e.xp=20;e.sp*=.85;e.coin+=3;
  sWarn();banner('👑 정예 몬스터 출현!','#ffd23e',1.6);return e;}
function spawnBoss(){
  bossOn=true;sWarn();
  for(const o of enemies.slice())if(!o.boss){dropGem(o.x,o.y,o.xp);puff(o.x,o.y,3);
    enemies.splice(enemies.indexOf(o),1);}
  const key=ST.boss;
  banner('👹 BOSS! '+(key==='duo'?'파리&모기 범죄듀오':MOB[key].boss),'#ff3860',2);
  if(key==='duo'){const a=spawnEnemy('flyB',player.x+260,player.y-120);
    const b=spawnEnemy('mosqB',player.x-260,player.y-120);if(a)a.st.sum=2;}
  else{const e=spawnEnemy(key,player.x,player.y-340);if(e)clampArena(e,e.r);}}
function director(dt){
  if(bossDone)return;
  if(!bossOn){
    if(gTime>=ST.bossAt){spawnBoss();return;}
    if(!eliteDone&&gTime>=ST.bossAt*.5){eliteDone=true;spawnElite(ST.elite);}
    spawnT-=dt;
    const interval=Math.max(.24,.85-gTime*.011-(stage-1)*.03);
    if(spawnT<=0){spawnT=interval;
      let tot=0;for(const[,w]of ST.mobs)tot+=w;
      let r=Math.random()*tot,pick=ST.mobs[0][0];
      for(const[k,w]of ST.mobs){r-=w;if(r<=0){pick=k;break;}}
      spawnEnemy(pick);}}}
// ================= combat =================
function damageEnemy(e,dmg,hx,hy){
  let mul=1;
  if(frzT>0)mul*=1.5;
  if(e.beh==='boar'&&e.st.ph==='dizzy')mul*=1.4;
  const crit=Math.random()<.1,v=Math.max(1,Math.round(dmg*mul*(crit?2:1)));
  e.hp-=v;e.flash=1;sHit();
  floater(e.x+rnd(-8,8),e.y-e.r*e.scale-6,crit?v+'!':''+v,crit?'#ffd23e':'#fff',crit);
  if(hx!==undefined&&!e.boss){const d=Math.sqrt(dist2(hx,hy,e.x,e.y))||1;
    e.kx+=(e.x-hx)/d*80;e.ky+=(e.y-hy)/d*80;}
  if(e.hp<=0)killEnemy(e);}
function killEnemy(e){
  const i=enemies.indexOf(e);if(i<0)return;enemies.splice(i,1);
  kills++;combo++;comboT=1.7;maxCombo=Math.max(maxCombo,combo);
  puff(e.x,e.y,e.boss?14:4);
  burst(e.x,e.y,['#ffb02f','#ff5f3c','#7ec8ff','#ffe066'],e.boss?36:9,e.boss?11:6);
  if(e.boss||e.elite){sBig();freezeT=Math.max(freezeT,.07);shake=Math.max(shake,11);}
  else{sDie();shake=Math.max(shake,1.6);}
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
  if(e.boss){
    for(const o of enemies)if(o.boss)o.st.rage=true;
    if(!enemies.some(x=>x.boss))stageCleared();}
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
  if(player.shieldT>0){floater(player.x,player.y-30,'무적!','#ffd23e',true);return;}
  dmg=Math.round(dmg||8);
  const before=player.hp;
  player.hp-=dmg;player.iT=.95;sHurt();shake=Math.min(8+dmg*.4,15);flashR=1;combo=0;lastMile=0;
  floater(player.x+rnd(-8,8),player.y-32,'-'+dmg,'#ff3860',true);
  burst(player.x,player.y,['#ff5f3c','#fff'],16,9);
  for(const e of enemies){if(e.boss)continue;
    const d=Math.sqrt(dist2(e.x,e.y,player.x,player.y));
    if(d<160){e.kx+=(e.x-player.x)/d*250;e.ky+=(e.y-player.y)/d*250;}}
  const TH=player.maxhp*.25;
  if(player.hp<=TH&&before>TH&&player.hp>0){slowT=.45;banner('☠ 위험!!','#ff3860',1);}
  if(player.hp<=0){player.hp=0;gameOver(false);}}
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
  skillCd=.6;const key=player.skill.key;
  player.skill.uses--;if(player.skill.uses<=0)player.skill=null;
  if(key==='nuke'){flashW=1;shake=16;freezeT=Math.max(freezeT,.1);sBig();sMeow();
    banner('💥 묘신의 주먹!!','#ff5f3c',1.3);
    fxs.push({kind:'nova',x:player.x,y:player.y,r:40,max:Math.max(W,H),t:0,col:'#ff5f3c'});
    for(const e of enemies.slice())damageEnemy(e,350,player.x,player.y);}
  else if(key==='bolt'){sZap();flashW=.7;banner('⚡ 천벌 냥뢰!!','#ffd23e',1.3);
    for(const e of enemies.slice()){fxs.push({kind:'bolt',x1:e.x,y1:e.y-260,x2:e.x,y2:e.y,t:0});
      e.stun=Math.max(e.stun,.8);damageEnemy(e,180);}
    shake=12;}
  else if(key==='frz'){frzT=8;sTele();banner('💤 전국민 낮잠 타임~','#7ec8ff',1.5);flashW=.4;}
  else if(key==='hole'){noise(.6,.2,800,'bandpass');banner('🌀 참치 블랙홀!!','#7ec8ff',1.3);
    for(const e of enemies){if(e.boss)continue;
      const a=Math.atan2(e.y-player.y,e.x-player.x);
      e.x=player.x+Math.cos(a)*110;e.y=player.y+Math.sin(a)*110;}
    for(const g of gems)g.vac=1;for(const g of coinDrops)g.vac=1;for(const g of drops)g.vac=1;
    setTimeout(()=>{if(state!=='playing')return;
      explode(player.x,player.y,200,0);
      for(const e of enemies.slice())if(dist2(player.x,player.y,e.x,e.y)<240*240)damageEnemy(e,220,player.x,player.y);},450);}}
// ================= weapons fire =================
function newWeapon(key){player.weapons[key]={dmg:1,rate:1,n:0,size:1,pierce:0,sp:{},t:0};}
function updateWeapons(dt){
  // innate
  const inn=INNATE[player.innate];
  player.innT-=dt;
  if(player.innT<=0){if(inn.fire(player))player.innT=inn.cd*player.cdMul;else player.innT=.08;}
  const wp=player.weapons;
  if(wp.paw){const w=wp.paw,cd=WDEF.paw.base.cd/w.rate*player.cdMul;
    w.t-=dt;if(w.t<=0){const tgt=nearTgt(720);
      if(tgt){w.t=cd;const n=1+w.n,base=Math.atan2(tgt.y-player.y,tgt.x-player.x);
        for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.15;
          bullets.push({kind:'paw',x:player.x,y:player.y,vx:Math.cos(a)*540,vy:Math.sin(a)*540,
            dmg:WDEF.paw.base.dmg*w.dmg*player.dmgMul,r:7*w.size,life:1.3,pierce:w.pierce,rot:a,spr:'paw',scale:w.size});}
        if(w.sp.ring)for(let i=0;i<8;i++){const a=i/8*TAU;
          bullets.push({kind:'paw',x:player.x,y:player.y,vx:Math.cos(a)*440,vy:Math.sin(a)*440,
            dmg:WDEF.paw.base.dmg*w.dmg*.5*player.dmgMul,r:6*w.size,life:.9,pierce:0,rot:a,spr:'paw',scale:w.size*.8});}
        sShot();}else w.t=.1;}}
  if(wp.yarn){const w=wp.yarn,cd=WDEF.yarn.base.cd/w.rate*player.cdMul;
    w.t-=dt;if(w.t<=0&&enemies.length){w.t=cd;
      for(let i=0;i<1+w.n;i++){const a=rnd(0,TAU);
        bullets.push({kind:'yarn',x:player.x,y:player.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,
          dmg:WDEF.yarn.base.dmg*w.dmg*player.dmgMul,r:9*w.size,life:2.3,
          tgt:enemies[(Math.random()*enemies.length)|0],rot:0,spr:w.sp.red?'yarnR':'yarn',
          scale:w.size,aoe:55*w.size,turret:w.sp.turret});}
      tone(460,.1,'triangle',.07,820);}}
  if(wp.fish){const w=wp.fish;fishAng+=dt*(2.5*w.rate);
    const n=2+w.n,R=82+8*w.n;
    for(let i=0;i<n;i++){const a=fishAng+i/n*TAU,
      bx=player.x+Math.cos(a)*R,by=player.y+Math.sin(a)*R;
      for(const e of enemies)if(e.bIT<=0&&dist2(bx,by,e.x,e.y)<(16*w.size+e.r*e.scale)*(16*w.size+e.r*e.scale)){
        e.bIT=.35;damageEnemy(e,WDEF.fish.base.dmg*w.dmg*player.dmgMul,player.x,player.y);
        if(w.sp.spike&&bullets.length<140)for(let k=0;k<4;k++){const sa=rnd(0,TAU);
          bullets.push({kind:'rapid',x:bx,y:by,vx:Math.cos(sa)*420,vy:Math.sin(sa)*420,
            dmg:4*w.dmg*player.dmgMul,r:4,life:.5,pierce:0,rot:sa,spr:'rapid'});}}}}
  if(wp.bolt){const w=wp.bolt,cd=WDEF.bolt.base.cd/w.rate*player.cdMul;
    w.t-=dt;if(w.t<=0){const first=nearTgt(480);
      if(first){w.t=cd;sZap();const chain=[first];let cur=first;
        for(let i=0;i<2+w.n;i++){let nx=null,bd=290*290;
          for(const e of enemies)if(!chain.includes(e)){const d=dist2(cur.x,cur.y,e.x,e.y);
            if(d<bd){bd=d;nx=e;}}
          if(!nx)break;chain.push(nx);cur=nx;}
        let px=player.x,py=player.y;
        for(const e of chain){fxs.push({kind:'bolt',x1:px,y1:py,x2:e.x,y2:e.y,t:0});
          damageEnemy(e,WDEF.bolt.base.dmg*w.dmg*player.dmgMul);
          if(w.sp.stun)e.stun=Math.max(e.stun,.4);
          if(w.sp.boom){fxs.push({kind:'nova',x:e.x,y:e.y,r:6,max:44,t:0,col:'#ffd23e'});
            for(const o of enemies)if(o!==e&&dist2(e.x,e.y,o.x,o.y)<44*44)
              damageEnemy(o,8*w.dmg*player.dmgMul);}
          px=e.x;py=e.y;}}else w.t=.15;}}
  if(wp.nova){const w=wp.nova,cd=WDEF.nova.base.cd/w.rate*player.cdMul;
    w.t-=dt;if(w.t<=0){w.t=cd;fireNova(w,1);
      if(w.sp.dbl)setTimeout(()=>{if(state==='playing')fireNova(w,1);},250);
      if(w.sp.echo)echoQ.push({x:player.x,y:player.y,t:1,w});}}
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
      const w=e.w,R=110*w.size*1.5;
      fxs.push({kind:'nova',x:e.x,y:e.y,r:14,max:R,t:0,col:'#ff8ad8'});
      sHiss();
      for(const en of enemies.slice())if(dist2(e.x,e.y,en.x,en.y)<R*R)
        damageEnemy(en,WDEF.nova.base.dmg*w.dmg*.8*player.dmgMul,e.x,e.y);}}}
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
  if(e.stun>0){e.stun-=dt;e.flash=Math.max(e.flash,.3);return;}
  e.wob+=dt*3;e.bIT-=dt;e.flash*=Math.pow(.001,dt);
  const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
  e.face=dx<0?-1:1;
  const S=e.st;
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
  }
  e.x+=e.kx*dt;e.y+=e.ky*dt;
  e.kx*=Math.pow(.002,dt);e.ky*=Math.pow(.002,dt);
  clampArena(e,e.r*e.scale*.7);
  const dd=Math.hypot(player.x-e.x,player.y-e.y);
  if(player.iT<=0&&!e.air&&dd<e.r*e.scale+player.r)hurtPlayer(e.dmg+(e.meals||0)*2);}
// ================= flow =================
function stageCleared(){
  bossDone=true;state='clear';sClear();slowT=.9;
  const bonus=Math.round((15+stage*6)*(1+SV.up.coin*.2));
  runCoins+=bonus;SV.coins+=bonus;
  const prev=SV.clears[stage];
  if(!prev||gTime<prev)SV.clears[stage]=Math.round(gTime);
  if(stage>=SV.maxStage&&stage<STAGES.length)SV.maxStage=stage+1;
  save();
  burst(player.x,player.y,['#ffe066','#7ec8ff','#ff8ad8'],80,12);
  banner('🏆 스테이지 클리어!!','#ffe066',2.2);
  setTimeout(()=>{
    $('rTitle').textContent='클리어! 🏆';
    $('rSub').textContent=ST.icon+' '+ST.n+(stage<STAGES.length?' → 다음 동네가 열렸다!':' — 동네 평정 완료!!');
    $('rTime').textContent=fmtT(gTime);$('rKills').textContent=kills;
    $('rLv').textContent=player.level;$('rCoins').textContent=runCoins;
    $('rHint').innerHTML=stage>=STAGES.length?'🎉 <b>모든 스테이지 클리어!</b> 당신은 전설의 고양이!':'클리어 보너스 🪙'+bonus+' 획득!';
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
    player.x+=mx*player.speed*dt;player.y+=my*player.speed*dt;walkT+=dt;}
  clampArena(player,player.r);
  player.iT-=dt;player.shieldT-=dt;frzT-=dt;skillCd-=dt;
  // camera clamp to arena
  cam.x+=(player.x-cam.x)*Math.min(1,dt*5);
  cam.y+=(player.y-cam.y)*Math.min(1,dt*5);
  const s=ST.shape,bw=s.k==='rect'?s.w/2:s.R,bh=s.k==='rect'?s.h/2:s.R;
  const mX=Math.max(0,bw+60-W/2),mY=Math.max(0,bh+60-H/2);
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
    if(player.iT<=0&&dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)*(b.r+player.r)){
      ebullets.splice(i,1);hurtPlayer(b.dmg);}}
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
    const dur=f.kind==='bolt'?.14:f.kind==='beam'?(f.warn>0?99:.18):f.kind==='tongue'?.2:f.kind==='hiss'?.5:f.kind==='claw'?.22:.45;
    if(f.t>dur&&!(f.kind==='beam'&&f.warn>0))fxs.splice(i,1);}
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];
    p.x+=p.vx;p.y+=p.vy;p.vx*=.94;p.vy*=.94;p.life-=dt*1.7;if(p.life<=0)parts.splice(i,1);}
  for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];
    f.y-=dt*46;f.t-=dt*1.25;if(f.t<=0)floaters.splice(i,1);}
  for(let i=banners.length-1;i>=0;i--){const b=banners[i];
    b.t+=dt;if(b.t>b.dur)banners.splice(i,1);}
  comboT-=dt;if(comboT<=0&&combo>0){combo=0;lastMile=0;}
  if(chestDelay>0){chestDelay-=dt;if(chestDelay<=0)openChestNow();}
  if(pendingLv>0){levelDelay-=dt;
    if(levelDelay<=0){pendingLv--;showLevelup();}}}
function yarnBoom(b){
  const R=b.aoe||55;
  fxs.push({kind:'nova',x:b.x,y:b.y,r:8,max:R,t:0,col:b.spr==='yarnR'?'#ff6a6a':'#ffd23e'});
  noise(.16,.12,650,'lowpass');shake=Math.max(shake,3);
  for(const e of enemies.slice())if(dist2(b.x,b.y,e.x,e.y)<R*R)damageEnemy(e,b.dmg,b.x,b.y);
  if(b.turret&&turrets.length<4)turrets.push({x:b.x,y:b.y,t:3,cd:.2});}
// ================= draw =================
function drawArena(ox,oy){
  ctx.fillStyle=SKYS[ST.bg];ctx.fillRect(0,0,W,H);
  const s=ST.shape;
  ctx.save();ctx.translate(ox,oy);
  ctx.beginPath();
  if(s.k==='rect')roundRectPath(-s.w/2,-s.h/2,s.w,s.h,34);
  else{ctx.arc(0,0,s.R,0,TAU);
    if(s.k==='ring')ctx.arc(0,0,s.r,0,TAU,true);}
  ctx.save();ctx.clip();
  const bg=BGS[ST.bg];
  const x0=Math.floor((-ox)/420)*420,y0=Math.floor((-oy)/420)*420;
  for(let x=x0;x<-ox+W+420;x+=420)for(let y=y0;y<-oy+H+420;y+=420)ctx.drawImage(bg,x,y);
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
  ctx.restore();}
function draw(){
  const ox=W/2-cam.x,oy=H/2-cam.y;
  ctx.save();
  if(shake>.4)ctx.translate(rnd(-shake,shake),rnd(-shake,shake));
  drawArena(ox,oy);
  ctx.translate(ox,oy);
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
    if(e.elite){ctx.globalAlpha=.5+.2*Math.sin(performance.now()/160);
      ctx.strokeStyle='#ffd23e';ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(e.x,yy,e.r*sc+12,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
    drawStk(sp,e.x,yy,rot,sc,e.face===-1);
    if(e.flash>.08){ctx.save();ctx.globalAlpha=e.flash*.85;ctx.translate(e.x,yy);
      ctx.scale((e.face===-1?-1:1)*sc,sc);ctx.drawImage(sp.w,-sp.half,-sp.half);ctx.restore();}
    if(e.beh==='boar'&&e.st.ph==='dizzy'){
      ctx.font='20px sans-serif';ctx.textAlign='center';
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
    else if(e.meals>0){ctx.font='900 11px sans-serif';ctx.textAlign='center';
      ctx.fillStyle='#ffd23e';ctx.fillText('×'+e.meals+'냠',e.x,yy-e.r*sc-8);}}
  // fish orbit
  if(player.weapons.fish){const w=player.weapons.fish,n=2+w.n,R=82+8*w.n;
    for(let i=0;i<n;i++){const a=fishAng+i/n*TAU;
      drawStk(w.sp.shark?STK.shark:STK.fish,player.x+Math.cos(a)*R,player.y+Math.sin(a)*R,
        a+Math.PI/2,w.size,false);}}
  // bullets (player) — white streak + sprite
  for(const b of bullets){
    ctx.globalAlpha=.4;ctx.strokeStyle='#fff';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(b.x-b.vx*.035,b.y-b.vy*.035);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.globalAlpha=1;
    if(b.spr==='rapid'){ctx.fillStyle='#fffbe0';ctx.strokeStyle=OUT;ctx.lineWidth=2;
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);
      ctx.beginPath();ctx.ellipse(0,0,7,3.5,0,0,TAU);ctx.fill();ctx.stroke();ctx.restore();}
    else drawStk(STK[b.spr],b.x,b.y,b.rot,b.scale||1);}
  for(const b of ebullets)drawEb(b);
  // bolts
  ctx.lineWidth=4;
  for(const f of fxs)if(f.kind==='bolt'){
    ctx.globalAlpha=Math.max(0,1-f.t/.14);ctx.strokeStyle='#ffd23e';ctx.beginPath();
    const seg=5;ctx.moveTo(f.x1,f.y1);
    for(let i=1;i<seg;i++){const t=i/seg;
      ctx.lineTo(f.x1+(f.x2-f.x1)*t+rnd(-12,12),f.y1+(f.y2-f.y1)*t+rnd(-12,12));}
    ctx.lineTo(f.x2,f.y2);ctx.stroke();}
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
  ctx.globalAlpha=1;
  // hiss text
  for(const f of fxs)if(f.kind==='hiss'){
    ctx.globalAlpha=Math.max(0,1-f.t/.5);
    ctx.font='900 24px sans-serif';ctx.textAlign='center';
    ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=5;
    ctx.strokeText('하악-!!',f.x,f.y-46);ctx.fillStyle='#ff8ad8';ctx.fillText('하악-!!',f.x,f.y-46);
    ctx.globalAlpha=1;}
  // player
  if(state!=='dead'){
    ctx.globalAlpha=.18;ctx.fillStyle='#1c3206';
    ctx.beginPath();ctx.ellipse(player.x,player.y+16,16,6,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
    const bob=Math.abs(Math.sin(walkT*11))*4;
    ctx.save();ctx.translate(player.x,player.y-bob);
    if(player.iT>0&&((player.iT*14)|0)%2===0)ctx.globalAlpha=.35;
    ctx.rotate(Math.sin(walkT*11)*.07);
    ctx.scale(player.face===-1?-1:1,1);
    const ps=STK[player.stk];ctx.drawImage(ps.n,-ps.half,-ps.half);
    ctx.restore();
    if(player.shieldT>0){
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
    ctx.font=`900 ${f.big?18:12.5}px sans-serif`;
    ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=3;
    ctx.strokeText(f.txt,f.x,f.y);
    ctx.fillStyle=f.col;ctx.fillText(f.txt,f.x,f.y);}
  ctx.globalAlpha=1;
  ctx.restore();
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
    ctx.font='900 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#fff';ctx.fillText('×'+player.skill.uses,b.x+b.r*.68,b.y-b.r*.68+1);
    ctx.textBaseline='alphabetic';
    if(!IS_TOUCH){ctx.font='900 10px sans-serif';
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
    ctx.font=`900 ${Math.min(W*.062,34)}px sans-serif`;ctx.textAlign='center';
    ctx.lineWidth=8;ctx.strokeStyle='rgba(50,35,15,.8)';ctx.strokeText(b.txt,0,0);
    ctx.fillStyle=b.col;ctx.fillText(b.txt,0,0);ctx.restore();}
  if(tutT>0&&state==='playing'&&gTime<5){
    ctx.globalAlpha=Math.min(1,tutT);ctx.font='900 15px sans-serif';ctx.textAlign='center';
    ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=4;
    const msg=IS_TOUCH?'누르고 끌어서 이동! 공격은 자동 🐾':'WASD/방향키 이동! 공격은 자동 🐾';
    ctx.strokeText(msg,W/2,H*.68);ctx.fillStyle='#fff';ctx.fillText(msg,W/2,H*.68);
    ctx.globalAlpha=1;}}
function drawHUD(){
  if(state==='menu'||!player)return;
  const pad=14,top=16;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,0,W,6);
  ctx.fillStyle='#ffe066';ctx.fillRect(0,0,W*clamp(player.xp/player.xpNext,0,1),6);
  ctx.font='900 12px sans-serif';ctx.textAlign='left';
  ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=3;
  ctx.strokeText('Lv.'+player.level,pad,top+10);
  ctx.fillStyle='#ffe066';ctx.fillText('Lv.'+player.level,pad,top+10);
  const hbw=124,hfrac=clamp(player.hp/player.maxhp,0,1);
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(pad,top+16,hbw,15);
  ctx.fillStyle=hfrac>.5?'#52c84a':hfrac>.25?'#ffb02f':'#ff3860';
  ctx.fillRect(pad+2,top+18,(hbw-4)*hfrac,11);
  ctx.font='900 10.5px sans-serif';ctx.textAlign='center';
  ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2.5;
  const htxt=Math.ceil(player.hp)+' / '+player.maxhp;
  ctx.strokeText(htxt,pad+hbw/2,top+27);
  ctx.fillStyle='#fff';ctx.fillText(htxt,pad+hbw/2,top+27);
  // stage + timer/boss
  ctx.font='900 12px sans-serif';
  ctx.strokeText(stage+'. '+ST.n,W/2,top+6);
  ctx.fillStyle='#fff';ctx.fillText(stage+'. '+ST.n,W/2,top+6);
  if(!bossOn){const left=Math.max(0,ST.bossAt-gTime);
    ctx.font='900 22px sans-serif';
    const tstr='👹 '+fmtT(left);
    ctx.strokeText(tstr,W/2,top+30);ctx.fillStyle='#fff';ctx.fillText(tstr,W/2,top+30);}
  ctx.textAlign='right';ctx.font='900 14px sans-serif';
  ctx.strokeText('💀 '+kills,W-pad,top+10);ctx.fillStyle='#fff';ctx.fillText('💀 '+kills,W-pad,top+10);
  ctx.strokeText('🪙 '+runCoins,W-pad,top+28);ctx.fillStyle='#ffe066';ctx.fillText('🪙 '+runCoins,W-pad,top+28);
  if(combo>2){ctx.font=`900 ${Math.min(18+combo*.4,30)}px sans-serif`;
    ctx.strokeText(combo+' 콤보',W-pad,top+56);
    ctx.fillStyle=combo>=25?'#ffe066':'#fff';ctx.fillText(combo+' 콤보',W-pad,top+56);}
  let by=top+44;
  for(const e of enemies)if(e.boss){
    const bw=Math.min(W*.56,300);
    ctx.textAlign='center';ctx.font='900 12px sans-serif';
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
      ctx.font='900 110px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=10;ctx.strokeStyle='rgba(40,40,40,.8)';ctx.strokeText(n,0,0);
      ctx.fillStyle='#fff';ctx.fillText(n,0,0);ctx.restore();ctx.textBaseline='alphabetic';}
    return;}
  if(state==='menu'){return;}
  if(freezeT>0){freezeT-=dt;draw();return;}
  let ts=1;
  if(slowT>0){slowT-=dt;ts=.3;}
  if(state==='playing')update(dt*ts);
  draw();}
requestAnimationFrame(loop);
// ================= level up cards =================
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}
function genCard(){
  const tier=rollTier();
  const owned=Object.keys(player.weapons);
  const opts=[];
  // new weapons
  if(owned.length<3)for(const k in WDEF)if(!player.weapons[k])
    opts.push({kind:'new',key:k,tier,wgt:2.2});
  else;
  for(const k in WDEF)if(!player.weapons[k]&&owned.length>=3)
    opts.push({kind:'new',key:k,tier,wgt:.5});
  // variants of owned weapons matching tier
  for(const k of owned){
    for(const v of VARS[k])if(v.t===tier)opts.push({kind:'var',key:k,v,tier,wgt:3});}
  // passives
  for(const k in PASS)if((player.passN[k]||0)<6)
    opts.push({kind:'pass',key:k,tier,wgt:1.6});
  if(!opts.length)return null;
  let tot=0;for(const o of opts)tot+=o.wgt;
  let r=Math.random()*tot;
  for(const o of opts){r-=o.wgt;if(r<=0)return o;}
  return opts[0];}
function cardHTML(p){
  let icon,name,cl,desc;
  if(p.kind==='new'){const D=WDEF[p.key];
    icon=`<img src="${ICONS[D.icon].toDataURL()}">`;
    name=D.name;cl='✨ 새 무기!';desc='새로운 무기를 장착한다!';}
  else if(p.kind==='var'){const D=WDEF[p.key];
    icon=`<img src="${ICONS[D.icon].toDataURL()}">`;
    name=p.v.n;cl=D.name;desc=p.v.d;}
  else{const D=PASS[p.key];
    icon=`<img src="${ICONS[D.icon].toDataURL()}">`;
    name=D.name;cl=p.tier==='SS'?'초월 강화!':p.tier==='S'?'대폭 강화!':'강화';desc=D.d(p.tier);}
  return `<div class="tb t${p.tier}">${p.tier}</div>
    <div class="ci">${icon}</div><div class="cn">${name}</div>
    <div class="cl">${cl}</div><div class="cd">${desc}</div>`;}
function applyCard(p){
  if(p.kind==='new'){newWeapon(p.key);
    const w=player.weapons[p.key];
    if(p.tier==='B')w.dmg+=.1;if(p.tier==='A')w.dmg+=.25;
    if(p.tier==='S')w.dmg+=.4;if(p.tier==='SS'){w.dmg+=.4;w.n+=1;}}
  else if(p.kind==='var')p.v.fx(player.weapons[p.key]);
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
  const picks=[],used=new Set();
  for(let i=0;i<3;i++){let p=null;
    for(let tr=0;tr<8;tr++){p=genCard();
      if(p&&!used.has(p.kind+p.key+(p.v?p.v.n:''))){used.add(p.kind+p.key+(p.v?p.v.n:''));break;}}
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
  g.fillStyle='#fff';g.font='900 15px sans-serif';g.textAlign='center';
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
    g.fillStyle='#4a3b2a';g.font='800 12.5px sans-serif';g.textAlign='center';
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
  if(cutDone){cutDone();cutDone=null;}});
// ================= run start =================
function startStage(n){
  stage=n;ST=STAGES[n-1];
  resetRun();ac();
  hide('menu');hide('results');show('hudBtns');
  mStep=0;mNext=0;
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
  img.src=STK[curCat().stk].n.toDataURL();img.width=84;img.height=84;
  hc.appendChild(img);
  $('btnPlay').disabled=!SV.owned.length;
  $('btnPlay').textContent=SV.owned.length?'▶ 모험 떠나기':'먼저 고양이를 영입하자!';
  // stages
  const sg=$('stageGrid');sg.innerHTML='';
  STAGES.forEach((st,i)=>{
    const n=i+1,unlocked=n<=SV.maxStage;
    const el=document.createElement('div');
    el.className='stg'+(unlocked?'':' lock')+(n===stage?' cur':'');
    el.innerHTML=`<div class="si">${unlocked?st.icon:'🔒'}</div>
      <div class="sn">${n}. ${st.n}</div>
      <div class="sc">${SV.clears[n]?'✔ '+fmtT(SV.clears[n]):''}</div>`;
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
    el.innerHTML=`<img src="${STK[c.stk].n.toDataURL()}" width="64" height="64">
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
