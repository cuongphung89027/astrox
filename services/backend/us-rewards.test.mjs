import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { usCheckin, usFirstTopup, usReferral, usRewardedAd, usWalletSummary } from './us-rewards.mjs';
import { creditsBalance } from './credits.mjs';

function fixture() {
  const native = new DatabaseSync(':memory:');
  native.exec("CREATE TABLE app_users(id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active')");
  for (const f of ['us-credits.sql', 'lemon-orders.sql'])
    native.exec(readFileSync(new URL('../../migrations/' + f, import.meta.url), 'utf8'));
  // Referral link table (shared, provider-agnostic user ids) from rewards migration.
  native.exec(readFileSync(new URL('../../migrations/rewards.sql', import.meta.url), 'utf8'));
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
  native.prepare("INSERT INTO app_users(id,status) VALUES('u2','active')").run();
  return env;
}

test('check-in: once per day per user; replay and next day behave correctly', async () => {
  const env = fixture();
  assert.deepEqual(await usCheckin(env, 'u1', '2026-09-28'), { granted: true, credits: 1 });
  assert.deepEqual(await usCheckin(env, 'u1', '2026-09-28'), { granted: false, reason: 'already_claimed' });
  assert.deepEqual(await usCheckin(env, 'u1', '2026-09-29'), { granted: true, credits: 1 });
  assert.equal((await creditsBalance(env, 'u1')).balance, 2);
});

test('first top-up: granted exactly once across multiple fulfilled orders', async () => {
  const env = fixture();
  assert.deepEqual(await usFirstTopup(env, 'u1', 'order-a'), { granted: true, credits: 5 });
  assert.deepEqual(await usFirstTopup(env, 'u1', 'order-b'), { granted: false, reason: 'already_claimed' });
  assert.equal((await creditsBalance(env, 'u1')).balance, 5);
});

test('referral: only with a verified link, no self-referral, once per invitee', async () => {
  const env = fixture();
  assert.deepEqual(await usReferral(env, 'u1', 'u2'), { granted: false, reason: 'not_linked' });
  await env.DB.prepare('INSERT INTO user_referrals(user_id,inviter_id,created_at) VALUES(?,?,?)')
    .bind('u2', 'u1', '2026')
    .run();
  assert.deepEqual(await usReferral(env, 'u1', 'u1'), { granted: false, reason: 'invalid_referral' });
  assert.deepEqual(await usReferral(env, 'u1', 'u2'), { granted: true, credits: 5 });
  assert.deepEqual(await usReferral(env, 'u1', 'u2'), { granted: false, reason: 'already_claimed' });
  assert.equal((await creditsBalance(env, 'u1')).balance, 5);
  assert.equal((await creditsBalance(env, 'u2')).balance, 0); // invitee gets nothing here
});

test('rewarded ads without a US provider are blocked — never a fake grant', async () => {
  const env = fixture();
  const blocked = await usRewardedAd(env, 'u1', null);
  assert.equal(blocked.granted, false);
  assert.equal(blocked.blocked, true);
  const forged = await usRewardedAd(env, 'u1', { provider: 'fake' });
  assert.equal(forged.granted, false);
  assert.equal((await creditsBalance(env, 'u1')).balance, 0);
});

test('wallet summary splits purchased vs bonus and keeps available/reserved', async () => {
  const env = fixture();
  const { creditPurchase, reserveCredits } = await import('./credits.mjs');
  await creditPurchase(env, { userId: 'u1', amount: 10, orderId: 'topup-1' });
  await creditPurchase(env, { userId: 'u1', amount: 3, kind: 'bonus', orderId: 'bonus-1' });
  await reserveCredits(env, { userId: 'u1', amount: 4, operationKey: 'hold' });
  const summary = await usWalletSummary(env, 'u1');
  assert.equal(summary.balance, 13);
  assert.equal(summary.available, 9);
  assert.equal(summary.reserved, 4);
  assert.equal(summary.purchased + summary.bonus, 13);
});

test('shared reward events credit US lots once and never create a VN wallet', async () => {
  const env = fixture();
  const { rewardCreditStatements } = await import('./reward-credit.mjs');
  await env.DB.prepare("INSERT INTO market_preferences(user_id,market,updated_at) VALUES('u1','US','now')").run();
  const input = { userId: 'u1', points: 7, reason: 'attendance', referenceId: '2026-09-28' };
  const batches = await Promise.all([
    rewardCreditStatements(env, input, 'now'),
    rewardCreditStatements(env, input, 'now'),
  ]);
  await env.DB.batch(batches[0]);
  await env.DB.batch(batches[1]);
  assert.equal((await creditsBalance(env, 'u1')).balance, 7);
  assert.equal((await env.DB.prepare("SELECT SUM(remaining) n FROM credit_lots WHERE user_id='u1'").first()).n, 7);
  assert.equal((await env.DB.prepare("SELECT COUNT(*) n FROM credits_ledger WHERE user_id='u1'").first()).n, 1);
});
