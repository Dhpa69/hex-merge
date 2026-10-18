'use strict';
// Hex Merge v2 app: modes, UI, coins, missions, streaks, achievements, ranks, leaderboard, daily, online, team, share.
const VER='v3',SITE='https://dhpa69.github.io/hex-merge/';
const L=HexL,$=id=>document.getElementById(id);
const COLORS=['','#3fd8ff','#4dff9a','#ffe14d','#ff9f40','#ff4f6d','#d45cff','#6f7bff','#ffffff','#ffd700'];
const LS=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const dayKey=()=>Missions.dayKey();
// ---------- profile ----------
let profile=Object.assign({name:'',coins:L.START_COINS,games:0,wins:0,difficulty:'medium',muted:false,chatOff:false,ext:{},rk:null,ach:{},best:{}},LS('hexmerge.profile',{}));
const DEV=LS('hexmerge.device',null)||(()=>{const d='hx'+Math.random().toString(36).slice(2,12)+Date.now().toString(36);SS('hexmerge.device',d);return d;})();
function saveProfile(){SS('hexmerge.profile',profile);showProfile();}
function addCoins(n){profile.coins=Math.max(0,(profile.coins|0)+n);saveProfile();}
function showProfile(){$('coinN').textContent=(profile.coins|0).toLocaleString();$('pstat').textContent=(profile.games|0)+' games · '+(profile.wins|0)+' wins';
 const ws=profile.ext.ws||{cur:0,best:0};$('wsBadge').textContent=(ws.cur?'🔥 Win streak '+ws.cur:'🔥 No win streak yet')+' · best '+ws.best+' · login day '+((profile.ext.login||{}).n||0);
 document.querySelectorAll('#diff button').forEach(b=>b.classList.toggle('on',b.dataset.d===profile.difficulty));
 $('muteBtn').textContent=profile.muted?'🔇 Sound: OFF':'🔊 Sound: ON';$('chatOffBtn').textContent=profile.chatOff?'💬 Chat: OFF':'💬 Chat: ON';rkBtn();
 const ms=Missions.ensure(LS('hexmerge.missions',null));const ready=Missions.list(ms).filter(m=>m.done&&!m.claimed).length+(!ms.streakClaimed?1:0);$('tMis').dataset.n=ready||'';
 $('resumeBtn').style.display=LS('hexmerge.save',null)?'':'none';const ds=dailySave();$('dailyBtn').textContent=ds?'🗓 Resume Daily Puzzle':(dailyRes()[dayKey()]?'🗓 Daily Puzzle ✓ (practice)':'🗓 Daily Puzzle #'+dailyNum(dayKey()));
 const os=Online.saved();$('onlResume').style.display=os?'':'none';if(os)$('onlResume').textContent='🌐 Continue online game ('+os.code+')';}
// ---------- sound ----------
let AC=null;function tone(f,d=.12,t='sine',v=.15,delay=0){if(profile.muted)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),gn=AC.createGain(),t0=AC.currentTime+delay;o.type=t;o.frequency.setValueAtTime(f,t0);gn.gain.setValueAtTime(v,t0);gn.gain.exponentialRampToValueAtTime(.001,t0+d);o.connect(gn).connect(AC.destination);o.start(t0);o.stop(t0+d);}catch(e){}}
const SND={tap:()=>tone(660,.06,'triangle',.08),drop:()=>tone(300,.1,'sine',.18),merge:c=>{tone(440*Math.pow(1.26,c),.18,'triangle',.18);tone(660*Math.pow(1.26,c),.22,'sine',.1,.06);},
 boom:()=>{tone(90,.35,'sawtooth',.2);tone(60,.4,'square',.1,.05);},pu:()=>{tone(880,.1,'sine',.12);tone(1320,.15,'sine',.1,.08);},nova:()=>[523,784,1046,1568].forEach((f,k)=>tone(f,.3,'sine',.14,k*.07)),
 win:()=>[523,659,784,1046].forEach((f,k)=>tone(f,.25,'triangle',.15,k*.12)),lose:()=>[400,300,220].forEach((f,k)=>tone(f,.3,'sine',.12,k*.15)),chime:()=>tone(1046,.2,'sine',.1)};
function toast(t,ms){const e=$('toast');e.innerHTML=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),ms||1600);}
function msg(t){$('msg').textContent=t;}
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id));if(id==='home')showProfile();}
const ov=(id,on)=>$(id).classList.toggle('on',on!==false);
// ---------- game session ----------
let g=null,S=null,busy=false,sel=null,tgt=null; // S: {mode,team,humans:[seats],cpu:{seat:level},me,names,level}
const fast=()=>!!window.__hmFast,wait=ms=>new Promise(r=>setTimeout(r,fast()?0:ms));
function isHumanTurn(){return g&&!g.over&&S.humans.includes(g.turn);}
function viewSeat(){return S.mode==='pvp'||S.mode==='team-pvp'?g.turn:S.me;}
function seatName(s){return S.names[s]||('P'+(s+1));}
function sideLabel(sd){if(g.N===1)return S.names[0];if(g.N===2)return seatName(sd);return seatName(sd)+' & '+seatName(sd+2);}
// ---------- board ----------
const SZ=30,svg=$('board');
const px=([q,r])=>[SZ*Math.sqrt(3)*(q+r/2),SZ*1.5*r];
function hexPts(s){let a=[];for(let k=0;k<6;k++){const an=Math.PI/180*(60*k-30);a.push((s*Math.cos(an)).toFixed(1)+','+(s*Math.sin(an)).toFixed(1));}return a.join(' ');}
function buildBoard(){const G=L.geo(g.R),R=g.R,W=SZ*Math.sqrt(3)*(2*R+1)+10,H=SZ*(3*R+2)+10;svg.setAttribute('viewBox',`${-W/2} ${-H/2} ${W} ${H}`);
 svg.innerHTML=`<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <radialGradient id="shine" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>`;
 G.C.forEach((c,i)=>{const[x,y]=px(c);const e=document.createElementNS('http://www.w3.org/2000/svg','g');e.setAttribute('class','cell');e.setAttribute('transform',`translate(${x},${y})`);e.dataset.i=i;
  e.innerHTML=`<polygon class="base" points="${hexPts(SZ-1.5)}" fill="#ffffff0c" stroke="#7f9cff33" stroke-width="1.5"/><g class="in"></g>`;e.addEventListener('click',()=>cellTap(i));svg.appendChild(e);});}
