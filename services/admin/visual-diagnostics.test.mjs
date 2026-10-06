import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig } from './config.ts';
import { wrapVisualPrompt, visualInput, readVisualReading } from './visual-reading.ts';
import { executeProviderChain } from './runtime.mjs';
import { fixture, original, serviceId } from '../../web/tests/support/visual-fixtures.mjs';

const privateText = 'private-customer-text-never-log-72641';
const privateKey = 'provider-api-key-never-log-93752';
const foreignKey = 'arbitrary-provider-property-never-log-31529';
const allowedDiagnosticKeys = new Set([
  'reason',
  'format',
  'min',
  'max',
  'length',
  'missingKeys',
  'extraKeysCount',
]);
const knownSchemaKeys = new Set([
  'schemaVersion',
  'module',
  'serviceId',
  'locale',
  'title',
  'summary',
  'chapters',
  'id',
  'visual',
  'insights',
  'kind',
  'factIds',
  'signals',
  'axisId',
  'lean',
  'insightId',
  'role',
  'label',
  'detail',
  'rationale',
  'example',
  'action',
  'terms',
  'sourceFactIds',
  'term',
  'explanation',
]);

function visualFixture() {
  const descriptor = wrapVisualPrompt(original, serviceId, 'en');
  const input = visualInput(descriptor, serviceId, 'en');
  return { descriptor, report: fixture(input) };
}

async function runProvider(descriptor, content, finishReason = 'stop') {
  const config = defaultConfig();
  config.ai.enabled = true;
  config.ai.chain = ['diagnostics'];
  config.ai.providers = [
    {
      id: 'diagnostics',
      enabled: true,
      baseUrl: 'https://api.openai.com/v1',
      protocol: 'chat',
      model: 'fixture',
      secretRef: 'provider:diagnostics',
      maxTokens: 8000,
      temperature: 0.5,
      retries: 0,
      timeoutMs: 1000,
    },
  ];
  let calls = 0;
  try {
    const result = await executeProviderChain(
      config,
      {
        serviceId,
        locale: 'en',
        promptDescriptor: descriptor,
        messages: [{ role: 'user', content: 'Return the visual report for this test fixture.' }],
      },
      async () => privateKey,
      {
        allowHosts: ['api.openai.com'],
        fetchImpl: async () => {
          calls++;
          return Response.json({ choices: [{ message: { content }, finish_reason: finishReason }] });
        },
      },
    );
    return { result, calls };
  } catch (error) {
    return { error, calls };
  }
}

function assertSafeDiagnostics(error, expectedReason) {
  assert.equal(error?.code, 'VISUAL_READING_INVALID');
  assert.equal(error.attempts.length, 1);
  const diagnostic = error.attempts[0].visualValidation;
  assert.ok(diagnostic && typeof diagnostic === 'object', 'the rejected provider attempt needs visual diagnostics');
  assert.equal(diagnostic.reason, expectedReason);
  assert.ok(Object.keys(diagnostic).every(k => allowedDiagnosticKeys.has(k)), 'diagnostics use a bounded metadata shape');
  for (const key of diagnostic.missingKeys ?? [])
    assert.ok(knownSchemaKeys.has(key), 'missingKeys may contain only known schema names');
  const metadata = JSON.stringify({ code: error.code, attempts: error.attempts });
  for (const secret of [privateText, privateKey, foreignKey])
    assert.equal(metadata.includes(secret), false, 'validation metadata must not echo private text or arbitrary keys');
  return diagnostic;
}

test('visual diagnostics fixture reaches the public provider runtime and still saves a valid report', async () => {
  const { descriptor, report } = visualFixture();
  const outcome = await runProvider(descriptor, JSON.stringify(report));
  assert.ifError(outcome.error);
  assert.equal(outcome.calls, 1);
  assert.equal(readVisualReading(outcome.result.choices[0].message.content).report.serviceId, serviceId);
});

test('visual validation identifies fenced JSON without echoing the provider response', async () => {
  const { descriptor, report } = visualFixture();
  report.summary = privateText;
  const outcome = await runProvider(descriptor, `\`\`\`json\n${JSON.stringify(report)}\n\`\`\``);
  assert.equal(outcome.calls, 1);
  const diagnostic = assertSafeDiagnostics(outcome.error, 'json_syntax');
  assert.equal(diagnostic.format, 'fenced-json');
});

