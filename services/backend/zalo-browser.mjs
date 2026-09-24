import {encrypt,decrypt,b64} from '../admin/crypto.mjs';
import {json,bodyJson} from './http.mjs';
import {loginFailure} from './login-failure.mjs';
const enc=new TextEncoder();
const hash=async value=>b64(await crypto.subtle.digest('SHA-256',enc.encode(value)));
const key=async env=>({ADMIN_ENCRYPTION_KEY:await hash('zalo-browser:'+env.SESSION_SECRET)});
const cookieValue=request=>(request.headers.get('cookie')||'').match(/(?:^|;\s*)astrox_zalo_finish=([^;]+)/)?.[1]||'';
export const clearBrowserCookie='astrox_zalo_finish=; HttpOnly; Secure; SameSite=Lax; Path=/auth/zalo; Max-Age=0';

// TEMPORARY OPERATOR-APPROVED TRUST EXCEPTION: client profile ID is NOT server verified.
// Binding/expiry/replay protections below do not prevent a browser owner forging me.id.
export async function startBrowserLogin(env,token,ref){
 const id=crypto.randomUUID(),cookie=crypto.randomUUID(),proof=crypto.randomUUID(),expires=Date.now()+180000;
 const payload=await encrypt(await key(env),id,JSON.stringify({token,ref,proof}));
 await env.DB.batch([
  env.DB.prepare('DELETE FROM zalo_browser_pending WHERE expires_at<=?').bind(Date.now()),
  env.DB.prepare('INSERT INTO zalo_browser_pending(id,cookie_hash,proof_hash,payload,expires_at) VALUES(?,?,?,?,?)').bind(id,await hash(cookie),await hash(proof),payload,expires),
 ]);
 return new Response(null,{status:302,headers:{location:'/auth/zalo/finish?id='+id,'cache-control':'no-store','referrer-policy':'no-referrer','set-cookie':`astrox_zalo_finish=${cookie}; HttpOnly; Secure; SameSite=Lax; Path=/auth/zalo; Max-Age=180`}});
}
export async function browserLoginFinish(env,request,settings,complete){
 const fail=(status=400)=>loginFailure(env,request,{error:'invalid_or_expired_state'},status);
 if(!env.SESSION_SECRET)return fail();
 if(request.method!=='GET'&&request.method!=='POST')return json(env,request,{error:'method_not_allowed'},405);
 if(request.method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return json(env,request,{error:'invalid_origin'},403);
 const cookie=cookieValue(request);if(!cookie)return fail();
 if(request.method==='GET'){
  const id=new URL(request.url).searchParams.get('id')||'';
  const row=await env.DB.prepare('SELECT payload FROM zalo_browser_pending WHERE id=? AND cookie_hash=? AND expires_at>?').bind(id,await hash(cookie),Date.now()).first();
  if(!row)return fail();
  const {token,proof}=JSON.parse(await decrypt(await key(env),id,row.payload));
  const nonce=crypto.randomUUID();
  const config=JSON.stringify({id,token,proof}).replace(/</g,'\\u003c');
  return new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đang đăng nhập · AstroX</title><style nonce="${nonce}">body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f6f7ed;color:#214d42;font:16px/1.7 system-ui}main{max-width:380px;padding:32px;text-align:center}h1{font:500 30px Georgia,serif}a{color:inherit;padding:12px;display:inline-block}small{letter-spacing:.18em}</style></head><body><main><small>ASTROX</small><h1>Đang đăng nhập</h1><p id="status" role="status">Chờ một chút nhé…</p><div id="retry" hidden><a href="/auth/zalo/login">Thử lại</a><a href="https://theastrox.space/">Về AstroX</a></div></main><script nonce="${nonce}">const config=${config};
(async()=>{try{const response=await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture&access_token='+encodeURIComponent(config.token),{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});const me=await response.json();if(!response.ok||!me.id||me.error)throw Error('provider');config.token='';const result=await fetch('/auth/zalo/finish',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({id:config.id,proof:config.proof,me:{id:me.id,name:me.name,picture:me.picture}}),signal:AbortSignal.timeout(15000)});const done=await result.json();if(!result.ok||!done.ok)throw Error('finish');location.replace(done.redirect);}catch{config.token='';document.getElementById('status').textContent='Chưa thể đăng nhập Zalo. Vui lòng thử lại.';document.getElementById('retry').hidden=false;}})();</script></body></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store, no-transform','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self' https://graph.zalo.me; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`}});
 }
 let body;try{body=await bodyJson(request,8192);}catch{return json(env,request,{error:'bad_request'},400);}
 if(typeof body?.id!=='string'||body.id.length>64||typeof body?.proof!=='string'||body.proof.length>64||typeof body?.me?.id!=='string'||!/^\d{1,64}$/.test(body.me.id))return fail();
 const row=await env.DB.prepare('DELETE FROM zalo_browser_pending WHERE id=? AND cookie_hash=? AND proof_hash=? AND expires_at>? RETURNING payload').bind(body.id,await hash(cookie),await hash(body.proof),Date.now()).first();
 if(!row)return fail();
 const {ref}=JSON.parse(await decrypt(await key(env),body.id,row.payload));
 let avatar='';try{const url=new URL(body.me.picture?.data?.url);if(url.protocol==='https:')avatar=url.href.slice(0,2000);}catch{}
 const me={id:body.me.id,name:typeof body.me.name==='string'?body.me.name.slice(0,200):'Zalo User',picture:{data:{url:avatar}}};
 const response=await complete(env,request,settings,me,ref);
 response.headers.append('set-cookie',clearBrowserCookie);
 return response;
}
