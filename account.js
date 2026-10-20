// Hex Merge v10: optional Sign in with Apple (Supabase OAuth, same project/approach as Star Tiles).
// Guest play is the default. The button stays hidden until Apple is enabled in Supabase AND the
// hexmerge_profiles table exists (see APPLE_LOGIN_SETUP.md). The anon key is public; RLS limits each user to their own row.
'use strict';
(function(){
const SB_URL='https://etfhuwopqjderqutlyhk.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Zmh1d29wcWpkZXJxdXRseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODY4NjAsImV4cCI6MjEwNzU2Mjg2MH0.nVq3VqCYn3fRByCUle0u8_4almvp31oafR4LaHrE7TA';
const T='hexmerge_profiles',REDIRECT=location.origin+location.pathname;let sb=null,user=null,ready=false,pushT=null;
try{if(window.supabase&&supabase.createClient)sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'hexmerge.sb'}});}catch(e){}
const st=t=>{const e=$('acStatus');if(e)e.textContent=t||'';};
// what we sync: wallet, cosmetics/xp/bag/chests (profile.ext), stats, badges, ranks, best scores
const SYNC=['coins','games','wins','ext','ach','rk','best','name'];
function snapLocal(){const d={};SYNC.forEach(k=>d[k]=profile[k]);return d;}
function merge(cloud,local){// first sign-in on this device: add guest progress on top of the account
 const out=Object.assign({},cloud);out.coins=(cloud.coins|0)+Math.max(0,(local.coins|0)-L.START_COINS);out.games=(cloud.games|0)+(local.games|0);out.wins=(cloud.wins|0)+(local.wins|0);
 out.ach=Object.assign({},local.ach||{},cloud.ach||{});out.best=Object.assign({},local.best||{},cloud.best||{});
 const ce=cloud.ext||{},le=local.ext||{},e=Object.assign({},le,ce);
 const cc=ce.cos||{owned:[]},lc=le.cos||{owned:[]};e.cos=Object.assign({},lc,cc,{owned:[...new Set([...(cc.owned||[]),...(lc.owned||[])])]});
 e.inv={};['double','bomb','cross'].forEach(k=>e.inv[k]=((ce.inv||{})[k]|0)+((le.inv||{})[k]|0));e.shards=(ce.shards|0)+(le.shards|0);e.wild=(ce.wild|0)+(le.wild|0);
 const cx=ce.xp||{xp:0,lvl:1},lx=le.xp||{xp:0,lvl:1};e.xp=(cx.lvl>lx.lvl||cx.lvl===lx.lvl&&cx.xp>=lx.xp)?cx:lx; // keep the higher level
 out.ext=e;if(!out.name)out.name=local.name;return out;}
function applyData(d){if(!d)return;SYNC.forEach(k=>{if(d[k]!==undefined)profile[k]=d[k];});_save();try{Meta.X();showProfile();document.body.classList.length;}catch(e){}
 if(typeof g!=='undefined'&&g&&!g.over&&S&&S.me>=0&&!(S.mode==='online'||S.mode==='team-online'))g.coins[S.me]=profile.coins;}
const _save=saveProfile.bind(null);let pushing=false;
async function pull(){const {data,error}=await sb.from(T).select('*').eq('id',user.id).maybeSingle();if(error)throw error;return data;}
async function push(){if(!sb||!user||!navigator.onLine)return;const {error}=await sb.from(T).upsert({id:user.id,data:snapLocal()},{onConflict:'id'});if(error)st('Sync error: '+error.message);else st('✓ Synced');}
function schedule(){if(!user)return;clearTimeout(pushT);pushT=setTimeout(push,2500);}
// wrap saveProfile so every local change is synced shortly after
const _sp=saveProfile;saveProfile=function(){_sp();schedule();};
async function onUser(u){user=u;ui();if(!u)return;try{st('Syncing…');const row=await pull();const mk='hexmerge.merged.'+u.id;
  if(!row){await sb.from(T).upsert({id:u.id,data:snapLocal()},{onConflict:'id'});localStorage.setItem(mk,'1');st('✓ Your progress is saved to your account');}
  else if(!localStorage.getItem(mk)){const m=merge(row.data||{},snapLocal());applyData(m);localStorage.setItem(mk,'1');await push();toast('✓ Signed in — guest progress merged');}
  else{applyData(row.data);st('✓ Synced');}}catch(e){st('Could not sync: '+(e.message||e));}}
function ui(){const t=$('tAcct');if(t)t.style.display=ready?'':'none';if(!ready)return;$('acState').textContent=user?'Signed in'+(user.email?' as '+user.email:'')+'.':'Playing as guest.';
 $('acApple').style.display=user?'none':'';$('acOut').style.display=user?'':'none';}
async function check(){if(!sb)return;try{const s=await fetch(SB_URL+'/auth/v1/settings',{headers:{apikey:SB_KEY}}).then(r=>r.json());if(!s||!s.external||!s.external.apple)return;
  const r=await fetch(SB_URL+'/rest/v1/'+T+'?select=id&limit=1',{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}});if(r.status===404)return; // table not created yet
  ready=true;ui();}catch(e){}}
if(sb){sb.auth.onAuthStateChange((ev,ses)=>{const u=ses&&ses.user||null;if((u&&u.id)!==(user&&user.id))onUser(u);});
 sb.auth.getSession().then(({data})=>{if(data&&data.session)onUser(data.session.user);});}
$('tAcct').onclick=()=>{ui();ov('acctov');};
$('acApple').onclick=async()=>{if(!sb)return;st('Opening Apple…');const {error}=await sb.auth.signInWithOAuth({provider:'apple',options:{redirectTo:REDIRECT}});if(error)st('Sign-in failed: '+error.message);};
$('acOut').onclick=async()=>{await push();await sb.auth.signOut();user=null;ui();st('Signed out — this device keeps playing as a guest.');};
window.Account={get ready(){return ready;},get user(){return user;},get sb(){return sb;},merge,push};
check();
})();
