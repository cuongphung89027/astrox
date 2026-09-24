import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnv } from './test/sqlite.mjs';
test('persistent quota allows only six concurrent calls per IP/minute across instances', async () => {
  const { limitAi } = await import('./ai-rate-limit.mjs');
  const env = testEnv();
  const req = () =>
    new Request('https://theastrox.space/api/ai', {
      headers: { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': crypto.randomUUID() },
    });
  const results = await Promise.all(Array.from({ length: 12 }, () => limitAi(req(), { ...env }, 60000)));
  assert.equal(results.filter(r => r === null).length, 6);
  for (const r of results.filter(Boolean)) {
    assert.equal(r.status, 429);
    assert.equal(r.headers.get('retry-after'), '60');
  }
  assert.equal(await limitAi(req(), env, 120000), null);
  const stored = JSON.stringify((await env.DB.prepare('SELECT * FROM ai_rate_limits').all()).results);
  assert.ok(!stored.includes('203.0.113.7'));
});
test('missing/unavailable quota storage fails closed, missing IP shares a bucket', async () => {
  const { limitAi } = await import('./ai-rate-limit.mjs');
  const req = new Request('https://theastrox.space/api/ai');
  assert.equal((await limitAi(req, {})).status, 503);
  const env = testEnv();
  for (let i = 0; i < 6; i++) assert.equal(await limitAi(req, env), null);
  assert.equal((await limitAi(req, env)).status, 429);
});
test('both published free AI and unpublished legacy route enforce the shared quota before provider calls', async () => {
  const { handleConfiguredAi } = await import('./integration-api.mjs');
  const { defaultConfig } = await import('./config.ts');
  const { state, publish } = await import('./store.mjs');
  const { onRequestPost } = await import('../../functions/api/ai.js');
  for (const published of [false, true]) {
    const env = testEnv();
    await state(env);
    if (published) {
      const c = defaultConfig();
      c.ai.enabled = true;
      c.billing.services[0].status = 'free';
      await publish(env, 'owner', c, 0, 'test');
    }
    const req = () =>
      new Request('https://theastrox.space/api/ai', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '203.0.113.8' },
        body: JSON.stringify({ serviceId: 'tuvi', messages: [{ role: 'user', content: 'test' }] }),
      });
    const run = () => (published ? handleConfiguredAi(req(), env) : onRequestPost({ request: req(), env }));
    for (let i = 0; i < 6; i++) assert.notEqual((await run()).status, 429);
    assert.equal((await run()).status, 429);
  }
});
