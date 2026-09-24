import {test} from 'node:test';
import {publicFetch} from './handler.mjs';
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
 for(const q of readFileSync(new URL('../../migrations/reward-events.sql',import.meta.url),'utf8').split(';').filter(s=>s.trim()))await env.DB.prepare(q).run();
 for(const q of readFileSync(new URL('./test/legacy-schema.sql',import.meta.url),'utf8').split(';').filter(s=>s.trim()))await env.DB.prepare(q).run();
 for(const q of readFileSync(new URL('../../migrations/backend.sql',import.meta.url),'utf8').split(';').filter(s=>s.trim()))await env.DB.prepare(q).run();
 for(const q of readFileSync(new URL('../../migrations/rewards.sql',import.meta.url),'utf8').split(';').filter(s=>s.trim()))await env.DB.prepare(q).run();
 Object.assign(env,{SESSION_SECRET:'test-session-secret',PAYOS_CLIENT_ID:'client',PAYOS_API_KEY:'test-api',PAYOS_CHECKSUM_KEY:'test-checksum',ZALO_APP_ID:'123456',ZALO_APP_SECRET:'test-zalo',ZALO_REDIRECT_URI:'https://api.example.com/auth/zalo/callback'});
 await env.DB.prepare("INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('u1','User','active','2026-01-01','2026-01-01')").run();
 await env.DB.prepare("INSERT INTO zalo_point_accounts VALUES('u1',10,'2026-01-01')").run();
 await env.DB.prepare("INSERT INTO topup_packages VALUES('old',50000,55,'50k',1,1,'2026-01-01')").run();
 return env;
}
async function published(env,change){await state(env);const c=defaultConfig();c.billing.enabled=true;c.integrations.payos={enabled:true,clientId:'client',returnUrl:'https://theastrox.space/hoso',cancelUrl:'https://theastrox.space/hoso',expiryMinutes:30};c.billing.packages=[{id:'new',name:'New',amountVnd:60000,mode:'fixed',fixedPoints:70,bonus:5,enabled:true,featured:false}];change?.(c);await saveDraft(env,'test',c,0);await publish(env,'test',c,1,'test');return c;}
test('imports legacy packages and connection readiness without keys or customer data',async()=>{const env=await fixture(),s=await legacySnapshot(env);assert.equal(s.packages[0].points,55);assert.equal(s.integrations.zalo.appId,'123456');assert.ok(s.inheritedSecrets.includes('payos:apiKey'));assert.ok(!JSON.stringify(s).includes('test-api'));assert.equal(capabilities(env).features.paidAi,true);assert.equal(capabilities(env).features.rewards,true)});
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
 assert.equal(fallback.status,502);
 row=await env.DB.prepare('SELECT stage,detail FROM login_diagnostics ORDER BY id DESC LIMIT 1').first();
 assert.equal(row.stage,'server_verify_failed');assert.ok(!row.detail.includes('secret'));
 const retired=await zaloFinish(env,new Request('https://api.example.com/auth/zalo/finish'));
 assert.equal(retired.status,410);assert.ok(!retired.headers.has('set-cookie'));

});
// Ví Point của người dùng và view Rewards của admin phải đọc cùng một ledger.
test('points history is session-scoped, newest-first and cursor-paginated',async()=>{
 const {publicFetch}=await import('./handler.mjs');const env=await fixture();
 await env.DB.prepare("INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('u2','Other','active','2026-01-01','2026-01-01')").run();
 const ledger=(user,reason,ref,delta,at)=>env.DB.prepare('INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user,delta,reason,ref,at).run();
 await ledger('u1','topup_payos','t1',55,'2026-02-02T10:00:00.000Z');
 await ledger('u1','unlock_service','s1',-30,'2026-02-03T09:00:00.000Z');
 await ledger('u1','ad_reward','a1',5,'2026-02-01T08:00:00.000Z');
 await ledger('u2','topup_payos','t9',999,'2026-02-04T00:00:00.000Z');
 assert.equal((await publicFetch(new Request('https://api.example.com/api/points/history'),env)).status,401);
 const cookie=(await sessionCookie(env,'u1')).split(';')[0];
 const bad=await publicFetch(new Request('https://api.example.com/api/points/history?cursor=bad',{headers:{cookie}}),env);assert.equal(bad.status,400);
 const page1=await (await publicFetch(new Request('https://api.example.com/api/points/history?limit=2',{headers:{cookie}}),env)).json();
 assert.deepEqual(page1.transactions.map(t=>[t.reason,t.delta]),[['unlock_service',-30],['topup_payos',55]]);
 assert.ok(page1.nextCursor);
 const page2=await (await publicFetch(new Request(`https://api.example.com/api/points/history?limit=2&cursor=${page1.nextCursor}`,{headers:{cookie}}),env)).json();
 assert.deepEqual(page2.transactions.map(t=>[t.reason,t.delta]),[['ad_reward',5]]);
 assert.equal(page2.nextCursor,null);
 assert.ok(!JSON.stringify([page1,page2]).includes('t9'),'must not leak other users ledger rows');
});
test('admin rewards view serves the same ledger rows as user points history',async()=>{
 const {publicFetch,internalFetch}=await import('./handler.mjs');const env=await fixture();
 await order(env);await handlePayosWebhook(env,await webhook(env));
 const rows=(await (await internalFetch(new Request('https://astrox-internal/internal/admin/rewards'),env)).json()).rows;
 const credit=rows.find(r=>r.reason==='topup_payos');
 assert.equal(credit.delta,55);assert.equal(credit.user_id,'u1');
 const cookie=(await sessionCookie(env,'u1')).split(';')[0];
 const page=await (await publicFetch(new Request('https://api.example.com/api/points/history',{headers:{cookie}}),env)).json();
 assert.equal(page.transactions[0].id,credit.id);
});

// ------------------------- Rewards engine (22/09/2026) -------------------------
const rewardsOn=c=>{c.rewards={...c.rewards,enabled:true,registrationEnabled:true,attendanceEnabled:true,firstTopupEnabled:true};};
async function seedInviter(env,code='ASTROX',userId='u1'){await env.DB.prepare('INSERT INTO referral_codes(user_id,code,created_at) VALUES(?,?,?)').bind(userId,code,'2026-01-01').run();}
async function addUser(env,id){await env.DB.prepare("INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES(?,'New','active','2026-01-02','2026-01-02')").bind(id).run();await env.DB.prepare("INSERT OR IGNORE INTO zalo_point_accounts VALUES(?,0,'2026-01-02')").bind(id).run();}
async function balance(env,id){return (await env.DB.prepare('SELECT balance FROM zalo_point_accounts WHERE user_id=?').bind(id).first())?.balance??null;}
const cookieOf=async env=>({origin:'https://theastrox.space',cookie:(await sessionCookie(env,'u1')).split(';')[0]});

test('capabilities advertise rewards and paid-AI as backend features',async()=>{const env=await fixture();assert.equal(capabilities(env).features.paidAi,true);assert.equal(capabilities(env).features.rewards,true)});

test('registration referral credits both sides once and maps the invitee',async()=>{
 const {creditRegistration}=await import('./rewards.mjs');
 const env=await fixture();await published(env,rewardsOn);await seedInviter(env);await addUser(env,'u2');
 await creditRegistration(env,'u2','ASTROX');
 assert.equal(await balance(env,'u2'),5);assert.equal(await balance(env,'u1'),15);
 await creditRegistration(env,'u2','ASTROX'); // idempotent
 assert.equal(await balance(env,'u2'),5);assert.equal(await balance(env,'u1'),15);
 const ref=await env.DB.prepare('SELECT inviter_id FROM user_referrals WHERE user_id=?').bind('u2').first();
 assert.equal(ref.inviter_id,'u1');
});

test('registration rewards ignore bad codes, self-referral and disabled config',async()=>{
 const {creditRegistration}=await import('./rewards.mjs');
 const env=await fixture();await published(env,rewardsOn);await seedInviter(env,'OWN');await addUser(env,'u2');
 await creditRegistration(env,'u2','NOPE7');await creditRegistration(env,'u1','OWN');
 assert.equal((await env.DB.prepare("SELECT COUNT(*) n FROM zalo_point_ledger WHERE reason='referral'").first()).n,0);
 const off=await fixture();await published(off,c=>{rewardsOn(c);c.rewards.registrationEnabled=false;});await seedInviter(off);await addUser(off,'u3');
 const {creditRegistration:cr}=await import('./rewards.mjs');await cr(off,'u3','ASTROX');
 assert.equal((await off.DB.prepare("SELECT COUNT(*) n FROM zalo_point_ledger WHERE reason='referral'").first()).n,0);
});

test('limited referral budget stops inviter rewards',async()=>{
 const {creditRegistration}=await import('./rewards.mjs');
 const env=await fixture();await published(env,c=>{rewardsOn(c);c.rewards.referralMode='limited';c.rewards.referralLimit=1;c.rewards.referralWindow='lifetime';});
 await seedInviter(env);await addUser(env,'u2');await addUser(env,'u3');
 await creditRegistration(env,'u2','ASTROX');
 assert.equal(await balance(env,'u2'),5);assert.equal(await balance(env,'u1'),15);
 await creditRegistration(env,'u3','ASTROX'); // inviter đã đạt hạn mức
 assert.equal(await balance(env,'u3'),0);assert.equal(await balance(env,'u1'),15);
});

test('check-in pays daily + milestone for user and inviter, and rejects duplicates',async()=>{
 const {handleRewardsCheckin}=await import('./rewards.mjs');
 const env=await fixture();await published(env,rewardsOn);await addUser(env,'u2');
 await env.DB.prepare('INSERT INTO user_referrals(user_id,inviter_id,created_at) VALUES(?,?,?)').bind('u2','u1','2026-01-01').run();
 const req=async()=>handleRewardsCheckin(env,new Request('https://api.example.com/api/rewards/checkin',{method:'POST',headers:await cookieOfUserId(env,'u2')}));
 // Seed chuỗi 2 ngày kết thúc hôm qua → lần claim hôm nay là ngày 3: user +2+3, inviter +2.
 const {vietnamDay}=await import('../rewards/rules.ts');
 const yesterday=vietnamDay(new Date(Date.now()-86400000));
 await env.DB.prepare("INSERT INTO user_attendance(user_id,last_day,streak,claimed_milestones,updated_at) VALUES(?,?,2,'[]',?)").bind('u2',yesterday,'2026-01-01').run();
 const claim=await req();assert.equal(claim.status,200);const t=await claim.json();
 assert.equal(t.points,5);assert.equal(t.streak,3);assert.deepEqual(t.milestones,[3]);
 assert.equal(await balance(env,'u2'),5);assert.equal(await balance(env,'u1'),12); // 10 gốc + 2 inviter
 const dup=await req();assert.equal(dup.status,409);assert.equal(await balance(env,'u2'),5);
 const fresh=await fixture();await published(fresh,rewardsOn);await addUser(fresh,'u9');
 const first=await (async()=>{const {handleRewardsCheckin:h}=await import('./rewards.mjs');return h(fresh,new Request('https://api.example.com/api/rewards/checkin',{method:'POST',headers:await cookieOfUserId(fresh,'u9')}));})();
 assert.equal((await first.json()).points,2);assert.equal(await balance(fresh,'u9'),2);
});

test('first paid topup rewards the inviter exactly once via the PayOS webhook',async()=>{
 const env=await fixture();await published(env,c=>{rewardsOn(c);c.integrations.payos.enabled=true;});await addUser(env,'u2');
 await env.DB.prepare('INSERT INTO user_referrals(user_id,inviter_id,created_at) VALUES(?,?,?)').bind('u1','u2','2026-01-01').run();
 await order(env);
 await handlePayosWebhook(env,await webhook(env));
 assert.equal(await balance(env,'u1'),65);assert.equal(await balance(env,'u2'),10); // inviter +10
 await handlePayosWebhook(env,await webhook(env));
 assert.equal(await balance(env,'u2'),10); // webhook lặp không thưởng thêm
});

test('admin wallet adjust writes ledger and refuses overdraft; user block kills sessions',async()=>{
 const {internalFetch}=await import('./handler.mjs');
 const env=await fixture();
 const plus=await internalFetch(new Request('https://astrox-internal/internal/admin/wallet/adjust',{method:'POST',body:JSON.stringify({userId:'u1',delta:50,reason:'test'})}),env);
 assert.equal(plus.status,200);assert.equal(await balance(env,'u1'),60);
 const over=await internalFetch(new Request('https://astrox-internal/internal/admin/wallet/adjust',{method:'POST',body:JSON.stringify({userId:'u1',delta:-1000,reason:'over'})}),env);
 assert.equal(over.status,409);
 const block=await internalFetch(new Request('https://astrox-internal/internal/admin/users/status',{method:'POST',body:JSON.stringify({userId:'u1',status:'suspended'})}),env);
 assert.equal(block.status,200);
 assert.equal(await readSession(env,new Request('https://api.example.com',{headers:await cookieOf(env)})),null);
 const diag=await internalFetch(new Request('https://astrox-internal/internal/admin/login-diagnostics'),env);
 assert.equal(diag.status,200);
});

test('paid AI charges idempotently, rejects insufficient balance and refunds on failure',async()=>{
 const {internalFetch}=await import('./handler.mjs');
 const env=await fixture();await published(env,c=>{c.ai.enabled=true;const s=c.billing.services.find(x=>x.id==='tarot');s.status='paid';s.points=30;});
 const {cookie}=await cookieOf(env);
 const chargeReq=chargeId=>new Request('https://astrox-internal/internal/ai/charge',{method:'POST',headers:{cookie},body:JSON.stringify({serviceId:'tarot',revision:1,operationId:'test-operation',requestHash:'a'.repeat(64)})});
 const poor=await internalFetch(chargeReq(),env);assert.equal(poor.status,402);assert.equal((await poor.json()).error,'insufficient_points');
 await env.DB.prepare("UPDATE zalo_point_accounts SET balance=100 WHERE user_id='u1'").run();
 const ok=await internalFetch(chargeReq(),env);const okBody=await ok.json();
 assert.equal(ok.status,200);assert.equal(okBody.points,30);assert.equal(await balance(env,'u1'),70);
 const refund=await internalFetch(new Request('https://astrox-internal/internal/ai/refund',{method:'POST',headers:{cookie},body:JSON.stringify({chargeId:okBody.chargeId})}),env);
 assert.equal(refund.status,200);assert.equal(await balance(env,'u1'),100);
 const again=await internalFetch(new Request('https://astrox-internal/internal/ai/refund',{method:'POST',headers:{cookie},body:JSON.stringify({chargeId:okBody.chargeId})}),env);
 assert.equal((await again.json()).refunded,false);assert.equal(await balance(env,'u1'),100); // hoàn 2 lần không nhân đôi
 const stale=await internalFetch(new Request('https://astrox-internal/internal/ai/charge',{method:'POST',headers:{cookie},body:JSON.stringify({serviceId:'tarot',revision:999,operationId:'stale-operation',requestHash:'a'.repeat(64)})}),env);
 assert.equal(stale.status,409);
});

test('public routing also hides new internal write endpoints',async()=>{
 const {publicFetch}=await import('./handler.mjs');const env=await fixture();
 for(const [path,method] of [['/internal/ai/charge','POST'],['/internal/admin/wallet/adjust','POST'],['/internal/admin/users/status','POST']]){
  const r=await publicFetch(new Request('https://api.example.com'+path,{method,body:JSON.stringify({})}),env);
  assert.equal(r.status,404,path);
 }
 const summary=await publicFetch(new Request('https://api.example.com/api/rewards/summary'),env);
 assert.equal(summary.status,401); // guest chặn ở auth, không phải 404
});
async function cookieOfUserId(env,userId){return {origin:'https://theastrox.space',cookie:(await sessionCookie(env,userId)).split(';')[0]};}

test('concurrent daily check-ins acknowledge one grant only',async()=>{
 const {handleRewardsCheckin}=await import('./rewards.mjs');const env=await fixture();await published(env,rewardsOn);const headers={...await cookieOf(env),origin:'https://theastrox.space'};
 const prepare=env.DB.prepare;let arrived=0,release;const barrier=new Promise(r=>{release=r;});env.DB.prepare=q=>{const decorate=statement=>{const bind=statement.bind;statement.bind=(...args)=>decorate(bind(...args));if(q.startsWith('SELECT last_day,streak,claimed_milestones')){const first=statement.first;statement.first=async()=>{const value=await first();if(++arrived===4)release();await barrier;return value;};}return statement;};return decorate(prepare(q));};
 const responses=await Promise.all(Array.from({length:4},()=>handleRewardsCheckin(env,new Request('https://api.example.com/api/rewards/checkin',{method:'POST',headers}))));
 assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(await balance(env,'u1'),12);
});
test('a replay cannot reward a different inviter for the same new account',async()=>{
 const {creditRegistration}=await import('./rewards.mjs');const env=await fixture();await published(env,rewardsOn);await seedInviter(env,'FIRST1');await addUser(env,'u2');await addUser(env,'u3');await seedInviter(env,'SECOND','u3');await creditRegistration(env,'u2','FIRST1');await creditRegistration(env,'u2','SECOND');assert.equal(await balance(env,'u3'),0);assert.equal(await balance(env,'u2'),5);
});
test('foreign origin cannot claim attendance using an existing cookie',async()=>{
 const env=await fixture();await published(env,rewardsOn);const response=await publicFetch(new Request('https://api.example.com/api/rewards/checkin',{method:'POST',headers:{...await cookieOf(env),origin:'https://evil.example'}}),env);assert.equal(response.status,403);assert.equal(await balance(env,'u1'),10);
});
test('old paid topup replay after rewards activation does not become a first topup',async()=>{
 const env=await fixture();await published(env,c=>{rewardsOn(c);c.integrations.payos.enabled=true;});await addUser(env,'u2');await env.DB.prepare("INSERT INTO user_referrals VALUES('u1','u2','2026-01-01')").run();await order(env);await env.DB.prepare("UPDATE topup_orders_zalo SET status='paid',paid_at='2026-01-01'").run();await handlePayosWebhook(env,await webhook(env));assert.equal(await balance(env,'u2'),0);
});

test('registration recovery keeps the original reward snapshot and settles only once',async()=>{
 const {registrationEventStatements,recoverRegistrationRewards}=await import('./rewards.mjs');const env=await fixture();await published(env,rewardsOn);await seedInviter(env);await addUser(env,'u2');await env.DB.batch(await registrationEventStatements(env,'u2','ASTROX'));
 const s=await state(env),c=JSON.parse(s.draft);c.rewards.registrationInviter=999;await publish(env,'owner',c,s.revision,'change');
 await recoverRegistrationRewards(env);await recoverRegistrationRewards(env);assert.equal(await balance(env,'u1'),15);assert.equal(await balance(env,'u2'),5);assert.equal((await env.DB.prepare("SELECT status FROM reward_events WHERE id='registration:u2'").first()).status,'completed');
});
const adsOn=c=>{rewardsOn(c);c.rewards.ads={...c.rewards.ads,enabled:true,networkCode:'1234',adUnit:'/1234/rewarded',dailyLimit:1,cooldownSeconds:90};};
async function adRequest(env,path,body={},userId='u1',origin='https://theastrox.space',now=Date.now()){
 const {handleRewardedAds}=await import('./rewarded-ads.mjs');return handleRewardedAds(env,new Request('https://api.example.com/api/rewards/ads/'+path,{method:'POST',headers:{...await cookieOfUserId(env,userId),origin},body:JSON.stringify(body)}),path,now);
}
test('ad completion is account-scoped, grants the reserved amount once and enforces daily cap',async()=>{
 const env=await fixture();await published(env,adsOn);await addUser(env,'u2');const now=Date.now();const start=await adRequest(env,'start',{},'u1',undefined,now);assert.equal(start.status,200);const session=await start.json();
 assert.equal((await adRequest(env,'grant',{id:session.id,points:999},'u1',undefined,now)).status,409);
 assert.equal((await adRequest(env,'ready',{id:session.id},'u2',undefined,now)).status,404);
 assert.equal((await adRequest(env,'ready',{id:session.id},'u1',undefined,now)).status,200);
 assert.equal((await adRequest(env,'grant',{id:session.id},'u1',undefined,now+1000)).status,409);
 const responses=await Promise.all([adRequest(env,'grant',{id:session.id,points:999},'u1',undefined,now+6000),adRequest(env,'grant',{id:session.id},'u1',undefined,now+6000)]);assert.ok(responses.every(r=>r.status===200));assert.equal(await balance(env,'u1'),15);
 assert.equal((await adRequest(env,'start',{},'u1',undefined,now+100000)).status,429);
});
test('ads fail closed without publisher settings, reject foreign origins, expired and cancelled sessions',async()=>{
 const env=await fixture();await published(env,rewardsOn);assert.equal((await adRequest(env,'start')).status,403);
 const s=await state(env),c=JSON.parse(s.draft);adsOn(c);await publish(env,'owner',c,s.revision,'ads');const now=Date.now();assert.equal((await adRequest(env,'start',{},'u1','https://evil.example',now)).status,403);
 const a=await(await adRequest(env,'start',{},'u1',undefined,now)).json();await adRequest(env,'cancel',{id:a.id},'u1',undefined,now+1000);assert.equal((await adRequest(env,'grant',{id:a.id},'u1',undefined,now+6000)).status,409);
 assert.equal((await adRequest(env,'start',{},'u1',undefined,now+5000)).status,429);
 const b=await(await adRequest(env,'start',{},'u1',undefined,now+100000)).json();await adRequest(env,'ready',{id:b.id},'u1',undefined,now+100000);assert.equal((await adRequest(env,'grant',{id:b.id},'u1',undefined,now+800000)).status,409);assert.equal(await balance(env,'u1'),10);
});
test('registration credit transaction rollback leaves recoverable event and no partial bonus',async()=>{
 const {registrationEventStatements,settleRegistration}=await import('./rewards.mjs');const env=await fixture();await published(env,rewardsOn);await seedInviter(env);await addUser(env,'u2');await env.DB.batch(await registrationEventStatements(env,'u2','ASTROX'));
 await env.DB.prepare("CREATE TRIGGER fail_reward BEFORE UPDATE ON zalo_point_accounts BEGIN SELECT RAISE(ABORT,'reward rollback'); END").run();await assert.rejects(()=>settleRegistration(env,'u2'),/reward rollback/);assert.equal((await env.DB.prepare("SELECT status FROM reward_events WHERE id='registration:u2'").first()).status,'pending');assert.equal(await balance(env,'u1'),10);assert.equal(await balance(env,'u2'),0);
 await env.DB.prepare('DROP TRIGGER fail_reward').run();await settleRegistration(env,'u2');assert.equal(await balance(env,'u1'),15);assert.equal(await balance(env,'u2'),5);
});
test('historical settled payment prevents a later order earning first-topup rewards',async()=>{
 const env=await fixture();await published(env,rewardsOn);await addUser(env,'u2');await env.DB.prepare("INSERT INTO user_referrals VALUES('u1','u2','2026-01-01')").run();await env.DB.prepare("INSERT INTO zalo_point_ledger VALUES('old','u1',55,'topup_payos','older-order','2026-01-01')").run();await order(env);await handlePayosWebhook(env,await webhook(env));assert.equal(await balance(env,'u2'),0);
});
test('concurrent ad starts reserve one slot and failed grant rolls back for retry',async()=>{
 const env=await fixture();await published(env,adsOn);const now=Date.now();const starts=await Promise.all([adRequest(env,'start',{},'u1',undefined,now),adRequest(env,'start',{},'u1',undefined,now)]);assert.equal(starts.filter(r=>r.status===200).length,1);const {id}=await starts.find(r=>r.status===200).json();await adRequest(env,'ready',{id},'u1',undefined,now);
 await env.DB.prepare("CREATE TRIGGER fail_ad BEFORE UPDATE ON zalo_point_accounts BEGIN SELECT RAISE(ABORT,'ad rollback'); END").run();await assert.rejects(()=>adRequest(env,'grant',{id},'u1',undefined,now+6000),/ad rollback/);assert.equal(await balance(env,'u1'),10);assert.equal((await env.DB.prepare('SELECT status FROM reward_ad_sessions WHERE id=?').bind(id).first()).status,'ready');await env.DB.prepare('DROP TRIGGER fail_ad').run();assert.equal((await adRequest(env,'grant',{id},'u1',undefined,now+7000)).status,200);assert.equal(await balance(env,'u1'),15);
});
test('referral follows verified OAuth and a returning identity cannot acquire new attribution',async()=>{
 const {zaloLogin}=await import('./auth.mjs');const env=await fixture();await published(env,rewardsOn);await seedInviter(env);await addUser(env,'u2');await seedInviter(env,'OTHER2','u2');const settings={zalo:{enabled:true,returnUrl:'https://theastrox.space/hoso'}};
 async function login(ref){const start=await zaloLogin(env,new Request('https://api.example.com/auth/zalo/login?ref='+ref),settings),state=new URL(start.headers.get('location')).searchParams.get('state');return zaloCallback(env,new Request('https://api.example.com/auth/zalo/callback?state='+state+'&code=test',{headers:{cookie:'astrox_oauth='+state}}),settings,async url=>url.includes('access_token')?Response.json({access_token:'provider-test'}):Response.json({id:'new-provider-identity',name:'Test only'}));}
 assert.equal((await login('ASTROX')).status,302);const identity=await env.DB.prepare("SELECT user_id FROM zalo_identities WHERE provider_subject='new-provider-identity'").first();assert.equal(await balance(env,identity.user_id),5);assert.equal(await balance(env,'u1'),15);assert.equal((await login('OTHER2')).status,302);assert.equal(await balance(env,'u2'),0);assert.equal(await balance(env,identity.user_id),5);assert.equal((await env.DB.prepare('SELECT inviter_id FROM user_referrals WHERE user_id=?').bind(identity.user_id).first()).inviter_id,'u1');
});
