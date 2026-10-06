import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig } from './config.ts';
import { renderServicePrompt, defaultPromptSettings } from './prompt-engine.ts';
import { defaultEnglishPromptSettings } from './english-prompts.ts';
import { wrapVisualPrompt, visualInput, readVisualReading, VISUAL_FORMAT_ADAPTER } from './visual-reading.ts';
import { executeProviderChain } from './runtime.mjs';
import { fixture, original, serviceId } from '../../web/tests/support/visual-fixtures.mjs';
import { scopeForReading } from '../backend/service-unlocks.mjs';
for (const locale of ['vi', 'en'])
  test(`deep ${locale} contract uses evidence and preserves original prompt settings`, () => {
    const settings = locale === 'en' ? defaultEnglishPromptSettings() : defaultPromptSettings();
    const old = renderServicePrompt(original, serviceId, settings, { locale });
    const wrapped = wrapVisualPrompt(original, serviceId, locale);
    const prompt = renderServicePrompt(wrapped, serviceId, settings, { locale });
    assert.ok(prompt.includes(old));
    assert.match(prompt, /900–1500/);
    assert.match(prompt, /sourceFactIds/);
    assert.match(prompt, /example/);
    assert.match(prompt, /explanation/);
    assert.equal(renderServicePrompt(original, serviceId, settings, { locale }), old);
  });
test('native compat wrapper preserves existing pair purchase scope', async () => {
  const n = {
    id: 'zodiac.compatPrompt.0',
    values: [
      'An',
      'Bạch Dương',
      'Aries',
      'Hoả',
      '',
      '',
      '',
      'Sư Tử',
      'Leo',
      'Hoả',
      '',
      '',
      '',
      '120',
      'tam hợp',
      'đồng hành',
      'cùng nguyên tố',
      '80',
      '80',
    ],
  };
  assert.deepEqual(
    await scopeForReading('compat--pair', wrapVisualPrompt(n, 'compat--pair', 'vi')),
    await scopeForReading('compat--pair', n),
  );
});
test('runtime puts format adapter after old system instructions and saves validated immutable snapshot', async () => {
  const config = defaultConfig();
  config.ai.enabled = true;
  config.ai.providers = [
    {
      id: 'a',
      enabled: true,
      baseUrl: 'https://api.openai.com/v1',
      protocol: 'chat',
      model: 'test',
      secretRef: 'provider:a',
      maxTokens: 8000,
      temperature: 0.7,
      retries: 0,
      timeoutMs: 1000,
    },
  ];
  config.ai.chain = ['a'];
  const descriptor = wrapVisualPrompt(original, serviceId, 'vi'),
    input = visualInput(descriptor, serviceId, 'vi');
  let calls = 0;
  const result = await executeProviderChain(
    config,
    {
      serviceId,
      locale: 'vi',
      promptDescriptor: descriptor,
      messages: [
        { role: 'system', content: 'Use **bold** and 150 words.' },
        { role: 'user', content: renderServicePrompt(descriptor, serviceId, config.prompts) },
      ],
    },
    async () => 'test-key',
    {
      allowHosts: ['api.openai.com'],
      fetchImpl: async (_u, o) => {
        calls++;
        const b = JSON.parse(o.body);
        assert.equal(b.max_tokens, 8000);
        assert.equal(b.messages.filter(m => m.role === 'system').at(-1).content, VISUAL_FORMAT_ADAPTER.vi);
        return Response.json({
          choices: [{ message: { content: JSON.stringify(fixture(input)) }, finish_reason: 'stop' }],
        });
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(readVisualReading(result.choices[0].message.content).report.serviceId, serviceId);
  for (const [content, finish_reason] of [
    ['bad', 'stop'],
    [JSON.stringify(fixture(input)), 'length'],
  ])
    await assert.rejects(
      executeProviderChain(
        config,
        { serviceId, locale: 'vi', promptDescriptor: descriptor, messages: [{ role: 'user', content: 'test' }] },
        async () => 'test-key',
        {
          allowHosts: ['api.openai.com'],
          fetchImpl: async () => Response.json({ choices: [{ message: { content }, finish_reason }] }),
        },
      ),
      e => e.code === 'VISUAL_READING_INVALID',
    );
});
for (const protocol of ['chat', 'responses', 'anthropic'])
  test(`English visual contract is enforced through ${protocol}`, async () => {
    const config = defaultConfig();
    config.ai.enabled = true;
    config.ai.chain = ['visual'];
    config.ai.providers = [
      {
        id: 'visual',
        enabled: true,
        baseUrl: 'https://api.openai.com/v1',
        protocol,
        model: 'fixture',
        secretRef: 'provider:visual',
        maxTokens: 8000,
        temperature: 0.5,
        retries: 0,
        timeoutMs: 1000,
      },
    ];
    const descriptor = wrapVisualPrompt(original, serviceId, 'en'),
      input = visualInput(descriptor, serviceId, 'en');
    let calls = 0;
    const result = await executeProviderChain(
      config,
      {
        serviceId,
        locale: 'en',
        promptDescriptor: descriptor,
        messages: [
          { role: 'system', content: 'Use **bold**.' },
          {
            role: 'user',
            content: renderServicePrompt(descriptor, serviceId, defaultEnglishPromptSettings(), { locale: 'en' }),
          },
        ],
      },
      async () => 'fixture-secret',
      {
        allowHosts: ['api.openai.com'],
        fetchImpl: async (_u, options) => {
          calls++;
          const body = JSON.parse(options.body);
          assert.equal(body.max_tokens ?? body.max_output_tokens, 8000);
          if (protocol === 'anthropic') assert.ok(body.system.endsWith(VISUAL_FORMAT_ADAPTER.en));
          else
            assert.equal(
              (body.messages ?? body.input).filter(m => m.role === 'system').at(-1).content,
              VISUAL_FORMAT_ADAPTER.en,
            );
          const text = JSON.stringify(fixture(input));
          return Response.json(
            protocol === 'chat'
              ? { choices: [{ message: { content: text }, finish_reason: 'stop' }] }
              : protocol === 'responses'
                ? {
                    status: 'completed',
                    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }],
                  }
                : { stop_reason: 'end_turn', content: [{ type: 'text', text }] },
          );
        },
      },
    );
    assert.equal(calls, 1);
    assert.equal(readVisualReading(result.choices[0].message.content).report.locale, 'en');
  });
