/**
 * Lemon Squeezy webhook (plan Task 16). Exactly-once fulfillment:
 *  1. HMAC-SHA256 over the RAW request bytes with X-Signature (constant-time).
 *  2. A durable receipt row is written BEFORE any processing.
 *  3. Fulfillment runs once per (environment, store, lemon order id) — replays
 *     and reordered events converge to the same single credit via the ledger's
 *     UNIQUE(user, kind, operation_key).
 * Signature failures are 4xx; unknown-but-signed events are 2xx no-ops; storage
 * hiccups are 5xx so Lemon retries.
 */
import { equal } from '../admin/crypto.mjs';
import { creditPurchase } from './credits.mjs';
import { lemonFirstTopupStatements } from './rewards.mjs';
import { verifyCheckoutSnapshot } from './lemon.mjs';

const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');

export async function verifyLemonSignature(rawBody, signatureHex, secret) {
  if (typeof rawBody !== 'string' || typeof signatureHex !== 'string' || signatureHex.length !== 64) return false;
  const computed = await crypto.subtle
    .importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then(key => crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)))
    .then(hex);
  // Constant-time compare over the two hex strings (equal() requires same length).
  return equal(computed, signatureHex.toLowerCase());
}

export async function handleLemonWebhook(env, request) {
  const reply = (status, body) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
  const raw = await request.text().catch(() => null);
  if (raw === null) return reply(400, { error: 'unreadable_body' });
  const signature = request.headers.get('x-signature') || '';
  if (!env.LEMON_WEBHOOK_SECRET) return reply(503, { error: 'webhook_not_configured' });
  if (!(await verifyLemonSignature(raw, signature, env.LEMON_WEBHOOK_SECRET)))
    return reply(401, { error: 'invalid_signature' });

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return reply(400, { error: 'invalid_json' });
  }
  const eventName = String(payload?.meta?.event_name || 'unknown');
  const localOrderId = payload?.meta?.custom_data?.orderId;
  const a = payload?.data?.attributes || {};
  const providerId = payload?.data?.type === 'orders' ? payload.data.id : a.order_id;
  const lemonOrderId = /^\d+$/.test(String(providerId ?? '')) ? String(providerId) : null;
  const storeId = a.store_id !== undefined ? String(a.store_id) : '';
  const environment = payload?.meta?.test_mode === true || a.test_mode === true ? 'test' : 'live';

  // Durable receipt first (before any fulfillment decision).
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(hex);
  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO lemon_webhook_receipts(id,event_name,lemon_order_id,local_order_id,environment,store_id,payload_digest,payload_json,received_at) VALUES(?,?,?,?,?,?,?,?,?)',
    )
      .bind(
        crypto.randomUUID(),
        eventName,
        lemonOrderId,
        typeof localOrderId === 'string' ? localOrderId : null,
        environment,
        storeId,
        digest,
        // Reconciliation (refunds) replays provider facts from this payload.
        raw.slice(0, 60000),
        new Date().toISOString(),
      )
      .run();
  } catch {
    return reply(503, { error: 'receipt_storage_failed' });
  }

  if (!/^order_(created|paid|refunded)/.test(eventName) || typeof localOrderId !== 'string')
    return reply(200, { ok: true, ignored: eventName });

  const order = await env.DB.prepare('SELECT * FROM lemon_orders WHERE id=?').bind(localOrderId).first();
  if (!order) return reply(200, { ok: true, ignored: 'unknown_order' });
  if (order.status === 'fulfilled' || order.status === 'refunded')
    return reply(200, { ok: true, credited: false, replayed: true });

  if (eventName === 'order_refunded') {
    // Refunds are applied by the reconciliation job (Task 17) which owns reversal logic.
    return reply(200, { ok: true, credited: false, deferred: 'reconcile' });
  }

  // Fulfillment gate: paid + snapshot match (store/variant/environment/subtotal/currency).
  const snapshot = verifyCheckoutSnapshot(order, {
    subtotal_cents: a.subtotal,
    tax_cents: a.tax || 0,
    total_cents: a.total,
    variant_id: String(a.variant_id ?? a.first_order_item?.variant_id ?? ''),
    store_id: storeId,
    environment,
  });
  const payable = a.status === 'paid' && a.currency === 'USD' && snapshot.ok;
  if (!payable) {
    return reply(200, { ok: true, credited: false, problems: snapshot.problems || ['status_or_currency'] });
  }

  // Exactly-once credit: the order is only marked fulfilled AFTER the credits
  // ledger row exists. Any failure returns 5xx so Lemon retries the event —
  // a replay then re-enters here because the order is still pending.
  if (!lemonOrderId) return reply(400, { error: 'missing_order_id' });
  // Claim the provider identity before any wallet mutation. One provider order
  // cannot fund two local checkout intents, including concurrent deliveries.
  try {
    const bound = await env.DB.prepare(
      'UPDATE lemon_orders SET lemon_order_id=?, updated_at=? WHERE id=? AND (lemon_order_id IS NULL OR lemon_order_id=?) RETURNING id',
    )
      .bind(lemonOrderId, new Date().toISOString(), order.id, lemonOrderId)
      .first();
    if (!bound) return reply(409, { error: 'provider_order_conflict' });
  } catch (error) {
    if (/unique/i.test(String(error))) return reply(409, { error: 'provider_order_conflict' });
    return reply(503, { error: 'order_binding_pending_retry' });
  }
  try {
    await creditPurchase(env, {
      userId: order.user_id,
      amount: order.credits,
      kind: order.package_id?.startsWith('bonus') ? 'bonus' : 'purchase',
      orderId: `lemon:${order.id}`,
    });
  } catch (e) {
    return reply(503, { error: 'credit_pending_retry', detail: String(e?.message || e).slice(0, 120) });
  }
  const ledgerRow = await env.DB.prepare(
    "SELECT id FROM credits_ledger WHERE user_id=? AND kind IN ('purchase','bonus') AND operation_key=?",
  )
    .bind(order.user_id, `credit:lemon:${order.id}`)
    .first();
  if (!ledgerRow) return reply(503, { error: 'credit_pending_retry' });
  try {
    const rewardStatements = await lemonFirstTopupStatements(env, order);
    const [credited] = await env.DB.batch([
      env.DB.prepare(
        "UPDATE lemon_orders SET status='fulfilled', lemon_order_id=?, updated_at=? WHERE id=? AND status IN ('pending','paid')",
      ).bind(lemonOrderId, new Date().toISOString(), localOrderId),
      ...rewardStatements,
    ]);
    return reply(200, { ok: true, credited: credited.meta?.changes === 1, replayed: credited.meta?.changes !== 1 });
  } catch {
    return reply(503, { error: 'fulfillment_pending_retry' });
  }
}