function hexPiece(v,s){return`<g filter="url(#glow)"><polygon points="${hexPts(s)}" fill="${COLORS[v]}" stroke="#fff" stroke-opacity=".7" stroke-width="2"/></g><polygon points="${hexPts(s)}" fill="url(#shine)"/><text y="${s*.36}" text-anchor="middle" font-size="${s*1.05}" font-weight="900" fill="#10142e" style="pointer-events:none">${v}</text>`;}
const cellG=i=>svg.querySelector(`.cell[data-i="${i}"] g.in`);
function drawVal(i,v,anim){const e=cellG(i);if(!e)return;e.innerHTML=v?hexPiece(v,SZ-4):'';e.classList.remove('mg','dp','vn');if(anim){e.getBoundingClientRect();e.classList.add(anim);}}
function drawAll(){g.b.forEach((v,i)=>drawVal(i,v));}
function popAt(i,text,color){const e=svg.querySelector(`.cell[data-i="${i}"]`);if(!e)return;const r=e.getBoundingClientRect(),a=$('app').getBoundingClientRect();const d=document.createElement('div');d.className='pop';d.textContent=text;if(color)d.style.color=color;d.style.left=(r.left+r.width/2-a.left)+'px';d.style.top=(r.top-a.top)+'px';$('app').appendChild(d);setTimeout(()=>d.remove(),1150);}
// ---------- render ----------
const PU=[{k:'double',i:'✖2',n:'Double'},{k:'triple',i:'✖3',n:'Triple'},{k:'bomb',i:'💣',n:'Bomb'},{k:'cross',i:'✚',n:'Cross'},{k:'swap',i:'⇄',n:'Swap'}];
function render(){if(!g)return;const solo=g.N===1;
 $('nm0').textContent=sideLabel(0);$('sc0').textContent=g.sc[0].toLocaleString();$('pl1').style.visibility=solo?'hidden':'';if(!solo){$('nm1').textContent=sideLabel(1);$('sc1').textContent=g.sc[1].toLocaleString();}
 $('pl0').classList.toggle('on',L.side(g,g.turn)===0&&!g.over);$('pl1').classList.toggle('on',L.side(g,g.turn)===1&&!g.over);
 $('turnN').textContent=Math.min(g.turns,g.done[g.turn]+1)+'/'+g.turns;$('turnL').dataset.d=g.drops;$('turnL').textContent=g.N===4?seatName(g.turn).slice(0,8).toUpperCase():'MOVE';
 $('chatBtn').style.visibility=S.mode==='online'||S.mode==='team-online'?'':'hidden';
 renderTray();renderPU();}
function renderTray(){const t=$('tray');t.innerHTML='';const vs=viewSeat();const mine=isHumanTurn()&&vs===g.turn;(g.trays[vs]||[]).forEach((v,k)=>{const d=document.createElement('div');d.className='tp'+(mine&&sel===k?' sel':'')+(mine?'':' lock');
  d.innerHTML=`<svg viewBox="-32 -32 64 64" width="56" height="56" style="overflow:visible">${hexPiece(v,26)}</svg>`;d.onclick=()=>{if(!isHumanTurn()||busy||vs!==g.turn)return;cancelTarget(true);sel=k;SND.tap();renderTray();msg('Tap an empty hex');};t.appendChild(d);});}
function renderPU(){const p=$('pups');p.innerHTML='';const s=viewSeat(),my=isHumanTurn()&&s===g.turn;
 PU.forEach(u=>{const d=document.createElement('div');let used,cost,act=false;if(u.k==='swap'){used=false;cost=g.swaps[s]>0?'FREE':'50🪙';}else{used=!!g.used[s][u.k];cost=used?'used':g.power[s]>0?'FREE':'50🪙';act=(g.mult[s]===2&&u.k==='double')||(g.mult[s]===3&&u.k==='triple')||(tgt&&tgt.p===u.k);}
  d.className='pu'+(used&&!act?' used':'')+(act?' act':'')+(!my?' off':'');d.innerHTML=`<span class="i">${u.i}</span>${u.n}<small>${cost}</small>`;d.onclick=()=>puTap(u.k);p.appendChild(d);});
 $('pinfo').textContent=`Drop ${Math.min(2,(g.drops|0)+1)} of 2${g.mult[s]>1?' · ×'+g.mult[s]+' on both drops':''} · ⚡ ${g.power[s]} free power-up${g.power[s]===1?'':'s'} left · 1 per turn · 🪙 ${(g.coins[s]|0).toLocaleString()}`;}
// ---------- input ----------
function puTap(k){if(!isHumanTurn()||busy)return;const s=g.turn;
 if(k==='swap'){if(!L.canSwap(g)){toast('Need 50 coins for another swap');return;}doAct({t:'swap'});return;}
 if(g.used[s][k]){toast('Each power-up once per game');return;}if(g.puTurn){toast('One power-up per turn');return;}if((k==='double'||k==='triple')&&g.drops){toast('Use Double/Triple before your 1st drop');return;}
 if(!L.canPower(g,k)){toast('No free power-ups left — need 50 coins');return;}
 if(k==='double'||k==='triple'){doAct({t:'boost',p:k});return;}
 if(!g.b.some(v=>v)){toast('Nothing to blast yet');return;}
 sel=null;tgt={p:k,c:null};$('tbar').classList.add('on');$('tmsg').textContent=(k==='bomb'?'💣 Bomb: ':'✚ Cross Blast: ')+'tap a target hex';$('tgo').disabled=true;renderTray();renderPU();}
function cancelTarget(silent){if(!tgt)return;tgt=null;$('tbar').classList.remove('on');svg.querySelectorAll('.cell.tgt').forEach(e=>e.classList.remove('tgt'));if(!silent)renderPU();}
function cellTap(i){if(!isHumanTurn()||busy)return;
 if(tgt){tgt.c=i;svg.querySelectorAll('.cell.tgt').forEach(e=>e.classList.remove('tgt'));L.blastCells(g,tgt.p,i).forEach(c=>svg.querySelector(`.cell[data-i="${c}"]`).classList.add('tgt'));$('tgo').disabled=false;$('tmsg').textContent='Tap BLAST! to clear the red hexes';return;}
 if(sel===null){msg('Pick a piece from your tray first');return;}if(g.b[i]){msg('That spot is taken');return;}
 const k=sel;sel=null;doAct({t:'drop',k,i});}
