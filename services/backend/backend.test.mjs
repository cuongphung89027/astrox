import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {testEnv} from '../admin/test/sqlite.mjs';
import {defaultConfig} from '../admin/config.ts';
import {state,saveDraft,publish} from '../admin/store.mjs';
import {legacySnapshot, runtimeSettings, capabilities} from './config.mjs';
import {sessionCookie,readSession,verifyZaloUser,zaloCallback,zaloFinish} from './auth.mjs';
import {payosSignature,handlePayosWebhook,handleTopupCreate} from './payments.mjs';

async function fixture(){
 const env=testEnv();
 for(const q of readFileSync(new URL('./test/legacy-schema.sql',import.meta.url),'utf8').split(';').filter(s=>s.trim()))await env.DB.prepare(q).run();
 for(const q of readFileSync(new URL('../../migrations/backend.sql',import.meta.url),'utf8').split(';').filter(s=>s.trim()))await env.DB.prepare(q).run();
 Object.assign(env,{SESSION_SECRET:'test-session-secret',PAYOS_CLIENT_ID:'client',PAYOS_API_KEY:'test-api',PAYOS_CHECKSUM_KEY:'test-checksum',ZALO_APP_ID:'123456',ZALO_APP_SECRET:'test-zalo',ZALO_REDIRECT_URI:'https://api.example.com/auth/zalo/callback'});
 await env.DB.prepare("INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('u1','User','active','2026-01-01','2026-01-01')").run();
 await env.DB.prepare("INSERT INTO zalo_point_accounts VALUES('u1',10,'2026-01-01')").run();
 await env.DB.prepare("INSERT INTO topup_packages VALUES('old',50000,55,'50k',1,1,'2026-01-01')").run();
 return env;
}
async function published(env,change){await state(env);const c=defaultConfig();c.billing.enabled=true;c.integrations.payos={enabled:true,clientId:'client',returnUrl:'https://theastrox.space/hoso',cancelUrl:'https://theastrox.space/hoso',expiryMinutes:30};c.billing.packages=[{id:'new',name:'New',amountVnd:60000,mode:'fixed',fixedPoints:70,bonus:5,enabled:true,featured:false}];change?.(c);await saveDraft(env,'test',c,0);await publish(env,'test',c,1,'test');return c;}
test('imports legacy packages and connection readiness without keys or customer data',async()=>{const env=await fixture(),s=await legacySnapshot(env);assert.equal(s.packages[0].points,55);assert.equal(s.integrations.zalo.appId,'123456');assert.ok(s.inheritedSecrets.includes('payos:apiKey'));assert.ok(!JSON.stringify(s).includes('test-api'));assert.equal(capabilities(env).features.paidAi,false);assert.equal(capabilities(env).features.rewards,false)});
test('published configuration wins over legacy tables and retains env credentials',async()=>{const env=await fixture();await published(env);const s=await runtimeSettings(env);assert.equal(s.packages[0].amount_vnd,60000);assert.equal(s.packages[0].points,75);assert.equal(s.env.PAYOS_API_KEY,'test-api');assert.equal(s.revision,1)});
test('legacy session signature remains valid, expired and missing-secret sessions fail closed',async()=>{const env=await fixture();const cookie=(await sessionCookie(env,'u1')).split(';')[0];assert.equal((await readSession(env,new Request('https://api.example.com',{headers:{cookie}}))).sub,'u1');assert.equal(await readSession({...env,SESSION_SECRET:''},new Request('https://api.example.com',{headers:{cookie}})),null);const expired=(await sessionCookie(env,'u1',Date.now()-31*86400000)).split(';')[0];assert.equal(await readSession(env,new Request('https://api.example.com',{headers:{cookie:expired}})),null)});
test('Zalo identity is obtained from provider and client identity cannot substitute for verification',async()=>{const verified=await verifyZaloUser('test-token',async()=>Response.json({id:'provider-id',name:'Verified'}));assert.equal(verified.id,'provider-id');await assert.rejects(()=>verifyZaloUser('test-token',async()=>Response.json({error:-1})),/zalo_identity_unverified/)});
async function order(env){await env.DB.prepare("INSERT INTO topup_orders_zalo(id,user_id,order_code,amount_vnd,points,status,idempotency_key,created_at) VALUES('o1','u1',12345,50000,55,'pending','order1','2026-01-01')").run();}
async function webhook(env,patch={}){const data={orderCode:12345,amount:50000,code:'00',...patch};const signature=await payosSignature(env.PAYOS_CHECKSUM_KEY,data);return new Request('https://api.example.com/api/webhooks/payos',{method:'POST',body:JSON.stringify({code:'00',success:true,data,signature})});}
test('PayOS webhook credits once and keeps old order points after config changes',async()=>{const env=await fixture();await order(env);await published(env,c=>{c.integrations.payos.enabled=false});assert.equal((await handlePayosWebhook(env,await webhook(env))).status,200);assert.equal((await handlePayosWebhook(env,await webhook(env))).status,200);assert.equal((await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='u1'").first()).balance,65);assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM zalo_point_ledger').first()).n,1);assert.equal((await env.DB.prepare("SELECT status FROM topup_orders_zalo WHERE id='o1'").first()).status,'paid')});
test('invalid webhook signature or amount never changes balances',async()=>{const env=await fixture();await order(env);const bad=new Request('https://api.example.com/api/webhooks/payos',{method:'POST',body:JSON.stringify({data:{orderCode:12345,amount:50000,code:'00'},signature:'forged'})});assert.equal((await handlePayosWebhook(env,bad)).status,400);await handlePayosWebhook(env,await webhook(env,{amount:1}));assert.equal((await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='u1'").first()).balance,10)});
test('credit failure rolls back ledger and order status, so webhook retry can succeed',async()=>{const env=await fixture();await order(env);await env.DB.prepare("CREATE TRIGGER reject_credit BEFORE UPDATE ON zalo_point_accounts BEGIN SELECT RAISE(ABORT,'test rollback'); END").run();const request=await webhook(env);await assert.rejects(()=>handlePayosWebhook(env,request),/test rollback/);assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM zalo_point_ledger').first()).n,0);assert.equal((await env.DB.prepare("SELECT status FROM topup_orders_zalo WHERE id='o1'").first()).status,'pending');await env.DB.prepare('DROP TRIGGER reject_credit').run();await handlePayosWebhook(env,await webhook(env));assert.equal((await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='u1'").first()).balance,65);
});
test('new payment uses published package and stores snapshot before upstream',async()=>{const env=await fixture();await published(env);const cookie=(await sessionCookie(env,'u1')).split(';')[0];let sent;
 const response=await handleTopupCreate(env,new Request('https://api.example.com/api/topup/create',{method:'POST',headers:{cookie,origin:'https://theastrox.space'},body:JSON.stringify({amount_vnd:60000})}),async(url,init)=>{sent=JSON.parse(init.body);assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM backend_order_snapshots').first()).n,1);const data={checkoutUrl:'https://pay.payos.vn/test',paymentLinkId:'link',orderCode:sent.orderCode,amount:60000};return Response.json({code:'00',data,signature:await payosSignature(env.PAYOS_CHECKSUM_KEY,data)})});
 assert.equal(response.status,200);assert.equal((await response.json()).points,75);assert.equal(sent.returnUrl,'https://theastrox.space/hoso');assert.ok(sent.expiredAt);const snap=await env.DB.prepare('SELECT * FROM backend_order_snapshots').first();assert.equal(snap.config_revision,1);
});
test('public routing never exposes internal configuration endpoints',async()=>{const {publicFetch}=await import('./handler.mjs');const env=await fixture();for(const path of ['/internal/admin/capabilities','/internal/admin/bootstrap','/internal/admin/users'])assert.equal((await publicFetch(new Request('https://astrox-internal'+path,{headers:{'x-admin-actor':'fake'}}),env)).status,404)});
test('legacy import retains exact package totals and maps active services',async()=>{const {importLegacyConfig}=await import('../admin/backend.mjs');const env=await fixture();const c=importLegacyConfig(defaultConfig(),await legacySnapshot(env));assert.equal(c.billing.packages[0].fixedPoints,55);assert.equal(c.integrations.payos.enabled,true);assert.equal(c.billing.enabled,true);assert.equal(c.billing.services.find(s=>s.id==='tuvi').status,'free')});
test('promotion reservations prevent concurrent oversubscription before payment',async()=>{const env=await fixture();await published(env,c=>{c.billing.promos=[{id:'once',code:'ONCE',bonus:10,limit:1,perUser:1,enabled:true,expiresAt:''}]});const cookie=(await sessionCookie(env,'u1')).split(';')[0];const req=()=>new Request('https://api.example.com/api/topup/create',{method:'POST',headers:{cookie,origin:'https://theastrox.space'},body:JSON.stringify({amount_vnd:60000,promo_code:'ONCE'})});const upstream=async(url,init)=>{const b=JSON.parse(init.body),data={orderCode:b.orderCode,amount:b.amount,checkoutUrl:'https://pay.payos.vn/test',paymentLinkId:'link'};return Response.json({code:'00',data,signature:await payosSignature(env.PAYOS_CHECKSUM_KEY,data)})};assert.equal((await handleTopupCreate(env,req(),upstream)).status,200);const second=await handleTopupCreate(env,req(),upstream);assert.equal(second.status,400);assert.equal((await second.json()).error,'promo_exhausted')});
test('new orders disabled in Admin do not reach PayOS',async()=>{const env=await fixture();await published(env,c=>{c.billing.enabled=false});const cookie=(await sessionCookie(env,'u1')).split(';')[0];let called=false;const r=await handleTopupCreate(env,new Request('https://api.example.com/api/topup/create',{method:'POST',headers:{cookie,origin:'https://theastrox.space'},body:JSON.stringify({amount_vnd:50000})}),async()=>{called=true;throw Error()});assert.equal(r.status,503);assert.equal(called,false)});
// Workers reject redirect:'error' at fetch() argument validation, before any network call,
// so an unsupported value throws TypeError and surfaces as a 503 instead of the intended error.
test('outbound fetches only use redirect modes the Workers runtime accepts',async()=>{
 const sources=['./auth.mjs','./payments.mjs','../admin/runtime.mjs'].map(f=>readFileSync(new URL(f,import.meta.url),'utf8'));
 for(const src of sources)for(const [,mode] of src.matchAll(/redirect:\s*'([^']+)'/g))assert.ok(['follow','manual'].includes(mode),`unsupported redirect mode: ${mode}`);
 const modes=sources.join('').matchAll(/redirect:\s*'([^']+)'/g);
 assert.ok([...modes].length>=3,'expected outbound fetches to pin an explicit redirect mode');
});
// Failed Zalo logins must persist a sanitized diagnostic row so production
// can be triaged from D1 even when the user never reports the error text.
test('failed Zalo callbacks persist diagnostics without leaking tokens',async()=>{const env=await fixture();
 const rejected=await zaloCallback(env,new Request('https://api.example.com/auth/zalo/callback?state=s&code=c'),{},async()=>{throw Error('unused')});
 assert.equal(rejected.status,400);
 let row=await env.DB.prepare('SELECT stage,detail FROM login_diagnostics ORDER BY id DESC LIMIT 1').first();
 assert.equal(row.stage,'callback_rejected');assert.ok(JSON.parse(row.detail).zalo_error===null);
 await env.DB.prepare('INSERT INTO oauth_states(id,code_verifier,created_at) VALUES(?,?,?)').bind('st1','v',new Date().toISOString()).run();
 const exchanged=await zaloCallback(env,new Request('https://api.example.com/auth/zalo/callback?state=st1&code=x',{headers:{cookie:'astrox_oauth=st1'}}),{zalo:{returnUrl:'https://theastrox.space/'}},async()=>Response.json({error_name:'invalid_code'},{status:400}));
 assert.equal(exchanged.status,502);assert.equal((await exchanged.json()).error,'token_exchange_failed');
 row=await env.DB.prepare('SELECT stage,detail FROM login_diagnostics ORDER BY id DESC LIMIT 1').first();
 assert.equal(row.stage,'token_exchange_failed');assert.ok(row.detail.includes('"status":400'));assert.ok(!row.detail.toLowerCase().includes('token'));
 await env.DB.prepare('INSERT INTO oauth_states(id,code_verifier,created_at) VALUES(?,?,?)').bind('st2','v',new Date().toISOString()).run();
 const zaloFetch=async(url)=>url.includes('access_token')?Response.json({access_token:'secret-access-token',refresh_token:'secret-refresh'}):Response.json({error:-501});
 const fallback=await zaloCallback(env,new Request('https://api.example.com/auth/zalo/callback?state=st2&code=x',{headers:{cookie:'astrox_oauth=st2'}}),{zalo:{returnUrl:'https://theastrox.space/'}},zaloFetch);
 assert.equal(fallback.status,302);
 const finishUrl=new URL(fallback.headers.get('location'),'https://api.example.com'),pendingId=finishUrl.searchParams.get('id');
 row=await env.DB.prepare('SELECT stage,detail FROM login_diagnostics ORDER BY id DESC LIMIT 1').first();
 assert.equal(row.stage,'server_verify_failed_fallback');assert.ok(!row.detail.includes('secret'));
 const page=await zaloFinish(env,new Request(finishUrl.href),{zalo:{returnUrl:'https://theastrox.space/'}});
 assert.equal(page.status,200);assert.ok((await page.text()).includes('graph.zalo.me'));
 const forged=await zaloFinish(env,new Request('https://api.example.com/auth/zalo/finish',{method:'POST',body:JSON.stringify({id:pendingId,token:'wrong-token',me:{id:'zp-new',name:'Fake'}})}),{zalo:{}});
 assert.equal(forged.status,401);
 const consumed=await zaloFinish(env,new Request('https://api.example.com/auth/zalo/finish',{method:'POST',body:JSON.stringify({id:pendingId,token:'secret-access-token',me:{id:'zp-new',name:'Real User'}})}),{zalo:{}});
 assert.equal(consumed.status,400);
 await env.DB.prepare('INSERT INTO oauth_states(id,code_verifier,created_at) VALUES(?,?,?)').bind('st3','v',new Date().toISOString()).run();
 const fallback2=await zaloCallback(env,new Request('https://api.example.com/auth/zalo/callback?state=st3&code=x',{headers:{cookie:'astrox_oauth=st3'}}),{zalo:{returnUrl:'https://theastrox.space/'}},zaloFetch);
 const pid2=new URL(fallback2.headers.get('location'),'https://api.example.com').searchParams.get('id');
 const done=await zaloFinish(env,new Request('https://api.example.com/auth/zalo/finish',{method:'POST',body:JSON.stringify({id:pid2,token:'secret-access-token',me:{id:'zp-new',name:'Real User'}})}),{zalo:{returnUrl:'https://theastrox.space/'}});
 assert.equal(done.status,200);assert.equal((await done.json()).ok,true);assert.ok(done.headers.get('set-cookie')?.includes('astrox_session='));
 const created=await env.DB.prepare("SELECT u.id,u.display_name FROM app_users u JOIN zalo_identities i ON i.user_id=u.id WHERE i.provider_subject='zp-new'").first();
 assert.equal(created.display_name,'Real User');assert.ok(await env.DB.prepare('SELECT user_id FROM zalo_point_accounts WHERE user_id=?').bind(created.id).first());
});
