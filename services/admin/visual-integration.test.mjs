import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnv } from './test/sqlite.mjs';
import { state, publish, saveSecret } from './store.mjs';
import { defaultConfig } from './config.ts';
import { handleConfiguredAi } from './integration-api.mjs';
import { wrapVisualPrompt, visualInput, readVisualReading } from './visual-reading.ts';
import { original, serviceId, fixture } from '../../web/tests/support/visual-fixtures.mjs';
test('configured paid visual reading completes only valid snapshots and refunds invalid JSON', async () => {
  for (const bad of [false, true]) {
    const env = testEnv();
    env.PROVIDER_ALLOWED_HOSTS = 'api.example.com';
    await state(env);
    const c = defaultConfig();
    c.ai.enabled = true;
    c.billing.enabled = true;
    c.ai.chain = ['visual'];
    Object.assign(
      c.billing.services.find(s => s.id === serviceId),
      { status: 'paid', points: 10 },
    );
    c.billing.services.find(s => s.id === 'numerology').status = 'free';
    c.engines.numerology.enabled = true;
    c.ai.providers = [
      {
        id: 'visual',
        name: 'Visual',
        model: 'fixture',
        protocol: 'chat',
        baseUrl: 'https://api.example.com/v1',
        enabled: true,
        timeoutMs: 1000,
        retries: 0,
        maxTokens: 8000,
        temperature: 0.5,
        secretRef: 'provider:visual',
      },
    ];
    await saveSecret(env, 'owner', 'provider:visual', 'fixture-secret');
    await publish(env, 'owner', c, 0, 'test');
    const descriptor = wrapVisualPrompt(original, serviceId, 'vi'),
      input = visualInput(descriptor, serviceId, 'vi'),
      operations = [];
    let stored;
    env.ASTROX_BACKEND = {
      fetch: async r => {
        const path = new URL(r.url).pathname.split('/').at(-1);
        operations.push(path);
        if (path === 'charge') return Response.json({ ok: true, chargeId: 'visual-charge', points: 10 });
        if (path === 'complete') stored = await r.json();
        return Response.json({ ok: true });
      },
    };
    const oldFetch = globalThis.fetch;
    let count = 0;
    globalThis.fetch = async () => {
      count++;
      return Response.json({
        choices: [
          {
            message: { content: bad ? 'Không đúng cấu trúc báo cáo.' : JSON.stringify(fixture(input)) },
            finish_reason: 'stop',
          },
        ],
      });
    };
    try {
      const response = await handleConfiguredAi(
        new Request('https://theastrox.space/api/ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceId,
            locale: 'vi',
            promptDescriptor: descriptor,
            operationId: 'visual-operation',
            expectedPoints: 10,
            messages: [{ role: 'user', content: 'Client preview' }],
          }),
        }),
        env,
      );
      assert.equal(response.status, bad ? 502 : 200, await response.clone().text());
      assert.equal(count, 1);
      assert.deepEqual(operations, bad ? ['charge', 'refund'] : ['charge', 'complete']);
      if (!bad) {
        const saved = readVisualReading(stored.response.choices[0].message.content);
        assert.equal(saved.snapshot.facts[0].value, 5);
        assert.equal(saved.report.serviceId, serviceId);
      } else assert.equal((await response.json()).code, 'operation_refunded');
      const rows = (await env.DB.prepare('SELECT attempts FROM admin_ai_requests').all()).results;
      assert.ok(!JSON.stringify(rows).includes('fixture-secret'));
      assert.ok(!JSON.stringify(rows).includes('Số chủ đạo'));
    } finally {
      globalThis.fetch = oldFetch;
    }
  }
});
