// @ts-check
import {
  supportsUnlock,
  quoteUnlock,
  reserveUnlock,
  replayUnlock,
  completeUnlock,
  refundUnlock,
  reconcileUnlocks,
} from './service-unlocks.mjs';
import { readAiSession } from './auth.mjs';
import { readPublished } from '../admin/store.mjs';
import { encrypt, decrypt, b64 } from '../admin/crypto.mjs';
import { bodyJson } from './http.mjs';
import { ensureCreditAccount, commitReserved, releaseReserved, marketOf } from './credits.mjs';
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const LEASE_MS = 180000; // Provider runtime is capped at 120s; leave time for persistence.
async function resultKey(env) {
  if (!env.SESSION_SECRET) throw Error('session_not_configured');
  return {
    ADMIN_ENCRYPTION_KEY: b64(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ai-result:' + env.SESSION_SECRET)),
    ),
  };
}
export async function chargeAi(env, request) {
  const session = await readAiSession(env, request);
  if (!session) return reply({ error: 'unauthorized' }, 401);
  const b = await bodyJson(request),
    operationId = b?.operationId,
    requestHash = b?.requestHash;
  if (
    typeof operationId !== 'string' ||
    !/^[a-zA-Z0-9_-]{8,120}$/.test(operationId) ||
    typeof requestHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(requestHash)
  )
    return reply({ error: 'invalid_operation' }, 400);
  // Market is the account's stored preference, never the client's say-so: a VN
  // wallet can never be charged by a US request and vice versa (MARKET-02).
  const market = await resolveMarket(env, session.sub, b.market);
  if (market.error) return market.error;
  // Check existing operation before current pricing: retries belong to the old snapshot.
  const existing = await env.DB.prepare('SELECT * FROM backend_ai_operations WHERE user_id=? AND operation_id=?')
    .bind(session.sub, operationId)
    .first();
  if (existing) return replay(env, existing, b);
  try {
    const unlocked = await replayUnlock(env, session.sub, b);
    if (unlocked) return reply(unlocked);
  } catch (e) {
    return reply({ error: e.message }, e.status || 503);
  }
  const published = await readPublished(env);
  if (!published || published.revision !== b.revision) return reply({ error: 'revision_mismatch' }, 409);
  const c = published.config,
    sharedService = c.billing.services.find(s => s.id === b.serviceId);
  // US market: the sparse usServices overlay overrides price/status per service (P1-e).
  const usOverlay = market.value === 'US' ? c.billing.usServices?.[b.serviceId] : null;
  const service = usOverlay ? { ...sharedService, points: usOverlay.points, status: usOverlay.status } : sharedService;
  if (supportsUnlock(c, b.serviceId)) {
    try {
      return reply(await reserveUnlock(env, session.sub, c, published.revision, b, market.value));
    } catch (e) {
      return reply({ error: e.message }, e.status || 503);
    }
  }
  const price =
    service?.status === 'paid' && Number.isSafeInteger(service.points) && service.points > 0 ? service.points : 0;
  if (!c.ai.enabled || !c.billing.enabled || c.operations.maintenance || !price)
    return reply({ error: 'service_not_paid' }, 403);
  if (market.value === 'US') return chargeAiUsCredits(env, session.sub, b, service.id, price, requestHash);
  const chargeId = crypto.randomUUID(),
    now = Date.now(),
    iso = new Date(now).toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(
      session.sub,
      iso,
    ),
    env.DB.prepare(
      "INSERT INTO backend_ai_operations(user_id,operation_id,charge_id,service_id,request_hash,config_revision,points,status,created_at,updated_at,market) SELECT ?,?,?,?,?,?,?,'running',?,?,'VN' WHERE EXISTS(SELECT 1 FROM zalo_point_accounts WHERE user_id=? AND balance>=?) ON CONFLICT(user_id,operation_id) DO NOTHING",
    ).bind(
      session.sub,
      operationId,
      chargeId,
      b.serviceId,
      requestHash,
      b.revision,
      price,
      now,
      now,
      session.sub,
      price,
    ),
    env.DB.prepare(
      "INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,user_id,-points,'ai_service',charge_id,? FROM backend_ai_operations WHERE charge_id=?",
    ).bind(chargeId, iso, chargeId),
    env.DB.prepare(
      'UPDATE zalo_point_accounts SET balance=balance-?,updated_at=? WHERE user_id=? AND changes()=1',
    ).bind(price, iso, session.sub),
  ]);
  const op = await env.DB.prepare('SELECT * FROM backend_ai_operations WHERE user_id=? AND operation_id=?')
    .bind(session.sub, operationId)
    .first();
  if (!op) return reply({ error: 'insufficient_points', needed: price }, 402);
  if (op.charge_id !== chargeId) return replay(env, op, b);
  return reply({ ok: true, chargeId, points: price });
}
/**
 * Resolves the billing market: the stored account preference is authoritative;
 * a client-sent market must match it exactly. No preference → the request's
 * validated value (VN default) — matching pre-market behavior for VN users.
 */
