import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnv } from '../admin/test/sqlite.mjs';
import { defaultConfig } from '../admin/config.ts';
import { state, publish } from '../admin/store.mjs';
import { sessionCookie } from './auth.mjs';
import { creditPurchase, creditsBalance, setMarket, auditCredits } from './credits.mjs';

async function fixture() {
  const env = testEnv();
  for (const file of [
    'services/backend/test/legacy-schema.sql',
    'migrations/backend.sql',
    'migrations/service-unlocks.sql',
    'migrations/rewards.sql',
    'migrations/us-credits.sql',
    'migrations/market-ai-operations.sql',
  ])
    for (const q of readFileSync(new URL('../../' + file, import.meta.url), 'utf8')
      .split(';')
      .filter(x => x.trim()))
      await env.DB.prepare(q).run();
  env.SESSION_SECRET = 'test';
  env.APP_ORIGIN = 'https://theastrox.space';
  await env.DB.prepare(
    "INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('u1','U','active','2026','2026')",
  ).run();
  const c = defaultConfig();
  c.ai.enabled = true;
  c.billing.enabled = true;
  const tarot = c.billing.services.find(x => x.id === 'tarot');
  tarot.status = 'paid';
  tarot.points = 7;
  await state(env);
  await publish(env, 'test', c, 0, 'test');
  return { env, c };
}
const cookieOf = async env => (await sessionCookie(env, 'u1')).split(';')[0];

async function charge(env, cookie, body) {
  const { internalFetch } = await import('./handler.mjs');
  return internalFetch(
    new Request('https://astrox-internal/internal/ai/charge', {
      method: 'POST',
      headers: { cookie },
      body: JSON.stringify(body),
    }),
    env,
  );
}

test('MARKET-02: client-sent market must match the stored preference exactly', async () => {
  const { env } = await fixture();
  await setMarket(env, 'u1', 'US');
  const cookie = await cookieOf(env);
  const mismatch = await charge(env, cookie, {
    serviceId: 'tarot',
    revision: 1,
    operationId: 'market-mismatch-01',
    requestHash: 'a'.repeat(64),
    market: 'VN',
  });
  assert.equal(mismatch.status, 409);
  assert.equal((await mismatch.json()).error, 'market_mismatch');
  const invalid = await charge(env, cookie, {
    serviceId: 'tarot',
    revision: 1,
    operationId: 'market-mismatch-02',
    requestHash: 'a'.repeat(64),
    market: 'EU',
  });
  assert.equal(invalid.status, 400);
});

test('AI-01 US: two 7-credit operations against 10 credits — one wins with insufficient_credits for the other', async () => {
  const { env } = await fixture();
  await setMarket(env, 'u1', 'US');
  await creditPurchase(env, { userId: 'u1', amount: 10, orderId: 'topup-1' });
  const cookie = await cookieOf(env);
  const [a, b] = await Promise.all([
    charge(env, cookie, {
      serviceId: 'tarot',
      revision: 1,
      operationId: 'us-op-a-credit-charge',
      requestHash: 'a'.repeat(64),
      market: 'US',
    }),
    charge(env, cookie, {
      serviceId: 'tarot',
      revision: 1,
      operationId: 'us-op-b-credit-charge',
      requestHash: 'b'.repeat(64),
      market: 'US',
    }),
  ]);
  const codes = [a.status, b.status].sort();
  assert.deepEqual(codes, [200, 402]);
  const wallet = await creditsBalance(env, 'u1');
  assert.equal(wallet.balance, 10); // reserved, not yet spent
  assert.equal(wallet.reserved, 7);
});

test('double-click on the same operation charges once and keeps market US (MARKET-01)', async () => {
  const { env } = await fixture();
  await setMarket(env, 'u1', 'US');
  await creditPurchase(env, { userId: 'u1', amount: 10, orderId: 'topup-2' });
  const cookie = await cookieOf(env);
  const body = {
    serviceId: 'tarot',
    revision: 1,
    operationId: 'us-op-duplicate-click',
    requestHash: 'c'.repeat(64),
    market: 'US',
  };
  const first = await charge(env, cookie, body);
  assert.equal(first.status, 200);
  // A second click while the operation is running is rejected as in-progress —
  // the client keeps the original chargeId and never reserves twice (AI-02).
  const second = await charge(env, cookie, body);
  assert.equal(second.status, 409);
  assert.equal((await second.json()).error, 'operation_in_progress');
  const wallet = await creditsBalance(env, 'u1');
  assert.equal(wallet.reserved, 7); // reserved once, never twice
  const opsAgain = (await env.DB.prepare("SELECT COUNT(*) AS n FROM backend_ai_operations WHERE user_id='u1'").all())
    .results[0].n;
  assert.equal(opsAgain, 1);
  const ops = (await env.DB.prepare("SELECT market,status FROM backend_ai_operations WHERE user_id='u1'").all())
    .results;
  assert.equal(ops.length, 1);
  assert.equal(ops[0].market, 'US');
});

