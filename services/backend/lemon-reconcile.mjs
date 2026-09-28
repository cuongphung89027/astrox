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
import { verifyCheckoutSnapshot } from './lemon.mjs';

const LOCK_LEASE_MS = 120000;

export async function acquireReconcileLease(env, now = Date.now()) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS lemon_reconcile_locks(id INTEGER PRIMARY KEY CHECK (id=1), lease_until INTEGER)`,
  ).run();
  const nowMs = Number(now) || Date.now();
  const row = await env.DB.prepare(
    'INSERT INTO lemon_reconcile_locks(id,lease_until) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET lease_until=excluded.lease_until WHERE lease_until<=? RETURNING lease_until',
  )
    .bind(nowMs + LOCK_LEASE_MS, nowMs)
    .first();
  return !!row;
}
export async function releaseReconcileLease(env, leaseUntil) {
  await env.DB.prepare('UPDATE lemon_reconcile_locks SET lease_until=0 WHERE id=1 AND lease_until=?')
    .bind(leaseUntil)
    .run();
}

/** Applies the cumulative refund total for a fulfilled order (idempotent by delta). */
export async function refundLemonOrder(env, localOrderId, cumulativeRefundCents, now = Date.now(), totalCents) {
  if (!Number.isSafeInteger(cumulativeRefundCents) || cumulativeRefundCents < 0)
    return { applied: false, reason: 'invalid_refund_amount' };
  for (let attempt = 0; attempt < 3; attempt++) {
    const order = await env.DB.prepare('SELECT * FROM lemon_orders WHERE id=?').bind(localOrderId).first();
    if (!order) return { applied: false, reason: 'order_not_found' };
    if (order.status === 'refunded') return { applied: true, deltaCredits: 0, deltaCents: 0 };
    if (order.status !== 'fulfilled') return { applied: false, reason: 'order_not_fulfilled' };
    const denominator =
      Number.isSafeInteger(totalCents) && totalCents >= order.amount_usd_cents ? totalCents : order.amount_usd_cents;
    const nextCents = Math.max(order.refunded_cents, Math.min(cumulativeRefundCents, denominator));
    const due = Math.min(order.credits, Math.floor((order.credits * nextCents) / denominator));
    const delta = due - order.refunded_credits,
      deltaCents = nextCents - order.refunded_cents,
      at = new Date(now).toISOString();
    if (delta <= 0) {
      await env.DB.prepare('UPDATE lemon_orders SET refunded_cents=MAX(refunded_cents,?),updated_at=? WHERE id=?')
        .bind(nextCents, at, localOrderId)
        .run();
      return { applied: true, deltaCredits: 0, deltaCents };
    }
    const wallet = await creditsBalance(env, order.user_id);
    const lot = await env.DB.prepare(
      "SELECT l.id,l.remaining FROM credit_lots l JOIN credits_ledger g ON g.lot_id=l.id WHERE g.user_id=? AND g.kind IN ('purchase','bonus') AND g.source_order=?",
    )
      .bind(order.user_id, `lemon:${localOrderId}`)
      .first();
    if (!lot) return { applied: false, reason: 'purchase_lot_missing' };
    const debt = wallet.available < delta || lot.remaining < delta;
    const ledgerId = crypto.randomUUID();
    const statements = [
      env.DB.prepare(
        "INSERT INTO credits_ledger(id,user_id,delta,balance_after,kind,operation_key,source_order,created_at) SELECT ?,?,?,NULL,?,?,?,? WHERE EXISTS(SELECT 1 FROM lemon_orders WHERE id=? AND status='fulfilled' AND refunded_credits=? AND refunded_cents=?) ON CONFLICT(user_id,kind,operation_key) DO NOTHING",
      ).bind(
        ledgerId,
        order.user_id,
        debt ? 0 : -delta,
        debt ? 'adjustment' : 'refund',
        `${debt ? 'debt' : 'refund'}:${localOrderId}:${nextCents}`,
        localOrderId,
        at,
        localOrderId,
        order.refunded_credits,
        order.refunded_cents,
      ),
    ];
    if (debt)
      statements.push(
        env.DB.prepare(
          "UPDATE credits_accounts SET status='restricted',updated_at=? WHERE user_id=? AND EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)",
        ).bind(at, order.user_id, ledgerId),
      );
    else
      statements.push(
        env.DB.prepare(
          'UPDATE credits_accounts SET balance=balance-?,updated_at=? WHERE user_id=? AND EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)',
        ).bind(delta, at, order.user_id, ledgerId),
        env.DB.prepare(
          'UPDATE credit_lots SET remaining=remaining-? WHERE id=? AND EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)',
        ).bind(delta, lot.id, ledgerId),
      );
    statements.push(
      env.DB.prepare(
        "UPDATE lemon_orders SET refunded_cents=?,refunded_credits=?,status=CASE WHEN ?>=? THEN 'refunded' ELSE status END,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)",
      ).bind(nextCents, due, nextCents, denominator, at, localOrderId, ledgerId),
    );
    try {
      await env.DB.batch(statements);
      if (await env.DB.prepare('SELECT id FROM credits_ledger WHERE id=?').bind(ledgerId).first())
        return { applied: true, deltaCredits: debt ? 0 : delta, ...(debt ? { debtCredits: delta } : {}), deltaCents };
    } catch (error) {
      if (attempt === 2 || !/constraint/i.test(String(error))) throw error;
    }
  }
  throw new Error('refund_conflict_retry');
}

/** Bounded reconcile pass: refund receipts (delta), stale pendings, then audit. */
export async function reconcileLemon(env, { now = Date.now(), limit = 50 } = {}) {
  if (!(await acquireReconcileLease(env, now))) return { skipped: 'lease_held' };
  const report = { refunds: [], stalePending: 0, failed: [] };
  try {
    const receipts = (
      await env.DB.prepare(
        "SELECT id, local_order_id, lemon_order_id, environment, store_id, payload_json FROM lemon_webhook_receipts WHERE event_name='order_refunded' AND processed=0 ORDER BY received_at LIMIT ?",
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
        const order = await env.DB.prepare('SELECT * FROM lemon_orders WHERE id=?')
          .bind(receipt.local_order_id)
          .first();
        if (order) {
          const snapshot = verifyCheckoutSnapshot(order, {
            subtotal_cents: a.subtotal,
            tax_cents: a.tax || 0,
            total_cents: a.total,
            variant_id: String(a.variant_id ?? a.first_order_item?.variant_id ?? ''),
            store_id: String(a.store_id ?? ''),
            environment: receipt.environment,
          });
          const providerId = payload?.data?.type === 'orders' ? payload.data.id : a.order_id;
          if (
            !snapshot.ok ||
            a.currency !== 'USD' ||
            !providerId ||
            (order.lemon_order_id && String(providerId) !== order.lemon_order_id)
          ) {
            report.failed.push({ receipt: receipt.id, error: 'refund_snapshot_mismatch' });
            continue;
          }
        }
        const result = await refundLemonOrder(env, receipt.local_order_id, cumulative, now, a.total);
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
    await releaseReconcileLease(env, (Number(now) || Date.now()) + LOCK_LEASE_MS);
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
