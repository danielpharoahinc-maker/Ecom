const { chromium, devices } = require('playwright');
const SUPA='https://kfnetfsyvhyysjjhpwue.supabase.co';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
const real={id:'real-1',aud:'authenticated',email:'danny@example.com',app_metadata:{provider:'email'},user_metadata:{}};
(async()=>{const b=await chromium.launch();
for(const scenario of ['stale-user+session','no-session']){
 const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const calls=[];let profile=null;let clubs=[];
 await ctx.route(`${SUPA}/**`,async r=>{const u=new URL(r.request().url());const m=r.request().method();if(m==='OPTIONS')return r.fulfill({status:200,headers:cors});
  const body=r.request().postData()||'';calls.push(m+' '+u.pathname+(m==='POST'&&u.pathname.includes('profiles')?' '+body.slice(0,80):''));
  const J=(o,s=200)=>r.fulfill({status:s,headers:cors,contentType:'application/json',body:JSON.stringify(o)});
  if(u.pathname.endsWith('/auth/v1/user'))return J(real);
  if(u.pathname==='/rest/v1/profiles'&&m==='GET')return J(profile?[{id:profile.id,pro_until:new Date(Date.now()+20*864e5).toISOString()}]:[]);
  if(u.pathname==='/rest/v1/profiles'&&m==='POST'){profile=JSON.parse(body);if(Array.isArray(profile))profile=profile[0];return r.fulfill({status:201,headers:cors,body:''});}
  if(u.pathname==='/rest/v1/rpc/create_club'){clubs=[{id:'c1',name:JSON.parse(body).club_name,code:'ABC234',owner:real.id}];return J([{id:'c1',code:'ABC234'}]);}
  if(u.pathname==='/rest/v1/clubs')return J(clubs);
  if(u.pathname==='/rest/v1/rpc/club_board')return J(profile?[{user_id:real.id,name:profile.name,goals:3,done_today:0,streak:0}]:[]);
  if(u.pathname==='/rest/v1/rpc/my_billing')return J([]);
  if(['/rest/v1/proofs','/rest/v1/respects'].includes(u.pathname)&&m==='GET')return J([]);
  return r.fulfill({status:201,headers:cors,body:''});});
 await p.goto('http://localhost:8765/');
 await p.evaluate(async({sc,real})=>{
  if(sc==='stale-user+session')localStorage.setItem('sb-kfnetfsyvhyysjjhpwue-auth-token',JSON.stringify({access_token:'a.b.c',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user:real}));
  const db=await new Promise(r=>{const q=indexedDB.open('proof-db',1);q.onupgradeneeded=()=>{const d=q.result;['kv','media'].forEach(n=>d.createObjectStore(n));d.createObjectStore('proofs',{keyPath:'id'});d.createObjectStore('clubs',{keyPath:'id'});};q.onsuccess=()=>r(q.result);});
  const tx=db.transaction(['kv'],'readwrite');tx.objectStore('kv').put({id:'OLD-LOCAL-ID',email:'x',name:'Danny',provider:'email',local:true},'user');
  tx.objectStore('kv').put({name:'Danny',commitments:['train','build','faith'],goalLog:[{ts:Date.now()-5*864e5,keys:['train','build','faith']}],createdAt:Date.now()-5*864e5,onboarded:true,tourDone:true,firstProofDone:true,inviteNudged:true,remindersAsked:true,lastReview:Date.now()},'profile');
  await new Promise(r=>tx.oncomplete=r);},{sc:scenario,real});
 await p.reload();await p.waitForTimeout(1200);
 if(scenario==='no-session'){console.log('[no session + old local user] shows sign-in screen:',await p.locator('.welcome').count()===1);await ctx.close();continue;}
 await p.waitForSelector('.cm-list');
 const uid=await p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('proof-db',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('user');g.onsuccess=()=>r(g.result.id);};}));
 console.log('[stale user+session] stored user id replaced with real login:',uid==='real-1');
 await p.waitForTimeout(4200);if(await p.locator('.sheet-wrap').count())await p.keyboard.press('Escape');await p.waitForTimeout(500);await p.click('[data-tab=club]');await p.waitForTimeout(3000);await p.waitForSelector('[data-create], .board',{timeout:3000});
 console.log(' profile saved to server before club loads:',!!profile,'| as id:',profile&&profile.id);
 await p.click('[data-create]');await p.waitForSelector('#cname');await p.fill('#cname','Test Club');await p.click('.sheet [type=submit]');
 await p.waitForSelector('.board',{timeout:8000});
 console.log(' club created, board shows:',(await p.locator('.board .brow-n b').allInnerTexts()).join(', '));
 console.log(' ERR',errs);await ctx.close();}
await b.close();})();