$('tgo').onclick=()=>{if(!tgt||tgt.c==null)return;const a={t:'blast',p:tgt.p,c:tgt.c};cancelTarget(true);doAct(a);};$('tno').onclick=()=>cancelTarget();
// ---------- actions ----------
async function animate(r,pre){if(!r)return;
 if(r.t==='boost'){SND.pu();toast((r.p==='double'?'✖2 Double':'✖3 Triple')+' — both drops this turn score ×'+(r.p==='double'?2:3));return;}
 if(r.t==='swap'){SND.pu();msg('⇄ New pieces!');return;}
 if(r.t==='blast'){SND.boom();r.cells.forEach(c=>{const e=svg.querySelector(`.cell[data-i="${c}"]`);e&&e.classList.add('tgt');});r.hit.forEach(c=>cellG(c).classList.add('vn'));await wait(320);svg.querySelectorAll('.cell.tgt').forEach(e=>e.classList.remove('tgt'));popAt(r.cells[0],'💥 '+r.hit.length+' cleared','#ff8a5c');return;}
 if(r.t==='drop'){drawVal(r.i,r.v,'dp');SND.drop();await wait(240);
  for(const st of r.steps){if(st.nova){st.cells.forEach(c=>cellG(c).classList.add('vn'));SND.nova();popAt(r.i,'🌟 SUPERNOVA +'+(st.pts*r.mult).toLocaleString(),'#fff');await wait(450);continue;}
   st.cells.forEach(c=>{if(c!==r.i)cellG(c).classList.add('vn');});await wait(220);st.cells.forEach(c=>{if(c!==r.i)drawVal(c,0);});drawVal(r.i,st.nv,'mg');SND.merge(st.combo);
   popAt(r.i,(st.combo>1?'COMBO ×'+st.combo+' ':'')+'+'+(st.pts*r.mult).toLocaleString()+(r.mult>1?' (×'+r.mult+')':''));await wait(360);}
  }}
async function doAct(a,opts){opts=opts||{};if(!g||g.over)return false;const seat=g.turn;const r=L.apply(g,a);if(!r){toast('Not allowed');return false;}busy=true;sel=null;
 try{render();await animate(r);
  if(opts.snap){g=L.restore(opts.snap);}drawAll();
  const online=S.mode==='online'||S.mode==='team-online';
  if(online&&!opts.remote){if(S.humans.includes(seat))Online.act(a,L.serialize(g));else Online.cpuAct(a,L.serialize(g),seat);}
  if(seat===S.me&&S.humans.includes(seat)&&profile.coins!==g.coins[seat]){profile.coins=Math.max(0,g.coins[seat]|0);saveProfile();}
  if(r.t==='drop'&&(seat===S.me)&&S.mode!=='pvp'&&S.mode!=='team-pvp')trackMove(r,seat);
  autosave();}finally{busy=false;}
 render();next();return true;}
function next(){if(!g)return;if(g.over){finish();return;}
 const s=g.turn,online=S.mode==='online'||S.mode==='team-online';
 if(S.humans.includes(s)){if(g.drops>0){msg('Nice! Now place your 2nd piece');return;}const t=S.mode==='pvp'||S.mode==='team-pvp'?seatName(s)+' — your turn':g.N===4?'Your turn (team '+(L.side(g,s)?'blue':'pink')+')':'Your turn — place 2 pieces';msg(t);if(S.humans.length>1&&(S.mode==='pvp'||S.mode==='team-pvp'))toast(seatName(s)+'\'s turn',900);return;}
 if(S.cpu[s]&&(!online||Online.st.host)){msg(seatName(s)+' is thinking…');runCpu(s);return;}
 msg('Waiting for '+seatName(s)+'…');}
let cpuRun=0;
async function runCpu(s){const id=++cpuRun;await wait(550);if(id!==cpuRun||!g||g.over||g.turn!==s)return;
 const acts=L.aiTurn(g,S.cpu[s]);let dropped=false;for(const a of acts){if(!g||g.turn!==s||g.over)break;if(a.t==='boost')toast(seatName(s)+' used '+(a.p==='double'?'✖2 Double':'✖3 Triple')+'!');
  if(a.t==='drop'){dropped=true;const ok=await doActNoNext(a);if(!ok)dropped=false;}else await doActNoNext(a);await wait(150);}
 let gd=0;while(g&&!g.over&&g.turn===s&&gd++<3){const em=L.empties(g);if(!em.length)break;await doActNoNext({t:'drop',k:0,i:em[0]});}
 render();next();}
async function doActNoNext(a){const seat=g.turn;const r=L.apply(g,a);if(!r)return false;busy=true;try{render();await animate(r);drawAll();const online=S.mode==='online'||S.mode==='team-online';if(online)Online.cpuAct(a,L.serialize(g),seat);autosave();}finally{busy=false;}return true;}
// ---------- start modes ----------
function needName(){const nm=$('pname').value.trim();if(!nm){$('pname').focus();toast('Enter your name first');return null;}profile.name=nm;saveProfile();return nm;}
function begin(game,sess){g=game;S=sess;busy=false;sel=null;tgt=null;cpuRun++;$('tbar').classList.remove('on');['endp','onl','team','chat'].forEach(i=>ov(i,false));show('game');buildBoard();drawAll();render();next();autosave();}
function startAI(){const nm=needName();if(!nm)return;const lv=profile.difficulty;clearSave();
 begin(L.newGame({mode:'ai',coins:[profile.coins,100]}),{mode:'ai',humans:[0],cpu:{1:lv},me:0,names:[nm,'CPU · '+cap(lv)],level:lv});}
function startPvP(){const nm=needName()||'Player 1';clearSave();begin(L.newGame({mode:'pvp',coins:[profile.coins,100]}),{mode:'pvp',humans:[0,1],cpu:{},me:0,names:[nm,'Player 2']});}
function startTeamAI(){const nm=needName();if(!nm)return;const lv=profile.difficulty;clearSave();
 begin(L.newGame({mode:'team-ai',N:4,coins:[profile.coins,100,100,100]}),{mode:'team-ai',team:true,humans:[0],cpu:{1:lv,2:lv,3:lv},me:0,names:[nm,'CPU A','CPU partner','CPU B'],level:lv});}