test('visual validation identifies malformed JSON without recording raw private text', async () => {
  const { descriptor } = visualFixture();
  const outcome = await runProvider(descriptor, `{"summary":"${privateText}","chapters":[`);
  assert.equal(outcome.calls, 1);
  assertSafeDiagnostics(outcome.error, 'json_syntax');
});

test('visual validation distinguishes truncated provider output from report validation errors', async () => {
  const { descriptor, report } = visualFixture();
  const outcome = await runProvider(descriptor, JSON.stringify(report), 'length');
  assert.equal(outcome.calls, 1);
  assertSafeDiagnostics(outcome.error, 'truncated');
});

test('visual validation identifies duplicate insight IDs', async () => {
  const { descriptor, report } = visualFixture();
  report.chapters[0].insights[1].id = report.chapters[0].insights[0].id;
  const outcome = await runProvider(descriptor, JSON.stringify(report));
  assert.equal(outcome.calls, 1);
  assertSafeDiagnostics(outcome.error, 'insight_id');
});

test('visual validation identifies absent required spectrum signals', async () => {
  const { descriptor, report } = visualFixture();
  delete report.chapters[0].visual.signals;
  const outcome = await runProvider(descriptor, JSON.stringify(report));
  assert.equal(outcome.calls, 1);
  assertSafeDiagnostics(outcome.error, 'signals');
});

for (const [name, detail, expectedLength] of [
  ['short', 'Brief.', 6],
  ['long', 'a'.repeat(2501), 2501],
])
  test(`visual validation identifies ${name} prose using bounds and length without logging text`, async () => {
    const { descriptor, report } = visualFixture();
    report.chapters[0].insights[0].detail = detail;
    const outcome = await runProvider(descriptor, JSON.stringify(report));
    assert.equal(outcome.calls, 1);
    const diagnostic = assertSafeDiagnostics(outcome.error, 'text_length');
    assert.equal(diagnostic.min, 80);
    assert.equal(diagnostic.max, 2500);
    assert.equal(diagnostic.length, expectedLength);
  });

test('visual validation identifies foreign evidence references without echoing the reference', async () => {
  const { descriptor, report } = visualFixture();
  report.chapters[0].insights[0].sourceFactIds = [privateText];
  const outcome = await runProvider(descriptor, JSON.stringify(report));
  assert.equal(outcome.calls, 1);
  assertSafeDiagnostics(outcome.error, 'evidence_refs');
});

test('visual validation identifies shallow reports whose individual fields satisfy their length bounds', async () => {
  const { descriptor, report } = visualFixture();
  for (const chapter of report.chapters)
    for (const insight of chapter.insights) {
      insight.summary = 'Connect one clue with a practical choice.';
      insight.detail =
        'Reflect on the situation before choosing a practical step. Consider one simple action and review the result.';
      insight.rationale = 'The calculated number is one traditional clue, rather than proof of personal events.';
      insight.example = 'In a new project, compare two small options first.';
      insight.action = 'Try one small option and write down the result.';
    }
  const words = report.chapters
    .flatMap(c => c.insights)
    .flatMap(i => [i.summary, i.detail, i.rationale, i.example, i.action])
    .join(' ')
    .trim()
    .split(/\s+/).length;
  assert.ok(words < 600);
  const outcome = await runProvider(descriptor, JSON.stringify(report));
  assert.equal(outcome.calls, 1);
  const diagnostic = assertSafeDiagnostics(outcome.error, 'depth');
  assert.equal(diagnostic.min, 600);
  assert.equal(diagnostic.length, words);
});

test('visual validation reports only an extra-key count for arbitrary provider properties', async () => {
  const { descriptor, report } = visualFixture();
  report[foreignKey] = { raw: privateText, credential: privateKey };
  const outcome = await runProvider(descriptor, JSON.stringify(report));
  assert.equal(outcome.calls, 1);
  const diagnostic = assertSafeDiagnostics(outcome.error, 'object_keys');
  assert.equal(diagnostic.extraKeysCount, 1);
});

test('visual validation missing-key metadata contains only the known schema key', async () => {
  const { descriptor, report } = visualFixture();
  delete report.chapters[0].insights[0].example;
  const outcome = await runProvider(descriptor, JSON.stringify(report));
  assert.equal(outcome.calls, 1);
  const diagnostic = assertSafeDiagnostics(outcome.error, 'object_keys');
  assert.deepEqual(diagnostic.missingKeys, ['example']);
});
