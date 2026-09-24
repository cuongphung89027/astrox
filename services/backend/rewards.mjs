// Rewards — nối engine thuần tuý services/rewards/rules.ts vào D1 theo cấu hình
// admin đã publish. Mọi khoản thưởng ghi một dòng zalo_point_ledger (idempotent
// nhờ UNIQUE(reason,reference_id,user_id)) và cộng balance bằng mẫu changes()=1
// trong cùng batch D1 như webhook PayOS vẫn dùng.
import { registrationRewards, checkIn, vietnamDay, validateConfig } from '../rewards/rules.ts';
import { readPublished } from '../admin/store.mjs';
import { readSession } from './auth.mjs';
import {adsConfigured} from './rewarded-ads.mjs';
import { json, trustedOrigin } from './http.mjs';

const nowIso = () => new Date().toISOString();

function rewardConfig(rewards) {
  return {
    registrationUser: Number(rewards.registrationUser) || 0,
    registrationInviter: Number(rewards.registrationInviter) || 0,
    firstTopupInviter: Number(rewards.firstTopupInviter) || 0,
    daily: Number(rewards.daily) || 0,
    milestones: (Array.isArray(rewards.milestones) ? rewards.milestones : []).map((m) => ({ day: Number(m.day) || 0, user: Number(m.user) || 0, inviter: Number(m.inviter) || 0 })),
  };
}

async function publishedRewards(env) {
  const published = await readPublished(env);
  const rewards = published?.config?.rewards;
  if (!rewards?.enabled || published.config.operations.maintenance) return null;
  const config = rewardConfig(rewards);
  try { validateConfig(config); } catch { return null; }
  return { ...rewards, __engine: config, __revision: published.revision };
}

/** An optional configured referral cap is evaluated inside the wallet transaction. */
function inviterBudget(rewards, userId, now=Date.now()) {
 if(rewards.referralMode!=='limited')return {sql:'1',args:[]};
 const since=rewards.referralWindow==='day'?new Date(now-86400000).toISOString():rewards.referralWindow==='month'?new Date(now-30*86400000).toISOString():null;
 return {sql:`(SELECT COUNT(*) FROM zalo_point_ledger WHERE user_id=? AND reason='referral'${since?' AND created_at>=?':''})<?`,args:[userId,...(since?[since]:[]),Number(rewards.referralLimit)||0]};
}
function creditStatements(env,{userId,points,reason,referenceId},now=nowIso(),guard={sql:'1',args:[]}) {
 if(!Number.isSafeInteger(points)||points<=0)return [];
 return [
  env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(userId,now),
  env.DB.prepare(`INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT(reason,reference_id,user_id) DO NOTHING`).bind(crypto.randomUUID(),userId,points,reason,referenceId,now,...guard.args),
  env.DB.prepare('UPDATE zalo_point_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND changes()=1').bind(points,now,userId),
 ];
}

/** Included in the verified new-identity creation batch. A crash after login
 * cannot lose the referral event; its reward rules are frozen at registration. */