function startTeamPP(){const nm=needName()||'Player 1';clearSave();begin(L.newGame({mode:'team-pvp',N:4,coins:[profile.coins,100,100,100]}),{mode:'team-pvp',team:true,humans:[0,1,2,3],cpu:{},me:0,names:[nm,'Player 2','Player 3','Player 4']});}
const cap=s=>s[0].toUpperCase()+s.slice(1);
// ---------- resume (local) ----------
function autosave(){if(!g)return;if(S.mode==='daily'){if(!g.over)SS('hexmerge.dailySave',{day:S.day,g:L.serialize(g),S});else localStorage.removeItem('hexmerge.dailySave');return;}
 if(S.mode==='online'||S.mode==='team-online')return;if(g.over){clearSave();return;}SS('hexmerge.save',{g:L.serialize(g),S,at:Date.now()});}
function clearSave(){localStorage.removeItem('hexmerge.save');}
function resumeLocal(){const v=LS('hexmerge.save',null);if(!v)return;begin(L.restore(v.g),v.S);toast('▶ Game resumed');}
// ---------- daily ----------
const EPOCH=Date.UTC(2026,9,1),dailyNum=k=>Math.round((Date.UTC(+k.slice(0,4),+k.slice(5,7)-1,+k.slice(8,10))-EPOCH)/864e5)+1;
const dailySeed=k=>{let h=2166136261;for(const ch of 'hexmerge-daily-'+k){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const dailyRes=()=>LS('hexmerge.daily',{});
function dailySave(){const v=LS('hexmerge.dailySave',null);if(v&&v.day===dayKey()&&v.g&&!v.g.over)return v;if(v)localStorage.removeItem('hexmerge.dailySave');return null;}
function startDaily(){const nm=needName();if(!nm)return;const sv=dailySave();if(sv){begin(L.restore(sv.g),sv.S);toast('🗓 Daily #'+sv.S.dailyN+' resumed');return;}
 const k=dayKey(),practice=!!dailyRes()[k];const game=L.newGame({mode:'daily',N:1,seed:dailySeed(k),coins:[profile.coins]});
 // same pre-seeded board for everyone: a few starter hexes from the seed
 const G=L.geo(game.R);for(let n=0;n<6;n++){const i=Math.floor(game.rng()*G.C.length);if(!game.b[i]){const v=1+Math.floor(game.rng()*3);const t=game.b.slice();t[i]=v;if(L.resolve(game.R,t,i,v).steps.length===0)game.b[i]=v;}}
 begin(game,{mode:'daily',humans:[0],cpu:{},me:0,names:[nm],day:k,dailyN:dailyNum(k),practice,moves:[]});toast(practice?'🗓 Daily #'+dailyNum(k)+' · practice replay':'🗓 Daily #'+dailyNum(k)+' · same puzzle for everyone today!',2200);}
const sq=s=>s<=0?'⬛':s<100?'🟦':s<200?'🟩':s<400?'🟨':s<800?'🟧':'🟥';
function dailyText(r){return '⬢ Hex Merge Daily #'+dailyNum(r.day)+' — '+r.score.toLocaleString()+'\n'+r.moves.slice(0,5).map(sq).join('')+'\n'+r.moves.slice(5,10).map(sq).join('')+'\nBest turn '+Math.max(0,...r.moves).toLocaleString()+'\nPlay today\'s puzzle: '+SITE+'?daily=1';}
// ---------- missions ----------
function misState(){return Missions.ensure(LS('hexmerge.missions',null));}
function trackMove(r,seat){const ms=misState();const done=Missions.track(ms,{type:'move',score:r.turnEnd?r.turnPts:0,merges:r.steps.filter(x=>!x.nova).length,combo:r.steps.length,maxV:Math.max(0,...r.steps.map(x=>x.nv||0))});SS('hexmerge.missions',ms);
 if(S.mode==='daily'&&r.turnEnd)S.moves.push(r.turnPts);done.forEach(m=>toast('🎯 Mission done: '+m.txt+' (+'+m.coins+' 🪙 to claim)',2200));
 if(r.steps.length>=4)unlock('combo4');if(r.steps.some(x=>x.nv>=8))unlock('make8');if(r.steps.some(x=>x.nova))unlock('nova');if(r.pts>=500)unlock('move500');}
function openMissions(){const ms=misState();SS('hexmerge.missions',ms);const L2=Missions.list(ms);
 $('mislist').innerHTML=L2.map(m=>`<div class="mis${m.claimed?' done':''}"><div class="t">${m.txt}<br><small>${m.have}/${m.goal} · +${m.coins} 🪙</small></div>${m.claimed?'✓':m.done?`<button class="btn" data-c="${m.id}">Claim</button>`:''}</div>`).join('')+
 `<div class="mis${ms.streakClaimed?' done':''}"><div class="t">🔥 Mission streak: day ${ms.streak}<br><small>Daily bonus +${Missions.streakBonus(ms)} 🪙</small></div>${ms.streakClaimed?'✓':'<button class="btn" data-c="streak">Claim</button>'}</div>`+
 `<div class="mis${ms.allClaimed?' done':''}"><div class="t">⭐ Claim all 3 missions<br><small>Bonus +${Missions.ALLBONUS} 🪙</small></div>${ms.allClaimed?'✓':L2.every(m=>m.claimed)?'<button class="btn" data-c="all">Claim</button>':''}</div><small class="small">New missions every day at midnight.</small>`;ov('missions');}
$('mislist').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;const ms=misState();const n=Missions.claim(ms,b.dataset.c);SS('hexmerge.missions',ms);if(n){addCoins(n);SND.chime();toast('+'+n+' 🪙');}openMissions();};
// ---------- achievements ----------
const ACH=[['win1','🏆','First win','Win a game'],['win10','🥇','Veteran','Win 10 games'],['hard','💪','Tough cookie','Beat Hard'],['expert','🧠','Big brain','Beat Expert'],['master','👑','Grandmaster','Beat Master'],
 ['combo4','⛓','Chain reaction','Get a ×4 combo'],['make8','🎱','Eight is great','Create an 8 hex'],['nova','🌟','Supernova','Merge up to a 9'],['move500','💥','Big bang','Score 500+ in one move'],
 ['g1000','🚀','Four digits','Score 1,000+ in a game'],['daily','🗓','Daily player','Finish a Daily Puzzle'],['daily7','📅','Dedicated','Finish 7 Daily Puzzles'],['online','🌐','Online','Finish an online game'],['team','👥','Team player','Win a Team 2v2 game'],['streak5','🔥','On fire','Win 5 games in a row']];
function unlock(id){if(profile.ach[id])return;profile.ach[id]=Date.now();saveProfile();const a=ACH.find(x=>x[0]===id);if(a)setTimeout(()=>toast(a[1]+' Badge unlocked: '+a[2],2200),800);}
// ---------- ranks (Elo for online, ported from Star Tiles v49) ----------
const TIERS=[[0,'Bronze','🥉'],[1100,'Silver','🥈'],[1250,'Gold','🥇'],[1400,'Platinum','💠'],[1550,'Diamond','💎'],[1700,'Nebula','🌌'],[1850,'Galaxy','🌠']];
const tier=r=>{let t=TIERS[0];for(const x of TIERS)if(r>=x[0])t=x;const nx=TIERS[TIERS.indexOf(t)+1];return{name:t[1],icon:t[2],next:nx?nx[0]:null};};
const RK=()=>profile.rk||(profile.rk={rating:1000,games:0,wins:0,peak:1000,ranked:true});
const elo=(me,opp,res,games)=>{const K=games<10?40:24,E=1/(1+Math.pow(10,(opp-me)/400));return Math.round(K*(res-E));};
function rkBtn(){const k=RK(),t=tier(k.rating);$('rkBtn').innerHTML=t.icon+' '+t.name+' · '+k.rating+' · Ranked online '+(k.ranked?'ON':'OFF');}
$('rkBtn').onclick=()=>{RK().ranked=!RK().ranked;saveProfile();};
// ---------- leaderboard ----------
let sbc=null;function sb(){if(sbc!==null)return sbc;try{sbc=window.supabase&&supabase.createClient?supabase.createClient('https://etfhuwopqjderqutlyhk.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Zmh1d29wcWpkZXJxdXRseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODY4NjAsImV4cCI6MjEwNzU2Mjg2MH0.nVq3VqCYn3fRByCUle0u8_4almvp31oafR4LaHrE7TA',{auth:{persistSession:false,storageKey:'hexmerge.sb'}}):false;}catch(e){sbc=false;}return sbc;}
async function flushLb(){const c=sb();if(!c||!navigator.onLine)return;const q=LS('hexmerge.lbq',[]);while(q.length){try{const {error}=await c.rpc('submit_hex_score',q[0]);if(error)return;}catch(e){return;}q.shift();SS('hexmerge.lbq',q);}}
function submitScore(mode,score,level,day){if(!(score>0))return;const q=LS('hexmerge.lbq',[]);q.push({p_mode:mode,p_level:level||null,p_score:score|0,p_name:profile.name||'Player',p_device:DEV,p_day:day||null});SS('hexmerge.lbq',q.slice(-30));flushLb();
 const key=mode+(level?':'+level:'');profile.best[key]=Math.max(profile.best[key]||0,score|0);saveProfile();}
let lbTab='week';
async function loadLb(){const el=$('lbList'),k=RK(),t=tier(k.rating);$('rkInfo').textContent=t.icon+' '+t.name+' · rating '+k.rating+(t.next?' ('+(t.next-k.rating)+' to next)':'')+' · '+k.games+' ranked games';
 if(lbTab==='ach'){el.innerHTML='<div class="achg">'+ACH.map(x=>'<div class="ach'+(profile.ach[x[0]]?' on':'')+'"><i>'+x[1]+'</i><b>'+x[2]+'</b><small>'+x[3]+'</small></div>').join('')+'</div>';return;}
 const mine=()=>{const b=profile.best,keys=Object.keys(b).sort((a,c)=>b[c]-b[a]);return keys.length?'<ol class="lbo">'+keys.map(x=>'<li><span>'+x.replace(':',' · ')+'</span><b>'+b[x].toLocaleString()+'</b></li>').join('')+'</ol>':'<p class="small">Play a game to set your first best score.</p>';};
 if(lbTab==='mine'){el.innerHTML=mine();return;}
 const c=sb();if(!c){el.innerHTML='<p class="small">Offline — your bests:</p>'+mine();return;}el.innerHTML='<p class="small">Loading…</p>';
 const isoWeek=d=>{d=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const n=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-n);const y=d.getUTCFullYear(),w=Math.ceil(((d-Date.UTC(y,0,1))/864e5+1)/7);return y+'-W'+String(w).padStart(2,'0');};
 try{let q=c.from('hex_scores').select('name,score,level,mode,device_id').order('score',{ascending:false}).limit(25);q=lbTab==='daily'?q.eq('mode','daily').eq('day',dayKey()):q.eq('week',isoWeek(new Date())).in('mode',['ai','online','team']);
  const {data,error}=await q;if(error)throw error;el.innerHTML=data.length?'<ol class="lbo">'+data.map(r=>'<li'+(r.device_id===DEV?' class="me"':'')+'><span>'+String(r.name).replace(/</g,'&lt;')+' <em>'+(r.level||r.mode)+'</em></span><b>'+r.score.toLocaleString()+'</b></li>').join('')+'</ol>':'<p class="small">No scores yet — be the first!</p>';}
 catch(e){el.innerHTML='<p class="small">The global board isn\'t switched on yet. Your bests:</p>'+mine();}}
