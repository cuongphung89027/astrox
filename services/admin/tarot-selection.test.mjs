import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnv } from './test/sqlite.mjs';
import { defaultConfig } from './config.ts';
import { state, publish, saveSecret } from './store.mjs';
import { limitAi } from './ai-rate-limit.mjs';
import { handleTarotSelection, makeDecisionRequest, validateDecision } from './tarot-selection.mjs';

const keys = [
  'one',
  'three_ppf',
  'three_sao',
  'three_soa',
  'cross5',
  'relationship5',
  'celtic10',
  'needs_context',
  'unsupported_comparison',
];
function decision(choice = 'three_sao', options = keys) {
  return {
    model: 'jev-1.13.0',
    answers: {
      spread: {
        type: 'choice',
        choice,
        confidence: 0.9,
        probabilities: Object.fromEntries(options.map(k => [k, k === choice ? 1 : 0])),
      },
    },
    usage: { input_tokens: 800, output_tokens: 20 },
  };
}
const request = (
  body = { question: 'Tôi vừa nhận một công việc mới. Nên bắt đầu từ đâu?', locale: 'vi', market: 'VN' },
  headers = {},
) =>
  new Request('https://theastrox.space/api/tarot/select', {
    method: 'POST',
    headers: {
      origin: 'https://theastrox.space',
      'content-type': 'application/json',
      'cf-connecting-ip': '192.0.2.21',
      ...headers,
    },
    body: JSON.stringify(body),
  });