export async function resolveMarket(env, userId, requested) {
  if (requested !== undefined && requested !== 'VN' && requested !== 'US')
    return { error: reply({ error: 'invalid_market' }, 400) };
  const pref = await marketOf(env, userId);
  const value = pref ?? (requested === 'US' ? 'US' : 'VN');
  if (pref && requested && requested !== pref) return { error: reply({ error: 'market_mismatch', market: pref }, 409) };
  return { value };
}

/** US per-service charge: reserve Credits, then persist the operation (or roll the reservation back). */
async function chargeAiUsCredits(env, userId, b, serviceId, price, requestHash) {
  const chargeId = crypto.randomUUID(),
    now = Date.now();
  await ensureCreditAccount(env, userId);
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO backend_ai_operations(user_id,operation_id,charge_id,service_id,request_hash,config_revision,points,status,created_at,updated_at,market) SELECT ?,?,?,?,?,?,?,'running',?,?,'US' WHERE EXISTS(SELECT 1 FROM credits_accounts WHERE user_id=? AND status='active' AND balance-reserved>=?) ON CONFLICT(user_id,operation_id) DO NOTHING",
    ).bind(userId, b.operationId, chargeId, serviceId, requestHash, b.revision, price, now, now, userId, price),
    env.DB.prepare(
      'UPDATE credits_accounts SET reserved=reserved+?,updated_at=? WHERE user_id=? AND EXISTS(SELECT 1 FROM backend_ai_operations WHERE charge_id=?)',
    ).bind(price, new Date(now).toISOString(), userId, chargeId),
  ]);
  const op = await env.DB.prepare('SELECT * FROM backend_ai_operations WHERE user_id=? AND operation_id=?')
    .bind(userId, b.operationId)
    .first();
  if (!op) return reply({ error: 'insufficient_credits', needed: price }, 402);
  if (op.charge_id !== chargeId) return replay(env, op, b);
  return reply({ ok: true, chargeId, points: price, market: 'US' });
}

