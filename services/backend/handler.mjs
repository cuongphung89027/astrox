import {handleRewardedAds} from './rewarded-ads.mjs';
import {accountData} from './user-data.mjs';
import {chargeAi,refundAi,completeAi} from './ai-operations.mjs';
import {readPublished} from '../admin/store.mjs';
import {publicConfig} from '../admin/config.ts';
import {runtimeSettings,capabilities,legacySnapshot} from './config.mjs';
import {readSession,aiSession,zaloLogin,zaloCallback,zaloFinish,logout} from './auth.mjs';
import {handlePayosWebhook,handleTopupCreate,handlePromoCheck} from './payments.mjs';
import {handlePointsHistory} from './points.mjs';
import {handleRewardsSummary,handleRewardsCheckin} from './rewards.mjs';
import {json,corsHeaders,trustedOrigin} from './http.mjs';

export async function moduleAccess(env,request){
 const published=await readPublished(env),access={};
 if(published){const c=published.config;for(const s of c.billing.services.filter(s=>s.id===s.module))access[s.module]=!c.operations.maintenance&&['free','paid'].includes(s.status);}
 else{const rows=await env.DB.prepare('SELECT slug,access_mode,enabled FROM modules').all();for(const r of rows.results)access[r.slug]=Boolean(r.enabled&&r.access_mode!=='disabled');}
 const session=await readSession(env,request);if(session){const rows=await env.DB.prepare('SELECT module,enabled FROM user_module_access WHERE user_id=?').bind(session.sub).all();for(const r of rows.results)access[r.module]=Boolean(access[r.module]&&r.enabled);}
 return json(env,request,{access,revision:published?.revision??null});
}
export async function publicFetch(request,env){
 try{
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(env,request)});
  if(path==='/api/health')return json(env,request,{ok:true,service:'astrox-api',database:Boolean(env.DB),version:'2026-09-24-zalo-browser-1'});
  // Internal APIs are never routed by the public handler, regardless of Host/header.
  if(path.startsWith('/internal/'))return json(env,request,{error:'not_found'},404);
  if(path==='/api/webhooks/payos'&&method==='POST'||path==='/api/payos/webhook'&&method==='POST')return await handlePayosWebhook(env,request);
  if(path==='/auth/zalo/login'&&method==='GET'){const s=await runtimeSettings(env);return await zaloLogin(s.env,request,s);}
  if(path==='/auth/zalo/callback'&&method==='GET'){const s=await runtimeSettings(env);return await zaloCallback(s.env,request,s);}
  if(path==='/auth/zalo/finish'){const s=await runtimeSettings(env);return await zaloFinish(s.env,request,s);}
  if(path==='/auth/zalo/complete')return json(env,request,{error:'restart_login',message:'Vui lòng đăng nhập lại để xác minh danh tính.'},410);
  if(path==='/auth/logout'&&method==='POST')return logout(env,request);
  if(path==='/api/ai/session'&&method==='POST')return await aiSession(env,request);
  if(path==='/api/user-data'){
   const session=await readSession(env,request);if(!session)return json(env,request,{error:'unauthorized'},401);
   if(method!=='GET'&&!trustedOrigin(env,request))return json(env,request,{error:'invalid_origin'},403);
   const r=await accountData(env,request,`zalo:${session.sub}`);const headers=new Headers(r.headers);for(const [k,v] of Object.entries(corsHeaders(env,request)))headers.set(k,v);return new Response(r.body,{status:r.status,headers});
  }
  if(path==='/api/me'&&method==='GET'){const session=await readSession(env,request);if(!session)return json(env,request,{user:null});const user=await env.DB.prepare('SELECT id,display_name,email,avatar_url FROM app_users WHERE id=?').bind(session.sub).first();const wallet=await env.DB.prepare('SELECT balance FROM zalo_point_accounts WHERE user_id=?').bind(session.sub).first();return json(env,request,{user,points:wallet?.balance||0});}
  if(path==='/api/module-access'&&method==='GET')return await moduleAccess(env,request);
  if(path==='/api/site-config'&&method==='GET'){const p=await readPublished(env);return json(env,request,{config:p?publicConfig(p.config):null,revision:p?.revision??null});}
  if(path==='/api/topup/packages'&&method==='GET'){const s=await runtimeSettings(env);return json(env,request,{packages:s.packages,revision:s.revision});}
  if(path==='/api/topup/create'&&method==='POST')return await handleTopupCreate(env,request);
  if(path==='/api/topup/promo-check'&&method==='POST')return await handlePromoCheck(env,request);
  if(path==='/api/topup/history'&&method==='GET'){const session=await readSession(env,request);if(!session)return json(env,request,{error:'unauthorized'},401);const rows=await env.DB.prepare('SELECT order_code,amount_vnd,points,status,created_at,paid_at FROM topup_orders_zalo WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(session.sub).all();return json(env,request,{orders:rows.results});}
  if(path==='/api/points/history'&&method==='GET')return await handlePointsHistory(env,request);
  if(path==='/api/rewards/summary'&&method==='GET')return await handleRewardsSummary(env,request);
  if(path.startsWith('/api/rewards/ads/'))return await handleRewardedAds(env,request,path.slice('/api/rewards/ads/'.length));
  if(path==='/api/rewards/checkin'&&method==='POST')return await handleRewardsCheckin(env,request);
  if(path==='/zalo_verifierHiMyTOFJ571A-hHxZ_WyNqxxiMEYZMiqDZSq.html')return new Response('<!doctype html><meta property="zalo-platform-site-verification" content="HiMyTOFJ571A-hHxZ_WyNqxxiMEYZMiqDZSq">',{headers:{'content-type':'text/html; charset=utf-8'}});
  return json(env,request,{error:'not_found'},404);
 }catch(e){console.error(JSON.stringify({event:'backend.request_failed',path:new URL(request.url).pathname,code:e.message==='request_too_large'?'request_too_large':'internal_error'}));return json(env,request,{error:e.message==='request_too_large'?'request_too_large':'backend_unavailable'},e.message==='request_too_large'?413:503);}
}
export async function internalFetch(request,env){
 const path=new URL(request.url).pathname;
 // Chỉ service binding (ASTROX_INTERNAL) mới vào được handler này; publicFetch
 // chặn mọi /internal/* ở trên. Các POST là thao tác ghi có xác thực riêng.
 if(path==='/internal/ai/charge'&&request.method==='POST')return await chargeAi(env,request);
 if(path==='/internal/ai/complete'&&request.method==='POST')return await completeAi(env,request);
 if(path==='/internal/ai/refund'&&request.method==='POST')return await refundAi(env,request);
 if(path==='/internal/admin/users/status'&&request.method==='POST')return await internalUserStatus(env,request);
 if(path==='/internal/admin/wallet/adjust'&&request.method==='POST')return await internalWalletAdjust(env,request);
 if(path==='/internal/admin/login-diagnostics'&&request.method==='GET')
  return Response.json({rows:(await env.DB.prepare('SELECT id,stage,detail,created_at FROM login_diagnostics ORDER BY id DESC LIMIT 200').all()).results,source:'astrox-api',readOnly:true});
 if(request.method!=='GET')return Response.json({error:'method_not_allowed'},{status:405});
 if(path==='/internal/admin/capabilities')return Response.json(capabilities(env));
 if(path==='/internal/admin/bootstrap')return Response.json(await legacySnapshot(env));
 const queries={
  users:'SELECT id,display_name,email,status,created_at,updated_at FROM app_users ORDER BY created_at DESC LIMIT 200',
  wallet:'SELECT a.user_id,u.display_name,a.balance,a.updated_at FROM zalo_point_accounts a JOIN app_users u ON u.id=a.user_id ORDER BY a.updated_at DESC LIMIT 200',
  reports:'SELECT id,user_id,order_code,amount_vnd,points,status,created_at,paid_at FROM topup_orders_zalo ORDER BY created_at DESC LIMIT 200',
  rewards:'SELECT id,user_id,delta,reason,reference_id,created_at FROM zalo_point_ledger ORDER BY created_at DESC LIMIT 200'
 };
 const kind=path.replace('/internal/admin/','');if(queries[kind])return Response.json({rows:(await env.DB.prepare(queries[kind]).all()).results,source:'astrox-api',readOnly:true});
 return Response.json({error:'not_found'},{status:404});
}

