import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {chromium} from 'playwright';
import {testEnv} from '../../services/admin/test/sqlite.mjs';
import {state,publish,saveSecret} from '../../services/admin/store.mjs';
import {defaultConfig} from '../../services/admin/config.ts';
import {sessionCookie} from '../../services/backend/auth.mjs';
import {publicFetch,internalFetch} from '../../services/backend/handler.mjs';
import {handleConfiguredAi} from '../../services/admin/integration-api.mjs';
test('real browser host-only cookie reaches API ticket endpoint; bearer reaches Pages and charges once',async()=>{
 const env=testEnv();for(const file of ['../../services/backend/test/legacy-schema.sql','../../migrations/backend.sql','../../migrations/rewards.sql'])for(const q of readFileSync(new URL(file,import.meta.url),'utf8').split(';').filter(s=>s.trim()))await env.DB.prepare(q).run();
 Object.assign(env,{SESSION_SECRET:'browser-test-only',APP_ORIGIN:'https://theastrox.space',PROVIDER_ALLOWED_HOSTS:'api.example.com'});
 await env.DB.prepare("INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('browser','Test','active','2026','2026')").run();await env.DB.prepare("INSERT INTO zalo_point_accounts VALUES('browser',100,'2026')").run();
 await state(env);const c=defaultConfig();c.ai.enabled=true;c.billing.enabled=true;c.billing.services[0].status='paid';c.billing.services[0].points=10;c.ai.chain=['test'];c.ai.providers=[{id:'test',name:'Test',model:'test',protocol:'chat',baseUrl:'https://api.example.com/v1',enabled:true,timeoutMs:1000,retries:0,maxTokens:100,temperature:0.5,secretRef:'provider:test'}];await saveSecret(env,'test','provider:test','test');await publish(env,'test',c,0,'test');env.ASTROX_BACKEND={fetch:r=>internalFetch(r,env)};
 const browser=await chromium.launch({headless:true});const context=await browser.newContext();const cookie=(await sessionCookie(env,'browser')).split(';')[0].slice('astrox_session='.length);
 await context.addCookies([{name:'astrox_session',value:cookie,url:'https://api.theastrox.space',httpOnly:true,secure:true,sameSite:'Lax'}]);
 let providerCalls=0,sawCookieOnTicket=false,sawCookieOnPages=false,sawBearer=false;
 const original=globalThis.fetch;globalThis.fetch=async()=>{providerCalls++;return Response.json({choices:[{message:{content:'Browser verified reading'},finish_reason:'stop'}]});};
 await context.route('**/*',async route=>{
  const r=route.request(),url=new URL(r.url());
  if(url.pathname==='/'){await route.fulfill({contentType:'text/html',body:'<!doctype html><title>AI session test</title>'});return;}
  const headers=await r.allHeaders(),request=new Request(r.url(),{method:r.method(),headers,...(r.method()==='POST'?{body:r.postData()}: {})});let response;
  if(url.hostname==='api.theastrox.space'){sawCookieOnTicket ||= !!headers.cookie;response=await publicFetch(request,env);}
  else{sawCookieOnPages ||= !!headers.cookie;sawBearer ||= !!headers.authorization;response=await handleConfiguredAi(request,env);}
  await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
 });
 try{const page=await context.newPage();await page.goto(env.APP_ORIGIN);const result=await page.evaluate(async()=>{
  const ticket=await fetch('https://api.theastrox.space/api/ai/session',{method:'POST',credentials:'include'});const {token}=await ticket.json();
  const call=()=>fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({operationId:'browser-operation',serviceId:'tuvi',messages:[{role:'user',content:'Question'}]})}).then(async r=>({status:r.status,body:await r.json()}));
  return [await call(),await call()];
 });assert.equal(result[0].status,200);assert.deepEqual(result[1],result[0]);assert.equal(providerCalls,1);assert.ok(sawCookieOnTicket);assert.equal(sawCookieOnPages,false);assert.ok(sawBearer);assert.equal((await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='browser'").first()).balance,90);
 }finally{globalThis.fetch=original;await browser.close();}
});
