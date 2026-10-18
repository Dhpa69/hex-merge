// Hex Merge core rules + computer players. Pure logic (node-testable), no DOM.
(function(root){
const DROPS=2,MAXV=9,EXTRA_COST=50,START_COINS=100,WIN_COINS=10,FREE_POWER=2,FREE_SWAP=1;
const PUPS=['double','triple','bomb','cross'];
const LEVELS=['easy','medium','hard','expert','master'];
const GEO={};
function geo(R){if(GEO[R])return GEO[R];const C=[],IDX={};for(let q=-R;q<=R;q++)for(let r=Math.max(-R,-q-R);r<=Math.min(R,-q+R);r++){IDX[q+','+r]=C.length;C.push([q,r]);}
 const D=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];const NB=C.map(([q,r])=>D.map(([a,b])=>IDX[(q+a)+','+(r+b)]).filter(x=>x!==undefined));
 return GEO[R]={R,C,IDX,NB};}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function attachRng(g){const base=mulberry(g.seed);for(let i=0;i<(g.rc|0);i++)base();Object.defineProperty(g,'rng',{value:()=>{g.rc=(g.rc|0)+1;return base();},enumerable:false,configurable:true,writable:true});return g;}
function draw(g){const x=g.rng();return x<.45?1:x<.8?2:x<.97?3:4;}
function side(g,s){return g.N===4?s%2:s;}
function newGame(o){o=o||{};const N=o.N||2,R=o.R||(N===4?4:3);const G=geo(R);
 const g={v:1,mode:o.mode||'ai',N,R,turns:o.turns||(N===4?8:10),drops:0,tp:0,seed:(o.seed>>>0)||((Math.random()*4294967295)>>>0),rc:0,b:Array(G.C.length).fill(0),
  trays:[],sc:[0,0],pts:Array(N).fill(0),done:Array(N).fill(0),turn:0,mult:Array(N).fill(1),power:Array(N).fill(FREE_POWER),swaps:Array(N).fill(FREE_SWAP),
  coins:(o.coins||[]).slice(0,N),used:Array.from({length:N},()=>({})),puTurn:false,over:false,winner:null,moveN:0,stats:Array.from({length:N},()=>({merges:0,best:0,combo:0,maxV:0,hexes:0}))};
 while(g.coins.length<N)g.coins.push(START_COINS);attachRng(g);for(let s=0;s<N;s++)g.trays.push([draw(g),draw(g),draw(g)]);return g;}
function serialize(g){return JSON.parse(JSON.stringify(g));}
function restore(o){return attachRng(JSON.parse(JSON.stringify(o)));}
function group(b,NB,i){const v=b[i],seen=new Set([i]),st=[i];while(st.length){const c=st.pop();for(const n of NB[c])if(!seen.has(n)&&b[n]===v){seen.add(n);st.push(n);}}return[...seen];}
function resolve(R,b0,i,v){const {NB}=geo(R),b=b0.slice();b[i]=v;let pts=0,combo=1;const steps=[];
 while(b[i]<MAXV){const g=group(b,NB,i);if(g.length<3)break;const val=b[i],p=val*10*g.length*combo;pts+=p;for(const c of g)b[c]=0;b[i]=val+1;steps.push({cells:g,val,nv:val+1,pts:p,combo});combo++;}
 // a 9 formed by merging is a supernova: clears its ring for a bonus
 if(b[i]===MAXV&&steps.length){const {NB:N2}=geo(R);let n=0;for(const c of N2[i])if(b[c]){n++;b[c]=0;}const p=500+n*50;pts+=p;b[i]=0;steps.push({nova:true,cells:[i,...N2[i]],pts:p,combo});}
 return{b,pts,steps};}
function blastCells(g,p,c){const {C,NB,IDX}=geo(g.R);if(p==='bomb')return[c,...NB[c]];const [q,r]=C[c],s=-q-r;const out=[];C.forEach(([a,bb],i)=>{if(a===q||bb===r||(-a-bb)===s)out.push(i);});return out;}
const canPower=(g,p)=>!g.over&&!g.puTurn&&!g.used[g.turn][p]&&(g.power[g.turn]>0||g.coins[g.turn]>=EXTRA_COST);
const powerCost=g=>g.power[g.turn]>0?0:EXTRA_COST;
const swapCost=g=>g.swaps[g.turn]>0?0:EXTRA_COST;
const canSwap=g=>!g.over&&(g.swaps[g.turn]>0||g.coins[g.turn]>=EXTRA_COST);
function spend(g){if(g.power[g.turn]>0)g.power[g.turn]--;else g.coins[g.turn]-=EXTRA_COST;}
function empties(g){const o=[];g.b.forEach((v,i)=>{if(!v)o.push(i);});return o;}
function finishCheck(g){const full=!g.b.includes(0);if(full||g.done.every(d=>d>=g.turns)){g.over=true;g.full=full;g.winner=g.sc[0]>g.sc[1]?0:g.sc[1]>g.sc[0]?1:-1;}}
// apply one action; returns a result object or null when illegal
function apply(g,a){if(g.over||!a)return null;const s=g.turn;
 if(a.t==='boost'){if(a.p!=='double'&&a.p!=='triple'||!canPower(g,a.p)||g.drops)return null;spend(g);g.used[s][a.p]=1;g.puTurn=true;g.mult[s]=a.p==='double'?2:3;g.moveN++;return{t:'boost',p:a.p};}
 if(a.t==='blast'){if(a.p!=='bomb'&&a.p!=='cross'||!canPower(g,a.p)||!(a.c>=0&&a.c<g.b.length))return null;const cells=blastCells(g,a.p,a.c);spend(g);g.used[s][a.p]=1;g.puTurn=true;const hit=cells.filter(c=>g.b[c]);hit.forEach(c=>g.b[c]=0);g.moveN++;return{t:'blast',p:a.p,cells,hit};}
 if(a.t==='swap'){if(!canSwap(g))return null;if(g.swaps[s]>0)g.swaps[s]--;else g.coins[s]-=EXTRA_COST;g.trays[s]=[draw(g),draw(g),draw(g)];g.moveN++;return{t:'swap'};}
 if(a.t==='drop'){const v=g.trays[s][a.k];if(!v||!(a.i>=0&&a.i<g.b.length)||g.b[a.i])return null;const r=resolve(g.R,g.b,a.i,v);const m=g.mult[s];const pts=r.pts*m;
  g.b=r.b;g.sc[side(g,s)]+=pts;g.pts[s]+=pts;g.trays[s].splice(a.k,1);g.drops=(g.drops|0)+1;g.tp=(g.tp|0)+pts;
  const st=g.stats[s];st.merges+=r.steps.filter(x=>!x.nova).length;st.best=Math.max(st.best,pts);st.combo=Math.max(st.combo,r.steps.length);st.hexes+=r.steps.reduce((n,x)=>n+x.cells.length,0);r.steps.forEach(x=>{if(x.nv)st.maxV=Math.max(st.maxV,x.nv);});
  g.moveN++;g.last={seat:s,i:a.i,v,pts,mult:m,steps:r.steps};const turnPts=g.tp,dropN=g.drops;
  const end=g.drops>=DROPS||!g.trays[s].length||!g.b.includes(0);
  if(end){g.mult[s]=1;while(g.trays[s].length<3)g.trays[s].push(draw(g));g.done[s]++;g.puTurn=false;g.drops=0;g.tp=0;
   let n=s;for(let k=0;k<g.N;k++){n=(n+1)%g.N;if(g.done[n]<g.turns)break;}g.turn=n;}
  finishCheck(g);return{t:'drop',v,i:a.i,pts,mult:m,steps:r.steps,seat:s,dropN,turnEnd:end,turnPts};}
 return null;}
// ---------- computer players ----------
function pairValue(R,b){const {NB}=geo(R);let s=0;const seen=new Set();for(let i=0;i<b.length;i++){if(!b[i]||seen.has(i))continue;const gr=group(b,NB,i);gr.forEach(c=>seen.add(c));if(gr.length===2)s+=b[i]*6;}return s;}
function bestReply(R,b,tray){let best=0;const vs=[...new Set(tray)];for(let i=0;i<b.length;i++){if(b[i])continue;for(const v of vs){const p=resolve(R,b,i,v).pts;if(p>best)best=p;}}return best;}
function nextOpp(g){let n=g.turn;for(let k=0;k<g.N;k++){n=(n+1)%g.N;if(side(g,n)!==side(g,g.turn)&&g.done[n]<g.turns)return n;}return -1;}
function greedyDrop(R,b,tray){let best=null;const vs=[...new Set(tray)];for(let i=0;i<b.length;i++){if(b[i])continue;for(const v of vs){const r=resolve(R,b,i,v);if(!best||r.pts>best.pts)best={pts:r.pts,b:r.b,v,i};}}return best;}
// opponent's likely 2-drop turn: best drop, then best follow-up with what's left (greedy)
function oppTurn(R,b,tray){const d1=greedyDrop(R,b,tray);if(!d1)return 0;const rest=tray.slice();rest.splice(rest.indexOf(d1.v),1);const d2=rest.length&&d1.b.includes(0)?greedyDrop(R,d1.b,rest):null;return d1.pts+(d2?d2.pts:0);}
function oppFull(R,b,tray){let best=0;const vs=[...new Set(tray)];for(let i=0;i<b.length;i++){if(b[i])continue;for(const v of vs){const r=resolve(R,b,i,v);const rest=tray.slice();rest.splice(rest.indexOf(v),1);const p=r.pts+(rest.length&&r.b.includes(0)?bestReply(R,r.b,rest):0);if(p>best)best=p;}}return best;}
const AIP={easy:{rand:.5,setup:0,opp:0,top:0,noise:40},medium:{rand:.35,setup:0,opp:0,top:0,noise:10},hard:{rand:.05,setup:.5,opp:.2,top:8,noise:6},expert:{rand:0,setup:1,opp:.8,top:30,noise:1},master:{rand:0,setup:1,opp:1,top:20,noise:.2,full:1}};
// plan a whole turn (up to 2 drops). Returns actions; drop k indexes refer to the tray at the moment of that drop.
function planDrops(g,level,rnd){const s=g.turn,P=AIP[level]||AIP.medium,tray=g.trays[s].slice(),need=Math.min(DROPS-(g.drops|0),tray.length),em=empties(g);if(!em.length)return[];
 const opp=nextOpp(g),oppTray=opp>=0?g.trays[opp]:[];const left=g.turns-g.done[s];
 const rdrop=(t,b)=>{const e=[];b.forEach((v,i)=>{if(!v)e.push(i);});return{k:Math.floor(rnd()*t.length),i:e[Math.floor(rnd()*e.length)]};};
 const combos=[];
 tray.forEach((v,k)=>{if(tray.indexOf(v)!==k)return;for(const i of em){const r1=resolve(g.R,g.b,i,v);
  if(need<2||!r1.b.includes(0)){combos.push({a:[{k,i}],pts:r1.pts,b:r1.b});continue;}
  const t2=tray.slice();t2.splice(k,1);t2.forEach((v2,k2)=>{if(t2.indexOf(v2)!==k2)return;for(let j=0;j<r1.b.length;j++){if(r1.b[j])continue;const r2=resolve(g.R,r1.b,j,v2);combos.push({a:[{k,i},{k:k2,i:j}],pts:r1.pts+r2.pts,b:r2.b});}});}});
 combos.forEach(c=>{c.sc=c.pts+(P.setup&&left>1?P.setup*pairValue(g.R,c.b):0)+rnd()*P.noise;});
 combos.sort((x,y)=>y.sc-x.sc);let best=combos[0];
 if(P.opp&&opp>=0&&P.top){const top=combos.slice(0,P.top);for(const c of top){c.sc2=c.sc-P.opp*(c.b.includes(0)?(P.full?oppFull(g.R,c.b,oppTray):oppTurn(g.R,c.b,oppTray)):0);}best=top.reduce((x,c)=>c.sc2>x.sc2?c:x);}
 let acts=best.a.map(d=>({t:'drop',k:d.k,i:d.i}));
 // random blunders for the easy levels (per drop)
 if(P.rand){const b=g.b.slice(),t=tray.slice();acts=acts.map(d=>{let x=d;if(rnd()<P.rand){x=rdrop(t,b);x.t='drop';}const v=t[x.k];const r=resolve(g.R,b,x.i,v);r.b.forEach((y,q)=>b[q]=y);t.splice(x.k,1);return x;});
  // make sure later drops still point at empty cells
  const b2=g.b.slice(),t2=tray.slice();acts=acts.filter(x=>{if(b2[x.i]||!t2[x.k])return false;const r=resolve(g.R,b2,x.i,t2[x.k]);r.b.forEach((y,q)=>b2[q]=y);t2.splice(x.k,1);return true;});}
 return {acts,pts:best.pts};}
function aiTurn(g,level,rnd){rnd=rnd||Math.random;const s=g.turn;if(!empties(g).length)return[];const left=g.turns-g.done[s];
 let plan=planDrops(g,level,rnd);const out=[];const pu=p=>canPower(g,p)&&g.power[s]>0;
 if((level==='master'||level==='expert')&&!g.drops&&plan.pts===0&&g.swaps[s]>0&&left>2){const c=restore(serialize(g));apply(c,{t:'swap'});const p2=planDrops(c,level,rnd);return[{t:'swap'},...boosts(g,level,p2.pts,left,pu),...p2.acts];}
 return[...boosts(g,level,plan.pts,left,pu),...plan.acts];}
function boosts(g,level,pts,left,pu){if(level==='easy'||!pts||g.drops)return[];const bigT={medium:600,hard:350,expert:260,master:220}[level],bigD={medium:400,hard:200,expert:150,master:130}[level];
 if(level!=='medium'&&pu('triple')&&(pts>=bigT||left<=1))return[{t:'boost',p:'triple'}];if(pu('double')&&(pts>=bigD||(level==='master'||level==='expert')&&left<=2))return[{t:'boost',p:'double'}];return[];}
// play a full turn for the computer on g (used by tests)
function aiPlay(g,level,rnd){const s=g.turn,start=g.done[s];const out=[];for(const a of aiTurn(g,level,rnd)){if(g.over||g.turn!==s)break;const r=apply(g,a);if(r)out.push([a,r]);}
 let guard=0;while(!g.over&&g.turn===s&&g.done[s]===start&&guard++<4){const em=empties(g);if(!em.length){finishCheck(g);g.over=true;break;}const a={t:'drop',k:0,i:em[0]};out.push([a,apply(g,a)]);}return out;}
const api={DROPS,MAXV,EXTRA_COST,START_COINS,WIN_COINS,FREE_POWER,FREE_SWAP,PUPS,LEVELS,geo,mulberry,newGame,serialize,restore,resolve,blastCells,apply,canPower,powerCost,swapCost,canSwap,empties,side,aiTurn,aiPlay,bestReply,attachRng,group};
if(typeof module!=='undefined')module.exports=api;else root.HexL=api;})(this);
