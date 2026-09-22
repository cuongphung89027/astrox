import {equal} from '../admin/crypto.mjs';
import {json,trustedOrigin} from './http.mjs';
import {creditRegistration} from './rewards.mjs';
const enc=new TextEncoder();
// Zalo chặn login ở nhiều tầng (consent, token exchange, verify) mà không bao giờ quay lại callback,
// nên mọi nhánh lỗi phải để lại dấu vết trong D1 để truy vết production.
const redact=o=>{try{return JSON.stringify({...o,access_token:undefined,refresh_token:undefined,id_token:undefined}).slice(0,300)}catch{return null}};
const diag=async(env,stage,detail)=>{try{await env.DB.prepare('INSERT INTO login_diagnostics(stage,detail,created_at) VALUES(?,?,?)').bind(stage,JSON.stringify(detail).slice(0,900),new Date().toISOString()).run();console.error(JSON.stringify({event:'zalo_login_failed',stage,...detail}))}catch{}};
const base64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function hmac(key,value){if(!key)throw new Error('session_not_configured');const k=await crypto.subtle.importKey('raw',enc.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return base64(await crypto.subtle.sign('HMAC',k,enc.encode(value)));}
export async function sessionCookie(env,userId,now=Date.now()){
 const body=base64(enc.encode(JSON.stringify({sub:userId,iat:now})));
 return `astrox_session=${body}.${await hmac(env.SESSION_SECRET,body)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`;
}
export async function readSession(env,request){
 try{if(!env.SESSION_SECRET)return null;const raw=(request.headers.get('cookie')||'').match(/(?:^|;\s*)astrox_session=([^;]+)/)?.[1];if(!raw)return null;const parts=raw.split('.');if(parts.length!==2)return null;const [body,sig]=parts;if(!await equal(sig,await hmac(env.SESSION_SECRET,body)))return null;
 const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
 if(typeof p.sub!=='string'||!Number.isFinite(p.iat)||p.iat>Date.now()+60000||p.iat<Date.now()-30*86400000)return null;
 const user=await env.DB.prepare("SELECT id FROM app_users WHERE id=? AND status='active'").bind(p.sub).first();return user?p:null;
 }catch{return null;}
}
export async function verifyZaloUser(token,fetchImpl=fetch){
 if(typeof token!=='string'||!token)throw new Error('zalo_identity_unverified:missing_token');
 const r=await fetchImpl('https://graph.zalo.me/v2.0/me?fields=id,name,picture',{headers:{access_token:token},redirect:'manual',signal:AbortSignal.timeout(15000)});const me=await r.json().catch(()=>null);
 if(!r.ok||!me?.id||me.error)throw new Error(`zalo_identity_unverified:status=${r.status} body=${redact(me&&me.error?{error:me.error}:me)}`);return me;
}
export async function zaloLogin(env,request,settings){
 if(!settings.zalo.enabled||!env.ZALO_APP_ID||!env.ZALO_APP_SECRET||!env.SESSION_SECRET)return json(env,request,{error:'zalo_not_configured'},503);
 const state=crypto.randomUUID(),verifier=base64(crypto.getRandomValues(new Uint8Array(32)));const challenge=base64(await crypto.subtle.digest('SHA-256',enc.encode(verifier)));
 const ref=new URL(request.url).searchParams.get('ref')||'';
 // Ref code giới thiệu bám theo phiên OAuth để sống sót qua callback/finish.
 const refStatements=/^[A-Z0-9]{4,10}$/.test(ref)?[env.DB.prepare('INSERT INTO oauth_referrals(id,ref,created_at) VALUES(?,?,?)').bind(state,ref,new Date().toISOString())]:[];
 await env.DB.batch([env.DB.prepare('INSERT INTO oauth_states(id,code_verifier,created_at) VALUES(?,?,?)').bind(state,verifier,new Date().toISOString()),...refStatements]);
 const url=new URL('https://oauth.zaloapp.com/v4/permission');url.search=new URLSearchParams({app_id:env.ZALO_APP_ID,redirect_uri:env.ZALO_REDIRECT_URI,code_challenge:challenge,state}).toString();
 return new Response(null,{status:302,headers:{location:url.href,'cache-control':'no-store','set-cookie':`astrox_oauth=${state}; HttpOnly; Secure; SameSite=Lax; Path=/auth/zalo; Max-Age=600`}});
}
export async function zaloCallback(env,request,settings,fetchImpl=fetch){
 const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');const cookie=(request.headers.get('cookie')||'').match(/(?:^|;\s*)astrox_oauth=([^;]+)/)?.[1];
 if(!state||!code||!cookie||!await equal(state,cookie)){await diag(env,'callback_rejected',{has_state:!!state,has_code:!!code,has_cookie:!!cookie,zalo_error:url.searchParams.get('error')||null,zalo_error_description:(url.searchParams.get('error_description')||'').slice(0,200)||null});return json(env,request,{error:'invalid_oauth_state'},400);}
 const row=await env.DB.prepare("DELETE FROM oauth_states WHERE id=? AND julianday(created_at)>julianday('now','-10 minutes') RETURNING code_verifier").bind(state).first();if(!row){await diag(env,'state_expired_or_missing',{});return json(env,request,{error:'invalid_or_expired_state'},400);}
 const refRow=await env.DB.prepare('DELETE FROM oauth_referrals WHERE id=? RETURNING ref').bind(state).first();const ref=refRow?.ref||null;
 const r=await fetchImpl('https://oauth.zaloapp.com/v4/access_token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',secret_key:env.ZALO_APP_SECRET},body:new URLSearchParams({code,app_id:env.ZALO_APP_ID,grant_type:'authorization_code',code_verifier:row.code_verifier}),redirect:'manual',signal:AbortSignal.timeout(15000)});
 const tokens=await r.json().catch(()=>null);if(!r.ok||!tokens?.access_token){await diag(env,'token_exchange_failed',{status:r.status,body:redact(tokens)});return json(env,request,{error:'token_exchange_failed'},502);}
 let me;try{me=await verifyZaloUser(tokens.access_token,fetchImpl);}
 // Zalo từ chối /me gọi từ IP edge quốc tế (error -501) dù token hợp lệ — worker legacy
 // từng né bằng cách đẩy bước này về trình duyệt user. Escrow token dưới id một-lần-dùng
 // rồi trả về finish page; trình duyệt phải submit lại đúng token đã escrow mới được tính.
 catch(e){const pendingId=crypto.randomUUID();await diag(env,'server_verify_failed_fallback',{reason:String(e?.message||'').slice(0,250)});
  const pendingStatements=[env.DB.prepare('INSERT INTO zalo_pending_tokens(id,access_token,created_at) VALUES(?,?,?)').bind(pendingId,tokens.access_token,new Date().toISOString())];
  if(ref)pendingStatements.push(env.DB.prepare('INSERT INTO oauth_referrals(id,ref,created_at) VALUES(?,?,?)').bind(pendingId,ref,new Date().toISOString()));
  await env.DB.batch(pendingStatements);
  return new Response(null,{status:302,headers:{location:`/auth/zalo/finish?id=${pendingId}`,'cache-control':'no-store'}});}
 return await completeZaloLogin(env,request,settings,me,ref);
}
async function completeZaloLogin(env,request,settings,me,ref=null){
 const now=new Date().toISOString(),candidate=crypto.randomUUID();
 // Người dùng mới hay đã có từ trước — quyết định thưởng đăng ký giới thiệu.
 const existing=await env.DB.prepare("SELECT user_id FROM zalo_identities WHERE provider='zalo' AND provider_subject=?").bind(String(me.id)).first();
 // Identity insert and user creation commit together; unique identity prevents races.
 await env.DB.batch([
  env.DB.prepare("INSERT INTO app_users(id,display_name,avatar_url,status,created_at,updated_at) SELECT ?,?,?,'active',?,? WHERE NOT EXISTS(SELECT 1 FROM zalo_identities WHERE provider='zalo' AND provider_subject=?)").bind(candidate,String(me.name||'Zalo User').slice(0,200),String(me.picture?.data?.url||'').slice(0,2000),now,now,String(me.id)),
  env.DB.prepare("INSERT OR IGNORE INTO zalo_identities(id,user_id,provider,provider_subject,created_at) SELECT ?,?,'zalo',?,? WHERE EXISTS(SELECT 1 FROM app_users WHERE id=?)").bind(crypto.randomUUID(),candidate,String(me.id),now,candidate),
  env.DB.prepare("INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) SELECT user_id,0,? FROM zalo_identities WHERE provider='zalo' AND provider_subject=?").bind(now,String(me.id))
 ]);
 const identity=await env.DB.prepare("SELECT user_id FROM zalo_identities WHERE provider='zalo' AND provider_subject=?").bind(String(me.id)).first();
 const user=await env.DB.prepare("SELECT id FROM app_users WHERE id=? AND status='active'").bind(identity.user_id).first();if(!user)return json(env,request,{error:'account_disabled'},403);
 if(ref&&!existing)await creditRegistration(env,identity.user_id,ref);
 const cookies=[['set-cookie',await sessionCookie(env,user.id)],['set-cookie','astrox_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/auth/zalo; Max-Age=0']];
 if(request.method==='GET'){const headers=new Headers({location:settings.zalo.returnUrl,'cache-control':'no-store'});for(const [k,v] of cookies)headers.append(k,v);return new Response(null,{status:302,headers});}
 const r=json(env,request,{ok:true,redirect:settings.zalo.returnUrl||'/'});for(const [k,v] of cookies)r.headers.append(k,v);return r;
}
const FINISH_PAGE=(id,token)=>`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Đang hoàn tất đăng nhập…</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding-top:40vh;color:#333"><p id="st">Đang hoàn tất đăng nhập…</p><script>window.__AX_T__=${JSON.stringify(token)};(async()=>{const st=document.getElementById('st'),id=${JSON.stringify(id)};try{const me=await(await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture&access_token='+encodeURIComponent(window.__AX_T__),{cache:'no-store'})).json();if(!me||!me.id||me.error)throw new Error('me_error:'+JSON.stringify(me&&me.error?me.error:me).slice(0,200));const done=await(await fetch('/auth/zalo/finish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,token:window.__AX_T__,me})})).json();if(!done||!done.ok)throw new Error('finish_error:'+JSON.stringify(done).slice(0,200));location.replace(done.redirect||'/');}catch(e){st.textContent='Không xác minh được danh tính từ Zalo. Vui lòng đăng nhập lại.';try{await fetch('/auth/zalo/finish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,error:String(e.message).slice(0,300)})})}catch(_){}}})();</script></body></html>`;
export async function zaloFinish(env,request,settings){
 const url=new URL(request.url),id=url.searchParams.get('id');
 if(request.method==='GET'){
  if(!id)return json(env,request,{error:'missing_id'},400);
  const row=await env.DB.prepare("SELECT access_token FROM zalo_pending_tokens WHERE id=? AND julianday(created_at)>julianday('now','-15 minutes')").bind(id).first();
  if(!row)return json(env,request,{error:'invalid_or_expired_session',message:'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'},400);
  return new Response(FINISH_PAGE(id,row.access_token),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; connect-src 'self' https://graph.zalo.me"}});
 }
 let body;try{body=await request.json()}catch{return json(env,request,{error:'bad_request'},400)}
 if(body?.error){await diag(env,'finish_page_error',{error:String(body.error).slice(0,250)});return json(env,request,{error:'zalo_identity_unverified',message:'Không xác minh được danh tính từ Zalo. Vui lòng đăng nhập lại.'},502);}
 const token=String(body?.token||''),me=body?.me;
 const row=await env.DB.prepare("DELETE FROM zalo_pending_tokens WHERE id=? AND julianday(created_at)>julianday('now','-15 minutes') RETURNING access_token").bind(String(body?.id||'')).first();
 if(!row){await diag(env,'finish_invalid_pending',{});return json(env,request,{error:'invalid_or_expired_session',message:'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'},400);}
 const refRow=await env.DB.prepare('DELETE FROM oauth_referrals WHERE id=? RETURNING ref').bind(String(body?.id||'')).first();const ref=refRow?.ref||null;
 if(!token||!await equal(token,row.access_token)){await diag(env,'finish_token_mismatch',{});return json(env,request,{error:'verification_failed'},401);}
 if(!me||typeof me.id!=='string'||!me.id||me.id.length>64){await diag(env,'finish_invalid_identity',{me:redact(me)});return json(env,request,{error:'verification_failed'},400);}
 return await completeZaloLogin(env,request,settings,me,ref);
}
export function logout(env,request){if(!trustedOrigin(env,request))return json(env,request,{error:'invalid_origin'},403);const r=json(env,request,{ok:true});r.headers.set('set-cookie','astrox_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return r;}