/** Khoá/mở tài khoản — session hiện hữu tự mất hiệu lực vì readSession kiểm status. */
async function internalUserStatus(env,request){
 const b=await request.json().catch(()=>null);
 const userId=String(b?.userId||''),status=String(b?.status||'');
 if(!userId||!['active','suspended'].includes(status))return Response.json({error:'bad_request'},{status:400});
 const r=await env.DB.prepare('UPDATE app_users SET status=?,updated_at=? WHERE id=?').bind(status,new Date().toISOString(),userId).run();
 return Response.json({ok:r.meta.changes===1,changed:r.meta.changes});
}

/** Cộng/trừ Point thủ công từ admin — ghi ledger reason='admin_adjust'. */
async function internalWalletAdjust(env,request){
 const b=await request.json().catch(()=>null);
 const userId=String(b?.userId||''),delta=Number(b?.delta),reason=String(b?.reason||'').slice(0,200);
 if(!userId||!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>100000)return Response.json({error:'bad_request'},{status:400});
 if(delta<0){const wallet=await env.DB.prepare('SELECT balance FROM zalo_point_accounts WHERE user_id=?').bind(userId).first();if(!wallet||wallet.balance+delta<0)return Response.json({error:'insufficient_points'},{status:409});}
 const now=new Date().toISOString(),referenceId=crypto.randomUUID();
 const batch=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(userId,now),
  env.DB.prepare('INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),userId,delta,'admin_adjust',referenceId,now),
  env.DB.prepare('UPDATE zalo_point_accounts SET balance=balance+?,updated_at=? WHERE user_id=?').bind(delta,now,userId),
 ]);
 return Response.json({ok:true,referenceId});
}
