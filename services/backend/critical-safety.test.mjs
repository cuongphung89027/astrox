import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {testEnv} from '../admin/test/sqlite.mjs';
import {zaloFinish,zaloCallback,sessionCookie} from './auth.mjs';
import {publicFetch,internalFetch} from './handler.mjs';
import {defaultConfig} from '../admin/config.ts';
import {state,publish} from '../admin/store.mjs';
async function fixture(){
 const env=testEnv();
 for(const file of ['./test/legacy-schema.sql','../../migrations/backend.sql','../../migrations/rewards.sql'])for(const q of readFileSync(new URL(file,import.meta.url),'utf8').split(';').filter(s=>s.trim()))await env.DB.prepare(q).run();
 Object.assign(env,{SESSION_SECRET:'test-session-secret',APP_ORIGIN:'https://theastrox.space'});
 await env.DB.prepare("INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('victim','Victim','active','2026-01-01','2026-01-01')").run();
 await env.DB.prepare("INSERT INTO zalo_identities VALUES('identity','victim','zalo','victim-zalo','2026-01-01')").run();
 await env.DB.prepare("INSERT INTO zalo_point_accounts VALUES('victim',100,'2026-01-01')").run();return env;
}
test('a valid escrow token plus forged client identity can never issue a victim session',async()=>{
 const env=await fixture();await env.DB.prepare('INSERT INTO zalo_pending_tokens VALUES(?,?,?)').bind('pending','attacker-token',new Date().toISOString()).run();
 const response=await zaloFinish(env,new Request('https://api.theastrox.space/auth/zalo/finish',{method:'POST',body:JSON.stringify({id:'pending',token:'attacker-token',me:{id:'victim-zalo'}})}),{zalo:{returnUrl:env.APP_ORIGIN}});
 assert.equal(response.headers.has('set-cookie'),false);assert.ok(response.status>=400);
});
test('unverified provider identity never falls back to browser-controlled identity or exposes token',async()=>{
 const env=await fixture();await env.DB.prepare('INSERT INTO oauth_states VALUES(?,?,?)').bind('state','verifier',new Date().toISOString()).run();
 const r=await zaloCallback(env,new Request('https://api.theastrox.space/auth/zalo/callback?state=state&code=c',{headers:{cookie:'astrox_oauth=state'}}),{zalo:{returnUrl:env.APP_ORIGIN}},async url=>url.includes('oauth.zaloapp')?Response.json({access_token:'private-token'}):Response.json({error:-501}));
 assert.equal(r.status,502);assert.ok(!(await r.text()).includes('private-token'));assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM zalo_pending_tokens').first()).n,0);
});
test('host-only cookie exchanges for an AI-only token with Origin, expiry and active-user checks',async()=>{
 const env=await fixture();const cookie=(await sessionCookie(env,'victim')).split(';')[0];
 const req=origin=>new Request('https://api.theastrox.space/api/ai/session',{method:'POST',headers:{cookie,origin}});
 assert.equal((await publicFetch(req('https://evil.example'),env)).status,403);
 const issued=await publicFetch(req(env.APP_ORIGIN),env);assert.equal(issued.status,200);
 const {token}=await issued.json();assert.ok(token);
 const {readAiSession}=await import('./auth.mjs');
 const bearer=new Request('https://astrox-internal/internal/ai/charge',{headers:{authorization:`Bearer ${token}`}});
 assert.equal((await readAiSession(env,bearer)).sub,'victim');
 assert.equal(await readAiSession(env,bearer,Date.now()+301000),null);
 const normal=await publicFetch(new Request('https://api.theastrox.space/api/me',{headers:{authorization:`Bearer ${token}`}}),env);
 assert.equal((await normal.json()).user,null);
 await env.DB.prepare("UPDATE app_users SET status='suspended' WHERE id='victim'").run();
 assert.equal(await readAiSession(env,bearer),null);
});
async function paidFixture(){const env=await fixture();await state(env);const c=defaultConfig();c.ai.enabled=true;c.billing.enabled=true;c.billing.services.find(s=>s.id==='tarot').status='paid';c.billing.services.find(s=>s.id==='tarot').points=10;await publish(env,'owner',c,0,'test');const cookie=(await sessionCookie(env,'victim')).split(';')[0];return {env,cookie};}
const paidRequest=(cookie,path,body)=>new Request('https://astrox-internal/internal/ai/'+path,{method:'POST',headers:{cookie},body:JSON.stringify(body)});
const operation=(id='operation-123')=>({serviceId:'tarot',revision:1,operationId:id,requestHash:'a'.repeat(64)});
const balance=async env=>(await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='victim'").first()).balance;
test('concurrent retries reserve one charge and reject changed payload for the same operation',async()=>{
 const {env,cookie}=await paidFixture();
 const results=await Promise.all(Array.from({length:4},()=>internalFetch(paidRequest(cookie,'charge',operation()),env)));
 assert.equal(await balance(env),90);assert.equal(results.filter(r=>r.status===200).length,1);
 assert.equal(results.filter(r=>r.status===409).length,3);
 assert.equal((await internalFetch(paidRequest(cookie,'charge',{...operation(),requestHash:'b'.repeat(64)}),env)).status,409);
});
test('completed operation replays original response without charge and cannot be refunded',async()=>{
 const {env,cookie}=await paidFixture();const charge=await(await internalFetch(paidRequest(cookie,'charge',operation()),env)).json();
 const response={choices:[{message:{content:'Private saved reading'}}],configRevision:1};
 assert.equal((await internalFetch(paidRequest(cookie,'complete',{chargeId:charge.chargeId,response}),env)).status,200);
 const retry=await internalFetch(paidRequest(cookie,'charge',operation()),env);assert.equal(retry.status,200);assert.deepEqual((await retry.json()).response,response);
 assert.equal(await balance(env),90);
 assert.ok(!JSON.stringify(await env.DB.prepare('SELECT * FROM backend_ai_operations').first()).includes('Private saved reading'));
 assert.equal((await internalFetch(paidRequest(cookie,'refund',{chargeId:charge.chargeId}),env)).status,409);
 assert.equal(await balance(env),90);
});
test('refund failure rolls back and durable recovery refunds exactly once after a worker interruption',async()=>{
 const {env,cookie}=await paidFixture();const {chargeId}=await(await internalFetch(paidRequest(cookie,'charge',operation()),env)).json();
 await env.DB.prepare("CREATE TRIGGER fail_refund BEFORE UPDATE ON zalo_point_accounts WHEN NEW.balance>OLD.balance BEGIN SELECT RAISE(ABORT,'refund unavailable'); END").run();
 await assert.rejects(()=>internalFetch(paidRequest(cookie,'refund',{chargeId}),env),/refund unavailable/);
 assert.equal(await balance(env),90);assert.equal((await env.DB.prepare('SELECT status FROM backend_ai_operations').first()).status,'running');
 await env.DB.prepare('DROP TRIGGER fail_refund').run();await env.DB.prepare('UPDATE backend_ai_operations SET created_at=?').bind(Date.now()-240000).run();
 const {reconcileAi}=await import('./ai-operations.mjs');await reconcileAi(env);await reconcileAi(env);
 assert.equal(await balance(env),100);assert.equal((await env.DB.prepare("SELECT COUNT(*) n FROM zalo_point_ledger WHERE reason='ai_service_refund'").first()).n,1);
 assert.equal((await internalFetch(paidRequest(cookie,'complete',{chargeId,response:{choices:[]}}),env)).status,409);
 assert.equal((await internalFetch(paidRequest(cookie,'charge',operation()),env)).status,409);
});
test('Pages AI carries bearer identity, saves success, and retries the same request without another provider call',async()=>{
 const {env,cookie}=await paidFixture();const {saveSecret,readPublished}=await import('../admin/store.mjs');const {handleConfiguredAi}=await import('../admin/integration-api.mjs');
 const c=(await readPublished(env)).config;c.ai.chain=['test'];c.ai.providers=[{id:'test',name:'Test',model:'test',protocol:'chat',baseUrl:'https://api.example.com/v1',enabled:true,timeoutMs:1000,retries:0,maxTokens:100,temperature:0.5,secretRef:'provider:test'}];
 env.PROVIDER_ALLOWED_HOSTS='api.example.com';await saveSecret(env,'owner','provider:test','fake-test-key');await publish(env,'owner',c,1,'provider');
 env.ASTROX_BACKEND={fetch:r=>internalFetch(r,env)};
 const {token}=await(await publicFetch(new Request('https://api.theastrox.space/api/ai/session',{method:'POST',headers:{cookie,origin:env.APP_ORIGIN}}),env)).json();
 const req=()=>new Request('https://theastrox.space/api/ai',{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({operationId:'operation-123',serviceId:'tarot',messages:[{role:'user',content:'A private question'}]})});
 let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;return Response.json({choices:[{message:{content:'An answer'},finish_reason:'stop'}]});};
 try{const first=await handleConfiguredAi(req(),env);assert.equal(first.status,200,await first.clone().text());const second=await handleConfiguredAi(req(),env);assert.equal(second.status,200);assert.deepEqual(await second.json(),await first.json());assert.equal(await balance(env),90);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
test('failed refund is reported as pending rather than logged as refunded, and cron repairs it',async()=>{
 const {env,cookie}=await paidFixture();const {handleConfiguredAi}=await import('../admin/integration-api.mjs');
 env.ASTROX_BACKEND={fetch:r=>r.url.endsWith('/refund')?Promise.resolve(Response.json({error:'down'},{status:500})):internalFetch(r,env)};
 const r=await handleConfiguredAi(new Request('https://theastrox.space/api/ai',{method:'POST',headers:{cookie},body:JSON.stringify({operationId:'operation-123',serviceId:'tarot',messages:[{role:'user',content:'test'}]})}),env);
 const body=await r.json();assert.equal(body.code,'refund_pending');assert.equal(await balance(env),90);
 const metric=await env.DB.prepare('SELECT attempts FROM admin_ai_requests ORDER BY created_at DESC LIMIT 1').first();assert.ok(!metric.attempts.includes('"refunded"'));
 const {reconcileAi}=await import('./ai-operations.mjs');await reconcileAi(env,Date.now()+240000);assert.equal(await balance(env),100);
});
test('verified Zalo callback still logs in using only the server provider identity',async()=>{
 const env=await fixture();await env.DB.prepare('INSERT INTO oauth_states VALUES(?,?,?)').bind('verified-state','verifier',new Date().toISOString()).run();
 const r=await zaloCallback(env,new Request('https://api.theastrox.space/auth/zalo/callback?state=verified-state&code=c',{headers:{cookie:'astrox_oauth=verified-state'}}),{zalo:{returnUrl:env.APP_ORIGIN}},async url=>url.includes('oauth.zaloapp')?Response.json({access_token:'private-token'}):Response.json({id:'victim-zalo',name:'Verified'}));
 assert.equal(r.status,302);assert.ok(r.headers.get('set-cookie').includes('astrox_session='));assert.equal(r.headers.get('location'),env.APP_ORIGIN);
});
test('charge rollback preserves balance and does not leave an operation; another user cannot complete/refund it',async()=>{
 const {env,cookie}=await paidFixture();await env.DB.prepare("CREATE TRIGGER fail_debit BEFORE UPDATE ON zalo_point_accounts WHEN NEW.balance<OLD.balance BEGIN SELECT RAISE(ABORT,'debit unavailable'); END").run();
 await assert.rejects(()=>internalFetch(paidRequest(cookie,'charge',operation()),env),/debit unavailable/);assert.equal(await balance(env),100);assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM backend_ai_operations').first()).n,0);
 await env.DB.prepare('DROP TRIGGER fail_debit').run();const {chargeId}=await(await internalFetch(paidRequest(cookie,'charge',operation()),env)).json();
 await env.DB.prepare("INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('other','Other','active','2026','2026')").run();const other=(await sessionCookie(env,'other')).split(';')[0];
 assert.equal((await internalFetch(paidRequest(other,'refund',{chargeId}),env)).status,404);
 assert.equal((await internalFetch(paidRequest(other,'complete',{chargeId,response:{choices:[]}}),env)).status,409);assert.equal(await balance(env),90);
});
test('long readings are saved for replay without argument-size overflow',async()=>{
 const {env,cookie}=await paidFixture();const {chargeId}=await(await internalFetch(paidRequest(cookie,'charge',operation()),env)).json();
 const response={choices:[{message:{content:'Luận giải tiếng Việt. '.repeat(12000)}}]};
 assert.equal((await internalFetch(paidRequest(cookie,'complete',{chargeId,response}),env)).status,200);
 assert.deepEqual((await(await internalFetch(paidRequest(cookie,'charge',operation()),env)).json()).response,response);
});
test('cloud data route requires cookie identity and rejects cross-origin writes',async()=>{
 const env=await fixture();await env.DB.prepare(readFileSync(new URL('../../migrations/user-sync.sql',import.meta.url),'utf8')).run();
 const cookie=(await sessionCookie(env,'victim')).split(';')[0];
 const url='https://api.theastrox.space/api/user-data';
 assert.equal((await publicFetch(new Request(url),env)).status,401);
 const get=await publicFetch(new Request(url,{headers:{cookie,origin:env.APP_ORIGIN}}),env);assert.equal(get.status,200);assert.equal(get.headers.get('access-control-allow-origin'),env.APP_ORIGIN);
 const payload=JSON.stringify({expectedRevision:0,payload:{profile:{name:'Private'}}});
 assert.equal((await publicFetch(new Request(url,{method:'PUT',headers:{cookie,origin:'https://evil.example'},body:payload}),env)).status,403);
 assert.equal((await publicFetch(new Request(url,{method:'PUT',headers:{cookie,origin:env.APP_ORIGIN},body:payload}),env)).status,200);
 assert.equal((await env.DB.prepare('SELECT user_id FROM user_data').first()).user_id,'zalo:victim');
});
