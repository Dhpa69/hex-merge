// Hex Merge core rules + computer players. Pure logic (node-testable), no DOM.
(function(root){
const MAXV=9,EXTRA_COST=50,START_COINS=100,WIN_COINS=10,FREE_POWER=2,FREE_SWAP=1;
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
 const g={v:1,mode:o.mode||'ai',N,R,turns:o.turns||(N===4?10:15),seed:(o.seed>>>0)||((Math.random()*4294967295)>>>0),rc:0,b:Array(G.C.length).fill(0),
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
 if(a.t==='boost'){if(a.p!=='double'&&a.p!=='triple'||!canPower(g,a.p))return null;spend(g);g.used[s][a.p]=1;g.puTurn=true;g.mult[s]=a.p==='double'?2:3;g.moveN++;return{t:'boost',p:a.p};}
 if(a.t==='blast'){if(a.p!=='bomb'&&a.p!=='cross'||!canPower(g,a.p)||!(a.c>=0&&a.c<g.b.length))return null;const cells=blastCells(g,a.p,a.c);spend(g);g.used[s][a.p]=1;g.puTurn=true;const hit=cells.filter(c=>g.b[c]);hit.forEach(c=>g.b[c]=0);g.moveN++;return{t:'blast',p:a.p,cells,hit};}
 if(a.t==='swap'){if(!canSwap(g))return null;if(g.swaps[s]>0)g.swaps[s]--;else g.coins[s]-=EXTRA_COST;g.trays[s]=[draw(g),draw(g),draw(g)];g.moveN++;return{t:'swap'};}
 if(a.t==='drop'){const v=g.trays[s][a.k];if(!v||!(a.i>=0&&a.i<g.b.length)||g.b[a.i])return null;const r=resolve(g.R,g.b,a.i,v);const m=g.mult[s];const pts=r.pts*m;
  g.b=r.b;g.sc[side(g,s)]+=pts;g.pts[s]+=pts;g.mult[s]=1;g.trays[s].splice(a.k,1);g.trays[s].push(draw(g));
  const st=g.stats[s];st.merges+=r.steps.filter(x=>!x.nova).length;st.best=Math.max(st.best,pts);st.combo=Math.max(st.combo,r.steps.length);st.hexes+=r.steps.reduce((n,x)=>n+x.cells.length,0);r.steps.forEach(x=>{if(x.nv)st.maxV=Math.max(st.maxV,x.nv);});
  g.done[s]++;g.puTurn=false;g.moveN++;g.last={seat:s,i:a.i,v,pts,mult:m,steps:r.steps};
  let n=s;for(let k=0;k<g.N;k++){n=(n+1)%g.N;if(g.done[n]<g.turns)break;}g.turn=n;finishCheck(g);return{t:'drop',v,i:a.i,pts,mult:m,steps:r.steps,seat:s};}
 return null;}
// ---------- computer players ----------
function pairValue(R,b){const {NB}=geo(R);let s=0;const seen=new Set();for(let i=0;i<b.length;i++){if(!b[i]||seen.has(i))continue;const gr=group(b,NB,i);gr.forEach(c=>seen.add(c));if(gr.length===2)s+=b[i]*6;}return s;}
function bestReply(R,b,tray){let best=0;const vs=[...new Set(tray)];for(let i=0;i<b.length;i++){if(b[i])continue;for(const v of vs){const p=resolve(R,b,i,v).pts;if(p>best)best=p;}}return best;}
function nextOpp(g){let n=g.turn;for(let k=0;k<g.N;k++){n=(n+1)%g.N;if(side(g,n)!==side(g,g.turn)&&g.done[n]<g.turns)return n;}return -1;}
function aiTurn(g,level,rnd){rnd=rnd||Math.random;const s=g.turn,em=empties(g),tray=g.trays[s];if(!em.length)return[];
 const opp=nextOpp(g),oppTray=opp>=0?g.trays[opp]:[];const left=g.turns-g.done[s];
 const P={easy:{rand:.55,setup:0,opp:0,own:0,noise:40},medium:{rand:.3,setup:0,opp:.1,own:0,noise:6},hard:{rand:0,setup:1,opp:.25,own:0,noise:4},expert:{rand:0,setup:1,opp:.8,own:.3,noise:1},master:{rand:0,setup:1,opp:1,own:.6,noise:.2,deep:12}}[level]||{};
 if(rnd()<P.rand)return[{t:'drop',k:Math.floor(rnd()*tray.length),i:em[Math.floor(rnd()*em.length)]}];
 let best=null;const cands=[];
 tray.forEach((v,k)=>{if(tray.indexOf(v)!==k)return;for(const i of em){const r=resolve(g.R,g.b,i,v);let sc=r.pts+P.setup*pairValue(g.R,r.b)*(left>1?1:0)+rnd()*P.noise;
  if(P.opp&&opp>=0&&r.b.includes(0))sc-=P.opp*bestReply(g.R,r.b,oppTray);
  if(P.own&&left>1){const rest=tray.slice();rest.splice(k,1);sc+=P.own*bestReply(g.R,r.b,rest);}
  const c={sc,k,i,pts:r.pts,b:r.b};if(P.deep)cands.push(c);if(!best||sc>best.sc)best=c;}});
 if(P.deep&&opp>=0&&cands.length){cands.sort((x,y)=>y.sc-x.sc);for(const c of cands.slice(0,P.deep)){const rest=tray.slice();rest.splice(c.k,1);
   // opponent's actual best reply, then our best follow-up from what's left
   let ob=null;const oe=[];c.b.forEach((v,j)=>{if(!v)oe.push(j);});for(const ov of new Set(oppTray))for(const j of oe){const rr=resolve(g.R,c.b,j,ov);const val=rr.pts-0.5*bestReply(g.R,rr.b,rest);if(!ob||val>ob.val)ob={val,pts:rr.pts,b:rr.b};}
   c.sc2=c.pts+0.4*pairValue(g.R,c.b)-(ob?ob.pts:0)+0.8*(ob?bestReply(g.R,ob.b,rest):bestReply(g.R,c.b,rest));}
  best=cands.slice(0,P.deep).reduce((a,c)=>c.sc2>a.sc2?c:a);}
 const acts=[];const pu=p=>canPower(g,p)&&g.power[s]>0; // computer only uses its free power-ups
 if(level!=='easy'&&best.pts>0){
  const bigT={medium:400,hard:240,expert:180,master:150}[level],bigD={medium:250,hard:140,expert:100,master:90}[level];
  if(level!=='medium'&&pu('triple')&&(best.pts>=bigT||left<=1&&best.pts>0))acts.push({t:'boost',p:'triple'});
  else if(pu('double')&&(best.pts>=bigD||(level==='master'||level==='expert')&&left<=2))acts.push({t:'boost',p:'double'});}
 // master/expert: swap a dead tray (no merge possible and no pairs to build) once
 if((level==='master'||level==='expert')&&best.pts===0&&g.swaps[s]>0&&left>2&&bestReply(g.R,g.b,tray)===0&&best.sc<=0){return[{t:'swap'},...aiTurnAfterSwap(g,level,rnd)];}
 acts.push({t:'drop',k:best.k,i:best.i});return acts;}
function aiTurnAfterSwap(g,level,rnd){const c=restore(serialize(g));apply(c,{t:'swap'});const a=aiTurn(c,level==='master'?'expert':'hard',rnd).filter(x=>x.t!=='swap');return a;}
// play a full turn for the computer on g (used by tests and the app)
function aiPlay(g,level,rnd){const acts=aiTurn(g,level,rnd);const out=[];for(const a of acts){const r=apply(g,a);if(r)out.push([a,r]);}if(!out.some(x=>x[0].t==='drop')&&!g.over){const em=empties(g);if(em.length){const a={t:'drop',k:0,i:em[0]};out.push([a,apply(g,a)]);}else{g.over=true;finishCheck(g);g.over=true;}}return out;}
const api={MAXV,EXTRA_COST,START_COINS,WIN_COINS,FREE_POWER,FREE_SWAP,PUPS,LEVELS,geo,mulberry,newGame,serialize,restore,resolve,blastCells,apply,canPower,powerCost,swapCost,canSwap,empties,side,aiTurn,aiPlay,bestReply,attachRng,group};
if(typeof module!=='undefined')module.exports=api;else root.HexL=api;})(this);