test('AI-02 US: complete commits credits exactly once; retry replays the same result; refund before complete releases', async () => {
  const { env } = await fixture();
  const { internalFetch } = await import('./handler.mjs');
  await setMarket(env, 'u1', 'US');
  await creditPurchase(env, { userId: 'u1', amount: 10, orderId: 'topup-3' });
  const cookie = await cookieOf(env);
  const charged = await (
    await charge(env, cookie, {
      serviceId: 'tarot',
      revision: 1,
      operationId: 'us-op-complete-once',
      requestHash: 'd'.repeat(64),
      market: 'US',
    })
  ).json();
  const response = {
    choices: [{ message: { role: 'assistant', content: 'English reading.' }, finish_reason: 'stop' }],
  };
  const complete = async () =>
    internalFetch(
      new Request('https://astrox-internal/internal/ai/complete', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ chargeId: charged.chargeId, response }),
      }),
      env,
    );
  assert.equal((await complete()).status, 200);
  const replayed = await complete();
  assert.equal(replayed.status, 200);
  const wallet = await creditsBalance(env, 'u1');
  assert.equal(wallet.balance, 3);
  assert.equal(wallet.reserved, 0);
  const spends = (
    await env.DB.prepare("SELECT COUNT(*) AS n FROM credits_ledger WHERE user_id='u1' AND kind='spend'").all()
  ).results[0].n;
  assert.equal(spends, 1);
  // Refund after success is refused; the spent credits stay spent.
  const refund = await internalFetch(
    new Request('https://astrox-internal/internal/ai/refund', {
      method: 'POST',
      headers: { cookie },
      body: JSON.stringify({ chargeId: charged.chargeId }),
    }),
    env,
  );
  assert.equal(refund.status, 409);
});

test('US failure path: refund before complete releases the reservation without spending credits', async () => {
  const { env } = await fixture();
  const { internalFetch } = await import('./handler.mjs');
  await setMarket(env, 'u1', 'US');
  await creditPurchase(env, { userId: 'u1', amount: 10, orderId: 'topup-4' });
  const cookie = await cookieOf(env);
  const charged = await (
    await charge(env, cookie, {
      serviceId: 'tarot',
      revision: 1,
      operationId: 'us-op-failure-refund',
      requestHash: 'e'.repeat(64),
      market: 'US',
    })
  ).json();
  const refund = await internalFetch(
    new Request('https://astrox-internal/internal/ai/refund', {
      method: 'POST',
      headers: { cookie },
      body: JSON.stringify({ chargeId: charged.chargeId }),
    }),
    env,
  );
  assert.equal(refund.status, 200);
  const wallet = await creditsBalance(env, 'u1');
  assert.equal(wallet.balance, 10);
  assert.equal(wallet.reserved, 0);
  assert.equal((await auditCredits(env, 'u1')).ok, true);
});

test('reconcile releases stale running US operations instead of granting free results', async () => {
  const { env } = await fixture();
  await setMarket(env, 'u1', 'US');
  await creditPurchase(env, { userId: 'u1', amount: 10, orderId: 'topup-5' });
  const cookie = await cookieOf(env);
  await charge(env, cookie, {
    serviceId: 'tarot',
    revision: 1,
    operationId: 'us-op-stale-reconcile',
    requestHash: 'f'.repeat(64),
    market: 'US',
  });
  // Simulate a worker crash after reservation: age the operation past the lease.
  await env.DB.prepare("UPDATE backend_ai_operations SET created_at=created_at-3600000 WHERE user_id='u1'").run();
  const { reconcileAi } = await import('./ai-operations.mjs');
  await reconcileAi(env);
  const op = (await env.DB.prepare("SELECT status FROM backend_ai_operations WHERE user_id='u1'").all()).results[0];
  assert.equal(op.status, 'refunded');
  const wallet = await creditsBalance(env, 'u1');
  assert.equal(wallet.reserved, 0);
  assert.equal(wallet.available, 10);
  // A later retry of the same operation replays as refunded — never a free result.
  const retry = await charge(env, cookie, {
    serviceId: 'tarot',
    revision: 1,
    operationId: 'us-op-stale-reconcile',
    requestHash: 'f'.repeat(64),
    market: 'US',
  });
  assert.equal((await retry.json()).error, 'operation_refunded');
});

test('VN users without a US preference keep the exact legacy Point path (no credits involved)', async () => {
  const { env } = await fixture();
  await env.DB.prepare(
    "INSERT OR REPLACE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES('u1',100,'2026')",
  ).run();
  const cookie = await cookieOf(env);
  const res = await charge(env, cookie, {
    serviceId: 'tarot',
    revision: 1,
    operationId: 'vi-op-legacy-points',
    requestHash: '1'.repeat(64),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.market ?? 'VN', 'VN');
  const points = (await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='u1'").first()).balance;
  assert.equal(points, 93);
  const wallet = await creditsBalance(env, 'u1');
  assert.equal(wallet.balance, 0); // VN charges never touch the Credits wallet
});

test('concurrent US retries reserve one operation without poisoning its commit', async () => {
  const { env } = await fixture();
  await setMarket(env, 'u1', 'US');
  await creditPurchase(env, { userId: 'u1', amount: 50, orderId: 'retry-purchase' });
  const cookie = await cookieOf(env),
    input = {
      operationId: 'repeat-operation-001',
      requestHash: 'b'.repeat(64),
      serviceId: 'tarot',
      expectedPoints: 7,
      market: 'US',
      revision: 1,
    };
  const responses = await Promise.all([charge(env, cookie, input), charge(env, cookie, input)]);
  assert.ok(responses.some(r => r.status === 200));
  assert.equal((await creditsBalance(env, 'u1')).reserved, 7);
  const { commitReserved } = await import('./credits.mjs');
  await commitReserved(env, { userId: 'u1', amount: 7, operationKey: `ai:${input.operationId}` });
  assert.equal((await creditsBalance(env, 'u1')).balance, 43);
  assert.equal((await creditsBalance(env, 'u1')).reserved, 0);
});
