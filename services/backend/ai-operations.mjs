import {readAiSession} from './auth.mjs';
import {readPublished} from '../admin/store.mjs';
import {encrypt,decrypt,b64} from '../admin/crypto.mjs';
import {bodyJson} from './http.mjs';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const LEASE_MS=180000; // Provider runtime is capped at 120s; leave time for persistence.
async function resultKey(env){
 if(!env.SESSION_SECRET)throw Error('session_not_configured');
 return {ADMIN_ENCRYPTION_KEY:b64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ai-result:'+env.SESSION_SECRET)))};
}
export async function chargeAi(env,request){
 const session=await readAiSession(env,request);if(!session)return reply({error:'unauthorized'},401);
 const b=await bodyJson(request),operationId=b?.operationId,requestHash=b?.requestHash;
 if(typeof operationId!=='string'||!/^[a-zA-Z0-9_-]{8,120}$/.test(operationId)||typeof requestHash!=='string'||!/^[a-f0-9]{64}$/.test(requestHash))return reply({error:'invalid_operation'},400);
 // Check existing operation before current pricing: retries belong to the old snapshot.
 const existing=await env.DB.prepare('SELECT * FROM backend_ai_operations WHERE user_id=? AND operation_id=?').bind(session.sub,operationId).first();
 if(existing)return replay(env,existing,b);
 const published=await readPublished(env);
 if(!published||published.revision!==b.revision)return reply({error:'revision_mismatch'},409);
 const c=published.config,service=c.billing.services.find(s=>s.id===b.serviceId);
 const price=service?.status==='paid'&&Number.isSafeInteger(service.points)&&service.points>0?service.points:0;
 if(!c.ai.enabled||!c.billing.enabled||c.operations.maintenance||!price)return reply({error:'service_not_paid'},403);
 const chargeId=crypto.randomUUID(),now=Date.now(),iso=new Date(now).toISOString();
 await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(session.sub,iso),
  env.DB.prepare("INSERT INTO backend_ai_operations(user_id,operation_id,charge_id,service_id,request_hash,config_revision,points,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,'running',?,? WHERE EXISTS(SELECT 1 FROM zalo_point_accounts WHERE user_id=? AND balance>=?) ON CONFLICT(user_id,operation_id) DO NOTHING").bind(session.sub,operationId,chargeId,b.serviceId,requestHash,b.revision,price,now,now,session.sub,price),
  env.DB.prepare("INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,user_id,-points,'ai_service',charge_id,? FROM backend_ai_operations WHERE charge_id=?").bind(chargeId,iso,chargeId),
  env.DB.prepare('UPDATE zalo_point_accounts SET balance=balance-?,updated_at=? WHERE user_id=? AND changes()=1').bind(price,iso,session.sub)
 ]);
 const op=await env.DB.prepare('SELECT * FROM backend_ai_operations WHERE user_id=? AND operation_id=?').bind(session.sub,operationId).first();
 if(!op)return reply({error:'insufficient_points',needed:price},402);
 if(op.charge_id!==chargeId)return replay(env,op,b);
 return reply({ok:true,chargeId,points:price});
}
async function replay(env,op,input){
 if(op.request_hash!==input.requestHash||op.service_id!==input.serviceId)return reply({error:'operation_conflict'},409);
 if(op.status==='succeeded'){
  if(!op.response_json)return reply({error:'result_expired'},410);
  return reply({ok:true,replayed:true,response:JSON.parse(await decrypt(await resultKey(env),op.charge_id,op.response_json))});
 }
 return reply({error:op.status==='refunded'?'operation_refunded':'operation_in_progress'},409);
}
export async function completeAi(env,request){
 const session=await readAiSession(env,request);if(!session)return reply({error:'unauthorized'},401);
 const b=await bodyJson(request,600000);
 if(!b?.chargeId||!b?.response||!Array.isArray(b.response.choices))return reply({error:'bad_request'},400);
 const value=await encrypt(await resultKey(env),b.chargeId,JSON.stringify(b.response)),now=Date.now();
 const r=await env.DB.prepare("UPDATE backend_ai_operations SET status='succeeded',response_json=?,updated_at=? WHERE charge_id=? AND user_id=? AND status='running' AND created_at>?").bind(value,now,b.chargeId,session.sub,now-LEASE_MS).run();
 if(r.meta.changes)return reply({ok:true});
 const op=await env.DB.prepare('SELECT status FROM backend_ai_operations WHERE charge_id=? AND user_id=?').bind(b.chargeId,session.sub).first();
 return op?.status==='succeeded'?reply({ok:true}):reply({error:'operation_not_running'},409);
}
export async function refundAi(env,request){
 const session=await readAiSession(env,request);if(!session)return reply({error:'unauthorized'},401);
 const b=await bodyJson(request);
 if(typeof b?.chargeId!=='string')return reply({error:'bad_request'},400);
 const op=await env.DB.prepare('SELECT * FROM backend_ai_operations WHERE charge_id=? AND user_id=?').bind(b.chargeId,session.sub).first();
 if(!op)return reply({error:'charge_not_found'},404);
 if(op.status==='succeeded')return reply({error:'operation_completed'},409);
 if(op.status==='refunded')return reply({ok:true,refunded:false});
 await refundOperation(env,op.charge_id);
 const after=await env.DB.prepare('SELECT status FROM backend_ai_operations WHERE charge_id=?').bind(op.charge_id).first();
 return after.status==='refunded'?reply({ok:true,refunded:true}):reply({error:'operation_completed'},409);
}
async function refundOperation(env,chargeId,cutoff=Date.now()){
 const now=Date.now(),iso=new Date(now).toISOString();
 // All three mutations commit or roll back together, including retries and cron races.
 await env.DB.batch([
  env.DB.prepare("INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,user_id,points,'ai_service_refund',charge_id,? FROM backend_ai_operations WHERE charge_id=? AND status='running' AND created_at<=? ON CONFLICT(reason,reference_id,user_id) DO NOTHING").bind(crypto.randomUUID(),iso,chargeId,cutoff),
  env.DB.prepare('UPDATE zalo_point_accounts SET balance=balance+(SELECT points FROM backend_ai_operations WHERE charge_id=?),updated_at=? WHERE user_id=(SELECT user_id FROM backend_ai_operations WHERE charge_id=?) AND changes()=1').bind(chargeId,iso,chargeId),
  env.DB.prepare("UPDATE backend_ai_operations SET status='refunded',updated_at=? WHERE charge_id=? AND status='running' AND EXISTS(SELECT 1 FROM zalo_point_ledger WHERE reason='ai_service_refund' AND reference_id=backend_ai_operations.charge_id AND user_id=backend_ai_operations.user_id)").bind(now,chargeId)
 ]);
}
export async function reconcileAi(env,now=Date.now()){
 const cutoff=now-LEASE_MS;
 const pending=await env.DB.prepare("SELECT charge_id FROM backend_ai_operations WHERE status='running' AND created_at<=? ORDER BY created_at LIMIT 100").bind(cutoff).all();
 let failed=0;
 for(const row of pending.results)try{await refundOperation(env,row.charge_id,cutoff);}catch{failed++;console.error(JSON.stringify({event:'ai.refund_retry_failed',chargeId:row.charge_id}));}
 await env.DB.batch([
  env.DB.prepare('DELETE FROM ai_rate_limits WHERE expires_at<?').bind(now),
  env.DB.prepare("DELETE FROM zalo_pending_tokens"),
  env.DB.prepare("DELETE FROM oauth_states WHERE julianday(created_at)<julianday('now','-1 day')"),
  env.DB.prepare("DELETE FROM oauth_referrals WHERE julianday(created_at)<julianday('now','-1 day')"),
  // Keep the operation tombstone to prevent a later retry from charging again.
  env.DB.prepare("UPDATE backend_ai_operations SET response_json=NULL WHERE status='succeeded' AND updated_at<? AND response_json IS NOT NULL").bind(now-7*86400000)
 ]);
 if(failed)throw Error('ai_refund_reconciliation_incomplete');
 return {checked:pending.results.length};
}
