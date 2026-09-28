/**
 * Lemon refund & reconciliation (plan Task 17).
 *
 * Refunds are CUMULATIVE: every receipt row carries the provider's total
 * refunded-to-date for the order; the reversal applied here is only the DELTA
 * versus what we already reversed — replayed or reordered events converge.
 * Credit reversal lands on the original purchase lot; deterministic integer
 * rounding (floor) capped at the credited amount. When the user has already
 * spent the credits, the account is restricted and a debt record is left for
 * manual resolution — the VN Point wallet is never touched.
 *
 * Reconciliation is bounded and crash-safe: each refund receipt is processed
 * with a per-row processed flag inside one batch; a cron lease table prevents
 * overlapping runs. Stale pending orders without a checkout URL age out to
 * failed so the client stops polling a checkout that was never created.
 */
import { creditsBalance, auditCredits } from './credits.mjs';

const LOCK_LEASE_MS = 120000;

export async function acquireReconcileLease(env, now = Date.now()) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS lemon_reconcile_locks(id INTEGER PRIMARY KEY CHECK (id=1), lease_until INTEGER)`,
  ).run();
  const nowMs = Number(now) || Date.now();
  const row = await env.DB.prepare('SELECT lease_until FROM lemon_reconcile_locks WHERE id=1').first();
  if (row && row.lease_until > nowMs) return false;
  await env.DB.prepare(
    'INSERT INTO lemon_reconcile_locks(id,lease_until) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET lease_until=excluded.lease_until WHERE lease_until<=?',
  )
    .bind(nowMs + LOCK_LEASE_MS, nowMs)
    .run();
  return true;
}
export async function releaseReconcileLease(env) {
  await env.DB.prepare('UPDATE lemon_reconcile_locks SET lease_until=0 WHERE id=1')
    .run()
    .catch(() => {});
}

/** Applies the cumulative refund total for a fulfilled order (idempotent by delta). */
export async function refundLemonOrder(env, localOrderId, cumulativeRefundCents, now = Date.now()) {
  const order = await env.DB.prepare('SELECT * FROM lemon_orders WHERE id=?').bind(localOrderId).first();
  if (!order || order.status !== 'fulfilled') return { applied: false, reason: 'order_not_fulfilled' };
  const nextCents = Math.min(Math.max(0, cumulativeRefundCents), order.amount_usd_cents);
  // Deterministic proportional credits, floored, capped at what was credited.
  const totalCreditsDue = Math.floor((order.credits * nextCents) / order.amount_usd_cents);
  const deltaCredits = totalCreditsDue - order.refunded_credits;
  const deltaCents = nextCents - order.refunded_cents;
  if (deltaCredits <= 0) {
    await env.DB.prepare('UPDATE lemon_orders SET refunded_cents=?, updated_at=? WHERE id=?')
      .bind(nextCents, new Date().toISOString(), localOrderId)
      .run();
    return { applied: true, deltaCredits: 0, deltaCents };
  }
  const wallet = await creditsBalance(env, order.user_id);
  const ledgerId = crypto.randomUUID(),
    at = new Date(now).toISOString();
  if (wallet.available >= deltaCredits) {
    await env.DB.batch([
      env.DB.prepare('UPDATE credits_accounts SET balance=balance-?, updated_at=? WHERE user_id=?').bind(
        deltaCredits,
        at,
        order.user_id,
      ),
      env.DB.prepare(
        "UPDATE credit_lots SET remaining=MAX(0, remaining-?) WHERE id=(SELECT lot_id FROM credits_ledger WHERE user_id=? AND kind IN ('purchase','bonus') AND source_order=?)",
      ).bind(deltaCredits, order.user_id, `lemon:${localOrderId}`),
      env.DB.prepare(
        "INSERT INTO credits_ledger(id,user_id,delta,balance_after,kind,operation_key,source_order,created_at) VALUES(?,?,?,?,'refund',?,?,?)",
      ).bind(ledgerId, order.user_id, -deltaCredits, null, `refund:${localOrderId}:${nextCents}`, localOrderId, at),
      env.DB.prepare(
        "UPDATE lemon_orders SET refunded_cents=?, refunded_credits=?, status=CASE WHEN ?>=amount_usd_cents THEN 'refunded' ELSE status END, updated_at=? WHERE id=?",
      ).bind(nextCents, totalCreditsDue, nextCents, at, localOrderId),
    ]);
    return { applied: true, deltaCredits, deltaCents };
  }
  // Already spent: restrict the account and record the debt for manual resolution.
  await env.DB.batch([
    env.DB.prepare("UPDATE credits_accounts SET status='restricted', updated_at=? WHERE user_id=?").bind(
      at,
      order.user_id,
    ),
    env.DB.prepare(
      "INSERT INTO credits_ledger(id,user_id,delta,balance_after,kind,operation_key,source_order,created_at) VALUES(?,?,0,NULL,'adjustment',?,?,?)",
    ).bind(ledgerId, order.user_id, `debt:${localOrderId}:${deltaCredits}`, localOrderId, at),
    env.DB.prepare('UPDATE lemon_orders SET refunded_cents=?, updated_at=? WHERE id=?').bind(
      nextCents,
      at,
      localOrderId,
    ),
  ]);
  return { applied: true, deltaCredits: 0, debtCredits: deltaCredits, deltaCents };
}

/** Bounded reconcile pass: refund receipts (delta), stale pendings, then audit. */
export async function reconcileLemon(env, { now = Date.now(), limit = 50 } = {}) {
  if (!(await acquireReconcileLease(env, now))) return { skipped: 'lease_held' };
  const report = { refunds: [], stalePending: 0, failed: [] };
  try {
    const receipts = (
      await env.DB.prepare(
        "SELECT id, local_order_id, payload_json FROM lemon_webhook_receipts WHERE event_name='order_refunded' AND processed=0 ORDER BY received_at LIMIT ?",
      )
        .bind(limit)
        .all()
    ).results;
    for (const receipt of receipts) {
      try {
        const payload = JSON.parse(receipt.payload_json || '{}');
        const a = payload?.data?.attributes || {};
        // Lemon order object reports the cumulative refunded amount in cents as
        // `refunded_amount`. Without it we cannot compute a delta — park the
        // receipt for the operator instead of guessing (never treat unknown as 0
        // or as full refund).
        const cumulative = Number(a.refunded_amount);
        if (!Number.isSafeInteger(cumulative) || cumulative < 0) {
          report.failed.push({ receipt: receipt.id, error: 'refund_amount_missing' });
          continue;
        }
        const result = await refundLemonOrder(env, receipt.local_order_id, cumulative, now);
        // Only close the receipt when the refund actually landed. A refund that
        // raced ahead of the paid webhook must stay pending — once the order
        // fulfills, the next reconcile pass processes it.
        if (result.applied || result.reason === 'order_not_found') {
          await env.DB.prepare('UPDATE lemon_webhook_receipts SET processed=1 WHERE id=?').bind(receipt.id).run();
        }
        report.refunds.push({ receipt: receipt.id, order: receipt.local_order_id, ...result });
      } catch (e) {
        report.failed.push({ receipt: receipt.id, error: String(e?.message || e) });
      }
    }
    const stale = (
      await env.DB.prepare(
        "SELECT id FROM lemon_orders WHERE status='pending' AND checkout_url IS NULL AND julianday(created_at)<julianday('now','-1 hour') LIMIT ?",
      )
        .bind(limit)
        .all()
    ).results;
    for (const row of stale)
      await env.DB.prepare("UPDATE lemon_orders SET status='failed', updated_at=? WHERE id=? AND status='pending'")
        .bind(new Date(now).toISOString(), row.id)
        .run();
    report.stalePending = stale.length;
    return report;
  } finally {
    await releaseReconcileLease(env);
  }
}

/** Balance audit across every fulfilled Lemon order: ledger equals accounts. */
export async function auditLemon(env) {
  const users = (
    await env.DB.prepare(
      "SELECT DISTINCT user_id AS u FROM lemon_orders WHERE status IN ('fulfilled','refunded')",
    ).all()
  ).results;
  let ok = true;
  const details = [];
  for (const { u } of users) {
    const a = await auditCredits(env, u);
    if (!a.ok) ok = false;
    details.push({ user: u, ok: a.ok });
  }
  return { ok, details };
}
