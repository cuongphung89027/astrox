// Rewards — nối engine thuần tuý services/rewards/rules.ts vào D1 theo cấu hình
// admin đã publish. Mọi khoản thưởng ghi một dòng zalo_point_ledger (idempotent
// nhờ UNIQUE(reason,reference_id,user_id)) và cộng balance bằng mẫu changes()=1
// trong cùng batch D1 như webhook PayOS vẫn dùng.
import { registrationRewards, firstTopupReward, checkIn, vietnamDay, validateConfig } from '../rewards/rules.ts';
import { readPublished } from '../admin/store.mjs';
import { readSession } from './auth.mjs';
import { json } from './http.mjs';

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
  if (!rewards?.enabled) return null;
  const config = rewardConfig(rewards);
  try { validateConfig(config); } catch { return null; }
  return { ...rewards, __engine: config };
}

/** Giới hạn thưởng inviter theo referralMode/Limit/Window (đếm dòng reason='referral'). */
async function inviterAllowed(env, rewards, inviterId) {
  if (rewards.referralMode !== 'limited') return true;
  const limit = Number(rewards.referralLimit) || 0;
  if (limit <= 0) return false;
  const since = rewards.referralWindow === 'day' ? new Date(Date.now() - 86400000).toISOString() : rewards.referralWindow === 'month' ? new Date(Date.now() - 30 * 86400000).toISOString() : null;
  const row = since
    ? await env.DB.prepare("SELECT COUNT(*) n FROM zalo_point_ledger WHERE user_id=? AND reason='referral' AND created_at>=?").bind(inviterId, since).first()
    : await env.DB.prepare("SELECT COUNT(*) n FROM zalo_point_ledger WHERE user_id=? AND reason='referral'").bind(inviterId).first();
  return (row?.n || 0) < limit;
}

/** Cặp statement ledger+balance cho một khoản credit; balance chỉ cộng khi dòng
 * ledger vừa được chèn (changes()=1) nên gọi lại nhiều lần không nhân đôi. */
function creditStatements(env, { userId, points, reason, referenceId }, now = nowIso()) {
  return [
    env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(userId, now),
    env.DB.prepare('INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(reason,reference_id,user_id) DO NOTHING').bind(crypto.randomUUID(), userId, points, reason, referenceId, now),
    env.DB.prepare('UPDATE zalo_point_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND changes()=1').bind(points, now, userId),
  ];
}

/** Thưởng đăng ký cho cặp invitee/inviter — gọi sau khi user mới được tạo. */
export async function creditRegistration(env, userId, refCode) {
  try {
    if (typeof refCode !== 'string' || !/^[A-Z0-9]{4,10}$/.test(refCode)) return;
    const rewards = await publishedRewards(env);
    if (!rewards || !rewards.registrationEnabled) return;
    const inviter = await env.DB.prepare('SELECT user_id FROM referral_codes WHERE code=?').bind(refCode).first();
    if (!inviter || inviter.user_id === userId) return;
    // Quan hệ giới thiệu ghi đúng một lần — mốc điểm danh và lần nạp đầu dựa vào đây.
    await env.DB.prepare('INSERT OR IGNORE INTO user_referrals(user_id,inviter_id,created_at) VALUES(?,?,?)').bind(userId, inviter.user_id, nowIso()).run();
    if (!await inviterAllowed(env, rewards, inviter.user_id)) return;
    const entries = registrationRewards({ userId, inviterId: inviter.user_id, verified: true, isNew: true }, rewards.__engine)
      .map((r) => ({ userId: r.userId, points: r.points, reason: 'referral', referenceId: r.key.replace(/^referral:/, '') }));
    if (entries.length) await env.DB.batch(entries.flatMap((e) => creditStatements(env, e)));
  } catch { /* thưởng không được làm hỏng đăng nhập */ }
}

/** Statements thưởng inviter khi invitee nạp lần đầu — nối vào batch webhook PayOS. */
export async function firstTopupStatements(env, settings, order) {
  try {
    const rewards = settings.config?.rewards;
    if (!rewards?.enabled || !rewards.firstTopupEnabled) return [];
    const minVnd = Number(rewards.firstTopupMinVnd) || 0;
    if (order.amount_vnd < minVnd) return [];
    const referral = await env.DB.prepare('SELECT inviter_id FROM user_referrals WHERE user_id=?').bind(order.user_id).first();
    if (!referral) return [];
    const already = await env.DB.prepare("SELECT 1 x FROM zalo_point_ledger WHERE reason='referral' AND reference_id=? AND user_id=?").bind(`${order.user_id}:first-paid-topup`, referral.inviter_id).first();
    const result = firstTopupReward({ userId: order.user_id, inviterId: referral.inviter_id, settled: true, paidAmount: order.amount_vnd, alreadyRewarded: Boolean(already) }, rewardConfig(rewards));
    if (!result.length || !await inviterAllowed(env, rewards, referral.inviter_id)) return [];
    return result.flatMap((r) => creditStatements(env, { userId: r.userId, points: r.points, reason: 'referral', referenceId: r.key.replace(/^referral:/, '') }));
  } catch { return []; }
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
    enabled: Boolean(rewards?.enabled),
    attendance: {
      enabled: Boolean(rewards?.attendanceEnabled),
      daily: Number(rewards?.daily) || 0,
      lastDay: att?.last_day || null,
      streak: att?.streak || 0,
      claimed,
      today: att?.last_day === day,
      milestones: (Array.isArray(rewards?.milestones) ? rewards.milestones : []).map((m) => ({ day: m.day, points: m.user })),
    },
    referral: {
      enabled: Boolean(rewards?.registrationEnabled),
      code,
      invited: invited?.n || 0,
      earned: earned?.s || 0,
      registrationInviter: Number(rewards?.registrationInviter) || 0,
      firstTopupEnabled: Boolean(rewards?.firstTopupEnabled),
      firstTopupInviter: Number(rewards?.firstTopupInviter) || 0,
    },
  });
}

export async function handleRewardsCheckin(env, request) {
  const session = await readSession(env, request);
  if (!session) return json(env, request, { error: 'unauthorized' }, 401);
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
  const now = nowIso();
  const statements = [
    env.DB.prepare('INSERT INTO user_attendance(user_id,last_day,streak,claimed_milestones,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_day=excluded.last_day,streak=excluded.streak,claimed_milestones=excluded.claimed_milestones,updated_at=excluded.updated_at')
      .bind(session.sub, result.state.lastDay, result.state.streak, JSON.stringify(result.state.claimedMilestones), now),
  ];
  if (result.points > 0) statements.push(...creditStatements(env, { userId: session.sub, points: result.points, reason: 'attendance', referenceId: result.day }, now));
  if (result.inviterPoints > 0) {
    const referral = await env.DB.prepare('SELECT inviter_id FROM user_referrals WHERE user_id=?').bind(session.sub).first();
    if (referral && await inviterAllowed(env, rewards, referral.inviter_id)) {
      statements.push(...creditStatements(env, { userId: referral.inviter_id, points: result.inviterPoints, reason: 'referral', referenceId: `${session.sub}:milestone:${result.day}` }, now));
    }
  }
  await env.DB.batch(statements);
  return json(env, request, { ok: true, day: result.day, streak: result.state.streak, points: result.points, milestones: result.milestones, inviterPoints: result.inviterPoints });
}