export async function registrationEventStatements(env,userId,refCode) {
 if(typeof refCode!=='string'||! /^[A-Z0-9]{4,10}$/.test(refCode))return [];
 const rewards=await publishedRewards(env);if(!rewards?.registrationEnabled)return [];
 const inviter=await env.DB.prepare("SELECT r.user_id FROM referral_codes r JOIN app_users u ON u.id=r.user_id WHERE r.code=? AND u.status='active'").bind(refCode).first();
 if(!inviter||inviter.user_id===userId)return [];
 return [env.DB.prepare("INSERT OR IGNORE INTO reward_events(id,user_id,kind,status,claim_token,config_revision,payload,created_at) SELECT ?,?,'registration','pending',?,?,?,? WHERE EXISTS(SELECT 1 FROM app_users WHERE id=?)").bind(`registration:${userId}`,userId,crypto.randomUUID(),rewards.__revision,JSON.stringify({inviterId:inviter.user_id,rewards}),nowIso(),userId)];
}
export async function settleRegistration(env,userId) {
 const id=`registration:${userId}`,event=await env.DB.prepare("SELECT payload FROM reward_events WHERE id=? AND status='pending'").bind(id).first();if(!event)return;
 const {inviterId,rewards}=JSON.parse(event.payload);validateConfig(rewards.__engine);
 const token=crypto.randomUUID(),now=nowIso(),budget=inviterBudget(rewards,inviterId);
 const guard={sql:"EXISTS(SELECT 1 FROM reward_events WHERE id=? AND status='processing' AND claim_token=?)",args:[id,token]};
 const entries=registrationRewards({userId,inviterId,verified:true,isNew:true},rewards.__engine);
 await env.DB.batch([
  env.DB.prepare("INSERT OR IGNORE INTO user_referrals(user_id,inviter_id,created_at) SELECT ?,?,? WHERE ?!=? AND EXISTS(SELECT 1 FROM app_users WHERE id=? AND status='active') AND NOT EXISTS(WITH RECURSIVE ancestry(id) AS (SELECT inviter_id FROM user_referrals WHERE user_id=? UNION SELECT r.inviter_id FROM user_referrals r JOIN ancestry a ON r.user_id=a.id) SELECT 1 FROM ancestry WHERE id=?)").bind(userId,inviterId,now,userId,inviterId,inviterId,inviterId,userId),
  env.DB.prepare(`UPDATE reward_events SET status='processing',claim_token=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM user_referrals WHERE user_id=? AND inviter_id=?) AND ${budget.sql}`).bind(token,id,userId,inviterId,...budget.args),
  ...entries.flatMap(r=>creditStatements(env,{userId:r.userId,points:r.points,reason:'referral',referenceId:r.key.replace(/^referral:/,'')},now,guard)),
  env.DB.prepare("UPDATE reward_events SET status=CASE WHEN claim_token=? AND status='processing' THEN 'completed' ELSE 'skipped' END,completed_at=? WHERE id=? AND status IN ('pending','processing')").bind(token,now,id),
 ]);
}
/** Internal compatibility helper; public routes never accept caller-supplied referrals. */
export async function creditRegistration(env,userId,refCode){const statements=await registrationEventStatements(env,userId,refCode);if(statements.length)await env.DB.batch(statements);await settleRegistration(env,userId);}
export async function recoverRegistrationRewards(env){
 const rows=(await env.DB.prepare("SELECT user_id FROM reward_events WHERE kind='registration' AND status='pending' ORDER BY created_at LIMIT 50").all()).results;
 for(const row of rows)try{await settleRegistration(env,row.user_id);}catch{console.error(JSON.stringify({event:'rewards.registration_retry_failed'}));}
}

/** Runs inside the verified PayOS settlement transaction, after its ledger entry.
 * The first settled real-money topup is authoritative, not the first callback
 * after a campaign was enabled. A replay of an already-paid order earns zero. */