$('lb').addEventListener('click',e=>{const t=e.target.closest('[data-t]');if(t){lbTab=t.dataset.t;document.querySelectorAll('.lbtabs button').forEach(b=>b.classList.toggle('on',b===t));loadLb();}});
// ---------- share ----------
function shareLink(extra){const q=new URLSearchParams(extra||{});q.set('from',profile.name||'A friend');return SITE+'?'+q.toString();}
async function share(text,title){title=title||'Hex Merge';if(navigator.share&&/iPhone|iPad|Android/i.test(navigator.userAgent)){try{await navigator.share({title,text});return;}catch(e){if(e&&e.name==='AbortError')return;}}
 let p=$('shareP');if(!p){p=document.createElement('div');p.id='shareP';p.className='ov';$('app').appendChild(p);p.addEventListener('click',e=>{if(e.target===p)ov('shareP',false);});}
 const t=encodeURIComponent(text);p.innerHTML='<div class="card"><h2>📣 Share</h2><pre class="shtxt"></pre><div class="shrow">'+(navigator.share?'<button class="btn big" data-a="sys">📱 Share…</button>':'')+
  '<a class="btn big" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text='+t+'">𝕏 Post on X</a><a class="btn big" target="_blank" rel="noopener" href="https://wa.me/?text='+t+'">🟢 WhatsApp</a><a class="btn big" href="sms:?&body='+t+'">💬 Text message</a><button class="btn big" data-a="copy">🔗 Copy</button><button class="btn gry" data-a="close">Close</button></div></div>';
 p.querySelector('.shtxt').textContent=text;p.querySelector('.shrow').onclick=async e=>{const a=e.target.closest('[data-a]');if(!a)return;if(a.dataset.a==='close')ov('shareP',false);if(a.dataset.a==='sys'){try{await navigator.share({title,text});}catch(_){}}
  if(a.dataset.a==='copy'){try{await navigator.clipboard.writeText(text);toast('📋 Copied!');}catch(_){window.prompt('Copy:',text);}}};ov('shareP');}