async function replay(env, op, input) {
  if (op.request_hash !== input.requestHash || op.service_id !== input.serviceId)
    return reply({ error: 'operation_conflict' }, 409);
  if (op.status === 'succeeded') {
    if (!op.response_json) return reply({ error: 'result_expired' }, 410);
    return reply({
      ok: true,
      replayed: true,
      response: JSON.parse(await decrypt(await resultKey(env), op.charge_id, op.response_json)),
    });
  }
  return reply({ error: op.status === 'refunded' ? 'operation_refunded' : 'operation_in_progress' }, 409);
}
export async function completeAi(env, request) {
  const session = await readAiSession(env, request);
  if (!session) return reply({ error: 'unauthorized' }, 401);
  const b = await bodyJson(request, 600000);
  if (!b?.chargeId || !b?.response || !Array.isArray(b.response.choices)) return reply({ error: 'bad_request' }, 400);
  const unlock = await env.DB.prepare('SELECT id FROM service_unlock_operations WHERE id=? AND user_id=?')
    .bind(b.chargeId, session.sub)
    .first();
  if (unlock) {
    try {
      return reply(await completeUnlock(env, session.sub, b.chargeId, b.response));
    } catch (e) {
      return reply({ error: e.message }, e.status || 503);
    }
  }
  const opRow = await env.DB.prepare(
    'SELECT market,points,operation_id FROM backend_ai_operations WHERE charge_id=? AND user_id=?',
  )
    .bind(b.chargeId, session.sub)
    .first();
  if (opRow?.market === 'US') {
    // Credit commit must LAND before sealing; a swallowed failure strands the
    // reservation on a succeeded operation. Idempotent per operation key — the
    // client retries completeAi and the commit runs exactly once.
    try {
      await commitReserved(env, {
        userId: session.sub,
        amount: opRow.points,
        operationKey: `ai:${opRow.operation_id}`,
        meta: 'ai_service',
      });
    } catch {
      return reply({ error: 'credit_commit_pending' }, 503);
    }
    const value = await encrypt(await resultKey(env), b.chargeId, JSON.stringify(b.response)),
      now = Date.now();
    const rUs = await env.DB.prepare(
      "UPDATE backend_ai_operations SET status='succeeded',response_json=?,updated_at=? WHERE charge_id=? AND user_id=? AND status='running' AND created_at>?",
    )
      .bind(value, now, b.chargeId, session.sub, now - LEASE_MS)
      .run();
    if (rUs.meta.changes) return reply({ ok: true });
    const done = await env.DB.prepare('SELECT status FROM backend_ai_operations WHERE charge_id=? AND user_id=?')
      .bind(b.chargeId, session.sub)
      .first();
    return done?.status === 'succeeded' ? reply({ ok: true }) : reply({ error: 'operation_not_running' }, 409);
  }
  const value = await encrypt(await resultKey(env), b.chargeId, JSON.stringify(b.response)),
    now = Date.now();
  const r = await env.DB.prepare(
    "UPDATE backend_ai_operations SET status='succeeded',response_json=?,updated_at=? WHERE charge_id=? AND user_id=? AND status='running' AND created_at>?",
  )
    .bind(value, now, b.chargeId, session.sub, now - LEASE_MS)
    .run();
  if (r.meta.changes) return reply({ ok: true });
  const op = await env.DB.prepare('SELECT status FROM backend_ai_operations WHERE charge_id=? AND user_id=?')
    .bind(b.chargeId, session.sub)
    .first();
  return op?.status === 'succeeded' ? reply({ ok: true }) : reply({ error: 'operation_not_running' }, 409);
}
export async function refundAi(env, request) {
  const session = await readAiSession(env, request);
  if (!session) return reply({ error: 'unauthorized' }, 401);
  const b = await bodyJson(request);
  if (typeof b?.chargeId !== 'string') return reply({ error: 'bad_request' }, 400);
  const unlock = await env.DB.prepare('SELECT id FROM service_unlock_operations WHERE id=? AND user_id=?')
    .bind(b.chargeId, session.sub)
    .first();
  if (unlock) {
    try {
      return reply(await refundUnlock(env, session.sub, b.chargeId));
    } catch (e) {
      return reply({ error: e.message }, e.status || 503);
    }
  }
  const op = await env.DB.prepare('SELECT * FROM backend_ai_operations WHERE charge_id=? AND user_id=?')
    .bind(b.chargeId, session.sub)
    .first();
  if (!op) return reply({ error: 'charge_not_found' }, 404);
  if (op.status === 'succeeded') return reply({ error: 'operation_completed' }, 409);
  if (op.status === 'refunded') return reply({ ok: true, refunded: false });
  if (op.market === 'US') {
    await releaseReserved(env, { userId: session.sub, amount: op.points, operationKey: `ai:${op.operation_id}` });
    await env.DB.prepare(
      "UPDATE backend_ai_operations SET status='refunded',updated_at=? WHERE charge_id=? AND user_id=? AND status='running'",
    )
      .bind(Date.now(), op.charge_id, session.sub)
      .run();
    return reply({ ok: true, refunded: true });
  }
  await refundOperation(env, op.charge_id);
  const after = await env.DB.prepare('SELECT status FROM backend_ai_operations WHERE charge_id=?')
    .bind(op.charge_id)
    .first();
  return after.status === 'refunded'
    ? reply({ ok: true, refunded: true })
    : reply({ error: 'operation_completed' }, 409);
}
async function refundOperation(env, chargeId, cutoff = Date.now()) {
  const now = Date.now(),
    iso = new Date(now).toISOString();
  // All three mutations commit or roll back together, including retries and cron races.
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,user_id,points,'ai_service_refund',charge_id,? FROM backend_ai_operations WHERE charge_id=? AND status='running' AND created_at<=? ON CONFLICT(reason,reference_id,user_id) DO NOTHING",
    ).bind(crypto.randomUUID(), iso, chargeId, cutoff),
    env.DB.prepare(
      'UPDATE zalo_point_accounts SET balance=balance+(SELECT points FROM backend_ai_operations WHERE charge_id=?),updated_at=? WHERE user_id=(SELECT user_id FROM backend_ai_operations WHERE charge_id=?) AND changes()=1',
    ).bind(chargeId, iso, chargeId),
    env.DB.prepare(
      "UPDATE backend_ai_operations SET status='refunded',updated_at=? WHERE charge_id=? AND status='running' AND EXISTS(SELECT 1 FROM zalo_point_ledger WHERE reason='ai_service_refund' AND reference_id=backend_ai_operations.charge_id AND user_id=backend_ai_operations.user_id)",
    ).bind(now, chargeId),
  ]);
}
export async function reconcileAi(env, now = Date.now()) {
  await reconcileUnlocks(env, now);
  const cutoff = now - LEASE_MS;
  const pending = await env.DB.prepare(
    "SELECT charge_id FROM backend_ai_operations WHERE status='running' AND created_at<=? ORDER BY created_at LIMIT 100",
  )
    .bind(cutoff)
    .all();
  let failed = 0;
  for (const row of pending.results)
    try {
      const op = await env.DB.prepare(
        'SELECT market,operation_id,points,user_id FROM backend_ai_operations WHERE charge_id=?',
      )
        .bind(row.charge_id)
        .first();
      if (op?.market === 'US') {
        await releaseReserved(env, {
          userId: op.user_id,
          amount: op.points,
          operationKey: `ai:${op.operation_id}`,
        });
        await env.DB.prepare(
          "UPDATE backend_ai_operations SET status='refunded',updated_at=? WHERE charge_id=? AND status='running'",
        )
          .bind(now, row.charge_id)
          .run();
      } else {
        await refundOperation(env, row.charge_id, cutoff);
      }
    } catch {
      failed++;
      console.error(JSON.stringify({ event: 'ai.refund_retry_failed', chargeId: row.charge_id }));
    }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ai_rate_limits WHERE expires_at<?').bind(now),
    env.DB.prepare('DELETE FROM zalo_pending_tokens'),
    env.DB.prepare("DELETE FROM oauth_states WHERE julianday(created_at)<julianday('now','-1 day')"),
    env.DB.prepare("DELETE FROM oauth_referrals WHERE julianday(created_at)<julianday('now','-1 day')"),
    // Keep the operation tombstone to prevent a later retry from charging again.
    env.DB.prepare(
      "UPDATE backend_ai_operations SET response_json=NULL WHERE status='succeeded' AND updated_at<? AND response_json IS NOT NULL",
    ).bind(now - 7 * 86400000),
  ]);
  if (failed) throw Error('ai_refund_reconciliation_incomplete');
  return { checked: pending.results.length };
}

export async function quoteAi(env, request) {
  const session = await readAiSession(env, request);
  if (!session) return reply({ error: 'unauthorized' }, 401);
  try {
    const input = await bodyJson(request, 300000),
      published = await readPublished(env);
    if (!published) return reply({ error: 'service_unavailable' }, 403);
    const market = await resolveMarket(env, session.sub, input?.market);
    if (market.error) return market.error;
    const quote = await quoteUnlock(
      env,
      session.sub,
      published.config,
      published.revision,
      input,
      Date.now(),
      market.value,
    );
    return reply(quote);
  } catch (e) {
    return reply({ error: e.message }, e.status || 503);
  }
}
