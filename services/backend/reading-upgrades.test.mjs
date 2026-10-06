import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnv } from '../admin/test/sqlite.mjs';
import { defaultConfig } from '../admin/config.ts';
import { wrapVisualPrompt, visualInput, saveVisualReading } from '../admin/visual-reading.ts';
import { original, serviceId, fixture as visualFixture } from '../../web/tests/support/visual-fixtures.mjs';
import {
  READING_UPGRADE_CAMPAIGN,
  quoteReadingUpgrade,
  reserveReadingUpgrade,
  completeReadingUpgrade,
  refundReadingUpgrade,
} from './reading-upgrades.mjs';
const migration = () => readFileSync(new URL('../../migrations/reading-format-upgrades.sql', import.meta.url), 'utf8');
async function sql(env, source) {
  for (const query of source.split(';').filter(q => q.trim())) await env.DB.prepare(query).run();
}
async function setup({ market = 'VN', status = 'succeeded', future = false, scope = null } = {}) {
  const env = testEnv();
  await sql(env, readFileSync(new URL('./test/legacy-schema.sql', import.meta.url), 'utf8'));
  await sql(env, readFileSync(new URL('../../migrations/backend.sql', import.meta.url), 'utf8'));
  await sql(env, readFileSync(new URL('../../migrations/us-credits.sql', import.meta.url), 'utf8'));
  await sql(env, readFileSync(new URL('../../migrations/user-sync.sql', import.meta.url), 'utf8'));
  await sql(env, readFileSync(new URL('../../migrations/market-ai-operations.sql', import.meta.url), 'utf8'));
  env.SESSION_SECRET = 'upgrade-test-secret';
  await env.DB.prepare(
    "INSERT INTO app_users(id,status,created_at,updated_at) VALUES('reader','active','2026','2026')",
  ).run();
  await env.DB.prepare("INSERT INTO zalo_point_accounts VALUES('reader',30,'2026')").run();
  await env.DB.prepare(
    `INSERT INTO backend_ai_operations
    (user_id,operation_id,charge_id,service_id,request_hash,config_revision,points,status,created_at,updated_at,market)
    VALUES('reader','old-operation','old-charge',?,'old-hash',1,90,?,?,?,?)`,
  )
    .bind(serviceId, status, Date.now() + (future ? 1000000 : -1000000), Date.now(), market)
    .run();
  await sql(env, migration());
  const c = defaultConfig();
  c.ai.enabled = c.billing.enabled = true;
  c.billing.unlocks.enabled = false;
  c.billing.services.forEach(s => {
    s.status = 'paid';
    s.points = 90;
  });
  if (scope !== null) await env.DB.prepare('UPDATE reading_upgrade_grants SET source_scope_key=?').bind(scope).run();
  const promptDescriptor = wrapVisualPrompt(original, serviceId, market === 'US' ? 'en' : 'vi');
  const input = {
    serviceId,
    promptDescriptor,
    upgradeCampaign: READING_UPGRADE_CAMPAIGN,
    operationId: crypto.randomUUID(),
    requestHash: 'a'.repeat(64),
  };
  return { env, c, input };
}
function response(input) {
  const locale = JSON.parse(input.promptDescriptor.values[0]).locale;
  const snapshot = visualInput(input.promptDescriptor, input.serviceId, locale);
  return { choices: [{ message: { content: saveVisualReading(JSON.stringify(visualFixture(snapshot)), snapshot) } }] };
}
test('successful old per-request readers get a free upgrade even with unlock pricing disabled', async () => {
  const { env, c, input } = await setup();
  const quote = await quoteReadingUpgrade(env, 'reader', c, 1, input);
  assert.equal(quote.available, true);
  assert.equal(quote.points, 0);
  assert.equal(quote.remaining, 1);
  const old = await env.DB.prepare('SELECT * FROM backend_ai_operations').first();
  const claim = await reserveReadingUpgrade(env, 'reader', c, 1, input);
  assert.equal(claim.points, 0);
  await completeReadingUpgrade(env, 'reader', claim.chargeId, response(input));
  assert.deepEqual(await env.DB.prepare('SELECT * FROM backend_ai_operations').first(), old);
  assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, input)).available, false);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM service_unlock_operations').first()).n, 0);
  assert.equal(
    (await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='reader'").first()).balance,
    30,
  );
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM zalo_point_ledger').first()).n, 0);
});
test('refunded, running and post-cutoff operations do not receive a free conversion', async () => {
  for (const opts of [{ status: 'refunded' }, { status: 'running' }, { future: true }]) {
    const { env, c, input } = await setup(opts);
    assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, input)).available, false);
    await assert.rejects(reserveReadingUpgrade(env, 'reader', c, 1, input), /upgrade_unavailable/);
  }
});
test('free conversion is bound to the account, market, service and any known profile scope', async () => {
  const { env, c, input } = await setup();
  assert.equal((await quoteReadingUpgrade(env, 'other', c, 1, input)).available, false);
  assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, input, Date.now(), 'US')).available, false);
  await env.DB.prepare("UPDATE reading_upgrade_grants SET source_scope_key='another-profile'").run();
  assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, input)).available, false);
  await assert.rejects(
    reserveReadingUpgrade(env, 'reader', c, 1, { ...input, promptDescriptor: original }),
    /invalid_upgrade/,
  );
});
test('duplicate requests replay the new saved report without consuming another entitlement', async () => {
  const { env, c, input } = await setup();
  const claim = await reserveReadingUpgrade(env, 'reader', c, 1, input);
  await assert.rejects(
    reserveReadingUpgrade(env, 'reader', c, 1, { ...input, operationId: crypto.randomUUID() }),
    /upgrade_in_progress/,
  );
  const result = response(input);
  await completeReadingUpgrade(env, 'reader', claim.chargeId, result);
  const replay = await reserveReadingUpgrade(env, 'reader', c, 1, input);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.response, result);
  const recovered = await quoteReadingUpgrade(env, 'reader', c, 1, input);
  assert.deepEqual(
    recovered.result,
    result,
    'a completed upgrade can be reopened after the browser loses the response',
  );
  await assert.rejects(
    reserveReadingUpgrade(env, 'reader', c, 1, { ...input, requestHash: 'b'.repeat(64) }),
    /operation_conflict/,
  );
  await assert.rejects(
    reserveReadingUpgrade(env, 'reader', c, 1, { ...input, operationId: crypto.randomUUID() }),
    /upgrade_unavailable/,
  );
  await assert.rejects(refundReadingUpgrade(env, 'reader', claim.chargeId), /operation_completed/);
});
test('AI failure releases the entitlement and a later successful retry remains free', async () => {
  const { env, c, input } = await setup();
  const first = await reserveReadingUpgrade(env, 'reader', c, 1, input);
  await assert.rejects(
    completeReadingUpgrade(env, 'reader', first.chargeId, { choices: [{ message: { content: 'old prose' } }] }),
    /invalid_upgrade_result/,
  );
  await refundReadingUpgrade(env, 'reader', first.chargeId);
  assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, input)).available, true);
  const next = await reserveReadingUpgrade(env, 'reader', c, 1, { ...input, operationId: crypto.randomUUID() });
  await completeReadingUpgrade(env, 'reader', next.chargeId, response(input));
  assert.equal(
    (await env.DB.prepare("SELECT COUNT(*) AS n FROM reading_upgrade_grants WHERE status='succeeded'").first()).n,
    1,
  );
});
test('an expired processing lease can be retried and late completion cannot consume the replacement', async () => {
  const { env, c, input } = await setup();
  const first = await reserveReadingUpgrade(env, 'reader', c, 1, input);
  await env.DB.prepare('UPDATE reading_upgrade_grants SET updated_at=?')
    .bind(Date.now() - 200000)
    .run();
  const next = await reserveReadingUpgrade(env, 'reader', c, 1, { ...input, operationId: crypto.randomUUID() });
  await assert.rejects(completeReadingUpgrade(env, 'reader', first.chargeId, response(input)), /charge_not_found/);
  await completeReadingUpgrade(env, 'reader', next.chargeId, response(input));
});
test('US upgrade skips wallet reservation and never uses a VN entitlement', async () => {
  const { env, c, input } = await setup({ market: 'US' });
  assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, input)).available, false);
  const claim = await reserveReadingUpgrade(env, 'reader', c, 1, input, 'US');
  assert.equal(claim.points, 0);
  assert.equal(claim.market, 'US');
  await completeReadingUpgrade(env, 'reader', claim.chargeId, response(input));
});
test('campaign migration is idempotent and a purchased bundle grants each member once', async () => {
  const { env } = await setup();
  const campaign = await env.DB.prepare('SELECT * FROM reading_upgrade_campaigns').first();
  await env.DB.prepare(
    `INSERT INTO service_unlock_operations
    (id,user_id,operation_id,request_hash,config_revision,module,service_id,offer_id,scope_key,members_json,credits_json,points,status,created_at,updated_at,market)
    VALUES('bundle','reader','bundle-op','hash',1,'numerology',?,'numerology','profile-scope',?,'[]',180,'succeeded',1,1,'VN')`,
  )
    .bind(serviceId, JSON.stringify([serviceId, 'numerology--destiny']))
    .run();
  await sql(env, migration());
  await sql(env, migration());
  assert.deepEqual(await env.DB.prepare('SELECT * FROM reading_upgrade_campaigns').first(), campaign);
  const rows = (
    await env.DB.prepare(
      "SELECT service_id,source_scope_key FROM reading_upgrade_grants WHERE source_kind='unlock' ORDER BY service_id",
    ).all()
  ).results;
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.source_scope_key === 'profile-scope'));
});
test('simultaneous upgrade requests claim only one entitlement', async () => {
  const { env, c, input } = await setup();
  const outcomes = await Promise.allSettled(
    [input, { ...input, operationId: crypto.randomUUID() }].map(b => reserveReadingUpgrade(env, 'reader', c, 1, b)),
  );
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(
    (await env.DB.prepare("SELECT COUNT(*) AS n FROM reading_upgrade_grants WHERE status='running'").first()).n,
    1,
  );
});
async function pagesScenario(opts = {}) {
  const { env, c, input } = await setup(opts);
  const { sessionCookie } = await import('./auth.mjs');
  const { internalFetch } = await import('./handler.mjs');
  const { state, publish, saveSecret } = await import('../admin/store.mjs');
  const { handleConfiguredAi } = await import('../admin/integration-api.mjs');
  env.APP_ORIGIN = 'https://theastrox.space';
  env.PROVIDER_ALLOWED_HOSTS = 'api.openai.com';
  env.ASTROX_BACKEND = { fetch: request => internalFetch(request, env) };
  c.ai.chain = ['upgrade'];
  c.ai.providers = [
    {
      id: 'upgrade',
      name: 'test',
      baseUrl: 'https://api.openai.com/v1',
      protocol: 'chat',
      model: 'fixture',
      enabled: true,
      secretRef: 'provider:upgrade',
      maxTokens: 8000,
      temperature: 0.5,
      retries: 0,
      timeoutMs: 1000,
    },
  ];
  await state(env);
  await publish(env, 'test', c, 0, 'upgrade test');
  await saveSecret(env, 'test', 'provider:upgrade', 'test-key');
  const cookie = (await sessionCookie(env, 'reader')).split(';')[0];
  const call = () =>
    handleConfiguredAi(
      new Request('https://theastrox.space/api/ai', {
        method: 'POST',
        headers: {
          cookie,
          origin: env.APP_ORIGIN,
          'content-type': 'application/json',
          'cf-connecting-ip': '203.0.113.40',
        },
        body: JSON.stringify({
          ...input,
          locale: 'vi',
          messages: [{ role: 'user', content: 'Original reading task' }],
        }),
      }),
      env,
    );
  return { env, c, input, call };
}
test('the Pages paid pipeline converts free, persists and replays without a wallet debit', async () => {
  const { env, input, call } = await pagesScenario();
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({
      choices: [
        {
          message: { content: JSON.stringify(JSON.parse(response(input).choices[0].message.content).report) },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    });
  };
  try {
    const first = await call();
    assert.equal(first.status, 200);
    assert.equal((await first.json()).chargedPoints, 0);
    const next = await call();
    assert.equal(next.status, 200);
    assert.equal((await next.json()).chargedPoints, 0);
    assert.equal(calls, 1);
    assert.equal(
      (await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='reader'").first()).balance,
      30,
    );
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM zalo_point_ledger').first()).n, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
test('an explicit ineligible conversion never falls back to a paid generation', async () => {
  const { env, call } = await pagesScenario({ future: true });
  await env.DB.prepare("UPDATE zalo_point_accounts SET balance=1000 WHERE user_id='reader'").run();
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error('provider must not run');
  };
  try {
    const result = await call();
    assert.equal(result.status, 403);
    assert.equal((await result.json()).code, 'upgrade_unavailable');
    assert.equal(calls, 0);
    assert.equal(
      (await env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='reader'").first()).balance,
      1000,
    );
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM zalo_point_ledger').first()).n, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
test('a previously free reading saved before the cutoff qualifies without a paid invoice, but later cache edits cannot add grants', async () => {
  const { env, c, input } = await setup({ future: true });
  await env.DB.prepare('DELETE FROM reading_upgrade_campaigns').run();
  const payload = {
    aiCache: {
      version: 2,
      profiles: {
        profileA: {
          numerologyTopics: {
            'life-path': { text: 'Original saved interpretation', module: 'numerology', topic: 'life-path' },
          },
        },
      },
    },
  };
  await env.DB.prepare("INSERT INTO user_data VALUES('reader',?,?)")
    .bind(JSON.stringify(payload), Date.now() - 100000)
    .run();
  await sql(env, migration());
  const q = await quoteReadingUpgrade(env, 'reader', c, 1, input);
  assert.equal(q.available, true);
  assert.equal(q.remaining, 1);
  const snapshot = await env.DB.prepare('SELECT entries_json FROM reading_upgrade_cache_snapshots').first();
  assert.ok(!snapshot.entries_json.includes('Original saved interpretation'), 'snapshot stores metadata only');
  payload.aiCache.profiles.profileA.numerologyTopics.destiny = {
    text: 'Added later',
    module: 'numerology',
    topic: 'destiny',
  };
  await env.DB.prepare("UPDATE user_data SET payload=?,updated_at=? WHERE user_id='reader'")
    .bind(JSON.stringify(payload), Date.now() + 1000)
    .run();
  await sql(env, migration());
  const next = {
    ...input,
    serviceId: 'numerology--destiny',
    promptDescriptor: wrapVisualPrompt(original, 'numerology--destiny', 'vi'),
  };
  assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, next)).available, false);
});
test('an old in-flight reading completed after migration still gets its conversion entitlement', async () => {
  const { env, c, input } = await setup({ status: 'running' });
  assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, input)).available, false);
  await env.DB.prepare("UPDATE backend_ai_operations SET status='succeeded'").run();
  assert.equal((await quoteReadingUpgrade(env, 'reader', c, 1, input)).available, true);
});
