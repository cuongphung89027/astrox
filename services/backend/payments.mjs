// Adapted from the deployed astrox-api Worker (ba4846ba, 2026-09-17).
// Legacy tables and PayOS signature format are preserved; money writes are atomic.
import {equal} from '../admin/crypto.mjs';
import {runtimeSettings} from './config.mjs';
import {readSession} from './auth.mjs';
import {firstTopupStatements} from './rewards.mjs';
import {json,bodyJson,trustedOrigin} from './http.mjs';
const sortObj=o=>Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]]));
function queryValue(v){if(Array.isArray(v))return JSON.stringify(v.map(x=>x&&typeof x==='object'?sortObj(x):x));if(v==null||v==='undefined'||v==='null')return '';if(typeof v==='object')return JSON.stringify(sortObj(v));return String(v);}
export async function payosSignature(key,data){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);const raw=Object.keys(data).sort().map(k=>`${k}=${queryValue(data[k])}`).join('&');return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');}
const configured=env=>Boolean(env.PAYOS_CLIENT_ID&&env.PAYOS_API_KEY&&env.PAYOS_CHECKSUM_KEY);
async function getPromo(env,settings,code,amount,userId){
 if(!code)return null;
 if(settings.config){const p=settings.config.billing.promos.find(p=>p.code===code&&p.enabled);if(!p)throw new Error('invalid_promo');if(p.expiresAt&&Date.parse(p.expiresAt)<=Date.now())throw new Error('promo_expired');return {id:p.id,code:p.code,bonus:p.bonus,limit:p.limit,perUser:p.perUser};}
 const p=await env.DB.prepare('SELECT * FROM promotion_codes WHERE code=? AND active=1').bind(code).first();if(!p)throw new Error('invalid_promo');if(p.expires_at&&Date.parse(p.expires_at)<=Date.now())throw new Error('promo_expired');if(p.starts_at&&Date.parse(p.starts_at)>Date.now())throw new Error('invalid_promo');if(amount&&amount<(p.min_amount_vnd||0))throw new Error('promo_min_amount');if(p.max_redemptions!=null&&p.redeemed_count>=p.max_redemptions)throw new Error('promo_exhausted');
 return {id:p.id,code:p.code,bonus:p.bonus_type==='percent'?Math.floor(amount/1000*p.points/100):p.points,limit:p.max_redemptions??1000000000,perUser:1000000000,legacy:true};
}
export async function handlePromoCheck(env,request){
 const user=await readSession(env,request);if(!user)return json(env,request,{error:'unauthorized'},401);const b=await bodyJson(request);const code=String(b?.promo_code||'').trim().toUpperCase();if(!code)return json(env,request,{error:'bad_request'},400);
 const settings=await runtimeSettings(env);try{const p=await getPromo(env,settings,code,Number(b?.amount_vnd)||0,user.sub);return json(env,request,{ok:true,bonus_points:p.bonus,bonus_label:`+${p.bonus} Point`});}catch(e){return json(env,request,{error:e.message},400);}
}
export async function handleTopupCreate(env,request,fetchImpl=fetch){
 if(!trustedOrigin(env,request))return json(env,request,{error:'invalid_origin'},403);
 const session=await readSession(env,request);if(!session)return json(env,request,{error:'unauthorized'},401);
 const settings=await runtimeSettings(env),runtime=settings.env;
 if(!configured(runtime)||!settings.payos.enabled)return json(env,request,{error:'payos_not_configured'},503);
 if(settings.config&&(!settings.config.billing.enabled||settings.config.operations.maintenance))return json(env,request,{error:'topup_disabled'},503);
 const body=await bodyJson(request),amount=body?.amount_vnd;
 if(!Number.isSafeInteger(amount)||amount<10000)return json(env,request,{error:'amount_too_small'},400);
 const pkg=settings.packages.find(p=>p.amount_vnd===amount);if(!pkg)return json(env,request,{error:'invalid_package'},400);
 let promo;try{promo=await getPromo(env,settings,String(body.promo_code||'').trim().toUpperCase(),amount,session.sub);}catch(e){return json(env,request,{error:e.message},400);}
 const points=pkg.points+(promo?.bonus||0);if(!Number.isSafeInteger(points)||points<1)return json(env,request,{error:'invalid_package'},422);
 const orderCode=Date.now()*1000+crypto.getRandomValues(new Uint16Array(1))[0]%1000;
 const id=crypto.randomUUID(),now=new Date().toISOString(),expires=new Date(Date.now()+settings.payos.expiryMinutes*60000).toISOString();
 // Reserve promotions with the order snapshot inside a D1 transaction, before PayOS.
 // Both paid orders and unexpired pending orders consume the limit.
 const count="SELECT COUNT(*) FROM backend_order_snapshots s JOIN topup_orders_zalo o ON o.order_code=s.order_code WHERE s.promo_id=? AND (o.status='paid' OR (o.status IN ('pending') AND s.expires_at>?))";
 const statements=[env.DB.prepare("INSERT INTO topup_orders_zalo(id,user_id,order_code,amount_vnd,points,status,idempotency_key,created_at) VALUES(?,?,?,?,?,'pending',?,?)").bind(id,session.sub,orderCode,amount,points,`payos:${orderCode}`,now)];
 if(promo)statements.push(env.DB.prepare(`INSERT INTO backend_order_snapshots(order_code,user_id,config_revision,package_id,promo_id,promo_code,promo_bonus,expires_at) SELECT ?,?,?,?,?,?,?,? WHERE (${count})<? AND (${count} AND s.user_id=?)<?`).bind(orderCode,session.sub,settings.revision,pkg.id,promo.id,promo.code,promo.bonus,expires,promo.id,now,promo.limit,promo.id,now,session.sub,promo.perUser));
 else statements.push(env.DB.prepare('INSERT INTO backend_order_snapshots(order_code,user_id,config_revision,package_id,promo_bonus,expires_at) VALUES(?,?,?,?,0,?)').bind(orderCode,session.sub,settings.revision,pkg.id,expires));
 const reserved=await env.DB.batch(statements);
 if(!reserved[1].meta.changes){await env.DB.prepare("UPDATE topup_orders_zalo SET status='cancelled' WHERE id=?").bind(id).run();return json(env,request,{error:'promo_exhausted'},400);}
 const payload={orderCode,amount,description:`AstroX ${points} Point`,returnUrl:settings.payos.returnUrl,cancelUrl:settings.payos.cancelUrl};
 payload.signature=await payosSignature(runtime.PAYOS_CHECKSUM_KEY,payload);payload.expiredAt=Math.floor(Date.parse(expires)/1000);
 try{
  const response=await fetchImpl('https://api-merchant.payos.vn/v2/payment-requests',{method:'POST',headers:{'content-type':'application/json','x-client-id':runtime.PAYOS_CLIENT_ID,'x-api-key':runtime.PAYOS_API_KEY},body:JSON.stringify(payload),redirect:'manual',signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>null);if(!response.ok||data?.code!=='00'||!data.data)throw new Error('payos_create_failed');
  if(!await equal(await payosSignature(runtime.PAYOS_CHECKSUM_KEY,data.data),String(data.signature||'')))throw new Error('payos_bad_signature');
  if(Number(data.data.orderCode)!==orderCode||Number(data.data.amount)!==amount||!String(data.data.checkoutUrl||'').startsWith('https://pay.payos.vn/'))throw new Error('payos_invalid_response');
  await env.DB.prepare("UPDATE topup_orders_zalo SET status=CASE WHEN status='pending' THEN 'pending' ELSE status END,payos_checkout_url=?,payos_payment_link_id=? WHERE id=?").bind(data.data.checkoutUrl,data.data.paymentLinkId||'',id).run();
  return json(env,request,{checkoutUrl:data.data.checkoutUrl,orderCode,amount,points,bonus_points:promo?.bonus||0,revision:settings.revision});
 }catch(e){
  // A timeout may still have created a payable order. Keep its immutable snapshot
  // and reservation until expiry; a later signed webhook must remain payable.
  await env.DB.prepare("UPDATE topup_orders_zalo SET status='pending' WHERE id=? AND status='pending'").bind(id).run();
  return json(env,request,{error:['payos_bad_signature','payos_invalid_response'].includes(e.message)?e.message:'payos_create_failed'},502);
 }
}
export async function handlePayosWebhook(env,request){
 const settings=await runtimeSettings(env),runtime=settings.env;if(!configured(runtime))return json(env,request,{error:'payos_not_configured'},503);
 const body=await bodyJson(request);if(!body?.data||typeof body.signature!=='string')return json(env,request,{error:'bad_request'},400);
 // Retain old checksum for in-flight legacy orders if Admin has rotated its override.
 const keys=[runtime.PAYOS_CHECKSUM_KEY,env.PAYOS_CHECKSUM_KEY].filter(Boolean);let valid=false;for(const key of new Set(keys))if(await equal(await payosSignature(key,body.data),body.signature))valid=true;
 if(!valid)return json(env,request,{error:'invalid_signature'},400);
 const d=body.data;if(d.code!=='00')return json(env,request,{ok:true,skipped:'not_paid'});
 if(!Number.isSafeInteger(Number(d.orderCode))||!Number.isSafeInteger(Number(d.amount)))return json(env,request,{error:'invalid_payment'},400);
 const order=await env.DB.prepare('SELECT * FROM topup_orders_zalo WHERE order_code=?').bind(Number(d.orderCode)).first();if(!order)return json(env,request,{ok:true,skipped:'unknown_order'});
 if(Number(d.amount)!==order.amount_vnd)return json(env,request,{ok:true,skipped:'amount_mismatch'});
 if(order.payos_payment_link_id&&d.paymentLinkId&&order.payos_payment_link_id!==d.paymentLinkId)return json(env,request,{error:'payment_link_mismatch'},400);
 const now=new Date().toISOString(),ref=String(d.orderCode);
 await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(order.user_id,now),
  env.DB.prepare("INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,user_id,points,'topup_payos',?,? FROM topup_orders_zalo WHERE id=? AND status IN ('pending') ON CONFLICT(reason,reference_id,user_id) DO NOTHING").bind(crypto.randomUUID(),ref,now,order.id),
  env.DB.prepare('UPDATE zalo_point_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND changes()=1').bind(order.points,now,order.user_id),
  env.DB.prepare("UPDATE topup_orders_zalo SET status='paid',paid_at=? WHERE id=? AND status IN ('pending') AND EXISTS(SELECT 1 FROM zalo_point_ledger WHERE reason='topup_payos' AND reference_id=? AND user_id=?)").bind(now,order.id,ref,order.user_id),
  env.DB.prepare('UPDATE promotion_codes SET redeemed_count=redeemed_count+1 WHERE id=(SELECT promo_id FROM topup_promo_map WHERE order_code=?) AND changes()=1').bind(Number(d.orderCode)),
  // Thưởng inviter khi invitee nạp lần đầu (cấu hình rewards admin đã publish).
  ...await firstTopupStatements(env,settings,order)
 ]);
 return json(env,request,{ok:true});
}
