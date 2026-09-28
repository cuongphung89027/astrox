import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { refundLemonOrder, reconcileLemon, auditLemon, acquireReconcileLease } from './lemon-reconcile.mjs';
import { creditsBalance, creditPurchase, reserveCredits, commitReserved } from './credits.mjs';

function fixture() {
  const native = new DatabaseSync(':memory:');
  native.exec("CREATE TABLE app_users(id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active')");
  for (const f of ['lemon-orders.sql', 'us-credits.sql', 'lemon-webhook.sql'])
    native.exec(readFileSync(new URL('../../migrations/' + f, import.meta.url), 'utf8'));
  const prepare = (query, args = []) => ({
    bind(...v) {
      return prepare(query, v);
    },
    async first() {
      return native.prepare(query).get(...args) || null;
    },
    async all() {
      return { results: native.prepare(query).all(...args) };
    },
    async run() {
      return { meta: { changes: native.prepare(query).run(...args).changes } };
    },
    execute() {
      const stmt = native.prepare(query);
      return stmt.columns().length ? { results: stmt.all(...args) } : { meta: { changes: stmt.run(...args).changes } };
    },
  });
  const env = {
    DB: {
      prepare,
      async batch(statements) {
        native.exec('BEGIN');
        try {
          const out = statements.map(s => s.execute());
          native.exec('COMMIT');
          return out;
        } catch (e) {
          native.exec('ROLLBACK');
          throw e;
        }
      },
    },
  };
  native.prepare("INSERT INTO app_users(id,status) VALUES('u1','active')").run();
  return env;
}
async function fulfilledOrder(env, { credits = 20, cents = 2000 } = {}) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO lemon_orders(id,user_id,market,package_id,package_revision,credits,amount_usd_cents,variant_id,store_id,environment,status,request_key,created_at,updated_at)
     VALUES(?,?,'US','us-20',1,?,?,'var','store','test','fulfilled',?,'2026','2026')`,
  )
    .bind(id, 'u1', credits, cents, `rk-${id.slice(0, 8)}`)
    .run();
  await creditPurchase(env, { userId: 'u1', amount: credits, orderId: `lemon:${id}` });
  return id;
}
async function refundReceipt(env, orderId, refundedCents, overrides = {}) {
  const order = await env.DB.prepare('SELECT * FROM lemon_orders WHERE id=?').bind(orderId).first();
  const attrs = {
    refunded_amount: refundedCents,
    subtotal: order.amount_usd_cents,
    total: order.amount_usd_cents,
    tax: 0,
    store_id: order.store_id,
    currency: 'USD',
    first_order_item: { variant_id: order.variant_id },
    ...overrides,
  };
  await env.DB.prepare(
    "INSERT INTO lemon_webhook_receipts(id,event_name,lemon_order_id,local_order_id,environment,store_id,payload_digest,payload_json,received_at) VALUES(?,'order_refunded','9001',?,'test',?,'digest',?,'2026')",
  )
    .bind(
      crypto.randomUUID(),
      orderId,
      order.store_id,
      JSON.stringify({ data: { type: 'orders', id: order.lemon_order_id || '9001', attributes: attrs } }),
    )
    .run();
}

test('PAY-06: two partial refunds apply only the delta, never exceeding the original', async () => {
  const env = fixture();
  const id = await fulfilledOrder(env, { credits: 20, cents: 2000 });
  await refundReceipt(env, id, 500); // 25% → 5 credits
  let r = await reconcileLemon(env);
  assert.equal(r.refunds[0].deltaCredits, 5);
  assert.equal((await creditsBalance(env, 'u1')).balance, 15);
  await refundReceipt(env, id, 1000); // 50% cumulative → +5 more credits
  r = await reconcileLemon(env);
  assert.equal(r.refunds[0].deltaCredits, 5);
  assert.equal((await creditsBalance(env, 'u1')).balance, 10);
  // Reordered duplicate of the earlier cumulative state: zero extra.
  await refundReceipt(env, id, 500);
  r = await reconcileLemon(env);
  assert.equal(r.refunds[0].deltaCredits, 0);
  assert.equal((await creditsBalance(env, 'u1')).balance, 10);
  const order = await env.DB.prepare('SELECT refunded_cents,refunded_credits,status FROM lemon_orders WHERE id=?')
    .bind(id)
    .first();
  assert.equal(order.refunded_cents, 1000); // cumulative never goes backwards
  assert.equal(order.status, 'fulfilled');
});

test('full refund reverses every credit and flips the order to refunded (replay is a no-op)', async () => {
  const env = fixture();
  const id = await fulfilledOrder(env, { credits: 20, cents: 2000 });
  await refundReceipt(env, id, 2000);
  await reconcileLemon(env);
  assert.equal((await creditsBalance(env, 'u1')).balance, 0);
  assert.equal(
    (await env.DB.prepare('SELECT status FROM lemon_orders WHERE id=?').bind(id).first()).status,
    'refunded',
  );
  // Replay the same receipt: processed flag guards it.
  const r = await reconcileLemon(env);
  assert.equal(r.refunds.length, 0);
});

test('PAY-07: refund after the credits were spent restricts the account and records a debt; VN wallet untouched', async () => {
  const env = fixture();
  const id = await fulfilledOrder(env, { credits: 20, cents: 2000 });
  await reserveCredits(env, { userId: 'u1', amount: 20, operationKey: 'spend-all' });
  await commitReserved(env, { userId: 'u1', amount: 20, operationKey: 'spend-all' });
  await refundReceipt(env, id, 2000);
  const r = await reconcileLemon(env);
  assert.equal(r.refunds[0].debtCredits, 20);
  assert.equal((await creditsBalance(env, 'u1')).status, 'restricted');
  const debt = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM credits_ledger WHERE kind='adjustment' AND operation_key LIKE 'debt:%'",
  ).first();
  assert.equal(debt.n, 1);
  const audit = await auditLemon(env);
  assert.equal(audit.ok, true);
});

test('refund before paid remains pending and is applied after fulfillment', async () => {
  const env = fixture();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO lemon_orders(id,user_id,market,package_id,package_revision,credits,amount_usd_cents,variant_id,store_id,environment,status,request_key,created_at,updated_at)
     VALUES(?,'u1','US','us-20',1,20,2000,'v','s','test','pending','rk-pending-refund','2026','2026')`,
  )
    .bind(id)
    .run();
  await refundReceipt(env, id, 2000);
  const r = await reconcileLemon(env);
  assert.equal(r.refunds[0].applied, false);
  assert.equal((await creditsBalance(env, 'u1')).balance, 0);
  assert.equal((await env.DB.prepare('SELECT processed FROM lemon_webhook_receipts').first()).processed, 0);
  await creditPurchase(env, { userId: 'u1', amount: 20, orderId: `lemon:${id}` });
  await env.DB.prepare("UPDATE lemon_orders SET status='fulfilled',lemon_order_id='9001' WHERE id=?").bind(id).run();
  const second = await reconcileLemon(env);
  assert.equal(second.refunds[0].deltaCredits, 20);
  assert.equal((await creditsBalance(env, 'u1')).balance, 0);
  assert.equal((await env.DB.prepare('SELECT processed FROM lemon_webhook_receipts').first()).processed, 1);
});

