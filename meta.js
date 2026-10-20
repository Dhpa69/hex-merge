// Hex Merge v10 meta-game: cosmetics shop, chests, XP/levels, stocked power-ups, badge rewards,
// undo (solo/CPU only), coins for every game, daily extra turns, mission auto-claim.
// Everything here is local/visual or affects only this player's wallet; online game rules are untouched.
'use strict';
(function(){
const X=()=>{const x=profile.ext||(profile.ext={});x.cos=x.cos||{owned:['tile:classic','board:night','fx:classic'],tile:'classic',board:'night',fx:'classic'};
 x.inv=x.inv||{double:0,bomb:0,cross:0};x.xp=x.xp||{xp:0,lvl:1};x.chest=x.chest||{last:0,bonus:0,opened:0};x.shards=x.shards|0;x.wild=x.wild|0;return x;};
// ---------- cosmetics (Star Tiles v51 approach + prices) ----------
const ITEMS={tile:[['classic','💎 Classic',0],['neon','⚡ Neon',300],['pastel','🍬 Pastel',300],['glass','🔮 Glass',500],['retro','👾 Retro',700],['gold','🏅 Gold',0,5],['galaxy','🌌 Galaxy',0,12]],
 board:[['night','🌃 Night Sky',0],['aurora','🌌 Aurora',400],['nebula','🪐 Nebula',400],['ocean','🌊 Deep Ocean',600],['sunset','🌅 Sunset',800],['royal','👑 Royal',0,8]],
 fx:[['classic','✨ Classic',0],['pulse','💓 Pulse',250],['rainbow','🌈 Rainbow',400],['comet','☄️ Comet',600],['firework','🎆 Firework',0,15]]};
const NAMES={tile:'Hex skins',board:'Board themes',fx:'Merge effects'};
const PUP={double:['✖2 Double',40],bomb:['💣 Bomb',60],cross:['✚ Cross Blast',60]};
function applyCos(){const c=X().cos,cl=document.body.classList;[...cl].filter(k=>/^(sk|th|fx)-/.test(k)).forEach(k=>cl.remove(k));cl.add('sk-'+c.tile,'th-'+c.board,'fx-'+c.fx);}
const own=(cat,id)=>X().cos.owned.includes(cat+':'+id);
function grant(cat,id){const c=X().cos;if(!own(cat,id))c.owned.push(cat+':'+id);}
function renderShop(){const x=X(),c=x.cos,lv=x.xp.lvl;$('shopCoins').textContent='🪙 '+(profile.coins|0).toLocaleString();
 let h='<h3>🎒 Power-ups to keep</h3><small class="small">Used after your free ones, before paying 50. Still 1 per turn, each type once per game.</small><div class="cosg">'+Object.keys(PUP).map(k=>'<button class="cosi" data-buy="'+k+'"><b>'+PUP[k][0]+'</b><small>own '+(x.inv[k]|0)+' · 🪙 '+PUP[k][1]+'</small></button>').join('')+'</div>';
 h+=Object.keys(ITEMS).map(cat=>'<h3>'+NAMES[cat]+'</h3><div class="cosg">'+ITEMS[cat].map(([id,nm,pr,lvReq])=>{const o=own(cat,id),on=c[cat]===id;
  const tag=on?'✓ Using':o?'Tap to use':lvReq?(lv>=lvReq?'Unlocked':'🔒 Level '+lvReq):'🪙 '+pr;
  return '<button class="cosi'+(on?' on':'')+(lvReq&&!o?' lk':'')+'" data-c="'+cat+'" data-i="'+id+'"><span class="cprev '+cat+'-'+id+'"><i></i><i></i><i></i></span><b>'+nm+'</b><small>'+tag+'</small></button>';}).join('')+'</div>').join('');
 h+='<small class="small">🧩 Skin shards: '+x.shards+'/10 — 10 shards unlock a random skin.</small>';$('shopList').innerHTML=h;}
function openShop(){renderShop();ov('shopov');}
function shopTap(e){const b=e.target.closest('button');if(!b)return;const x=X();
 if(b.dataset.buy){const k=b.dataset.buy,pr=PUP[k][1];if((profile.coins|0)<pr){toast('Need '+pr+' 🪙');return;}addCoins(-pr);x.inv[k]=(x.inv[k]|0)+1;saveProfile();SND.pu();toast(PUP[k][0]+' added to your bag 🎒');renderShop();return;}
 const cat=b.dataset.c,id=b.dataset.i;if(!cat)return;const it=ITEMS[cat].find(t=>t[0]===id);
 if(!own(cat,id)){if(it[3]){if(x.xp.lvl<it[3]){toast('Reach level '+it[3]+' to unlock');return;}grant(cat,id);}
  else{if((profile.coins|0)<it[2]){toast('Need '+it[2]+' 🪙');return;}addCoins(-it[2]);grant(cat,id);unlock('shop1');SND.win();toast('Unlocked '+it[1]+'!');}}
 x.cos[cat]=id;saveProfile();applyCos();renderShop();}
// ---------- chests ----------
const CHEST_MS=4*3600e3,CHEST_COST=150;
const freeReady=()=>Date.now()-(X().chest.last||0)>=CHEST_MS||X().chest.bonus>0;
function fmt(ms){const m=Math.ceil(ms/6e4);return Math.floor(m/60)+'h '+(m%60)+'m';}
function roll(){const x=X(),r=Math.random();
 if(r<.5){const n=40+Math.floor(Math.random()*81);addCoins(n);return '🪙 +'+n+' coins';}
 if(r<.8){const k=['double','bomb','cross'][Math.floor(Math.random()*3)];x.inv[k]=(x.inv[k]|0)+1;return PUP[k][0]+' power-up';}
 const n=2+Math.floor(Math.random()*3);x.shards+=n;let t='🧩 +'+n+' skin shards';
 if(x.shards>=10){x.shards-=10;const pool=[];['tile','board','fx'].forEach(cat=>ITEMS[cat].forEach(it=>{if(it[2]>0&&!own(cat,it[0]))pool.push([cat,it]);}));
  if(pool.length){const [cat,it]=pool[Math.floor(Math.random()*pool.length)];grant(cat,it[0]);t+=' → unlocked '+it[1]+'!';}else{addCoins(100);t+=' → +100 🪙';}}
 return t;}
function renderChest(res){const x=X(),c=x.chest;const left=CHEST_MS-(Date.now()-(c.last||0));
 $('chestBody').innerHTML=(res?'<div class="chres">🎉 '+res+'</div>':'<div class="chbox">🎁</div>')+
  '<button class="btn big" id="chFree"'+(freeReady()?'':' disabled')+'>'+(c.bonus>0?'🎁 Open bonus chest ('+c.bonus+')':freeReady()?'🎁 Open FREE chest':'Free chest in '+fmt(left))+'</button>'+
  '<button class="btn big" id="chBuy">💰 Buy a chest · '+CHEST_COST+' 🪙</button><small class="small">Chests hold coins, power-ups for your bag, or skin shards. You have 🪙 '+(profile.coins|0).toLocaleString()+'.</small>';
 $('chFree').onclick=()=>open(true);$('chBuy').onclick=()=>open(false);}
function open(free){const x=X(),c=x.chest;if(free){if(!freeReady())return;if(c.bonus>0)c.bonus--;else c.last=Date.now();}else{if((profile.coins|0)<CHEST_COST){toast('Need '+CHEST_COST+' 🪙');return;}addCoins(-CHEST_COST);}
 c.opened=(c.opened|0)+1;const res=roll();if(c.opened>=5)unlock('chest5');saveProfile();SND.win();renderChest(res);const e=document.querySelector('#chestBody .chres');e&&e.classList.add('pop2');}
function openChest(){renderChest();ov('chestov');}
// ---------- XP / levels ----------
const need=l=>100+50*(l-1);
const LVL_UNLOCK={5:['tile','gold'],8:['board','royal'],12:['tile','galaxy'],15:['fx','firework']};
function addXP(n){const x=X(),p=x.xp;p.xp+=n;const ups=[];while(p.xp>=need(p.lvl)){p.xp-=need(p.lvl);p.lvl++;const coins=25+10*p.lvl;addCoins(coins);let t='+'+coins+' 🪙';if(p.lvl%5===0){x.chest.bonus++;t+=' · 🎁 bonus chest';}
  const u=LVL_UNLOCK[p.lvl];if(u){grant(u[0],u[1]);const it=ITEMS[u[0]].find(i=>i[0]===u[1]);t+=' · unlocked '+it[1];}ups.push([p.lvl,t]);if(p.lvl>=5)unlock('lvl5');if(p.lvl>=10)unlock('lvl10');}
 saveProfile();return ups;}
function levelUp(ups){if(!ups.length)return;const [l,t]=ups[ups.length-1];$('lvlBody').innerHTML='<div class="lvbig">⭐ '+l+'</div><p>You reached <b>level '+l+'</b>!</p><p class="lvrw">'+ups.map(u=>'Lv '+u[0]+': '+u[1]).join('<br>')+'</p>';ov('lvlov');SND.win();}
function lvlLine(){const p=X().xp;return '⭐ Level '+p.lvl+' · '+p.xp+'/'+need(p.lvl)+' XP';}
// ---------- badge rewards + new badges ----------
const BADGE_COINS={win1:25,win10:75,hard:50,expert:75,master:100,combo4:50,make8:75,nova:100,move500:50,g1000:50,daily:25,daily7:75,online:25,team:50,streak5:75,make7:25,wild3:40,lvl5:50,lvl10:100,shop1:25,chest5:40};
ACH.push(['make7','7️⃣','Lucky seven','Create a 7 hex'],['wild3','🌈','Wild thing','Merge with 3 wild pieces'],['lvl5','⭐','Rising star','Reach level 5'],['lvl10','🌟','Star player','Reach level 10'],['shop1','🛍','Shopper','Buy a cosmetic'],['chest5','🎁','Treasure hunter','Open 5 chests']);
const _unlock=unlock;unlock=function(id){const had=!!profile.ach[id];_unlock(id);if(!had&&profile.ach[id]){const n=BADGE_COINS[id]||25;addCoins(n);setTimeout(()=>toast('🏅 Badge reward +'+n+' 🪙',1800),2400);}};
// ---------- missions auto-claim ----------
function autoClaim(){const ms=misState();let tot=0;Missions.list(ms).forEach(m=>{if(m.done&&!m.claimed)tot+=Missions.claim(ms,m.id);});if(Missions.list(ms).every(m=>m.claimed)&&!ms.allClaimed)tot+=Missions.claim(ms,'all');
 if(!ms.streakClaimed)tot+=Missions.claim(ms,'streak');SS('hexmerge.missions',ms);if(tot){addCoins(tot);SND.chime();toast('🎯 Mission reward +'+tot+' 🪙 (auto-claimed)',2200);}return tot;}
const _track=trackMove;trackMove=function(r,seat){_track(r,seat);if(r.wild&&r.steps.length){const x=X();x.wild++;saveProfile();if(x.wild>=3)unlock('wild3');}if(r.steps.some(s=>s.nv>=7))unlock('make7');};
// ---------- undo (solo/CPU only, once per turn, 30 coins) ----------
const UNDO=30;let snap=null;const usedUndo=new Set();
const undoMode=()=>S&&['ai','team-ai','daily'].includes(S.mode);
function canUndo(){return !!(g&&!g.over&&!busy&&undoMode()&&snap&&g.turn===S.me&&snap.key===g.turn+':'+g.done[g.turn]&&!usedUndo.has(snap.key)&&g.drops>0);}
const _doAct=doAct;doAct=async function(a,opts){opts=opts||{};const mine=g&&!opts.remote&&g.turn===S.me&&S.humans.includes(S.me);
 const pre=mine&&a.t==='drop'&&undoMode()?{g:L.serialize(g),key:g.turn+':'+g.done[g.turn],mis:localStorage.getItem('hexmerge.missions'),moves:S.moves?S.moves.slice():null}:null;
 const ok=await _doAct(a,opts);
 if(ok&&mine&&a.stock){const x=X();x.inv[a.p]=Math.max(0,(x.inv[a.p]|0)-1);saveProfile();toast('🎒 Used a '+PUP[a.p][0]+' from your bag',1400);}
 if(ok&&pre)snap=pre;if(g&&snap&&snap.key!==g.turn+':'+g.done[g.turn])snap=null;try{renderUndo();}catch(e){}return ok;};
function doUndo(){if(!canUndo())return;if((profile.coins|0)<UNDO){toast('Undo costs '+UNDO+' 🪙');return;}usedUndo.add(snap.key);addCoins(-UNDO);
 const cur=misState();g=L.restore(snap.g);g.coins[S.me]=profile.coins;if(snap.mis){const old=JSON.parse(snap.mis);if(old&&old.day===cur.day){old.claimed=cur.claimed;old.allClaimed=cur.allClaimed;old.streakClaimed=cur.streakClaimed;SS('hexmerge.missions',old);}}
 if(snap.moves)S.moves=snap.moves;snap=null;sel=null;drawAll();render();autosave();SND.tap();toast('↶ Last drop undone (−'+UNDO+' 🪙)');msg('Undone — place that piece again');}
function renderUndo(){const b=$('undoB');if(!b)return;b.style.display=undoMode()?'':'none';b.disabled=!canUndo();$('undoc').textContent=g&&snap&&usedUndo.has(snap.key)?'USED':UNDO+'🪙';}
const _render=render;render=function(){_render();try{renderUndo();const s=viewSeat(),x=X();if(g.mult[s]<2&&g.power[s]<=0){const n=['double','bomb','cross'].reduce((a,k)=>a+(g.used[s][k]?0:(x.inv[k]|0)),0);if(n&&s===S.me)$('badge').textContent='🎒'+n;}}catch(e){}};
// ---------- finish: coins for every game, XP, daily extra turns ----------
const _finish=finish;finish=function(){if(!g||g._fin)return;const pvp=S.mode==='pvp'||S.mode==='team-pvp',daily=S.mode==='daily';const mySide=pvp?0:L.side(g,S.me);const won=!pvp&&!daily&&g.winner===mySide;
 _finish();const sc=g.sc[mySide]|0,lines=[];let c=3;const pts=Math.min(20,Math.floor(sc/100));c+=pts;if(daily&&!S.extra&&!S.practice)c+=15;addCoins(c);
 lines.push('🪙 +'+c+' coins ('+['+3 for finishing',pts?'+'+pts+' for points':'',daily&&!S.extra&&!S.practice?'+15 daily puzzle':''].filter(Boolean).join(', ')+')'+(pvp?' — for '+(S.names[0]||'Player 1'):''));
 const xp=20+Math.min(40,Math.floor(sc/50))+(won?15:0);const ups=addXP(xp);lines.push('⭐ +'+xp+' XP · '+lvlLine());
 autoClaim();
 if(daily&&!S.extra&&!g.full&&!S.practiceStart)lines.push('<button class="btn" id="xtraB">➕ 2 more turns · 75 🪙</button><br><small class="small">Just for fun — today\'s saved score stays the same.</small>');
 $('ovX').innerHTML+=(($('ovX').innerHTML?'<br>':'')+lines.join('<br>'));const xb=$('xtraB');if(xb)xb.onclick=extraTurns;
 if(ups.length)setTimeout(()=>levelUp(ups),1300);};
function extraTurns(){if(!g||S.mode!=='daily'||S.extra)return;if((profile.coins|0)<75){toast('Need 75 🪙');return;}addCoins(-75);S.extra=true;S.practice=true;g.over=false;g._fin=false;g.winner=null;g.turns+=2;g.coins[0]=profile.coins;
 ov('endp',false);render();next();autosave();toast('➕ 2 bonus turns — go for it!');}
// remember whether the daily was a practice run from the start (no extra-turn offer then)
const _sd=startDaily;startDaily=function(){_sd();if(S&&S.mode==='daily')S.practiceStart=!!S.practice;};
// ---------- home / menu UI ----------
function homeUI(){const t=$('lvlLine');if(t)t.textContent=lvlLine();const ch=$('tChest');if(ch)ch.dataset.n=freeReady()?'!':'';}
const _sp=showProfile;showProfile=function(){_sp();try{homeUI();}catch(e){}};
function annotateMenu(){const x=X();['double','bomb','cross'].forEach(k=>{const el=document.querySelector('#pmenu [data-p='+k+'] small');if(el&&x.inv[k]>0&&!el.textContent.includes('🎒'))el.textContent+=' · 🎒 '+x.inv[k]+' in bag';});}
window.Meta={has:k=>(X().inv[k]|0)>0,give:(k,n)=>{X().inv[k]=(X().inv[k]|0)+n;saveProfile();},autoClaim,openShop,openChest,addXP,levelUp,X,canUndo,ITEMS};
document.addEventListener('DOMContentLoaded',()=>{});
X();applyCos();
$('shopList').addEventListener('click',shopTap);$('tShop').onclick=openShop;$('tChest').onclick=openChest;$('undoB').onclick=doUndo;
$('power').addEventListener('click',()=>setTimeout(annotateMenu,0));
setTimeout(()=>{try{autoClaim();homeUI();}catch(e){}},1500);setInterval(()=>{try{homeUI();}catch(e){}},60000);homeUI();
})();
