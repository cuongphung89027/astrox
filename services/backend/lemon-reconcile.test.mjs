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
const refundReceipt = (env, orderId, refundedCents) =>
  env.DB.prepare(
    "INSERT INTO lemon_webhook_receipts(id,event_name,lemon_order_id,local_order_id,environment,store_id,payload_digest,payload_json,received_at) VALUES(?,?,9001,?, 'test','11111','digest',?, '2026')",
  )
    .bind(
      crypto.randomUUID(),
      'order_refunded',
      orderId,
      JSON.stringify({ data: { attributes: { refunded_amount: refundedCents } } }),
    )
    .run();

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
  assert.equal(order.refunded_cents, 500); // cumulative never goes backwards
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

test('refund for an unfulfilled order is ignored (refund before paid)', async () => {
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
