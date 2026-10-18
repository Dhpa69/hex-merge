'use strict';
const R=3,TURNS=15,MAXV=9;
const COLORS=['','#3fd8ff','#4dff9a','#ffe14d','#ff9f40','#ff4f6d','#d45cff','#6f7bff','#ffffff','#ffd700'];
const CELLS=[];for(let q=-R;q<=R;q++)for(let r=Math.max(-R,-q-R);r<=Math.min(R,-q+R);r++)CELLS.push([q,r]);
const IDX={};CELLS.forEach((c,i)=>IDX[c[0]+','+c[1]]=i);
const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const NB=CELLS.map(([q,r])=>DIRS.map(([dq,dr])=>IDX[(q+dq)+','+(r+dr)]).filter(x=>x!==undefined));
const PUPS=[{k:'double',i:'✨',n:'Double'},{k:'triple',i:'💫',n:'Triple'},{k:'bomb',i:'💣',n:'Bomb'},{k:'swap',i:'🔄',n:'Swap'}];
function randPiece(){const x=Math.random();return x<.45?1:x<.8?2:x<.97?3:4}
function group(b,i){const v=b[i],seen=new Set([i]),st=[i];while(st.length){const c=st.pop();for(const n of NB[c])if(!seen.has(n)&&b[n]===v){seen.add(n);st.push(n)}}return[...seen]}
// Pure: place v at i on board b (copy). returns {b,pts,steps}
function resolve(b0,i,v){const b=b0.slice();b[i]=v;let pts=0,combo=1;const steps=[];
 while(true){const g=group(b,i);if(g.length<3||b[i]>=MAXV)break;const val=b[i];
  const p=val*10*g.length*combo;pts+=p;for(const c of g)b[c]=0;b[i]=val+1;steps.push({cells:g,val,nv:val+1,pts:p,combo});combo++;}
 return{b,pts,steps}}
function bombCells(i){return[i,...NB[i]]}
// ---------- state ----------
let S=null,sel=null,mode='ai',diff='medium',busy=false,pendingPU=null;
const $=id=>document.getElementById(id);
let coins=+localStorage.getItem('hexCoins')||0,muted=localStorage.getItem('hexMute')==='1';
// ---------- sound ----------
let AC=null;function tone(f,d=.12,t='sine',v=.15,delay=0){if(muted)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain(),t0=AC.currentTime+delay;o.type=t;o.frequency.setValueAtTime(f,t0);g.gain.setValueAtTime(v,t0);g.gain.exponentialRampToValueAtTime(.001,t0+d);o.connect(g).connect(AC.destination);o.start(t0);o.stop(t0+d)}catch(e){}}
const SND={tap:()=>tone(660,.06,'triangle',.08),drop:()=>tone(300,.1,'sine',.18),merge:c=>{tone(440*Math.pow(1.26,c),.18,'triangle',.18);tone(660*Math.pow(1.26,c),.22,'sine',.1,.06)},
 boom:()=>{tone(90,.35,'sawtooth',.2);tone(60,.4,'square',.1,.05)},pu:()=>{tone(880,.1,'sine',.12);tone(1320,.15,'sine',.1,.08)},win:()=>[523,659,784,1046].forEach((f,k)=>tone(f,.25,'triangle',.15,k*.12)),lose:()=>[400,300,220].forEach((f,k)=>tone(f,.3,'sine',.12,k*.15))};
