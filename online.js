// Hex Merge online rooms. Same transport approach as Star Tiles (mq.js: MQTT over WebSocket to public brokers,
// every move stored as a retained message so a returning phone replays history). Each move carries the sender's
// full resulting game state (authoritative totals, like Star Tiles v71), so all phones always agree.
const Online=(function(){
 const T=c=>'hexmerge/v1/'+c,GK='hexmerge.online';
 const st={on:false,code:null,id:null,me:-1,host:false,size:2,seats:[],applied:0,log:[],buf:{},started:false,h:{},seen:new Set()};
 const rnd=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
 const uid=()=>Math.random().toString(36).slice(2,10);
 function topic(m){if(m.t==='act')return T(st.code)+'/a/'+m.n;if(m.t==='chat')return T(st.code)+'/c/'+m.u;if(m.t==='hello')return T(st.code)+'/h/'+m.id;return T(st.code)+'/'+m.t;}
 const RET={act:1,chat:1,hello:1,room:1,start:1,rematch:1};
 function send(m){m.from=st.id;m.u=m.u||uid();const n=MQ.pub(topic(m),JSON.stringify(m),!!RET[m.t]);if(!n){Q.push(m);}return n;}
 const Q=[];function flush(){const q=Q.splice(0);q.forEach(send);}
 function persist(){if(!st.code)return;try{const m=JSON.parse(localStorage.getItem(GK)||'{}');m[st.code]={code:st.code,id:st.id,me:st.me,host:st.host,size:st.size,seats:st.seats,log:st.log.slice(-1),applied:st.applied,seed:st.seed,started:st.started,over:!!st.over,at:Date.now(),snap:st.snap||null};
  for(const k in m)if(Date.now()-(m[k].at||0)>7*864e5)delete m[k];localStorage.setItem(GK,JSON.stringify(m));}catch(e){}}
 function saved(){try{const m=JSON.parse(localStorage.getItem(GK)||'{}');return Object.values(m).filter(o=>o.started&&!o.over&&Date.now()-(o.at||0)<864e5).sort((a,b)=>b.at-a.at)[0]||null;}catch(e){return null;}}
 function clear(code){try{const m=JSON.parse(localStorage.getItem(GK)||'{}');delete m[code];localStorage.setItem(GK,JSON.stringify(m));}catch(e){}}
 function onMsg(tp,payload){const parts=tp.split('/');if(parts[2]!==st.code||!st.on)return;let d;try{d=JSON.parse(payload);}catch(e){return;}if(!d)return;
  if(d.u){if(st.seen.has(d.u))return;st.seen.add(d.u);}
  if(d.t==='hello'&&st.host&&!st.started){if(!st.seats.some(s=>s.id===d.id)&&st.seats.length<st.size){st.seats.push({id:d.id,name:String(d.name||'Player').slice(0,14),coins:d.coins|0});room();}return;}
  if(d.t==='room'&&!st.host){st.seats=d.seats;st.size=d.size;st.h.room&&st.h.room();return;}
  if(d.t==='start'){if(st.started&&d.from===st.id)return;const me=d.seats.findIndex(s=>s.id===st.id);if(me<0&&!st.host){st.h.status&&st.h.status('This room is full');return;}
   if(!st.started){st.started=true;st.seats=d.seats;st.size=d.size;st.me=me;st.seed=d.seed;persist();st.h.start&&st.h.start(d);}return;}
  if(d.t==='act'){if(typeof d.n!=='number'||d.n<st.applied)return;st.buf[d.n]=d;drain();if(d.n>st.applied)send({t:'need',have:st.applied});return;}
  if(d.t==='need'){for(let n=d.have;n<st.log.length;n++)if(st.log[n]&&st.log[n].from===st.id)send(Object.assign({},st.log[n],{u:uid()}));return;}
  if(d.t==='chat'){if(d.from===st.id)return;st.h.chat&&st.h.chat(d);return;}
  if(d.t==='rematch'){if(d.from!==st.id)st.h.rematch&&st.h.rematch(d);return;}
  if(d.t==='bye'){if(d.from!==st.id)st.h.bye&&st.h.bye(d);return;}}
 let draining=false;
 async function drain(){if(draining)return;draining=true;try{while(st.buf[st.applied]){const d=st.buf[st.applied];delete st.buf[st.applied];
   if(d.from===st.id&&st.log[d.n]){st.applied++;continue;}st.log[d.n]=d;st.applied++;st.snap=d.snap;persist();if(st.h.act)await st.h.act(d);}}finally{draining=false;}}
 function room(){send({t:'room',size:st.size,seats:st.seats});st.h.room&&st.h.room();}
 function listen(){MQ.sub(T(st.code)+'/#');}
 if(typeof MQ!=='undefined')MQ.start(onMsg,m=>{if(/connected$/.test(m)){setTimeout(flush,300);st.h.net&&st.h.net();}});
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')MQ.wake();});
 return {st,saved,clear,persist,
  host(name,coins,size,h){Object.assign(st,{on:true,host:true,code:rnd(),id:uid(),me:0,size,seats:[{id:null,name,coins}],applied:0,log:[],buf:{},started:false,over:false,h,seen:new Set(),snap:null});st.seats[0].id=st.id;listen();setTimeout(room,400);return st.code;},
  join(code,name,coins,h){code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');Object.assign(st,{on:true,host:false,code,id:uid(),me:-1,seats:[],applied:0,log:[],buf:{},started:false,over:false,h,seen:new Set(),snap:null});listen();
   const hi=()=>{if(!st.started)send({t:'hello',id:st.id,name,coins});};hi();setTimeout(hi,2500);setTimeout(hi,7000);return code;},
  addCpu(){if(!st.host||st.started||st.seats.length>=st.size)return;st.seats.push({id:'cpu'+uid(),name:'CPU',coins:100,cpu:true});room();},
  start(seed){st.started=true;st.seed=seed;st.me=0;send({t:'start',seed,size:st.size,seats:st.seats});persist();},
  resume(s,h){Object.assign(st,{on:true,seed:s.seed,host:s.host,code:s.code,id:s.id,me:s.me,size:s.size,seats:s.seats,applied:s.applied,log:[],buf:{},started:true,over:false,h,seen:new Set(),snap:s.snap});listen();setTimeout(()=>send({t:'need',have:st.applied}),1500);},
  act(a,snap){const m={t:'act',n:st.applied,a,snap,by:st.me};m.from=st.id;st.log[st.applied]=m;st.applied++;st.snap=snap;persist();send(m);},
  cpuAct(a,snap,seat){const m={t:'act',n:st.applied,a,snap,by:seat};m.from=st.id;st.log[st.applied]=m;st.applied++;st.snap=snap;persist();send(m);},
  chat(name,txt,sys,extra){send(Object.assign({t:'chat',name,txt,sys:sys||'',ts:Date.now(),seat:st.me},extra||{}));},
  rematch(code){send({t:'rematch',code});},
  over(){st.over=true;persist();},
  leave(){if(st.code)MQ.unsub(T(st.code)+'/#');st.on=false;},
  get up(){return MQ.up;}};
})();
