import {equal} from '../admin/crypto.mjs';
import {json,trustedOrigin} from './http.mjs';
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
 await env.DB.prepare('INSERT INTO oauth_states(id,code_verifier,created_at) VALUES(?,?,?)').bind(state,verifier,new Date().toISOString()).run();
 const url=new URL('https://oauth.zaloapp.com/v4/permission');url.search=new URLSearchParams({app_id:env.ZALO_APP_ID,redirect_uri:env.ZALO_REDIRECT_URI,code_challenge:challenge,state}).toString();
 return new Response(null,{status:302,headers:{location:url.href,'cache-control':'no-store','set-cookie':`astrox_oauth=${state}; HttpOnly; Secure; SameSite=Lax; Path=/auth/zalo; Max-Age=600`}});
}
export async function zaloCallback(env,request,settings,fetchImpl=fetch){
 const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');const cookie=(request.headers.get('cookie')||'').match(/(?:^|;\s*)astrox_oauth=([^;]+)/)?.[1];
 if(!state||!code||!cookie||!await equal(state,cookie)){await diag(env,'callback_rejected',{has_state:!!state,has_code:!!code,has_cookie:!!cookie,zalo_error:url.searchParams.get('error')||null,zalo_error_description:(url.searchParams.get('error_description')||'').slice(0,200)||null});return json(env,request,{error:'invalid_oauth_state'},400);}
 const row=await env.DB.prepare("DELETE FROM oauth_states WHERE id=? AND julianday(created_at)>julianday('now','-10 minutes') RETURNING code_verifier").bind(state).first();if(!row){await diag(env,'state_expired_or_missing',{});return json(env,request,{error:'invalid_or_expired_state'},400);}
 const r=await fetchImpl('https://oauth.zaloapp.com/v4/access_token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',secret_key:env.ZALO_APP_SECRET},body:new URLSearchParams({code,app_id:env.ZALO_APP_ID,grant_type:'authorization_code',code_verifier:row.code_verifier}),redirect:'manual',signal:AbortSignal.timeout(15000)});
 const tokens=await r.json().catch(()=>null);if(!r.ok||!tokens?.access_token){await diag(env,'token_exchange_failed',{status:r.status,body:redact(tokens)});return json(env,request,{error:'token_exchange_failed'},502);}
 let me;try{me=await verifyZaloUser(tokens.access_token,fetchImpl);}catch(e){await diag(env,'identity_unverified',{reason:String(e?.message||'').slice(0,250)});return json(env,request,{error:'zalo_identity_unverified',message:'Chưa xác minh được danh tính từ Zalo. Vui lòng thử lại.'},502);}
 const now=new Date().toISOString(),candidate=crypto.randomUUID();
 // Identity insert and user creation commit together; unique identity prevents races.
 await env.DB.batch([
  env.DB.prepare("INSERT INTO app_users(id,display_name,avatar_url,status,created_at,updated_at) SELECT ?,?,?,'active',?,? WHERE NOT EXISTS(SELECT 1 FROM zalo_identities WHERE provider='zalo' AND provider_subject=?)").bind(candidate,String(me.name||'Zalo User').slice(0,200),String(me.picture?.data?.url||'').slice(0,2000),now,now,String(me.id)),
  env.DB.prepare("INSERT OR IGNORE INTO zalo_identities(id,user_id,provider,provider_subject,created_at) SELECT ?,?,'zalo',?,? WHERE EXISTS(SELECT 1 FROM app_users WHERE id=?)").bind(crypto.randomUUID(),candidate,String(me.id),now,candidate),
  env.DB.prepare("INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) SELECT user_id,0,? FROM zalo_identities WHERE provider='zalo' AND provider_subject=?").bind(now,String(me.id))
 ]);
 const identity=await env.DB.prepare("SELECT user_id FROM zalo_identities WHERE provider='zalo' AND provider_subject=?").bind(String(me.id)).first();
 const user=await env.DB.prepare("SELECT id FROM app_users WHERE id=? AND status='active'").bind(identity.user_id).first();if(!user)return json(env,request,{error:'account_disabled'},403);
 const headers=new Headers({location:settings.zalo.returnUrl,'cache-control':'no-store'});headers.append('set-cookie',await sessionCookie(env,user.id));headers.append('set-cookie','astrox_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/auth/zalo; Max-Age=0');return new Response(null,{status:302,headers});
}
export function logout(env,request){if(!trustedOrigin(env,request))return json(env,request,{error:'invalid_origin'},403);const r=json(env,request,{ok:true});r.headers.set('set-cookie','astrox_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return r;}