test('stale pending checkouts without a URL age out to failed', async () => {
  const env = fixture();
  await env.DB.prepare(
    `INSERT INTO lemon_orders(id,user_id,market,package_id,package_revision,credits,amount_usd_cents,variant_id,store_id,environment,status,request_key,created_at,updated_at)
     VALUES('stale-1','u1','US','us-5',1,5,499,'v','s','test','pending','rk-stale-old-1',datetime('now','-2 hours'),datetime('now','-2 hours'))`,
  ).run();
  const r = await reconcileLemon(env);
  assert.equal(r.stalePending, 1);
  assert.equal(
    (await env.DB.prepare('SELECT status FROM lemon_orders WHERE id=?').bind('stale-1').first()).status,
    'failed',
  );
});

test('cron lease prevents overlapping reconcile runs', async () => {
  const env = fixture();
  assert.equal(await acquireReconcileLease(env, 1000), true);
  assert.equal(await acquireReconcileLease(env, 1000 + 1000), false); // lease held
  assert.equal(await acquireReconcileLease(env, 1000 + 130000), true); // expired
});

test('simultaneous lease contenders have exactly one winner', async () => {
  const env = fixture();
  const results = await Promise.all([acquireReconcileLease(env, 1000), acquireReconcileLease(env, 1000)]);
  assert.equal(results.filter(Boolean).length, 1);
});
test('refund of a consumed lot does not consume an unrelated purchase lot', async () => {
  const env = fixture();
  const id = await fulfilledOrder(env);
  await reserveCredits(env, { userId: 'u1', amount: 20, operationKey: 'spent-first' });
  await commitReserved(env, { userId: 'u1', amount: 20, operationKey: 'spent-first' });
  await creditPurchase(env, { userId: 'u1', amount: 30, orderId: 'unrelated' });
  const result = await refundLemonOrder(env, id, 2000);
  assert.equal(result.debtCredits, 20);
  assert.equal((await creditsBalance(env, 'u1')).balance, 30);
  assert.equal((await env.DB.prepare("SELECT SUM(remaining) n FROM credit_lots WHERE user_id='u1'").first()).n, 30);
  assert.equal((await refundLemonOrder(env, id, 2000)).deltaCredits, 0);
});
test('concurrent duplicate refunds deduct exactly once and preserve account/lot totals', async () => {
  const env = fixture(),
    id = await fulfilledOrder(env);
  await Promise.all([refundLemonOrder(env, id, 1000), refundLemonOrder(env, id, 1000)]);
  assert.equal((await creditsBalance(env, 'u1')).balance, 10);
  assert.equal((await env.DB.prepare("SELECT SUM(remaining) n FROM credit_lots WHERE user_id='u1'").first()).n, 10);
});

test('tax-inclusive refund proportions use the original paid total and reject a foreign store', async () => {
  const env = fixture(),
    id = await fulfilledOrder(env);
  await refundReceipt(env, id, 1100, { tax: 200, total: 2200, store_id: 'foreign' });
  let result = await reconcileLemon(env);
  assert.equal(result.failed[0].error, 'refund_snapshot_mismatch');
  assert.equal((await creditsBalance(env, 'u1')).balance, 20);
  await refundReceipt(env, id, 1100, { tax: 200, total: 2200 });
  result = await reconcileLemon(env);
  assert.equal(result.refunds[0].deltaCredits, 10);
  assert.equal((await creditsBalance(env, 'u1')).balance, 10);
});
