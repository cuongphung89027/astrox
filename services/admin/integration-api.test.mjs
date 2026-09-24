import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnv } from './test/sqlite.mjs';
import { defaultConfig } from './config.ts';
import { state, publish, readPublished } from './store.mjs';
import { handlePublic, handleConfiguredAi, handleAdminRuntime } from './integration-api.mjs';
import { providerHealth } from './health-store.mjs';
const request = (path, body) =>
  new Request('https://theastrox.space' + path, {
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });
test('unpublished AI leaves legacy path intact and public config does not disclose drafts', async () => {
  const env = testEnv();
  await state(env);
  assert.equal(await handleConfiguredAi(request('/api/ai', {}), env), null);
  assert.equal((await (await handlePublic(request('/api/site-config'), env)).json()).config, null);
});
test('public config projection exposes only published version and no secrets', async () => {
  const env = testEnv();
  await state(env);
  const c = defaultConfig();
  c.content.announcement = 'published';
  c.integrations.payos.clientId = 'private';
  await publish(env, 'owner', c, 0, 'publish');
  const r = await handlePublic(request('/api/site-config'), env);
  const body = await r.json();
  assert.equal(body.config.content.announcement, 'published');
  assert.equal(body.config.integrations, undefined);
  assert.equal(body.revision, (await readPublished(env)).revision);
});
test('published disabled/draft AI cannot fall back to hard-coded provider', async () => {
  const env = testEnv();
  await state(env);
  await publish(env, 'owner', defaultConfig(), 0, 'publish');
  const res = await handleConfiguredAi(
    request('/api/ai', { serviceId: 'tuvi', messages: [{ role: 'user', content: 'test' }] }),
    env,
  );
  assert.equal(res.status, 503);
});
test('paid AI charges the backend wallet then runs locally, refunding on provider failure', async () => {
  const env = testEnv();
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.billing.enabled = true;
  c.billing.services[0].status = 'paid';
  c.billing.services[0].points = 10;
  await publish(env, 'owner', c, 0, 'publish');
  const calls = [];
  env.ASTROX_BACKEND = {
    fetch: async r => {
      const body = await r.json().catch(() => ({}));
      calls.push({ url: r.url, body });
      if (r.url.endsWith('/internal/ai/charge')) return Response.json({ ok: true, chargeId: 'c1', points: 10 });
      if (r.url.endsWith('/internal/ai/refund')) return Response.json({ ok: true });
      return Response.json({ owned: true });
    },
  };
  // Không có provider nào cấu hình → chain thất bại sau khi đã trừ Point.
  const failed = await handleConfiguredAi(
    request('/api/ai', {
      operationId: 'same-operation',
      serviceId: 'tuvi',
      messages: [{ role: 'user', content: 'test' }],
    }),
    env,
  );
  assert.equal(failed.status, 503);
  assert.ok(
    calls.some(x => x.url.endsWith('/internal/ai/charge') && x.body.serviceId === 'tuvi'),
    'charge phải sang worker với serviceId',
  );
  assert.ok(
    calls.some(x => x.url.endsWith('/internal/ai/refund') && x.body.chargeId === 'c1'),
    'chain lỗi phải hoàn Point',
  );
  // Backend từ chối trừ (402) → trả nguyên thông báo thiếu Point, không gọi chain.
  calls.length = 0;
  env.ASTROX_BACKEND = {
    fetch: async r => Response.json({ error: 'insufficient_points', needed: 10 }, { status: 402 }),
  };
  const poor = await handleConfiguredAi(
    request('/api/ai', {
      operationId: 'same-operation',
      serviceId: 'tuvi',
      messages: [{ role: 'user', content: 'test' }],
    }),
    env,
  );
  assert.equal(poor.status, 402);
  assert.equal((await poor.json()).code, 'insufficient_points');
});
test('provider health is persisted and reset across separate handlers', async () => {
  const env = testEnv();
  await providerHealth(env).recordFailure('a', 100);
  await providerHealth(env).recordFailure('a', 200);
  assert.deepEqual(await providerHealth(env).get('a'), { failures: 2, lastFailureAt: 200 });
  await providerHealth(env).recordSuccess('a');
  assert.equal(await providerHealth(env).get('a'), null);
});
test('integration readiness never pretends to validate real OAuth or payment', async () => {
  const env = testEnv();
  await state(env);
  const res = await handleAdminRuntime('integrations/zalo', request('/api/admin/integrations/zalo', {}), env, {
    email: 'owner',
    capabilities: ['secrets.write'],
  });
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.scope, 'configuration-only');
  assert.ok(data.checks.some(c => !c.ok));
});
test('AI disable cannot be bypassed by enabling billing', async () => {
  const env = testEnv();
  await state(env);
  const c = defaultConfig();
  c.billing.enabled = true;
  await publish(env, 'owner', c, 0, 'publish');
  let called = false;
  env.ASTROX_BACKEND = {
    fetch: async () => {
      called = true;
      return Response.json({});
    },
  };
  const r = await handleConfiguredAi(
    request('/api/ai', { operationId: 'op', serviceId: 'tuvi', messages: [{ role: 'user', content: 'test' }] }),
    env,
  );
  assert.equal(r.status, 503);
  assert.equal(called, false);
});
test('configured API rejects images and malformed messages before any backend handoff', async () => {
  const env = testEnv();
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.billing.enabled = true;
  c.billing.services[0].status = 'paid';
  c.billing.services[0].points = 10;
  await publish(env, 'owner', c, 0, 'publish');
  let called = false;
  env.ASTROX_BACKEND = {
    fetch: async () => {
      called = true;
      return Response.json({});
    },
  };
  for (const messages of [
    null,
    {},
    [null],
    [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'https://example.com/image.png' } }] }],
  ]) {
    const r = await handleConfiguredAi(request('/api/ai', { serviceId: 'tuvi', messages }), env);
    assert.equal(r.status, 400);
  }
  assert.equal(called, false);
});
test('authority handoff strips spoofed headers and includes published revision', async () => {
  const env = testEnv();
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.billing.enabled = true;
  c.billing.services[0].status = 'paid';
  c.billing.services[0].points = 10;
  await publish(env, 'owner', c, 0, 'publish');
  let captured;
  env.ASTROX_BACKEND = {
    fetch: async r => {
      captured = r;
      return Response.json({});
    },
  };
  const r = new Request('https://theastrox.space/api/ai', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-actor': 'fake',
      'x-internal-authorized': 'yes',
      cookie: 'astrox_session=user',
    },
    body: JSON.stringify({
      operationId: 'same-operation',
      serviceId: 'tuvi',
      messages: [{ role: 'user', content: 'test' }],
    }),
  });
  await handleConfiguredAi(r, env);
  assert.equal(captured.headers.get('x-admin-actor'), null);
  assert.equal(captured.headers.get('x-internal-authorized'), null);
  assert.equal(captured.headers.get('x-astrox-config-revision'), '1');
  assert.equal(captured.headers.get('cookie'), 'astrox_session=user');
});
test('free AI stays local when topups are enabled and persists sanitized metrics', async () => {
  const { saveSecret } = await import('./store.mjs');
  const env = testEnv();
  env.PROVIDER_ALLOWED_HOSTS = 'api.example.com';
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.billing.enabled = true;
  c.ai.chain = ['gateway'];
  c.billing.services[0].status = 'free';
  c.ai.providers = [
    {
      id: 'gateway',
      name: 'Gateway',
      model: 'test-model',
      protocol: 'chat',
      baseUrl: 'https://api.example.com/v1',
      enabled: true,
      timeoutMs: 1000,
      retries: 0,
      maxTokens: 100,
      temperature: 0.5,
      secretRef: 'provider:gateway',
      pricing: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 0 },
    },
  ];
  await saveSecret(env, 'owner', 'provider:gateway', 'secret-never-log');
  await publish(env, 'owner', c, 0, 'metrics test');
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      choices: [{ message: { content: 'private response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 60 } },
    });
  try {
    const response = await handleConfiguredAi(
      request('/api/ai', { serviceId: 'tuvi', messages: [{ role: 'user', content: 'private prompt' }] }),
      env,
    );
    assert.equal(response.status, 200);
    const row = await env.DB.prepare('SELECT * FROM admin_ai_requests').first();
    const attempt = JSON.parse(row.attempts)[0];
    assert.equal(attempt.model, 'test-model');
    assert.equal(attempt.usage.input, 100);
    assert.equal(attempt.usage.cacheRead, 60);
    assert.ok(attempt.durationMs >= 0);
    assert.ok(attempt.costUsd > 0);
    assert.ok(!JSON.stringify(row).includes('private'));
    assert.ok(!JSON.stringify(row).includes('secret-never-log'));
  } finally {
    globalThis.fetch = original;
  }
});
test('published leaf templates override client prose and engine switch blocks provider', async () => {
  const { saveSecret } = await import('./store.mjs');
  const env = testEnv();
  env.PROVIDER_ALLOWED_HOSTS = 'api.example.com';
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.ai.chain = ['a'];
  c.ai.providers = [
    {
      id: 'a',
      name: 'A',
      model: 'model',
      protocol: 'chat',
      baseUrl: 'https://api.example.com/v1',
      enabled: true,
      timeoutMs: 1000,
      retries: 0,
      maxTokens: 100,
      temperature: 0.5,
      secretRef: 'provider:a',
    },
  ];
  const id = 'tuvi--tim-hieu-ban-than--tinh-cach';
  c.billing.services.find(s => s.id === 'tuvi').status = 'free';
  c.billing.services.find(s => s.id === id).status = 'free';
  c.prompts.tasks[id] = 'Published task';
  await saveSecret(env, 'owner', 'provider:a', 'test');
  await publish(env, 'owner', c, 0, 'test');
  let sent,
    calls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    calls++;
    sent = JSON.parse(o.body);
    return Response.json({ choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }] });
  };
  const input = {
    serviceId: id,
    compact: true,
    promptDescriptor: {
      id: 'tuvi.tuviPromptBody.0',
      values: ['PROFILE', { id: 'tuvi.ziweiContextText.0', values: ['{"palaces":["Mệnh"]}'] }, 'client task'],
    },
    messages: [
      { role: 'system', content: 'CLIENT_SYSTEM' },
      { role: 'user', content: 'CLIENT_PROSE' },
    ],
  };
  try {
    const r = await handleConfiguredAi(request('/api/ai', input), env);
    assert.equal(r.status, 200);
    const text = JSON.stringify(sent);
    assert.ok(text.includes('Published task'));
    assert.ok(text.includes('Mệnh'));
    assert.ok(text.includes('150 từ'));
    assert.ok(!text.includes('CLIENT_PROSE'));
    assert.ok(!text.includes('CLIENT_SYSTEM'));
    c.engines.iztro.enabled = false;
    await publish(env, 'owner', c, 1, 'disable');
    const blocked = await handleConfiguredAi(request('/api/ai', input), env);
    assert.equal(blocked.status, 403);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test('changed paid price or free-to-paid change cannot charge without new confirmation', async () => {
  const env = testEnv();
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.billing.enabled = true;
  c.billing.services[0].status = 'paid';
  c.billing.services[0].points = 10;
  await publish(env, 'owner', c, 0, 'publish');
  let calls = 0;
  env.ASTROX_BACKEND = {
    fetch: async () => {
      calls++;
      return Response.json({});
    },
  };
  for (const expectedPoints of [0, 5]) {
    const r = await handleConfiguredAi(
      request('/api/ai', {
        serviceId: 'tuvi',
        operationId: 'price-test',
        expectedPoints,
        messages: [{ role: 'user', content: 'test' }],
      }),
      env,
    );
    assert.equal(r.status, 409);
    assert.equal((await r.json()).code, 'price_changed');
  }
  assert.equal(calls, 0);
});
test('blocked price and rate outcomes persist separately from provider failures', async () => {
  const env = testEnv();
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.billing.enabled = true;
  c.billing.services[0].status = 'paid';
  c.billing.services[0].points = 10;
  await publish(env, 'owner', c, 0, 'metrics');
  env.AI_IP_PER_MINUTE = 1;
  const input = {
    serviceId: 'tuvi',
    operationId: 'metrics-operation',
    expectedPoints: 0,
    messages: [{ role: 'user', content: 'test' }],
  };
  assert.equal((await handleConfiguredAi(request('/api/ai', input), env)).status, 409);
  assert.equal((await handleConfiguredAi(request('/api/ai', input), env)).status, 429);
  const rows = (await env.DB.prepare('SELECT status,attempts FROM admin_ai_requests ORDER BY created_at').all())
    .results;
  assert.deepEqual(
    rows.map(r => r.status),
    ['price_changed', 'rate_limited'],
  );
  assert.ok(rows.every(r => r.attempts === '[]'));
});