async function setup(change = () => {}) {
  const env = { ...testEnv(), PROVIDER_ALLOWED_HOSTS: 'api.b.ai' };
  await state(env);
  const config = defaultConfig();
  config.ai.enabled = true;
  config.ai.providers = [
    {
      id: 'bai',
      name: 'B.AI',
      baseUrl: 'https://api.b.ai/v1',
      protocol: 'chat',
      model: 'some-reading-model',
      enabled: true,
      secretRef: 'bai:key',
      models: [],
    },
  ];
  for (const s of config.billing.services.filter(s => s.module === 'tarot')) s.status = 'paid';
  change(config);
  await publish(env, 'test', config, 0, 'fixture');
  await saveSecret(env, 'test', 'bai:key', 'test-key-not-a-real-credential');
  return env;
}
test('decision describes complexity/context and limits answers to published configurations', () => {
  const body = makeDecisionRequest(
    { question: 'Công việc tôi yêu thích', context: 'Tôi đang chuyển ngành', locale: 'vi' },
    ['one', 'three_sao'],
  );
  assert.equal(body.model, 'jev-1.13.0');
  assert.equal(body.state.context, 'Tôi đang chuyển ngành');
  assert.deepEqual(Object.keys(body.questions.spread.criteria), [
    'one',
    'three_sao',
    'needs_context',
    'unsupported_comparison',
  ]);
  assert.match(body.questions.spread.instructions, /complexity/i);
  assert.match(body.questions.spread.instructions, /length/i);
});
test('validates IDs, probabilities, usage and semantic clarification without inventing accuracy', () => {
  assert.deepEqual(validateDecision(decision(), keys), {
    status: 'selected',
    spreadId: 'three',
    frameId: 'sao',
    reasonCode: 'action',
    source: 'jev',
  });
  assert.equal(validateDecision(decision('needs_context'), keys).status, 'needs_context');
  for (const modify of [
    d => (d.answers.spread.choice = 'unknown'),
    d => (d.answers.spread.probabilities.one = 0.5),
    d => delete d.answers.spread.probabilities.one,
    d => (d.answers.spread.confidence = 2),
    d => (d.usage.input_tokens = -1),
    d => (d.answers.spread.type = 'noul'),
  ]) {
    const d = decision();
    modify(d);
    assert.throws(() => validateDecision(d, keys));
  }
});
test('uses B.AI Decisions and returns only selection, without wallet or reading calls', async () => {
  const env = await setup();
  let calls = 0;
  const result = await handleTarotSelection(request(), env, {
    fetchImpl: async (url, init) => {
      calls++;
      assert.equal(url, 'https://api.b.ai/v1/decisions');
      // workerd rejects redirect:error before sending a request; manual must reject 3xx below.
      assert.equal(init.redirect, 'manual');
      assert.equal(init.headers.Authorization, 'Bearer test-key-not-a-real-credential');
      assert.equal(JSON.parse(init.body).model, 'jev-1.13.0');
      return Response.json(decision());
    },
  });
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.frameId, 'sao');
  assert.equal(body.source, 'jev');
  assert.equal(body.confidence, undefined);
  assert.equal(body.usage, undefined);
  assert.equal(calls, 1);
  const logs = (await env.DB.prepare('SELECT * FROM admin_ai_requests').all()).results;
  assert.equal(logs.length, 1);
  assert.ok(!JSON.stringify(logs).includes('công việc mới'));
});
test('blank question selects one card without calling JEV', async () => {
  const env = await setup();
  const r = await handleTarotSelection(request({ question: ' ', locale: 'vi' }), env, {
    fetchImpl: () => {
      throw Error('must not call');
    },
  });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).spreadId, 'one');
});
test('rejects untrusted origin, oversized or invalid input before inference', async () => {
  const env = await setup();
  for (const [req, code] of [
    [request({}, { origin: 'https://evil.example' }), 403],
    [request({ question: 'x'.repeat(2001) }), 400],
    [request({ question: 'hi', model: 'override' }), 400],
    [request({ question: 'hi', locale: 'xx' }), 400],
    [request({ question: 'hi' }, { 'content-length': '99000' }), 413],
  ])
    assert.equal((await handleTarotSelection(req, env)).status, code);
});
test('honors published maintenance, engine, provider and host availability', async () => {
  for (const change of [
    c => (c.operations.maintenance = true),
    c => (c.ai.enabled = false),
    c => (c.engines.tarot.enabled = false),
    c => (c.ai.providers[0].enabled = false),
    c => (c.billing.services.find(s => s.id === 'tarot').status = 'maintenance'),
    c => (c.ai.providers[0].baseUrl = 'https://api.b.ai.evil.example/v1'),
  ]) {
    const env = await setup(change);
    assert.notEqual(
      (
        await handleTarotSelection(request(), env, {
          fetchImpl: () => {
            throw Error('must not call');
          },
        })
      ).status,
      200,
    );
  }
  const env = await setup();
  env.PROVIDER_ALLOWED_HOSTS = '';
  assert.equal((await handleTarotSelection(request(), env)).status, 503);
});
test('market-specific disabled candidates cannot be selected', async () => {
  const env = await setup(c => (c.billing.usServices = { 'tarot--celtic10': { status: 'maintenance' } }));
  let allowed;
  const r = await handleTarotSelection(request({ question: 'A complex question', locale: 'en', market: 'US' }), env, {
    fetchImpl: async (_, init) => {
      allowed = Object.keys(JSON.parse(init.body).questions.spread.criteria);
      return Response.json(decision('celtic10'));
    },
  });
  assert.ok(!allowed.includes('celtic10'));
  assert.equal(r.status, 502);
});
test('provider 429/non-JSON, invalid response and timeout are recoverable and never retried', async () => {
  for (const [fetchImpl, status] of [
    [async () => new Response('', { status: 429 }), 429],
    [async () => Response.json({ answers: {} }), 502],
    [
      async (_, init) =>
        new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))),
      504,
    ],
  ]) {
    let calls = 0;
    const env = await setup();
    const r = await handleTarotSelection(request(), env, {
      fetchImpl: (...args) => {
        calls++;
        return fetchImpl(...args);
      },
      timeoutMs: 15,
    });
    assert.equal(r.status, status);
    assert.equal(calls, 1);
  }
});
test('selection quota is bounded and independent from paid reading quota', async () => {
  const env = await setup();
  for (let n = 0; n < 6; n++)
    assert.equal(
      (await handleTarotSelection(request(), env, { fetchImpl: async () => Response.json(decision()) })).status,
      200,
    );
  assert.equal((await handleTarotSelection(request(), env)).status, 429);
  assert.equal(await limitAi(request(), env), null);
});

test('provider redirects are rejected without following the credential to another host', async () => {
  const env = await setup();
  let calls = 0;
  const response = await handleTarotSelection(request(), env, {
    fetchImpl: async (_url, init) => {
      calls++;
      assert.equal(init.redirect, 'manual');
      return new Response(null, { status: 302, headers: { location: 'https://unexpected.example/decisions' } });
    },
  });
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
});
