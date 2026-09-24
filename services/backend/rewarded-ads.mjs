import { readSession } from './auth.mjs';
import { readPublished } from '../admin/store.mjs';
import { vietnamDay } from '../rewards/rules.ts';
import { json, trustedOrigin, bodyJson } from './http.mjs';

export function adsConfigured(rewards) {
  const ads = rewards?.ads;
  return Boolean(
    rewards?.enabled && ads?.enabled && /^\d+$/.test(ads.networkCode) && ads.adUnit?.startsWith(`/${ads.networkCode}/`),
  );
}
/** Google Rewarded Web's completion event is client-reported, NOT SSV.
 * This handler guarantees session ownership, caps and exactly-once wallet credit;
 * it cannot cryptographically prove that a person actually watched an ad. */
export async function handleRewardedAds(env, request, action, now = Date.now()) {
  if (request.method !== 'POST') return json(env, request, { error: 'method_not_allowed' }, 405);
  const session = await readSession(env, request);
  if (!session) return json(env, request, { error: 'unauthorized' }, 401);
  if (!trustedOrigin(env, request)) return json(env, request, { error: 'forbidden_origin' }, 403);
  const published = await readPublished(env),
    rewards = published?.config?.rewards;
  if (!adsConfigured(rewards) || published.config.operations.maintenance)
    return json(env, request, { error: 'ads_unavailable' }, 403);
  const ads = rewards.ads,
    userId = session.sub,
    day = vietnamDay(new Date(now));
  if (action === 'start') {
    const id = crypto.randomUUID(),
      expires = now + ads.sessionTtlSeconds * 1000;
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE reward_ad_sessions SET status='expired' WHERE user_id=? AND status IN ('started','ready') AND expires_at<=?",
      ).bind(userId, now),
      env.DB.prepare(
        "INSERT INTO reward_ad_sessions(id,user_id,day,points,config_revision,status,created_at,expires_at) SELECT ?,?,?,?,?,'started',?,? WHERE NOT EXISTS(SELECT 1 FROM reward_ad_sessions WHERE user_id=? AND status IN ('started','ready')) AND (SELECT COUNT(*) FROM reward_ad_sessions WHERE user_id=? AND day=? AND status IN ('started','ready','granted'))<? AND COALESCE((SELECT MAX(created_at) FROM reward_ad_sessions WHERE user_id=?),0)<=? RETURNING id",
      ).bind(
        id,
        userId,
        day,
        ads.points,
        published.revision,
        now,
        expires,
        userId,
        userId,
        day,
        ads.dailyLimit,
        userId,
        now - ads.cooldownSeconds * 1000,
      ),
    ]);
    if (!results[1].results?.length)
      return json(
        env,
        request,
        {
          error: 'ad_limit_or_cooldown',
          message: 'Bạn đã đạt giới hạn hôm nay, đang có lượt xem hoặc cần chờ giữa hai lượt.',
        },
        429,
      );
    return json(env, request, {
      id,
      points: ads.points,
      adUnit: ads.adUnit,
      expiresAt: expires,
      verification: 'google-web-client-callback',
    });
  }
  const body = await bodyJson(request, 1024);
  if (typeof body?.id !== 'string' || body.id.length > 80) return json(env, request, { error: 'invalid_session' }, 400);
  const row = await env.DB.prepare('SELECT * FROM reward_ad_sessions WHERE id=? AND user_id=?')
    .bind(body.id, userId)
    .first();
  if (!row) return json(env, request, { error: 'not_found' }, 404);
  if (action === 'cancel') {
    await env.DB.prepare(
      "UPDATE reward_ad_sessions SET status='cancelled' WHERE id=? AND user_id=? AND status IN ('started','ready')",
    )
      .bind(row.id, userId)
      .run();
    return json(env, request, { ok: true });
  }
  if (action === 'grant' && row.status === 'granted')
    return json(env, request, { ok: true, points: row.points, replayed: true });
  if (row.expires_at <= now || row.day !== day || !['started', 'ready'].includes(row.status))
    return json(env, request, { error: 'ad_session_expired_or_closed' }, 409);
  if (action === 'ready') {
    const ready = await env.DB.prepare(
      "UPDATE reward_ad_sessions SET status='ready',ready_at=COALESCE(ready_at,?) WHERE id=? AND user_id=? AND status IN ('started','ready') RETURNING id",
    )
      .bind(now, row.id, userId)
      .first();
    return json(env, request, ready ? { ok: true } : { error: 'ad_session_closed' }, ready ? 200 : 409);
  }
  if (action !== 'grant') return json(env, request, { error: 'not_found' }, 404);
  if (row.status !== 'ready' || now - row.ready_at < 5000) return json(env, request, { error: 'ad_not_ready' }, 409);
  const at = new Date(now).toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE reward_ad_sessions SET status='granted',granted_at=? WHERE id=? AND user_id=? AND status='ready' AND expires_at>? AND day=?",
    ).bind(now, row.id, userId, now, day),
    env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(
      userId,
      at,
    ),
    env.DB.prepare(
      "INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,user_id,points,'ad_reward',id,? FROM reward_ad_sessions WHERE id=? AND user_id=? AND status='granted' ON CONFLICT(reason,reference_id,user_id) DO NOTHING",
    ).bind(crypto.randomUUID(), at, row.id, userId),
    env.DB.prepare(
      'UPDATE zalo_point_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND changes()=1',
    ).bind(row.points, at, userId),
  ]);
  const credited = await env.DB.prepare(
    "SELECT delta FROM zalo_point_ledger WHERE reason='ad_reward' AND reference_id=? AND user_id=?",
  )
    .bind(row.id, userId)
    .first();
  return json(
    env,
    request,
    credited ? { ok: true, points: credited.delta } : { error: 'ad_session_closed' },
    credited ? 200 : 409,
  );
}