function setMute(m){muted=m;localStorage.setItem('hexMute',m?'1':'0');$('muteBtn').textContent=$('muteG').textContent=m?'🔇':'🔊'}
// ---------- board render ----------
const SZ=30,svg=$('board');
function px([q,r]){return[SZ*Math.sqrt(3)*(q+r/2),SZ*1.5*r]}
function hexPts(s){let a=[];for(let k=0;k<6;k++){const an=Math.PI/180*(60*k-30);a.push((s*Math.cos(an)).toFixed(1)+','+(s*Math.sin(an)).toFixed(1))}return a.join(' ')}
function buildBoard(){const W=SZ*Math.sqrt(3)*(2*R+1)+10,H=SZ*(3*R+2)+10;svg.setAttribute('viewBox',`${-W/2} ${-H/2} ${W} ${H}`);
 svg.innerHTML=`<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <radialGradient id="shine" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>`;
 CELLS.forEach((c,i)=>{const[x,y]=px(c);const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','cell');g.setAttribute('transform',`translate(${x},${y})`);g.dataset.i=i;
  g.innerHTML=`<polygon class="base" points="${hexPts(SZ-1.5)}" fill="#ffffff0c" stroke="#7f9cff33" stroke-width="1.5"/><g class="in"></g>`;g.addEventListener('click',()=>cellTap(i));svg.appendChild(g)})}
function hexPiece(v,s){return`<g filter="url(#glow)"><polygon points="${hexPts(s)}" fill="${COLORS[v]}" stroke="#fff" stroke-opacity=".7" stroke-width="2"/></g><polygon points="${hexPts(s)}" fill="url(#shine)"/><text y="${s*.36}" text-anchor="middle" font-size="${s*1.05}" font-weight="900" fill="#10142e" style="pointer-events:none">${v}</text>`}
function cellG(i){return svg.querySelector(`.cell[data-i="${i}"] g.in`)}
function drawCell(i,anim){const g=cellG(i);const v=S.b[i];g.innerHTML=v?hexPiece(v,SZ-4):'';g.classList.remove('mg','dp','vn');if(anim){void g.getBBox;g.getBoundingClientRect();g.classList.add(anim)}}
function drawAll(){S.b.forEach((_,i)=>drawCell(i))}
function popAt(i,text,color){const g=svg.querySelector(`.cell[data-i="${i}"]`);const r=g.getBoundingClientRect(),a=$('app').getBoundingClientRect();const d=document.createElement('div');d.className='pop';d.textContent=text;if(color)d.style.color=color;d.style.left=(r.left+r.width/2-a.left)+'px';d.style.top=(r.top-a.top)+'px';$('app').appendChild(d);setTimeout(()=>d.remove(),1150)}
// ---------- UI ----------
function renderTray(){const t=$('tray');t.innerHTML='';const human=isHuman();S.tray.forEach((v,k)=>{const d=document.createElement('div');d.className='tp'+(sel===k?' sel':'')+(human?'':' lock');d.innerHTML=`<svg viewBox="-32 -32 64 64" width="58" height="58" style="overflow:visible">${hexPiece(v,26)}</svg>`;d.onclick=()=>{if(!isHuman()||busy)return;pendingPU=pendingPU==='bomb'?null:pendingPU;sel=k;SND.tap();renderTray();renderPU();msg('Tap an empty hex')};t.appendChild(d)});
 const defs=svg.querySelector('defs');if(defs&&!document.getElementById('gdefs')){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.id='gdefs';s.setAttribute('width',0);s.setAttribute('height',0);s.style.position='absolute';s.innerHTML='<defs>'+defs.innerHTML+'</defs>';document.body.appendChild(s)}}
function renderPU(){const p=$('pups');p.innerHTML='';const pl=S.p[S.turn];PUPS.forEach(u=>{const d=document.createElement('div');const used=pl.used[u.k];const act=pl.mult>1&&((u.k==='double'&&pl.mult===2)||(u.k==='triple'&&pl.mult===3))||pendingPU===u.k;d.className='pu'+(used&&!act?' used':'')+(act?' act':'');d.innerHTML=`<span class="i">${u.i}</span>${u.n}`;d.onclick=()=>usePU(u.k);p.appendChild(d)})}
function renderHUD(){for(let k=0;k<2;k++){$('sc'+k).textContent=S.p[k].score.toLocaleString();$('pl'+k).classList.toggle('on',S.turn===k)}$('turnN').textContent=Math.min(TURNS,S.p[S.turn].turns+1)+'/'+TURNS}
function msg(t){$('msg').textContent=t}
function isHuman(){return mode==='pp'||S.turn===0}
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id))}
// ---------- game flow ----------
function newGame(m){mode=m;S={b:Array(CELLS.length).fill(0),tray:[randPiece(),randPiece(),randPiece()],turn:0,over:false,
 p:[0,1].map(()=>({score:0,turns:0,mult:1,used:{}}))};
 $('nm0').textContent=m==='ai'?'You':'Player 1';$('nm1').textContent=m==='ai'?'CPU · '+diff[0].toUpperCase()+diff.slice(1):'Player 2';
 sel=null;pendingPU=null;busy=false;$('over').classList.remove('on');show('game');buildBoard();drawAll();refresh();msg(mode==='ai'?'Your turn — pick a piece':'Player 1 — pick a piece');}
