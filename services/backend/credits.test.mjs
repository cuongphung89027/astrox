import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureCreditAccount,
  creditsBalance,
  creditPurchase,
  reserveCredits,
  commitReserved,
  releaseReserved,
  creditsHistory,
  setMarket,
  marketOf,
  auditCredits,
} from './credits.mjs';

function fixture() {
  const native = new DatabaseSync(':memory:');
  native.exec("CREATE TABLE app_users(id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active')");
  native.exec(readFileSync(new URL('../../migrations/us-credits.sql', import.meta.url), 'utf8'));
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
  return env;
}
const user = async (env, id) => {
  await env.DB.prepare('INSERT OR IGNORE INTO app_users(id) VALUES(?)').bind(id).run();
  return id;
};

test('AI-01: two concurrent 7-credit spends against 10 credits — one wins, never negative', async () => {
  const env = fixture();
  const u = await user(env, 'u1');
  await creditPurchase(env, { userId: u, amount: 10, orderId: 'ord-1' });
  const results = await Promise.all([
    reserveCredits(env, { userId: u, amount: 7, operationKey: 'op-a' }),
    reserveCredits(env, { userId: u, amount: 7, operationKey: 'op-b' }),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  const balance = await creditsBalance(env, u);
  assert.equal(balance.balance, 10);
  assert.equal(balance.reserved, 7);
  assert.equal(balance.available, 3);
});

test('duplicate purchase credit yields exactly one ledger row and one lot', async () => {
  const env = fixture();
  const u = await user(env, 'u2');
  const first = await creditPurchase(env, { userId: u, amount: 20, orderId: 'ord-dup' });
  const second = await creditPurchase(env, { userId: u, amount: 20, orderId: 'ord-dup' });
  assert.equal(first.credited, true);
  assert.equal(second.credited, false);
  assert.equal((await creditsBalance(env, u)).balance, 20);
  const ledger = await env.DB.prepare('SELECT COUNT(*) AS n FROM credits_ledger').first();
  assert.equal(ledger.n, 1);
});

test('reserve→commit is exactly-once: retrying the same operationKey commits once', async () => {
  const env = fixture();
  const u = await user(env, 'u3');
  await creditPurchase(env, { userId: u, amount: 10, orderId: 'ord-3' });
  assert.equal(await reserveCredits(env, { userId: u, amount: 6, operationKey: 'ai-op' }), true);
  const a = await commitReserved(env, { userId: u, amount: 6, operationKey: 'ai-op' });
  const b = await commitReserved(env, { userId: u, amount: 6, operationKey: 'ai-op' });
  assert.equal(a.committed, true);
  assert.equal(b.committed, false);
  const balance = await creditsBalance(env, u);
  assert.equal(balance.balance, 4);
  assert.equal(balance.reserved, 0);
  const spends = await env.DB.prepare("SELECT COUNT(*) AS n FROM credits_ledger WHERE kind='spend'").first();
  assert.equal(spends.n, 1);
});

test('release returns credits after failure and is idempotent; lots consumed FIFO on commit', async () => {
  const env = fixture();
  const u = await user(env, 'u4');
  await creditPurchase(env, { userId: u, amount: 5, orderId: 'o1' });
  await creditPurchase(env, { userId: u, amount: 5, orderId: 'o2' });
  assert.equal(await reserveCredits(env, { userId: u, amount: 7, operationKey: 'x' }), true);
  const r1 = await releaseReserved(env, { userId: u, amount: 7, operationKey: 'x' });
  const r2 = await releaseReserved(env, { userId: u, amount: 7, operationKey: 'x' });
  assert.equal(r1.released, true);
  assert.equal(r2.released, false);
  assert.equal((await creditsBalance(env, u)).available, 10);
  // FIFO: spend the first lot entirely, then part of the second.
  assert.equal(await reserveCredits(env, { userId: u, amount: 6, operationKey: 'y' }), true);
  await commitReserved(env, { userId: u, amount: 6, operationKey: 'y' });
  const lots = (await env.DB.prepare('SELECT remaining FROM credit_lots ORDER BY created_at, rowid').all()).results;
  assert.deepEqual(
    lots.map(l => l.remaining),
    [0, 4],
  );
});

test('wrong owner and restricted accounts cannot touch another wallet', async () => {
  const env = fixture();
  const a = await user(env, 'owner-a');
  const b = await user(env, 'owner-b');
  await creditPurchase(env, { userId: a, amount: 10, orderId: 'o-a' });
  assert.equal(await reserveCredits(env, { userId: b, amount: 5, operationKey: 'steal' }), false);
  await env.DB.prepare("UPDATE credits_accounts SET status='restricted' WHERE user_id=?").bind(a).run();
  assert.equal(await reserveCredits(env, { userId: a, amount: 5, operationKey: 'nope' }), false);
});

test('history is user-scoped and stable under pagination', async () => {
  const env = fixture();
  const u = await user(env, 'u5');
  const other = await user(env, 'u6');
  await creditPurchase(env, { userId: u, amount: 5, orderId: 'h1' });
  await creditPurchase(env, { userId: other, amount: 5, orderId: 'h2' });
  const page1 = await creditsHistory(env, u, { limit: 1 });
  assert.equal(page1.entries.length, 1);
  assert.equal(page1.entries[0].source_order, 'h1');
  const page2 = await creditsHistory(env, u, { limit: 1, before: page1.nextCursor });
  assert.equal(page2.entries.length, 0);
});

test('market: explicit set/read; blocked while a reservation is pending', async () => {
  const env = fixture();
  const u = await user(env, 'u7');
  assert.equal(await marketOf(env, u), null);
  assert.deepEqual(await setMarket(env, u, 'US'), { market: 'US' });
  assert.equal(await marketOf(env, u), 'US');
  await creditPurchase(env, { userId: u, amount: 5, orderId: 'm1' });
  await reserveCredits(env, { userId: u, amount: 5, operationKey: 'pending' });
  await assert.rejects(() => setMarket(env, u, 'VN'), /market_change_blocked_pending_operation/);
  await releaseReserved(env, { userId: u, amount: 5, operationKey: 'pending' });
  assert.deepEqual(await setMarket(env, u, 'VN'), { market: 'VN' });
});

test('audit: ledger inflow always equals the authoritative balance', async () => {
  const env = fixture();
  const u = await user(env, 'u8');
  await creditPurchase(env, { userId: u, amount: 30, orderId: 'a1' });
  await creditPurchase(env, { userId: u, amount: 20, orderId: 'a2' });
  await reserveCredits(env, { userId: u, amount: 25, operationKey: 's1' });
  await commitReserved(env, { userId: u, amount: 25, operationKey: 's1' });
  const audit = await auditCredits(env, u);
  assert.equal(audit.ok, true);
  assert.equal(audit.balance, 25);
});