function gameText(){const me=S.mode==='pvp'||S.mode==='team-pvp'?0:L.side(g,S.me),op=1-me;const w=g.winner===me?'🏆 Won':g.winner===op?'💪 Lost':'🤝 Tied';
 const vs=S.mode==='ai'?'the computer ('+S.level+')':S.team?'a Team 2v2':sideLabel(op);return '⬢ Hex Merge — '+w+' '+g.sc[me].toLocaleString()+' – '+g.sc[op].toLocaleString()+' vs '+vs+'\nPlay me: '+shareLink();}
// ---------- streak + login bonus (ported from Star Tiles v50) ----------
const LOGIN=[20,25,30,40,50,75,100];
function login(){const x=profile.ext,k=dayKey();const l=x.login||{last:null,n:0};if(l.last===k)return;l.n=l.last===Missions.prevDay(k)?l.n+1:1;l.last=k;x.login=l;const amt=LOGIN[(l.n-1)%7];addCoins(amt);
 const strip=LOGIN.map((v,i)=>'<span class="lgd'+(i<((l.n-1)%7)?' done':i===((l.n-1)%7)?' now':'')+'">D'+(i+1)+'<b>'+v+'</b></span>').join('');
 const d=document.createElement('div');d.className='ov on';d.id='loginb';d.innerHTML='<div class="card"><h2>🎁 Daily login bonus</h2><p>Day '+l.n+' in a row</p><div class="lgstrip">'+strip+'</div><p style="font-size:26px;font-weight:900;color:#ffd54a">+'+amt+' 🪙</p><small class="small">Come back tomorrow for '+LOGIN[l.n%7]+'! Missing a day restarts at Day 1.</small><button class="btn big" id="lgOk">Collect</button></div>';
 $('app').appendChild(d);$('lgOk').onclick=()=>{d.remove();SND.chime();};}
// ---------- finish ----------
function finish(){if(!g||g._fin)return;g._fin=true;msg('Game over');$('toast').classList.remove('on');const online=S.mode==='online'||S.mode==='team-online';const pvp=S.mode==='pvp'||S.mode==='team-pvp';
 const mySide=pvp?0:L.side(g,S.me),[a,b]=g.sc;let title,x=[];const won=g.N===1?true:g.winner===mySide;
 if(online)Online.over();
 if(S.mode==='daily'){title='🗓 Daily #'+S.dailyN+' done!';const res=dailyRes();if(!S.practice&&!res[S.day]){res[S.day]={day:S.day,score:a,moves:S.moves.slice()};SS('hexmerge.daily',res);submitScore('daily',a,null,S.day);x.push('Score saved for today.');}else x.push('Practice replay — first score of the day counts.');
  unlock('daily');if(Object.keys(dailyRes()).length>=7)unlock('daily7');localStorage.removeItem('hexmerge.dailySave');SND.win();}
 else if(pvp){title=g.winner<0?'🤝 Tie game!':'🏆 '+sideLabel(g.winner)+' win'+(g.N===2?'s':'')+'!';SND.win();}
 else{title=g.winner<0?'🤝 Tie game!':won?(g.N===4?'🏆 Your team wins!':'🏆 You win!'):(g.N===4?'Their team wins':S.mode==='ai'?'Computer wins':sideLabel(1-mySide)+' wins');won&&g.winner>=0?SND.win():SND.lose();}
 // coins + stats (Star Tiles rules: win = +10)
 profile.games=(profile.games|0)+1;let earn=0;if(!pvp&&S.mode!=='daily'&&g.winner===mySide){earn=L.WIN_COINS;profile.wins=(profile.wins|0)+1;}
 if(earn){addCoins(earn);x.push('+'+earn+' 🪙 for the win');}
 if(!pvp&&S.mode!=='daily'){const ws=profile.ext.ws||{cur:0,best:0};if(g.winner===mySide){ws.cur++;ws.best=Math.max(ws.best,ws.cur);let line='🔥 Win streak '+ws.cur;if(ws.cur>=2){const bb=Math.min(50,5*ws.cur);addCoins(bb);line+=' · +'+bb+' 🪙 bonus';}x.push('<span class="wsline">'+line+'</span>');if(ws.cur>=5)unlock('streak5');}
  else if(g.winner>=0){if(ws.cur>=2)x.push('<span class="wsline">Streak ended at '+ws.cur+'</span>');ws.cur=0;}profile.ext.ws=ws;}
 const ms=misState();Missions.track(ms,{type:'game',won:!pvp&&S.mode!=='daily'&&g.winner===mySide,online,daily:S.mode==='daily'});SS('hexmerge.missions',ms);
 if(!pvp&&g.winner===mySide&&S.mode!=='daily'){unlock('win1');if(profile.wins>=10)unlock('win10');if(S.mode==='ai'&&['hard','expert','master'].includes(S.level))unlock(S.level==='hard'?'hard':S.level);if(g.N===4)unlock('team');}
 if(!pvp&&g.sc[mySide]>=1000)unlock('g1000');if(online)unlock('online');
 if(S.mode==='ai')submitScore('ai',g.sc[0],S.level);if(online&&g.N===2)submitScore('online',g.sc[mySide]);if(g.N===4&&!pvp)submitScore('team',g.sc[mySide]);
 // ranked online (1v1)
 if(S.mode==='online'&&RK().ranked&&S.oppRating){const k=RK(),res=g.winner<0?.5:g.winner===mySide?1:0,d=elo(k.rating,S.oppRating,res,k.games),t0=tier(k.rating).name;k.rating=Math.max(100,k.rating+d);k.games++;if(res===1)k.wins++;k.peak=Math.max(k.peak,k.rating);const t=tier(k.rating);
  x.push('<span class="rkline">'+t.icon+' Ranked '+(d>=0?'+':'')+d+' → '+k.rating+' '+t.name+'</span>');if(t.name!==t0)setTimeout(()=>toast((d>0?'⬆ Promoted to ':'⬇ ')+t.icon+' '+t.name+'!',2200),1200);}
 else if(S.mode==='online')x.push('<span class="rkline">Unranked game</span>');
 saveProfile();if(!online)clearSave();
 $('ovT').textContent=title;$('ovS').innerHTML=g.N===1?'<span style="color:#ff7ad9">'+a.toLocaleString()+'</span>':`<span style="color:#ff7ad9">${a.toLocaleString()}</span> — <span style="color:#5cc8ff">${b.toLocaleString()}</span>`+(g.full?'<div class="small">Board full!</div>':'');
 $('ovX').innerHTML=x.join('<br>');$('again').textContent=S.mode==='daily'?'🔁 Practice again':'🔁 Rematch';$('again').style.display='';
 setTimeout(()=>{$('toast').classList.remove('on');ov('endp');},fast()?0:900);window.__hmDone={a,b,title,winner:g.winner};}
