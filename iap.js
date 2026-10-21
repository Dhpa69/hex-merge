// Hex Merge v11: real-money shop (Star Tiles style). StoreKit 2 via @capgo/native-purchases — ONLY inside the iPhone app.
// On the website the shop shows an "available in the iPhone app" note instead of prices.
'use strict';
(function(){
const CAP=window.Capacitor,native=!!(CAP&&CAP.isNativePlatform&&CAP.isNativePlatform()),NP=native&&CAP.Plugins&&CAP.Plugins.NativePurchases;
const B='com.dhavalpatel.hexmerge.';
const IAP=[
 {id:B+'coins500',coins:500,price:'$0.99'},
 {id:B+'coins1500',coins:1500,price:'$2.99'},
 {id:B+'coins3500',coins:3500,price:'$4.99'},
 {id:B+'coins8000',coins:8000,price:'$9.99',tag:'BEST VALUE'},
 {id:B+'coins20000',coins:20000,price:'$19.99'},
 {id:B+'removeads',nonConsumable:true,price:'$2.99',title:'🚫 Remove Ads',note:'No more ads between games or banners'},
 {id:B+'pro',nonConsumable:true,price:'$4.99',title:'⭐ Hex Merge Pro',note:'No ads + 2,000 coins (one time)',proCoins:2000,tag:'PRO'}];
const key=id=>id.split('.').pop(),products={};
const owned=()=>LS('hexmerge.iap.owned',{}),setOwned=o=>SS('hexmerge.iap.owned',o),seen=()=>LS('hexmerge.iap.tx',[]);
const noAds=()=>{const o=owned();return !!(o.removeads||o.pro);};
function own(it){const o=owned();if(o[key(it.id)])return;o[key(it.id)]=true;
 if(it.proCoins&&!o.proCoins){o.proCoins=true;addCoins(it.proCoins);} // Pro coins are paid exactly once per device, even after Restore
 setOwned(o);}
// Credit a verified transaction once (de-duplicated by StoreKit transaction id, so a relaunch/replay never double-grants).
function grant(it,tx){if(tx){const s=seen();if(s.includes(String(tx)))return false;s.push(String(tx));SS('hexmerge.iap.tx',s.slice(-300));}
 if(it.coins)addCoins(it.coins);if(it.nonConsumable)own(it);saveProfile();try{SND.win();}catch(e){}
 toast(it.coins?'+'+it.coins.toLocaleString()+' 🪙 added!':'✓ '+it.title.replace(/^\S+\s/,'')+' unlocked',2200);return true;}
async function load(){if(!NP)return;try{const r=await NP.getProducts({productIdentifiers:IAP.map(p=>p.id),productType:'inapp'});(r.products||[]).forEach(p=>products[p.identifier]=p);}catch(e){console.warn('products',e);}}
const msgEl=t=>{const e=document.getElementById('iapMsg');if(e)e.textContent=t;};
let buying=false;
async function buy(id){const it=IAP.find(p=>p.id===id);if(!it)return;if(!NP){toast('Purchases are available in the iPhone app');return;}if(buying)return;buying=true;
 msgEl('Contacting the App Store…');try{const t=await NP.purchaseProduct({productIdentifier:id,productType:'inapp',quantity:1});grant(it,t&&(t.transactionId||t.id));msgEl('');}
 catch(e){const m=(e&&e.message)||String(e);msgEl(/cancel/i.test(m)?'':'Purchase failed: '+m);}buying=false;refresh();}
async function restore(){if(!NP){toast('Restore is available in the iPhone app');return;}msgEl('Restoring…');let n=0;
 try{try{await NP.restorePurchases();}catch(e){}const r=await NP.getPurchases({productType:'inapp'});
  for(const p of (r.purchases||[])){const it=IAP.find(x=>x.id===(p.productIdentifier||p.productId));if(it&&it.nonConsumable){own(it);n++;}}
  saveProfile();msgEl(n?'Restored ✓':'Nothing to restore');}catch(e){msgEl('Restore failed: '+((e&&e.message)||e));}refresh();}
// Silently re-apply owned Remove Ads / Pro on launch (e.g. reinstall with the same Apple ID). Never credits coin packs.
async function sync(){if(!NP)return;try{const r=await NP.getPurchases({productType:'inapp'});for(const p of (r.purchases||[])){const it=IAP.find(x=>x.id===(p.productIdentifier||p.productId));if(it&&it.nonConsumable)own(it);}saveProfile();}catch(e){}}
function html(){if(!native)return '<div class="iapbox"><h3>💰 Coin packs &amp; Remove Ads</h3><p class="small getapp">Coin packs, <b>Remove Ads</b> and <b>Pro</b> are available in the <b>Hex Merge iPhone app</b>. Keep earning coins here by playing, missions and chests!</p></div>';
 const o=owned();return '<div class="iapbox"><h3>💰 Get coins</h3><div class="iapg">'+IAP.map(p=>{const pr=products[p.id],ow=p.nonConsumable&&(o[key(p.id)]||(key(p.id)==='removeads'&&o.pro));
  return '<div class="iapi'+(p.tag==='BEST VALUE'?' best':'')+'">'+(p.tag?'<em>'+p.tag+'</em>':'')+'<b>'+(p.title||'🪙 '+p.coins.toLocaleString()+' coins')+'</b>'+(p.note?'<small>'+p.note+'</small>':'')+
  '<button class="btn" data-iap="'+p.id+'"'+(ow?' disabled':'')+'>'+(ow?'Owned ✓':(pr&&(pr.priceString||pr.localizedPrice))||p.price)+'</button></div>';}).join('')+
  '</div><small class="small" id="iapMsg"></small><button class="btn" id="iapRestore">Restore purchases</button><small class="small">Coin packs are consumable. Restore brings back Remove Ads and Pro on a new device.</small></div>';}
function refresh(){const l=document.getElementById('shopList');if(!l)return;const old=l.querySelector('.iapbox');if(old)old.remove();l.insertAdjacentHTML('afterbegin',html());}
const list=document.getElementById('shopList');
list.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.iap)buy(b.dataset.iap);else if(b.id==='iapRestore')restore();});
new MutationObserver(()=>{if(!list.querySelector('.iapbox'))refresh();}).observe(list,{childList:true});
function openShop(){Meta.openShop();refresh();load().then(refresh);const l=document.getElementById('shopList');if(l)l.scrollTop=0;}
// GET COINS entries: tap the coin balance (home + in game) or the button in the power-up menu.
['coinN','gCoinN','pcoins'].forEach(id=>{const e=document.getElementById(id);const t=id==='coinN'?e&&e.parentElement:e;if(t){t.style.cursor='pointer';t.addEventListener('click',ev=>{ev.stopPropagation();openShop();});}});
const pm=document.querySelector('#pmenu .pcard'),cancel=pm&&pm.querySelector('[data-p=cancel]');
if(pm&&!document.getElementById('pmShop')){const b=document.createElement('button');b.className='pbig getcoins';b.id='pmShop';b.innerHTML='🪙 GET COINS<small>Coin packs · Remove Ads · Pro</small>';
 b.onclick=e=>{e.stopPropagation();document.getElementById('pmenu').classList.remove('show');openShop();};pm.insertBefore(b,cancel);}
window.HMIap={noAds,openShop,products:IAP,native};
if(native){load();sync();}
})();
