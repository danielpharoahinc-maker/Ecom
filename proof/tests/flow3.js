const { chromium, devices } = require('playwright');
const SUPA='https://kfnetfsyvhyysjjhpwue.supabase.co';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
const anon={id:'g-1',aud:'authenticated',email:'',is_anonymous:true,app_metadata:{provider:'anonymous'},user_metadata:{}};
const mock=(state)=>async r=>{const u=new URL(r.request().url());const m=r.request().method();if(m==='OPTIONS')return r.fulfill({status:200,headers:cors});state.calls.push(m+' '+u.pathname);const body=r.request().postData()||'';
 const J=(o,s=200)=>r.fulfill({status:s,headers:cors,contentType:'application/json',body:JSON.stringify(o)});
 if(u.pathname.endsWith('/signup'))return J({access_token:'a.b.c',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user:anon});
 if(u.pathname.endsWith('/otp'))return J({});
 if(u.pathname.endsWith('/logout'))return r.fulfill({status:204,headers:cors,body:''});
 if(u.pathname.endsWith('/auth/v1/user'))return m==='PUT'?J({...anon,new_email:'x@y.co'}):J(anon);
 if(u.pathname==='/rest/v1/profiles'&&m==='GET')return J(state.profile?[{id:'g-1',pro_until:new Date(Date.now()+20*864e5).toISOString()}]:[]);
 if(u.pathname==='/rest/v1/profiles'&&m==='POST'){state.profile=JSON.parse(body);return r.fulfill({status:201,headers:cors,body:''});}
 if(u.pathname==='/rest/v1/rpc/join_club'){state.joined=JSON.parse(body).invite;return J('c1');}
 if(u.pathname==='/rest/v1/clubs')return J(state.joined?[{id:'c1',name:'Brothers',code:state.joined,owner:'x'}]:[]);
 if(u.pathname==='/rest/v1/rpc/club_board')return J([{user_id:'x',name:'Sipho',goals:3,done_today:2,streak:5}]);
 if(u.pathname==='/rest/v1/rpc/my_billing')return J([]);
 if(['/rest/v1/proofs','/rest/v1/respects'].includes(u.pathname)&&m==='GET')return J([]);
 return r.fulfill({status:201,headers:cors,body:''});};
(async()=>{const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
// A) returning user, signed out
{const ctx=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const p=await ctx.newPage();const st={calls:[]};const errs=[];p.on('pageerror',e=>errs.push(e.message));await ctx.route(`${SUPA}/**`,mock(st));
 await p.goto('http://localhost:8765/');
 await p.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('proof-db',1);q.onupgradeneeded=()=>{const d=q.result;['kv','media'].forEach(n=>d.createObjectStore(n));d.createObjectStore('proofs',{keyPath:'id'});d.createObjectStore('clubs',{keyPath:'id'});};q.onsuccess=()=>r(q.result);});
 const tx=db.transaction(['kv'],'readwrite');tx.objectStore('kv').put({name:'Danny',commitments:['train'],goalLog:[{ts:1,keys:['train']}],createdAt:Date.now()-9*864e5,onboarded:true,tourDone:true},'profile');await new Promise(r=>tx.oncomplete=r);});
 await p.reload();await p.waitForSelector('.email-form',{timeout:8000});
 console.log('A returning signed-out user sees sign-in:',(await p.locator('.welcome h1').innerText()).trim(),'| age/parent asked:',await p.locator('[name=parent]').count());
 await p.fill('#email','danny@example.com');console.log('  email only -> button disabled:',await p.locator('.email-form [type=submit]').isDisabled());
 await p.check('[name=agree]');console.log('  + terms -> enabled:',!(await p.locator('.email-form [type=submit]').isDisabled()));
 await p.click('.email-form [type=submit]');await p.waitForSelector('.wait-step',{timeout:6000});
 console.log('  link sent, waiting screen, no code box:',(await p.locator('.wait-step').innerText()).replace(/\s+/g,' ').slice(0,70),'|',await p.locator('#otp').count(),'| otp call:',st.calls.some(c=>c.endsWith('/otp')));console.log('  ERR',errs);await ctx.close();}
// B) invite link through the new flow
{const ctx=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block',permissions:['camera','microphone']});const p=await ctx.newPage();const st={calls:[]};const errs=[];p.on('pageerror',e=>errs.push(e.message));await ctx.route(`${SUPA}/**`,mock(st));
 await p.goto('http://localhost:8765/?join=abc234');await p.waitForSelector('[data-start]');
 console.log('B invite banner on intro:',(await p.locator('.invite-banner').innerText()).trim());
 await p.click('[data-start]');await p.waitForSelector('.ob');
 await p.locator('.choice').first().click();await p.click('[data-next]');await p.waitForTimeout(300);await p.locator('.choice').nth(2).click();await p.click('[data-next]');await p.waitForTimeout(300);
 for(const k of ['train','build','faith'])await p.locator(`.ctile[data-k="${k}"]`).click();await p.click('[data-next]');await p.waitForTimeout(300);
 await p.fill('#name','Friend');await p.click('[data-next]');await p.waitForTimeout(400);
 await p.waitForSelector('.wheel');await p.locator('.wheel').evaluate(e=>e.scrollTo({top:8*46}));await p.waitForTimeout(500);await p.click('[data-next]');await p.waitForTimeout(400);
 await p.check('[name=agree]');await p.fill('#email','friend@example.com');await p.click('.acct [type=submit]');await p.waitForSelector('[data-perm]',{timeout:8000});
 await p.click('[data-next]');await p.waitForTimeout(3000);
 console.log('  joined the club after setup:',st.joined,'| invite cleared:',await p.evaluate(()=>localStorage.getItem('proof:join')===null));
 console.log('  ERR',errs);await ctx.close();}
await b.close();})();