$('again').onclick=()=>{ov('endp',false);if(S.mode==='ai')startAI();else if(S.mode==='pvp')startPvP();else if(S.mode==='team-ai')startTeamAI();else if(S.mode==='team-pvp')startTeamPP();else if(S.mode==='daily')startDaily();else if(S.mode==='online'||S.mode==='team-online')onlineRematch();};
$('endShare').onclick=()=>{if(S.mode==='daily'){const r=dailyRes()[S.day]||{day:S.day,score:g.sc[0],moves:S.moves};share(dailyText(r),'Daily #'+S.dailyN);}else share(gameText());};
$('homeB').onclick=()=>{ov('endp',false);goHome();};
function goHome(){cpuRun++;if(S&&(S.mode==='online'||S.mode==='team-online'))Online.leave();show('home');}
// ---------- online ----------
function onlHandlers(){return{room:roomUI,status:t=>{$('onlmsg').textContent=t;},start:d=>onlineBegin(d),act:onRemoteAct,chat:chatIn,rematch:d=>{if(!$('endp').classList.contains('on'))return;$('ovX').innerHTML+='<br><b>'+(d.name||'Opponent')+' wants a rematch!</b>';$('again').textContent='▶ Join rematch';S.rematchCode=d.code;},net:()=>{const u=Online.up;if(!Online.st.started)$('onlmsg').textContent=(u.length?'Connected ✓ ':'Connecting… ')+(Online.st.host?'Waiting for players':'Joining room');}};}
function roomUI(){const st=Online.st;$('onlcode').textContent=st.code;const n=st.size;let h='';for(let i=0;i<n;i++){const s=st.seats[i];h+=`<div class="seat ${n===4?(i%2?'b':'a'):''}">${n===4?(i%2?'🔵 ':'🩷 '):''}Seat ${i+1}: ${s?s.name+(s.id===st.id?' (you)':''):'<i>waiting…</i>'}</div>`;}$('seatList').innerHTML=h;
 const full=st.seats.length>=n;$('onlStart').style.display=st.host&&full?'':'none';$('addCpu').style.display=st.host&&!full&&n===4?'':'none';
 $('onlmsg').textContent=st.host?(full?'Everyone is here — tap Start!':'Share the code or link. Waiting for '+(n-st.seats.length)+' more…'):'Joined! Waiting for the host to start…';}
function hostOnline(size){const nm=needName();if(!nm)return;Online.host(nm,profile.coins,size,onlHandlers());$('onlT').textContent=size===4?'👥 Online team room':'🌐 Online room';roomUI();ov('team',false);ov('onl');}
function joinOnline(code){const nm=needName();if(!nm)return;code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length<4){toast('Enter the room code');return;}
 Online.join(code,nm,profile.coins,onlHandlers());$('onlcode').textContent=code;$('seatList').innerHTML='';$('onlStart').style.display='none';$('addCpu').style.display='none';$('onlmsg').textContent='Connecting…';ov('onl');}
$('onlStart').onclick=()=>{const seed=(Math.random()*4294967295)>>>0;Online.start(seed);onlineBegin({seed,size:Online.st.size,seats:Online.st.seats});};
$('addCpu').onclick=()=>Online.addCpu();
$('onlCancel').onclick=()=>{Online.leave();ov('onl',false);};
$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(Online.st.code);toast('📋 Code copied');}catch(e){window.prompt('Room code:',Online.st.code);}};
$('shareCode').onclick=()=>share('⬢ Join my Hex Merge game! Room code '+Online.st.code+'\n'+SITE+'?room='+Online.st.code,'Hex Merge room');
function sessFor(d,me){const N=d.size,cpu={},humans=[];d.seats.forEach((s,i)=>{if(s.cpu)cpu[i]=profile.difficulty;else if(i===me)humans.push(i);});
 return{mode:N===4?'team-online':'online',team:N===4,humans,cpu,me,names:d.seats.map((s,i)=>i===me?s.name+' (you)':s.name),code:Online.st.code};}
function onlineBegin(d){const me=Online.st.me;const game=L.newGame({mode:'online',N:d.size,seed:d.seed,coins:d.seats.map(s=>s.coins|0||100)});begin(game,sessFor(d,me));
 toast('🌐 Game on! Room '+Online.st.code,1500);setTimeout(()=>Online.chat(profile.name,'',"rk",{r:RK().rating}),800);}