function refresh(){renderHUD();renderTray();renderPU()}
function usePU(k){if(!isHuman()||busy||S.over)return;const pl=S.p[S.turn];if(pl.used[k]){if(pendingPU===k){pendingPU=null;renderPU();msg('Bomb cancelled')}return}
 if(k==='bomb'){if(!S.b.some(v=>v)){msg('Nothing to bomb yet');return}pendingPU='bomb';sel=null;renderTray();renderPU();msg('💣 Tap a hex to blast it and its neighbors');return}
 applyPU(k);}
function applyPU(k,target){const pl=S.p[S.turn];pl.used[k]=true;SND.pu();
 if(k==='double'){pl.mult=2;msg('✨ Next drop scores ×2')}else if(k==='triple'){pl.mult=3;msg('💫 Next drop scores ×3')}
 else if(k==='swap'){S.tray=[randPiece(),randPiece(),randPiece()];sel=null;msg('🔄 New pieces!')}
 else if(k==='bomb'){pendingPU=null;let n=0;for(const c of bombCells(target))if(S.b[c]){n++;S.b[c]=0;cellG(c).classList.add('vn')}SND.boom();setTimeout(()=>{bombCells(target).forEach(c=>drawCell(c))},260);pl.score+=n*5;popAt(target,'💥 +'+n*5,'#ff8a5c');msg('Boom! Now drop a piece')}
 refresh()}
