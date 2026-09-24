import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnv } from '../admin/test/sqlite.mjs';
import { defaultConfig } from '../admin/config.ts';
import { publish, state } from '../admin/store.mjs';
import { quoteUnlock, reserveUnlock, completeUnlock, refundUnlock, scopeForReading } from './service-unlocks.mjs';
const leaf = 'tuvi--tim-hieu-ban-than--tinh-cach',
  sibling = 'tuvi--tim-hieu-ban-than--thu-thach';
const descriptor = (name = 'Lan') => ({
  id: 'tuvi.tuviPromptBody.0',
  values: [
    { id: 'tuvi.profileContextText.0', values: [name, 'Nữ', '01/01/1990', 'Tý', 'Hà Nội'] },
    { id: 'tuvi.ziweiContextText.0', values: ['{"solarDate":"1990-01-01"}'] },
    'Phân tích',
  ],
});
async function fixture() {
  const env = testEnv();
  for (const file of [
    'services/backend/test/legacy-schema.sql',
    'migrations/backend.sql',
    'migrations/service-unlocks.sql',
  ])
    for (const q of readFileSync(new URL('../../' + file, import.meta.url), 'utf8')
      .split(';')
      .filter(x => x.trim()))
      await env.DB.prepare(q).run();
  env.SESSION_SECRET = 'test';
  await env.DB.prepare(
    "INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('u','Test','active','2026','2026')",
  ).run();
  await env.DB.prepare("INSERT INTO zalo_point_accounts VALUES('u',1000,'2026')").run();
  const c = defaultConfig();
  c.ai.enabled = c.billing.enabled = c.billing.unlocks.enabled = true;
  c.billing.services.forEach(s => {
    s.status = 'paid';
    s.points = 90;
  });
  c.billing.unlocks.bundles = [
    { id: 'tuvi', enabled: true, points: 600 },
    { id: 'tuvi--tim-hieu-ban-than', enabled: true, points: 300 },
  ];
  await state(env);
  await publish(env, 'test', c, 0, 'test');
  return { env, c };
}
async function buy(env, c, serviceId = leaf, offerId = serviceId, op = crypto.randomUUID(), desc = descriptor()) {
  const input = { serviceId, promptDescriptor: desc };
  const q = await quoteUnlock(env, 'u', c, 1, input);
  const offer = q.offers.find(o => o.id === offerId);
  assert.ok(offer, offerId);
  const body = {
    ...input,
    operationId: op,
    requestHash: 'a'.repeat(64),
    revision: 1,
    selection: {
      offerId,
      version: q.version,
      scopeKey: q.scopeKey,
      points: offer.points,
      expiresAt: offer.expiresAt,
      revision: 1,
    },
  };
  const response = await reserveUnlock(env, 'u', c, 1, body);
  return { response, body, q };
}
const bal = async env =>
  (await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='u'").first()).balance;
const finish = async (env, r) =>
  completeUnlock(env, 'u', r.chargeId, { choices: [{ message: { content: 'Kết quả' } }] });
test('leaf purchase, group upgrade, then module upgrade consume each paid credit once', async () => {
  const { env, c } = await fixture();
  let r = await buy(env, c);
  assert.equal(r.response.points, 90);
  await finish(env, r.response);
  r = await buy(env, c, sibling, 'tuvi--tim-hieu-ban-than');
  assert.equal(r.response.points, 240);
  await finish(env, r.response);
  r = await buy(env, c, leaf, 'tuvi');
  assert.equal(r.response.points, 440);
  await finish(env, r.response);
  assert.equal(await bal(env), 230);
  r = await buy(env, c, sibling);
  assert.equal(r.response.points, 0);
  await finish(env, r.response);
  assert.equal(await bal(env), 230);
});
test('simultaneous purchase is serialized, retries replay, changed payload conflicts', async () => {
  const { env, c } = await fixture();
  const first = await buy(env, c);
  await assert.rejects(() => buy(env, c, sibling), /purchase_in_progress|quote_changed/);
  assert.equal(await bal(env), 910);
  await finish(env, first.response);
  const replay = await reserveUnlock(env, 'u', c, 1, first.body);
  assert.equal(replay.replayed, true);
  await assert.rejects(
    () => reserveUnlock(env, 'u', c, 1, { ...first.body, requestHash: 'b'.repeat(64) }),
    /operation_conflict/,
  );
  assert.equal(await bal(env), 910);
});
test('refund creates no entitlement and preserves upgrade credits; failure is atomic', async () => {
  const { env, c } = await fixture();
  let r = await buy(env, c);
  await finish(env, r.response);
  r = await buy(env, c, sibling, 'tuvi--tim-hieu-ban-than');
  await refundUnlock(env, 'u', r.response.chargeId);
  await refundUnlock(env, 'u', r.response.chargeId);
  assert.equal(await bal(env), 910);
  const q = await quoteUnlock(env, 'u', c, 1, { serviceId: sibling, promptDescriptor: descriptor() });
  assert.equal(q.offers.find(o => o.id === 'tuvi--tim-hieu-ban-than').points, 240);
  await env.DB.prepare(
    "CREATE TRIGGER fail_debit BEFORE UPDATE ON zalo_point_accounts WHEN NEW.balance<OLD.balance BEGIN SELECT RAISE(ABORT,'test_debit_failure'); END",
  ).run();
  await assert.rejects(() => buy(env, c, sibling), /test_debit_failure/);
  assert.equal(await bal(env), 910);
});
test('ownership cannot cross profile, user or expired period and cannot bypass disabled services', async () => {
  const { env, c } = await fixture();
  const r = await buy(env, c);
  await finish(env, r.response);
  const q = await quoteUnlock(env, 'u', c, 1, { serviceId: leaf, promptDescriptor: descriptor('Khác') });
  assert.equal(q.offers[0].points, 90);
  const other = await quoteUnlock(env, 'other', c, 1, { serviceId: leaf, promptDescriptor: descriptor() });
  assert.equal(other.offers[0].points, 90);
  c.billing.services.find(s => s.id === leaf).status = 'hidden';
  await assert.rejects(
    () => quoteUnlock(env, 'u', c, 1, { serviceId: leaf, promptDescriptor: descriptor() }),
    /service_unavailable/,
  );
});
test('server derives Vietnam period expiry and rejects missing or mismatched prompt contexts', async () => {
  const s = await scopeForReading('tuvi--period--today', descriptor(), Date.parse('2026-09-24T16:59:00Z'));
  assert.equal(s.expiresAt, Date.parse('2026-09-24T17:00:00Z'));
  await assert.rejects(() => scopeForReading(leaf, undefined), /invalid_scope/);
  await assert.rejects(() => scopeForReading(leaf, { id: 'zodiac.zodiacPromptBody.0', values: [] }), /invalid_scope/);
  const { env, c } = await fixture();
  await assert.rejects(() => quoteUnlock(env, 'u', c, 1, null), /invalid_scope/);
});
test('stale ownership quotes and changed config prices never debit, including insufficient balance', async () => {
  const { env, c } = await fixture();
  const input = { serviceId: leaf, promptDescriptor: descriptor() };
  const q = await quoteUnlock(env, 'u', c, 1, input);
  const body = {
    ...input,
    operationId: 'stale-quote-op',
    requestHash: 'a'.repeat(64),
    selection: { offerId: leaf, scopeKey: q.scopeKey, version: q.version, revision: 1, points: 90, expiresAt: null },
  };
  const r = await buy(env, c);
  await finish(env, r.response);
  await assert.rejects(() => reserveUnlock(env, 'u', c, 1, body), /quote_changed/);
  assert.equal(await bal(env), 910);
  await assert.rejects(() => reserveUnlock(env, 'u', c, 2, body), /quote_changed/);
  await env.DB.prepare("UPDATE zalo_point_accounts SET balance=0 WHERE user_id='u'").run();
  await assert.rejects(() => buy(env, c, sibling), /insufficient_points/);
  assert.equal(await bal(env), 0);
});
test('a forecast quote from a different period cannot be charged after its boundary', async () => {
  const { env, c } = await fixture();
  const input = { serviceId: 'tuvi--period--today', promptDescriptor: descriptor() };
  const q = await quoteUnlock(env, 'u', c, 1, input);
  const selection = {
    offerId: input.serviceId,
    scopeKey: q.scopeKey,
    version: q.version,
    revision: 1,
    points: 90,
    expiresAt: q.offers[0].expiresAt - 86400000,
  };
  await assert.rejects(
    () =>
      reserveUnlock(env, 'u', c, 1, {
        ...input,
        operationId: 'expired-period',
        requestHash: 'a'.repeat(64),
        selection,
      }),
    /quote_changed/,
  );
  assert.equal(await bal(env), 1000);
});
test('simultaneous different operation IDs and overlapping scopes can reserve only once', async () => {
  const { env, c } = await fixture();
  const input = { serviceId: leaf, promptDescriptor: descriptor() };
  const q = await quoteUnlock(env, 'u', c, 1, input);
  const selection = {
    offerId: 'tuvi',
    scopeKey: q.scopeKey,
    version: q.version,
    revision: 1,
    points: 600,
    expiresAt: null,
  };
  const results = await Promise.allSettled(
    Array.from({ length: 4 }, (_, i) =>
      reserveUnlock(env, 'u', c, 1, {
        ...input,
        operationId: 'concurrent-' + i,
        requestHash: 'a'.repeat(64),
        selection,
      }),
    ),
  );
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await bal(env), 400);
});
test('user cannot complete or refund another user purchase; exhausted lease refunds without granting', async () => {
  const { env, c } = await fixture();
  const r = await buy(env, c);
  await assert.rejects(
    () => completeUnlock(env, 'other', r.response.chargeId, { choices: [] }),
    /operation_not_running/,
  );
  await assert.rejects(() => refundUnlock(env, 'other', r.response.chargeId), /charge_not_found/);
  await env.DB.prepare('UPDATE service_unlock_operations SET created_at=?')
    .bind(Date.now() - 240000)
    .run();
  const { reconcileUnlocks } = await import('./service-unlocks.mjs');
  await reconcileUnlocks(env);
  await reconcileUnlocks(env);
  assert.equal(await bal(env), 1000);
  const q = await quoteUnlock(env, 'u', c, 1, { serviceId: leaf, promptDescriptor: descriptor() });
  assert.equal(q.offers[0].owned, false);
});
test('Pages quote, selection, successful reading and owned sibling use one backend grant', async () => {
  const { env, c } = await fixture();
  const { saveSecret } = await import('../admin/store.mjs');
  const { sessionCookie } = await import('./auth.mjs');
  const { internalFetch } = await import('./handler.mjs');
  const { handleAiQuote, handleConfiguredAi } = await import('../admin/integration-api.mjs');
  env.APP_ORIGIN = 'https://theastrox.space';
  env.PROVIDER_ALLOWED_HOSTS = 'api.example.com';
  env.ASTROX_BACKEND = { fetch: r => internalFetch(r, env) };
  c.ai.chain = ['test'];
  c.ai.providers = [
    {
      id: 'test',
      name: 'Test',
      model: 'test',
      protocol: 'chat',
      baseUrl: 'https://api.example.com/v1',
      enabled: true,
      timeoutMs: 1000,
      retries: 0,
      maxTokens: 100,
      temperature: 0.5,
      secretRef: 'provider:test',
    },
  ];
  await saveSecret(env, 'test', 'provider:test', 'fake-test-key');
  await publish(env, 'test', c, 1, 'provider');
  const cookie = (await sessionCookie(env, 'u')).split(';')[0];
  const request = (path, body) =>
    new Request('https://theastrox.space' + path, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const quote = await handleAiQuote(request('/api/ai/quote', { serviceId: leaf, promptDescriptor: descriptor() }), env);
  assert.equal(quote.status, 200);
  const q = await quote.json();
  const offer = q.offers.find(o => o.id === 'tuvi--tim-hieu-ban-than');
  assert.equal(offer.points, 300);
  const selection = {
    offerId: offer.id,
    scopeKey: q.scopeKey,
    version: q.version,
    revision: q.revision,
    points: offer.points,
    expiresAt: offer.expiresAt,
  };
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ choices: [{ message: { content: 'Kết quả luận giải' }, finish_reason: 'stop' }] });
  };
  try {
    const first = await handleConfiguredAi(
      request('/api/ai', {
        serviceId: leaf,
        operationId: 'buy-group-123',
        messages: [{ role: 'user', content: 'Question' }],
        promptDescriptor: descriptor(),
        selection,
        expectedPoints: 300,
      }),
      env,
    );
    assert.equal(first.status, 200, await first.clone().text());
    assert.equal((await first.json()).chargedPoints, 300);
    assert.equal(await bal(env), 700);
    const next = await handleAiQuote(
      request('/api/ai/quote', { serviceId: sibling, promptDescriptor: descriptor() }),
      env,
    );
    const nq = await next.json();
    assert.equal(nq.offers[0].points, 0);
    assert.equal(nq.offers[0].owned, true);
    const free = {
      offerId: sibling,
      scopeKey: nq.scopeKey,
      version: nq.version,
      revision: nq.revision,
      points: 0,
      expiresAt: null,
    };
    const second = await handleConfiguredAi(
      request('/api/ai', {
        serviceId: sibling,
        operationId: 'read-sibling-123',
        messages: [{ role: 'user', content: 'Question' }],
        promptDescriptor: descriptor(),
        selection: free,
        expectedPoints: 0,
      }),
      env,
    );
    assert.equal(second.status, 200, await second.clone().text());
    assert.equal((await second.json()).chargedPoints, 0);
    assert.equal(await bal(env), 700);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