async function onRemoteAct(d){if(!g||!S||!(S.mode==='online'||S.mode==='team-online')){return;}
 while(busy)await wait(50);const pre=g.b.slice();const r=L.apply(g,d.a);if(r){busy=true;try{render();await animate(r);}finally{busy=false;}}
 g=L.restore(d.snap);drawAll();render();next();} // the sender's state is authoritative
function resumeOnline(){const s=Online.saved();if(!s)return;Online.resume(s,onlHandlers());const d={size:s.size,seats:s.seats,seed:s.seed};
 const sess=sessFor({size:s.size,seats:s.seats},s.me);let game=s.snap?L.restore(s.snap):L.newGame({mode:'online',N:s.size,seed:s.seed});begin(game,sess);toast('🌐 Back in room '+s.code);}
async function onlineRematch(){if(S.rematchCode){const c=S.rematchCode;Online.leave();joinOnline(c);return;}const size=g.N,old=Online.st.code,nm=profile.name;
Online.leave();const code=Online.host(nm,profile.coins,size,onlHandlers());
 // tell the old room where the rematch is
 const keep=Object.assign({},Online.st);MQ.pub('hexmerge/v1/'+old+'/rematch',JSON.stringify({t:'rematch',code,name:nm,from:keep.id,u:Math.random().toString(36).slice(2)}),true);
 roomUI();ov('endp',false);ov('onl');}
// ---------- chat ----------
const chatLog=[];
function chatIn(d){if(d.sys==='rk'){if(d.seat!==S?.me&&+d.r>0&&S)S.oppRating=+d.r;return;}if(profile.chatOff)return;chatLog.push(d);drawChat();if(!$('chat').classList.contains('on'))$('chatDot').classList.add('on');SND.chime();}
function drawChat(){$('chlist').innerHTML=chatLog.slice(-60).map(m=>`<div class="cm${m.from===Online.st.id?' me':''}"><b>${String(m.name||'?').replace(/</g,'&lt;')}:</b> ${String(m.txt).replace(/</g,'&lt;')}</div>`).join('');$('chlist').scrollTop=1e9;}
function sendChat(t){t=String(t||'').trim().slice(0,200);if(!t)return;const m={name:profile.name,txt:t,from:Online.st.id};Online.chat(profile.name,t);chatLog.push(m);drawChat();$('chText').value='';}
$('chatBtn').onclick=()=>{if(profile.chatOff){toast('Chat is off (Home → More)');return;}$('chatDot').classList.remove('on');drawChat();ov('chat');};$('chClose').onclick=()=>ov('chat',false);
$('chSend').onclick=()=>sendChat($('chText').value);$('chText').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat($('chText').value);});
document.querySelector('.chemo').onclick=e=>{if(e.target.tagName==='BUTTON')sendChat(e.target.textContent);};
// ---------- stars bg ----------
(function(){const c=$('stars'),x=c.getContext('2d');function d(){c.width=c.offsetWidth;c.height=c.offsetHeight;for(let k=0;k<110;k++){x.fillStyle=`rgba(255,255,255,${Math.random()*.8})`;x.beginPath();x.arc(Math.random()*c.width,Math.random()*c.height,Math.random()*1.4,0,7);x.fill();}}d();addEventListener('resize',d);})();
// ---------- wiring ----------
$('pname').value=profile.name||'';$('ver').textContent=VER;
document.querySelectorAll('#diff button').forEach(b=>b.onclick=()=>{profile.difficulty=b.dataset.d;saveProfile();SND.tap();});
$('vsAI').onclick=startAI;$('vsP').onclick=startPvP;$('dailyBtn').onclick=startDaily;$('resumeBtn').onclick=resumeLocal;$('onlResume').onclick=resumeOnline;
$('hostBtn').onclick=()=>hostOnline(2);$('joinBtn').onclick=()=>joinOnline($('joinCode').value);
$('tMis').onclick=openMissions;$('misClose').onclick=()=>ov('missions',false);$('tLb').onclick=()=>{ov('lb');loadLb();flushLb();};$('lbClose').onclick=()=>ov('lb',false);
$('tTeam').onclick=()=>ov('team');$('teamClose').onclick=()=>ov('team',false);$('teamAI').onclick=startTeamAI;$('teamPP').onclick=startTeamPP;$('teamOn').onclick=()=>hostOnline(4);
$('tShare').onclick=()=>share('⬢ Hex Merge — drop numbered hexes, connect 3 to merge bigger, chain combos!\n'+(profile.games?'I\'ve played '+profile.games+' games — ':'')+'Come play me!\n'+shareLink());
$('tHow').onclick=()=>ov('howto');$('howClose').onclick=()=>ov('howto',false);$('tMore').onclick=()=>$('more').classList.toggle('open');
$('muteBtn').onclick=()=>{profile.muted=!profile.muted;saveProfile();};$('chatOffBtn').onclick=()=>{profile.chatOff=!profile.chatOff;saveProfile();};
$('menuBtn').onclick=()=>{if(g&&!g.over&&(S.mode==='online'||S.mode==='team-online'))toast('Online game saved — continue from Home');else if(g&&!g.over)toast('Game saved — tap Resume on Home');goHome();};
document.querySelectorAll('.ov').forEach(o=>o.addEventListener('click',e=>{if(e.target===o&&!['endp','onl','loginb'].includes(o.id))o.classList.remove('on');}));
showProfile();
// launch links: ?room=CODE joins, ?daily=1 opens the daily
(function(){const q=new URLSearchParams(location.search);const room=q.get('room');if(room||q.get('daily'))history.replaceState(null,'',location.pathname);
 if(room){$('joinCode').value=room.toUpperCase();if(profile.name)setTimeout(()=>joinOnline(room),600);else toast('Enter your name, then tap Join',2500);}
 else if(q.get('daily')&&profile.name)setTimeout(startDaily,300);})();
if(!window.__hmTest)setTimeout(login,1200);setTimeout(flushLb,4000);
window.__hm={get g(){return g;},get S(){return S;},doAct,L,startAI,startDaily,joinOnline,hostOnline,profile};