function cellTap(i){if(!isHuman()||busy||S.over)return;
 if(pendingPU==='bomb'){if(!S.b[i]){msg('Tap a hex that has a piece');return}applyPU('bomb',i);return}
 if(sel===null){msg('Pick a piece from the tray first');return}if(S.b[i]){msg('That spot is taken');return}
 const k=sel;sel=null;play(k,i)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function play(k,i){busy=true;const v=S.tray[k];const pl=S.p[S.turn];const res=resolve(S.b,i,v);
 S.tray.splice(k,1);S.tray.push(randPiece());S.b[i]=v;drawCell(i,'dp');SND.drop();renderTray();
 const fast=window.__hmFast;await wait(fast?0:260);
 let gained=0;for(const st of res.steps){st.cells.forEach(c=>{if(c!==i){S.b[c]=0;cellG(c).classList.add('vn')}});await wait(fast?0:240);
  st.cells.forEach(c=>{if(c!==i)drawCell(c)});S.b[i]=st.nv;drawCell(i,'mg');const p=st.pts*pl.mult;gained+=p;SND.merge(st.combo);
  popAt(i,(st.combo>1?'COMBO ×'+st.combo+' ':'')+'+'+p.toLocaleString());pl.score+=p;renderHUD();await wait(fast?0:380)}
 if(gained&&pl.mult>1)pl.mult=1;else if(pl.mult>1&&!res.steps.length){/*keep multiplier for a scoring drop? no: once used it's spent*/pl.mult=1}
 pl.turns++;S.turn=1-S.turn;
 const full=!S.b.includes(0);if(full||(S.p[0].turns>=TURNS&&S.p[1].turns>=TURNS)){endGame(full);busy=false;return}
 refresh();busy=false;
 if(!isHuman()){msg('Computer is thinking…');await wait(fast?0:650);aiMove()}else msg(mode==='ai'?'Your turn':(S.turn?'Player 2':'Player 1')+' — your turn')}
function endGame(full){S.over=true;renderHUD();const[a,b]=[S.p[0].score,S.p[1].score];let t,earn=0;
 if(mode==='ai'){if(a>b){t='🏆 You Win!';earn=20+(diff==='hard'?20:diff==='medium'?10:0);SND.win()}else if(a<b){t='Computer Wins';earn=5;SND.lose()}else{t='Tie Game!';earn=10}}
 else{t=a>b?'🏆 Player 1 Wins!':a<b?'🏆 Player 2 Wins!':'Tie Game!';earn=5;SND.win()}
 coins+=earn;localStorage.setItem('hexCoins',coins);$('coinN').textContent=coins;
 $('ovT').textContent=t;$('ovS').innerHTML=`<span style="color:#ff7ad9">${a.toLocaleString()}</span> — <span style="color:#5cc8ff">${b.toLocaleString()}</span>`+(full?'<div style="font-size:13px;color:#9fb0e0">Board full!</div>':'');$('ovC').textContent='+'+earn+' 🪙';
 setTimeout(()=>$('over').classList.add('on'),window.__hmFast?0:700);window.__hmDone={a,b,t}}
// ---------- AI ----------
function bestReply(b,tray){let best=0;for(const v of new Set(tray))for(let i=0;i<b.length;i++)if(!b[i]){const p=resolve(b,i,v).pts;if(p>best)best=p}return best}
function setupScore(b,i){// small bonus for building pairs
 let s=0;const v=b[i];if(v){const g=group(b,i).length;if(g===2)s+=v*3}return s}
function aiMove(){const pl=S.p[1],empt=[];S.b.forEach((v,i)=>{if(!v)empt.push(i)});let mv;
 if(diff==='easy'&&Math.random()<.7){mv={k:Math.floor(Math.random()*3),i:empt[Math.floor(Math.random()*empt.length)]}}
 else{let best=-1e9;const after=S.tray.slice();
  S.tray.forEach((v,k)=>{for(const i of empt){const r=resolve(S.b,i,v);let sc=r.pts+setupScore(r.b,i)+Math.random()*2;
   if(diff==='hard'){const nt=after.filter((_,j)=>j!==k);sc-=bestReply(r.b,nt)*.8}
   if(sc>best){best=sc;mv={k,i,pts:r.pts}}}})}
 // power-ups
 if(diff!=='easy'&&mv.pts>=60&&!pl.used.triple){pl.used.triple=true;pl.mult=3;SND.pu();msg('CPU used 💫 Triple!')}
 else if(diff!=='easy'&&mv.pts>=40&&!pl.used.double){pl.used.double=true;pl.mult=2;SND.pu();msg('CPU used ✨ Double!')}
 else if(diff==='hard'&&!pl.used.swap&&(!mv.pts)&&pl.turns>9){pl.used.swap=true;S.tray=[randPiece(),randPiece(),randPiece()];return aiMove()}
 play(mv.k,mv.i)}
// ---------- stars bg ----------
(function(){const c=$('stars'),x=c.getContext('2d');function d(){c.width=c.offsetWidth;c.height=c.offsetHeight;for(let k=0;k<90;k++){x.fillStyle=`rgba(255,255,255,${Math.random()*.8})`;x.beginPath();x.arc(Math.random()*c.width,Math.random()*c.height,Math.random()*1.4,0,7);x.fill()}}d();addEventListener('resize',d)})();
// ---------- wiring ----------
$('coinN').textContent=coins;setMute(muted);
$('muteBtn').onclick=$('muteG').onclick=()=>setMute(!muted);
document.querySelectorAll('.diff .btn').forEach(b=>b.onclick=()=>{diff=b.dataset.d;document.querySelectorAll('.diff .btn').forEach(x=>x.classList.toggle('sel',x===b));SND.tap()});
$('playAI').onclick=()=>newGame('ai');$('playPP').onclick=()=>newGame('pp');
$('again').onclick=()=>newGame(mode);$('homeB').onclick=()=>{$('over').classList.remove('on');show('home')};
window.__hm={get S(){return S},play,usePU,resolve,CELLS};