export async function firstTopupStatements(env,settings,order) {
 const rewards=settings.config?.rewards;
 if(!rewards?.enabled||!rewards.firstTopupEnabled||order.status!=='pending'||order.amount_vnd<(Number(rewards.firstTopupMinVnd)||0))return [];
 const referral=await env.DB.prepare('SELECT inviter_id FROM user_referrals WHERE user_id=?').bind(order.user_id).first();if(!referral)return [];
 const config=rewardConfig(rewards);validateConfig(config);
 const budget=inviterBudget(rewards,referral.inviter_id);
 const guard={sql:`EXISTS(SELECT 1 FROM zalo_point_ledger WHERE user_id=? AND reason='topup_payos' AND reference_id=?) AND NOT EXISTS(SELECT 1 FROM zalo_point_ledger WHERE user_id=? AND reason='topup_payos' AND reference_id!=?) AND EXISTS(SELECT 1 FROM app_users WHERE id=? AND status='active') AND ${budget.sql}`,args:[order.user_id,String(order.order_code),order.user_id,String(order.order_code),referral.inviter_id,...budget.args]};
 const entries=[{userId:order.user_id,points:Number(rewards.firstTopupUser)||0,reason:'referral',referenceId:`${order.user_id}:first-paid-topup:user`},{userId:referral.inviter_id,points:config.firstTopupInviter,reason:'referral',referenceId:`${order.user_id}:first-paid-topup`}];
 return entries.flatMap(r=>creditStatements(env,r,nowIso(),guard));
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
async function ensureReferralCode(env, userId) {
  const existing = await env.DB.prepare('SELECT code FROM referral_codes WHERE user_id=?').bind(userId).first();
  if (existing) return existing.code;
  for (let i = 0; i < 3; i++) {
    await env.DB.prepare('INSERT OR IGNORE INTO referral_codes(user_id,code,created_at) VALUES(?,?,?)').bind(userId, randomCode(), nowIso()).run();
    const row = await env.DB.prepare('SELECT code FROM referral_codes WHERE user_id=?').bind(userId).first();
    if (row) return row.code;
  }
  return '';
}

export async function handleRewardsSummary(env, request) {
  const session = await readSession(env, request);
  if (!session) return json(env, request, { error: 'unauthorized' }, 401);
  const published = await readPublished(env);
  const rewards = published?.config?.rewards;
  const day = vietnamDay(new Date());
  const code = await ensureReferralCode(env, session.sub);
  const att = await env.DB.prepare('SELECT last_day,streak,claimed_milestones FROM user_attendance WHERE user_id=?').bind(session.sub).first();
  const invited = await env.DB.prepare('SELECT COUNT(*) n FROM user_referrals WHERE inviter_id=?').bind(session.sub).first();
  const earned = await env.DB.prepare("SELECT COALESCE(SUM(delta),0) s FROM zalo_point_ledger WHERE user_id=? AND reason='referral'").bind(session.sub).first();
  let claimed = [];
  try { claimed = JSON.parse(att?.claimed_milestones || '[]'); } catch { claimed = []; }
  return json(env, request, {
    enabled: Boolean(rewards?.enabled && !published?.config?.operations?.maintenance),
    ads: {enabled:adsConfigured(rewards)&&!published?.config?.operations?.maintenance,points:Number(rewards?.ads?.points)||0,dailyLimit:Number(rewards?.ads?.dailyLimit)||0,used:(await env.DB.prepare("SELECT COUNT(*) n FROM reward_ad_sessions WHERE user_id=? AND day=? AND status='granted'").bind(session.sub,day).first())?.n||0,cooldownSeconds:Number(rewards?.ads?.cooldownSeconds)||0},
    attendance: {
      enabled: Boolean(rewards?.attendanceEnabled),
      daily: Number(rewards?.daily) || 0,
      lastDay: att?.last_day || null,
      streak: att?.last_day===day||att?.last_day===vietnamDay(new Date(Date.now()-86400000))?att.streak:0,
      claimed,
      today: att?.last_day === day,
      milestones: (Array.isArray(rewards?.milestones) ? rewards.milestones : []).map((m) => ({ day: m.day, points: m.user, inviterPoints:m.inviter })),
    },
    referral: {
      enabled: Boolean(rewards?.registrationEnabled),
      code,
      invited: invited?.n || 0,
      earned: earned?.s || 0,
      registrationInviter: Number(rewards?.registrationInviter) || 0,
      registrationUser: Number(rewards?.registrationUser) || 0,
      firstTopupMinVnd: Number(rewards?.firstTopupMinVnd)||0,
      firstTopupEnabled: Boolean(rewards?.firstTopupEnabled),
      firstTopupInviter: Number(rewards?.firstTopupInviter) || 0,
    },
  });
}

export async function handleRewardsCheckin(env, request) {
  const session = await readSession(env, request);
  if (!session) return json(env, request, { error: 'unauthorized' }, 401);
  if(!trustedOrigin(env,request))return json(env,request,{error:'forbidden_origin'},403);
  const rewards = await publishedRewards(env);
  if (!rewards || !rewards.attendanceEnabled) return json(env, request, { error: 'attendance_disabled' }, 403);
  const att = await env.DB.prepare('SELECT last_day,streak,claimed_milestones FROM user_attendance WHERE user_id=?').bind(session.sub).first();
  let previous = { lastDay: null, streak: 0, claimedMilestones: [] };
  if (att) {
    try { previous = { lastDay: att.last_day, streak: att.streak, claimedMilestones: JSON.parse(att.claimed_milestones || '[]') }; }
    catch { /* state hỏng — coi như chưa từng điểm danh */ }
  }
  let result;
  try { result = checkIn(previous, new Date(), rewards.__engine); }
  catch { return json(env, request, { error: 'attendance_invalid_state' }, 500); }
  if (result.duplicate) return json(env, request, { error: 'already_checked_in', day: result.day, streak: previous.streak }, 409);
  const now=nowIso(),token=crypto.randomUUID(),id=`attendance:${session.sub}:${result.day}`;
  const guard={sql:'EXISTS(SELECT 1 FROM reward_events WHERE id=? AND claim_token=?)',args:[id,token]};
  const statements=[
   env.DB.prepare("INSERT OR IGNORE INTO reward_events(id,user_id,kind,status,claim_token,config_revision,payload,created_at,completed_at) SELECT ?,?,'attendance','completed',?,?,?,?,? WHERE COALESCE((SELECT last_day FROM user_attendance WHERE user_id=?),'')=? RETURNING id").bind(id,session.sub,token,rewards.__revision,JSON.stringify(result),now,now,session.sub,previous.lastDay||''),
   env.DB.prepare(`INSERT INTO user_attendance(user_id,last_day,streak,claimed_milestones,updated_at) SELECT ?,?,?,?,? WHERE ${guard.sql} ON CONFLICT(user_id) DO UPDATE SET last_day=excluded.last_day,streak=excluded.streak,claimed_milestones=excluded.claimed_milestones,updated_at=excluded.updated_at`).bind(session.sub,result.day,result.state.streak,JSON.stringify(result.state.claimedMilestones),now,...guard.args),
   ...creditStatements(env,{userId:session.sub,points:result.points,reason:'attendance',referenceId:result.day},now,guard),
  ];
  let inviterPoints=0,inviterId=null;
  if(result.inviterPoints>0){
   const referral=await env.DB.prepare('SELECT inviter_id FROM user_referrals WHERE user_id=?').bind(session.sub).first();
   if(referral){const budget=inviterBudget(rewards,referral.inviter_id);statements.push(...creditStatements(env,{userId:referral.inviter_id,points:result.inviterPoints,reason:'referral',referenceId:`${session.sub}:milestone:${result.day}`},now,{sql:`${guard.sql} AND ${budget.sql} AND EXISTS(SELECT 1 FROM app_users WHERE id=? AND status='active')`,args:[...guard.args,...budget.args,referral.inviter_id]}));inviterId=referral.inviter_id;}
  }
  const committed=await env.DB.batch(statements);
  if(!committed[0].results?.length)return json(env,request,{error:'already_checked_in',day:result.day},409);
  if(inviterId)inviterPoints=(await env.DB.prepare("SELECT delta FROM zalo_point_ledger WHERE user_id=? AND reason='referral' AND reference_id=?").bind(inviterId,`${session.sub}:milestone:${result.day}`).first())?.delta||0;
  return json(env,request,{ok:true,day:result.day,streak:result.state.streak,points:result.points,milestones:result.milestones,inviterPoints});
}
