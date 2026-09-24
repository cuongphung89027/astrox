/** Synthetic local QA only. Never connects to Cloudflare or a production database.
 * Run: ADMIN_DATA_DIR=/tmp/astrox-admin-upgrade-qa ASTROX_QA_PASSWORD=... node services/admin/test/seed-upgrade-qa.mjs
 * Refuses existing databases and any destination outside a dedicated temp directory.
 */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,readFileSync,existsSync,realpathSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SERVICE_CATALOG} from '../catalog.ts';
const root=new URL('../../../',import.meta.url);
export function seedUpgradeQa(db,now=Date.now()){
 db.exec(readFileSync(new URL('services/backend/test/legacy-schema.sql',root),'utf8'));
 for(const name of ['admin','backend','rewards','reward-events','ai-safety','client-errors','feature-events','admin-insights','user-sync','user-data-revisions'])db.exec(readFileSync(new URL(`migrations/${name}.sql`,root),'utf8'));
 const iso=n=>new Date(n).toISOString(),day=86400000;
 const put=(sql,...args)=>db.prepare(sql).run(...args);
 const users=60;
 db.exec('BEGIN');
 try {
 for(let i=0;i<users;i++){
  const id=`qa-user-${String(i+1).padStart(3,'0')}`,date=iso(now-(i%14)*day-3600000);
  put('INSERT INTO app_users(id,display_name,email,status,created_at,updated_at) VALUES(?,?,?,?,?,?)',id,`QA Người dùng ${String(i+1).padStart(3,'0')}`,`qa-${i+1}@example.invalid`,i===59?'suspended':'active',date,date);
  put('INSERT INTO zalo_point_accounts VALUES(?,?,?)',id,1000+i*15,date);
  if(i>0&&i<25)put('INSERT INTO user_referrals VALUES(?,?,?)',id,'qa-user-001',date);
 }
 for(let d=0;d<14;d++){
  // Noon VN every selected day, capped before now for the current day.
  const vnDay=new Date(now+7*3600000-d*day).toISOString().slice(0,10),at=Math.min(Date.parse(vnDay+'T05:00:00Z'),now-3600000),created=iso(at);
  for(let j=0;j<28+d;j++){
   const service=SERVICE_CATALOG[(j+d)%SERVICE_CATALOG.length],session=randomUUID();
   for(const event of ['feature_view','feature_start',...(j%5?['result_view']:[])])put('INSERT INTO feature_events VALUES(?,?,?,?,?,?,?,?)',randomUUID(),event,service.module,service.id,event==='feature_view'?'navigation':event==='result_view'&&j%3===0?'cache':'ai',session,j%3===0?'desktop':j%3===1?'mobile':'tablet',created);
   const status=j%11===0?'failed':j%7===0?'replayed':j%13===0?'rate_limited':'success';
   const attempts=status==='replayed'||status==='rate_limited'?[]:[{providerId:'qa-provider',model:'qa-model',outcome:status==='failed'?'error':'success',latencyMs:850+j*91,inputTokens:320+j,outputTokens:680+j}];
   put('INSERT INTO admin_ai_requests VALUES(?,?,?,?,?,?,?)',randomUUID(),service.id,1,created,status,JSON.stringify(attempts),status==='replayed'?40:850+j*91);
  }
  for(let j=0;j<8;j++){
   const user=`qa-user-${String(j+1).padStart(3,'0')}`,event=`qa-attendance-${d}-${j}`;
   put('INSERT INTO reward_events VALUES(?,?,?,?,?,?,?,?,?)',event,user,'attendance','completed','qa-claim',1,'{}',created,created);
   put('INSERT INTO zalo_point_ledger VALUES(?,?,?,?,?,?)',randomUUID(),user,5,'attendance',event,created);
   put('INSERT INTO zalo_point_ledger VALUES(?,?,?,?,?,?)',randomUUID(),user,-(20+j),'ai_service',`qa-use-${d}-${j}`,created);
   const status=j<5?'paid':j===5?'pending':j===6?'cancelled':'expired';
   put('INSERT INTO topup_orders_zalo(id,user_id,order_code,amount_vnd,points,status,idempotency_key,created_at,paid_at) VALUES(?,?,?,?,?,?,?,?,?)',`qa-topup-${d}-${j}`,user,900000+d*100+j,20000+j*10000,200+j*100,status,`qa-topup-${d}-${j}`,created,status==='paid'?created:null);
   if(status==='paid')put('INSERT INTO zalo_point_ledger VALUES(?,?,?,?,?,?)',randomUUID(),user,200+j*100,'topup_payos',`qa-topup-${d}-${j}`,created);
   put('INSERT INTO reward_ad_sessions VALUES(?,?,?,?,?,?,?,?,?,?)',`qa-ad-${d}-${j}`,user,vnDay,2,1,j<5?'granted':'started',at,at+120000,at+10000,j<5?at+30000:null);
  }
 }
 put('INSERT INTO reward_events VALUES(?,?,?,?,?,?,?,?,?)','qa-pending-reward','qa-user-003','milestone','pending','qa-claim',1,'{}',iso(now-7200000),null);
 put('INSERT INTO login_diagnostics(stage,detail,created_at) VALUES(?,?,?)','qa_callback_failed','{}',iso(now-1800000));
 put('INSERT INTO client_error_counts VALUES(?,?,?,?,?)',Math.floor(now/day),'/tarot','runtime',3,now-120000);
 db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
 return {users,days:14,featureEvents:db.prepare('SELECT COUNT(*) n FROM feature_events').get().n,aiRequests:db.prepare('SELECT COUNT(*) n FROM admin_ai_requests').get().n,topups:112,rewardAttendance:112,referrals:24,adSessions:112};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const destination=resolve(process.env.ADMIN_DATA_DIR||'/tmp/astrox-admin-upgrade-qa');
 if(!/^\/(?:private\/)?tmp\/astrox-admin-upgrade-qa(?:-[a-z0-9-]+)?$/.test(destination))throw new Error('QA destination must be a dedicated /tmp/astrox-admin-upgrade-qa directory');
 if(!process.env.ASTROX_QA_PASSWORD)throw new Error('ASTROX_QA_PASSWORD required for local-only login');
 mkdirSync(destination,{recursive:true,mode:0o700});
 if(!/^\/(?:private\/)?tmp\/astrox-admin-upgrade-qa(?:-[a-z0-9-]+)?$/.test(realpathSync(destination)))throw new Error('Refusing redirected QA directory');
 const path=join(destination,'admin.sqlite');if(existsSync(path))throw new Error('Refusing to overwrite existing QA database');
 const db=new DatabaseSync(path),summary=seedUpgradeQa(db);db.close();
 writeFileSync(join(destination,'credentials.json'),JSON.stringify({password:process.env.ASTROX_QA_PASSWORD,encryptionKey:randomBytes(32).toString('base64')}),{mode:0o600,flag:'wx'});
 writeFileSync(join(destination,'QA-FIXTURE.json'),JSON.stringify({synthetic:true,createdAt:new Date().toISOString(),...summary},null,2),{mode:0o600});
 console.log(JSON.stringify({destination,...summary}));
}
