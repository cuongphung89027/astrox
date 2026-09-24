import {readInsights,readSupport,readIssues,updateIssue} from './insights.mjs';
import {backendStatus,connectionSecretAvailable,importLegacyConfig} from './backend.mjs';
import {aiReport} from './ai-report.mjs';
import {CAPABILITIES,validateConfig,defaultConfig} from './config.ts';
import {state,sql,readPublished,readSecret,saveSecret,saveDraft,publish,recordAudit,auditStatement} from './store.mjs';
import {b64,unb64,equal,token,untoken,sign} from './crypto.mjs';
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const local=(request,env)=>env.LOCAL_ADMIN===true&&['localhost','127.0.0.1'].includes(new URL(request.url).hostname);
const cookie=r=>(r.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('astrox_admin='))?.slice(13)||'';
const cookieValue=(value,dev,clear=false)=>`astrox_admin=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; ${dev?'':'Secure; '}Max-Age=${clear?0:28800}`;
async function identity(request,env){
 if(local(request,env)){const p=await untoken(env,cookie(request));if(!p||!await sql(env,'SELECT id FROM admin_sessions WHERE id=? AND expires>?',p.sid,Date.now()).first())return null;return {...p,capabilities:CAPABILITIES};}
 if(!env.ADMIN_ACCESS_AUD||!env.ADMIN_ACCESS_TEAM_DOMAIN||!env.ADMIN_OWNER_EMAILS)throw Object.assign(new Error('Chưa cấu hình Cloudflare Access cho quản trị.'),{status:503});
 const domain=String(env.ADMIN_ACCESS_TEAM_DOMAIN).replace(/^https:\/\//,'').replace(/\/$/,'');if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain))throw Object.assign(new Error('Access domain không hợp lệ.'),{status:503});
 try{const raw=request.headers.get('Cf-Access-Jwt-Assertion');if(!raw)return null;const[h,p,s]=raw.split('.');const decode=v=>JSON.parse(new TextDecoder().decode(unb64(v.replace(/-/g,'+').replace(/_/g,'/'))));const header=decode(h),claims=decode(p);if(header.alg!=='RS256'||claims.iss!==`https://${domain}`||!Array.isArray(claims.aud)||!claims.aud.includes(env.ADMIN_ACCESS_AUD)||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000||claims.nbf>Date.now()/1000)return null;
 const response=await fetch(`https://${domain}/cdn-cgi/access/certs`,{signal:AbortSignal.timeout(5000)});if(!response.ok)return null;const jwk=(await response.json()).keys.find(k=>k.kid===header.kid);if(!jwk)return null;const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,unb64(s.replace(/-/g,'+').replace(/_/g,'/')),new TextEncoder().encode(h+'.'+p)))return null;
 const email=String(claims.email||'').toLowerCase();let capabilities=CAPABILITIES;if(!String(env.ADMIN_OWNER_EMAILS).toLowerCase().split(',').map(v=>v.trim()).includes(email)){const assignments=JSON.parse(env.ADMIN_ROLE_ASSIGNMENTS||'{}');const published=await readPublished(env);const config=published?.config||(await import('./config.ts')).defaultConfig();const member=await sql(env,'SELECT role_id FROM admin_members WHERE email=?',email).first();const roleId=member?member.role_id:assignments[email];const role=config.access.roles.find(r=>r.id===roleId&&r.id!=='owner');if(!role)return null;capabilities=role.capabilities;}return{email,capabilities,csrf:await sign(env,raw)};
 }catch{return null;}
}
async function body(request){if(Number(request.headers.get('content-length'))>300000)throw Object.assign(new Error('Nội dung quá lớn.'),{status:413});const text=await request.text();if(text.length>300000)throw Object.assign(new Error('Nội dung quá lớn.'),{status:413});try{return JSON.parse(text)}catch{throw Object.assign(new Error('JSON không hợp lệ.'),{status:400})}}
async function activationErrors(env,c){
 const errors=[],backend=await backendStatus(env);
 if(!backend.configVersioned&&(c.billing.enabled||c.rewards.enabled||c.rewards.ads.enabled||c.integrations.payos.enabled||c.integrations.zalo.enabled||c.integrations.wallet.enabled||c.billing.services.some(s=>s.status==='paid')))errors.push({path:'integrations.wallet',message:'Chưa nối backend ví và xác thực. Không thể kích hoạt chức năng cần backend.'});
 if(c.billing.services.some(s=>s.status==='paid')&&!backend.features.paidAi)errors.push({path:'billing.services',message:'Backend chưa hỗ trợ thu Point cho AI. Chỉ có thể áp dụng dịch vụ miễn phí, ẩn hoặc bảo trì.'});
 if((c.rewards.enabled||c.rewards.ads.enabled)&&!backend.features.rewards)errors.push({path:'rewards',message:'Backend chưa hỗ trợ thưởng tự động.'});
 const refs=c.ai.enabled?c.ai.providers.filter(p=>p.enabled).map(p=>p.secretRef):[];if(c.integrations.payos.enabled)refs.push('payos:apiKey','payos:checksumKey');if(c.integrations.zalo.enabled)refs.push('zalo:appSecret');for(const ref of refs)if(!await connectionSecretAvailable(env,ref,backend))errors.push({path:ref,message:'Chưa lưu khóa kết nối.'});return errors;
}
async function legacyData(env,kind){
 const tables=(await sql(env,"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('app_users','zalo_point_accounts')").all()).results.map(r=>r.name);
 if(kind==='users'&&tables.includes('app_users'))return {rows:(await sql(env,'SELECT id,display_name,email,status,created_at,updated_at FROM app_users ORDER BY updated_at DESC LIMIT 200').all()).results,source:'legacy',readOnly:true};
 if(kind==='wallet'&&tables.includes('zalo_point_accounts'))return {rows:(await sql(env,'SELECT user_id,balance,updated_at FROM zalo_point_accounts ORDER BY updated_at DESC LIMIT 200').all()).results,source:'legacy',readOnly:true};
 return null;
}
export async function handleAdmin(request,env){try{
 const path=new URL(request.url).pathname.replace(/^\/api\/admin\/?/,'').replace(/\/$/,'');const method=request.method;
 if(!env.DB)return json({error:'Chưa cấu hình cơ sở dữ liệu Admin.'},503);
 if(path==='login'&&method==='POST'){
 if(!local(request,env))return json({error:'Đăng nhập qua Cloudflare Access.'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Origin không hợp lệ.'},403);
 const key='local',window=Math.floor(Date.now()/600000);await sql(env,'INSERT INTO admin_login_attempts(key,count,window) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window',key,window).run();const attempts=await sql(env,'SELECT count FROM admin_login_attempts WHERE key=?',key).first();if(attempts.count>10)return json({error:'Thử lại sau 10 phút.'},429);
 const b=await body(request);if(typeof b.password!=='string'||!env.LOCAL_ADMIN_PASSWORD||!await equal(b.password,env.LOCAL_ADMIN_PASSWORD))return json({error:'Mật khẩu không đúng.'},401);
 const sid=crypto.randomUUID(),csrf=crypto.randomUUID(),email='local@astrox.dev',exp=Date.now()+28800000;await sql(env,'INSERT INTO admin_sessions(id,expires) VALUES(?,?)',sid,exp).run();await recordAudit(env,email,'session.login','local');return json({user:{email,capabilities:CAPABILITIES},csrf},200,{'Set-Cookie':cookieValue(await token(env,{sid,csrf,email,exp}),true)});
 }
 const user=await identity(request,env);if(!user)return json({error:'Cần đăng nhập quản trị.'},401);
 if(!['GET','HEAD'].includes(method)&&(request.headers.get('origin')!==new URL(request.url).origin||!await equal(request.headers.get('x-admin-csrf')||'',user.csrf)))return json({error:'Phiên xác thực thao tác không hợp lệ.'},403);
 if(path==='session'&&method==='GET')return json({user:{email:user.email,capabilities:user.capabilities},csrf:user.csrf});
 if(path==='logout'&&method==='POST'){if(user.sid)await sql(env,'DELETE FROM admin_sessions WHERE id=?',user.sid).run();return json({ok:true,...(!local(request,env)?{redirect:'/cdn-cgi/access/logout'}:{})},200,{'Set-Cookie':cookieValue('',local(request,env),true)});}
 const needed=path==='members'?'access.manage':path==='audit'?'audit.read':path==='secrets'?'secrets.write':path==='publish'||path==='rollback'?'config.publish':path.startsWith('data/')?({ai:'config.read','ai-metrics':'config.read','client-errors':'audit.read',users:'users.read',wallet:'wallet.read',reports:'reports.read',rewards:'reports.read','login-diagnostics':'audit.read'}[path.slice(5)]):method==='GET'?'config.read':'config.write';if(needed&&!user.capabilities.includes(needed))return json({error:'Bạn không có quyền thực hiện thao tác này.'},403);
 await state(env);
 if(path==='members'&&method==='GET'){
 const roles=((await readPublished(env))?.config||defaultConfig()).access.roles;
 const assignments=JSON.parse(env.ADMIN_ROLE_ASSIGNMENTS||'{}');const rows=(await sql(env,'SELECT email,role_id FROM admin_members ORDER BY email').all()).results;
 const owners=String(env.ADMIN_OWNER_EMAILS||'').toLowerCase().split(',').map(v=>v.trim()).filter(Boolean);const effective=new Map(Object.entries(assignments).map(([email,roleId])=>[email.toLowerCase(),{email:email.toLowerCase(),roleId,source:'environment'}]));
 for(const r of rows){effective.delete(r.email);if(r.role_id)effective.set(r.email,{email:r.email,roleId:r.role_id,source:'database'});}
 for(const email of owners)effective.set(email,{email,roleId:'owner',source:'environment'});
 return json({members:[...effective.values()],roles});
 }
 if(path==='members'&&['PUT','DELETE'].includes(method)){
 const b=await body(request);const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json({error:'Email không hợp lệ.'},422);
 const owners=String(env.ADMIN_OWNER_EMAILS||'').toLowerCase().split(',').map(v=>v.trim());
 if(owners.includes(email)||email==='local@astrox.dev'||b.roleId==='owner')return json({error:'Chủ hệ thống được quản lý trong cấu hình triển khai, không thể thay đổi ở đây.'},403);
 const roles=((await readPublished(env))?.config||defaultConfig()).access.roles;
 if(method==='PUT'&&!roles.some(r=>r.id===b.roleId&&r.id!=='owner'))return json({error:'Vai trò chưa được áp dụng hoặc không tồn tại.'},422);
 const roleId=method==='DELETE'?'':b.roleId,now=new Date().toISOString();
 // Empty role is a revocation tombstone so deleting an environment-assigned member cannot restore access.
 await env.DB.batch([sql(env,'INSERT INTO admin_members(email,role_id,created_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET role_id=excluded.role_id,updated_at=excluded.updated_at',email,roleId,now,now),auditStatement(env,user.email,method==='DELETE'?'member.remove':'member.assign',email,{roleId})]);
 return json({ok:true});
 }
 if(path==='data/insights'&&method==='GET')return json(await readInsights(env,new URL(request.url).searchParams,user));
 if(path==='data/support'&&method==='GET')return json(await readSupport(env,new URL(request.url).searchParams,user));
 if(path==='data/issues'&&method==='GET')return json(await readIssues(env,new URL(request.url).searchParams,user));
 if(path==='data/issues'&&method==='POST')return json(await updateIssue(env,await body(request),user));
 if(path==='data/client-errors'&&method==='GET')return json({available:true,rows:(await sql(env,'SELECT day,path,kind,count,last_at FROM client_error_counts WHERE day>=? ORDER BY last_at DESC LIMIT 400',Math.floor(Date.now()/86400000)-30).all()).results});
 if(path==='data/ai-metrics'&&method==='GET')return json(await aiReport(env,new URL(request.url).searchParams));
 if(path==='data/ai'&&method==='GET'){
 const rows=(await sql(env,'SELECT id,service_id,config_revision,created_at,status,attempts,duration_ms FROM admin_ai_requests ORDER BY created_at DESC LIMIT 200').all()).results;
 return json({available:true,rows:rows.map(r=>{let attempts=[];try{const parsed=JSON.parse(r.attempts||'[]');if(Array.isArray(parsed))attempts=parsed.map(a=>Object.fromEntries(['providerId','status','durationMs','outcome','errorCode'].filter(k=>['string','number'].includes(typeof a[k])).map(k=>[k,a[k]])))}catch{}return {...r,attempts};})});
 }
 if(path==='config'&&method==='GET'){const s=await state(env),p=await readPublished(env),secrets=await sql(env,'SELECT ref FROM admin_secrets ORDER BY ref').all(),backend=await backendStatus(env);return json({draft:JSON.parse(s.draft),revision:s.revision,published:p?.config||null,publishedRevision:p?.revision||null,secrets:[...new Set([...secrets.results.map(r=>r.ref),...backend.inheritedSecrets])],inheritedSecrets:backend.inheritedSecrets,integration:{wallet:backend.configVersioned,features:backend.features}});}
 if(path==='import-legacy'&&method==='POST'){
  if(!user.capabilities.includes('secrets.write')||!user.capabilities.includes('access.manage'))return json({error:'Chỉ chủ quản trị có thể nhập cấu hình cũ.'},403);
  const b=await body(request),s=await state(env);if(s.published_id||s.revision!==b.expectedRevision||s.revision!==0)return json({error:'Chỉ nhập một lần khi bản nháp chưa được chỉnh sửa hoặc xuất bản.'},409);
  if(!env.ASTROX_BACKEND)return json({error:'Chưa nối backend.'},503);
  const response=await env.ASTROX_BACKEND.fetch(new Request('https://astrox-internal/internal/admin/bootstrap',{signal:AbortSignal.timeout(10000)}));if(!response.ok)return json({error:'Không đọc được cấu hình cũ.'},502);
  const legacy=await response.json();let c;try{c=importLegacyConfig(JSON.parse(s.draft),legacy,{legacyAi:Boolean(env.DEVQUOTE_API_KEY)});}catch(e){return json({error:e.message},422);}
  const errors=validateConfig(c);if(errors.length)return json({error:'Cấu hình cũ cần hiệu chỉnh.',errors},422);
  if(env.DEVQUOTE_API_KEY&&!await readSecret(env,'provider:legacy'))await saveSecret(env,user.email,'provider:legacy',env.DEVQUOTE_API_KEY);
  if(!await saveDraft(env,user.email,c,s.revision))return json({error:'Cấu hình đã thay đổi.'},409);
  await recordAudit(env,user.email,'config.import','astrox-api',{packages:c.billing.packages.length});return json({ok:true,revision:s.revision+1});
 }
 if(path==='config'&&method==='PUT'){const b=await body(request),errors=validateConfig(b.config);if(!errors.length&&!user.capabilities.includes('access.manage')&&JSON.stringify(b.config.access)!==JSON.stringify(JSON.parse((await state(env)).draft).access))return json({error:'Không có quyền thay đổi vai trò.'},403);if(errors.length)return json({error:'Kiểm tra cấu hình.',errors},422);if(!Number.isSafeInteger(b.expectedRevision))return json({error:'Thiếu phiên bản.'},400);return await saveDraft(env,user.email,b.config,b.expectedRevision)?json({ok:true,revision:b.expectedRevision+1}):json({error:'Cấu hình đã thay đổi. Tải lại trước khi lưu.'},409);}
 if((path==='publish'||path==='rollback')&&method==='POST'){const b=await body(request),s=await state(env);if(b.expectedRevision!==s.revision)return json({error:'Cấu hình đã thay đổi. Tải lại trước khi áp dụng.'},409);let c=JSON.parse(s.draft);if(path==='rollback'){const v=await sql(env,'SELECT config FROM admin_versions WHERE id=?',b.versionId).first();if(!v)return json({error:'Không tìm thấy phiên bản.'},404);c=JSON.parse(v.config);}const publishedAccess=((await readPublished(env))?.config||defaultConfig()).access;if(!user.capabilities.includes('access.manage')&&JSON.stringify(c.access)!==JSON.stringify(publishedAccess))return json({error:'Không có quyền áp dụng thay đổi vai trò.'},403);const errors=[...validateConfig(c),...await activationErrors(env,c)];if(errors.length)return json({error:'Chưa thể áp dụng cấu hình.',errors},422);const note=typeof b.note==='string'?b.note.slice(0,500):path==='rollback'?`Khôi phục phiên bản ${b.versionId}`:'';return await publish(env,user.email,c,b.expectedRevision,note)?json({ok:true,revision:s.revision+1}):json({error:'Xung đột phiên bản.'},409);}
 if(path==='history'&&method==='GET')return json({versions:(await sql(env,'SELECT id,created_at,actor,note FROM admin_versions ORDER BY id DESC LIMIT 100').all()).results});
 if(path==='audit'&&method==='GET')return json({events:(await sql(env,'SELECT * FROM admin_audit ORDER BY id DESC LIMIT 200').all()).results.map(e=>({...e,detail:JSON.parse(e.detail)}))});
 if(path==='secrets'&&method==='PUT'){const b=await body(request);if(typeof b.ref!=='string'||! /^(provider:[a-zA-Z0-9_-]{1,80}|payos:apiKey|payos:checksumKey|zalo:appSecret|ads:verificationKey)$/.test(b.ref)||typeof b.value!=='string'||!b.value.trim()||b.value.length>16000)return json({error:'Khóa hoặc tham chiếu không hợp lệ.'},422);await saveSecret(env,user.email,b.ref,b.value);return json({ok:true});}
 if(path==='data/wallet/adjust'&&method==='POST'){
  if(!user.capabilities.includes('wallet.adjust'))return json({error:'Bạn không có quyền thực hiện thao tác này.'},403);
  const b=await body(request);const userId=typeof b.userId==='string'?b.userId.trim():'';const delta=Number(b.delta);const note=typeof b.note==='string'?b.note.trim().slice(0,200):'';
  if(!userId||!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>100000)return json({error:'Số Point phải là số nguyên khác 0, tối đa ±100.000.'},422);
  if(!env.ASTROX_BACKEND)return json({error:'Chưa kết nối backend nghiệp vụ.'},503);
  const r=await env.ASTROX_BACKEND.fetch(new Request('https://astrox-internal/internal/admin/wallet/adjust',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId,delta,reason:note||`Điều chỉnh bởi ${user.email}`})}));
  if(!r.ok)return json({error:'Backend từ chối điều chỉnh — kiểm tra user id và số dư.'},502);
  await recordAudit(env,user.email,'wallet.adjust',userId,{delta,note});return json({ok:true});
 }
 if(path==='data/users/status'&&method==='POST'){
  if(!user.capabilities.includes('access.manage'))return json({error:'Bạn không có quyền thực hiện thao tác này.'},403);
  const b=await body(request);const userId=typeof b.userId==='string'?b.userId.trim():'';const status=String(b.status||'');
  if(!userId||!['active','suspended'].includes(status))return json({error:'Trạng thái không hợp lệ.'},422);
  if(!env.ASTROX_BACKEND)return json({error:'Chưa kết nối backend nghiệp vụ.'},503);
  const r=await env.ASTROX_BACKEND.fetch(new Request('https://astrox-internal/internal/admin/users/status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId,status})}));
  const d=await r.json().catch(()=>null);
  if(!r.ok||!d?.ok)return json({error:'Không cập nhật được người dùng — kiểm tra user id.'},502);
  await recordAudit(env,user.email,'users.status',userId,{status});return json({ok:true});
 }
 if(path==='data/login-diagnostics'&&method==='GET'){
  if(!env.ASTROX_BACKEND)return json({unavailable:true,rows:[],error:'Chưa kết nối backend nghiệp vụ. Không có dữ liệu để hiển thị.'},503);
  const r=await env.ASTROX_BACKEND.fetch(new Request('https://astrox-internal/internal/admin/login-diagnostics'));
  if(!r.ok)return json({error:'Backend nghiệp vụ chưa sẵn sàng.'},502);return json(await r.json());
 }
 if(/^data\/(users|wallet|reports|rewards)$/.test(path)&&method==='GET'){if(!env.ASTROX_BACKEND){const data=await legacyData(env,path.slice(5));if(data)return json(data);return json({unavailable:true,error:'Chưa kết nối backend nghiệp vụ. Không có dữ liệu để hiển thị.'},503);}const r=await env.ASTROX_BACKEND.fetch(new Request('https://astrox-internal/internal/admin/'+path.slice(5),{headers:{'x-admin-actor':user.email}}));if(!r.ok)return json({error:'Backend nghiệp vụ chưa sẵn sàng.'},502);return json(await r.json());}
 if(path==='test-provider'||path.startsWith('integrations/')){const {handleAdminRuntime}=await import('./integration-api.mjs');return handleAdminRuntime(path,request,env,{email:user.email,capabilities:user.capabilities});}
 return json({error:'Không tìm thấy API.'},404);
 }catch(e){return json({error:e.status?e.message:'Không thể xử lý yêu cầu quản trị.'},e.status||500);}}
