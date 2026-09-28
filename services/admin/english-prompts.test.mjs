import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGLISH_TEMPLATES,
  ENGLISH_TASKS,
  ENGLISH_SYSTEM_PROMPT,
  defaultEnglishPromptSettings,
} from './english-prompts.ts';
import { originalTasks, PROMPT_TEMPLATES, renderServicePrompt } from './prompt-engine.ts';
import {
  ENGLISH_READING_POLICY,
  ENGLISH_LANGUAGE_POLICY_VERSION,
  inspectEnglishReading,
  englishRepairMessages,
} from './reading-language.ts';
import { SERVICE_CATALOG } from './catalog.ts';

test('every prompt template has an English override — no silent Vietnamese fallback', () => {
  for (const t of PROMPT_TEMPLATES) {
    assert.ok(
      typeof ENGLISH_TEMPLATES[t.id] === 'string' && ENGLISH_TEMPLATES[t.id].length > 0,
      `missing EN template: ${t.id}`,
    );
  }
});

test('every original AI task has an English task for the same service ids', () => {
  const viTasks = originalTasks();
  const missing = Object.keys(viTasks).filter(id => !ENGLISH_TASKS[id]);
  assert.deepEqual(missing, []);
  // And no invented service ids.
  const unknown = Object.keys(ENGLISH_TASKS).filter(id => !viTasks[id]);
  assert.deepEqual(unknown, []);
});

test('english tasks keep the {SIGN}/{ELEMENT}/{RULER}/{NATAL} placeholders where Vietnamese used them', () => {
  for (const [id, vi] of Object.entries(originalTasks())) {
    for (const token of ['SIGN', 'ELEMENT', 'RULER', 'NATAL']) {
      const viHas = vi.includes(`{${token}}`);
      const enHas = ENGLISH_TASKS[id].includes(`{${token}}`);
      assert.equal(enHas, viHas, `${id} ${token} placeholder mismatch`);
    }
  }
});

test('english prompts contain no Vietnamese instruction sentences', () => {
  const sample = [ENGLISH_SYSTEM_PROMPT, ...Object.values(ENGLISH_TEMPLATES).slice(0, 8)].join('\n');
  assert.equal(/(?<![A-Za-zÀ-ỹ])(không được|hãy|vui lòng|trả lời duy nhất)(?![A-Za-zÀ-ỹ])/i.test(sample), false);
});

test('renderServicePrompt with English settings never falls back to Vietnamese templates', () => {
  const settings = defaultEnglishPromptSettings();
  const node = {
    id: 'tuvi.tuviPromptBody.0',
    values: ['Querent: An, Male', 'CHART DATA {...}', 'placeholder task'],
  };
  const out = renderServicePrompt(node, 'tuvi--tim-hieu-ban-than--tinh-cach', settings, { locale: 'en' });
  assert.match(out, /CHART ANALYSIS RULES/);
  assert.doesNotMatch(out, /QUY TẮC PHÂN TÍCH/);
  // Task text replaced by the English task with placeholders substituted.
  assert.doesNotMatch(out, /\{SIGN\}|\{NATAL\}/);
});

test('English readings policy: Han-script body text is flagged, Latin diacritics are not', () => {
  assert.equal(ENGLISH_LANGUAGE_POLICY_VERSION, 'en-reading-1');
  assert.ok(ENGLISH_READING_POLICY.includes('English'));
  const flagged = inspectEnglishReading(
    'Great outlook. 無正曜明星 means no major star here. More text follows in English.',
  );
  assert.ok(flagged.spans.length > 0, 'long Han run must be flagged');
  const clean = inspectEnglishReading('Your partner Nguyễn Thị Hoa brings warmth. Quyền energy flows well.');
  assert.equal(clean.spans.length, 0, 'Vietnamese Latin names/terms must not be flagged');
  const repair = englishRepairMessages(flagged);
  assert.equal(repair[0].role, 'system');
  assert.match(repair[0].content, /English/i);
});

test('catalog leaves without tasks are exactly the period services (served by EN period templates)', () => {
  const managedModules = new Set(['tuvi', 'zodiac', 'batu', 'numerology']);
  const aiLeafIds = SERVICE_CATALOG.filter(s => managedModules.has(s.module)).map(s => s.id);
  const viTasks = originalTasks();
  const noTask = aiLeafIds.filter(id => !viTasks[id]).sort();
  assert.deepEqual(noTask, [
    'tuvi--period--month',
    'tuvi--period--today',
    'tuvi--period--week',
    'zodiac--period--month',
    'zodiac--period--today',
    'zodiac--period--week',
  ]);
});

// --- Runtime locale behavior -------------------------------------------------
import { executeProviderChain } from './runtime.mjs';
import { defaultConfig } from './config.ts';

function aiConfig() {
  const c = defaultConfig();
  c.ai.enabled = true;
  c.ai.systemPrompt = 'VIETNAMESE ADMIN SYSTEM PROMPT';
  c.ai.providers = [
    {
      id: 'a',
      name: 'a',
      baseUrl: 'https://api.openai.com/v1',
      protocol: 'chat',
      model: 'm',
      enabled: true,
      timeoutMs: 1000,
      retries: 0,
      maxTokens: 100,
      temperature: 0.5,
      secretRef: 'provider:a',
    },
  ];
  c.ai.chain = ['a'];
  c.billing.services.find(s => s.id === 'tuvi').status = 'free';
  c.billing.services.find(s => s.id === 'tuvi--tim-hieu-ban-than--tinh-cach').status = 'free';
  return c;
}

test('English runtime request gets English system+policy, never the Vietnamese admin prompt', async () => {
  let captured = null;
  const fetchImpl = async (_url, init) => {
    captured = JSON.parse(init.body);
    return Response.json({
      choices: [{ message: { role: 'assistant', content: 'English reading body.' }, finish_reason: 'stop' }],
      usage: { total_tokens: 3 },
    });
  };
  await executeProviderChain(
    aiConfig(),
    {
      serviceId: 'tuvi--tim-hieu-ban-than--tinh-cach',
      locale: 'en',
      messages: [{ role: 'user', content: 'CHART DATA {}' }],
    },
    async () => 'k',
    { fetchImpl, allowHosts: ['api.openai.com'] },
  );
  const system = captured.messages.filter(m => m.role === 'system').map(m => m.content);
  assert.ok(system.some(c => c.includes('seasoned astrologer')));
  assert.ok(system.some(c => c.includes('natural, fluent English')));
  assert.equal(
    system.some(c => c.includes('VIETNAMESE ADMIN SYSTEM PROMPT')),
    false,
  );
  assert.equal(
    system.some(c => c.includes('tiếng Việt')),
    false,
  );
});

test('Vietnamese runtime request keeps the exact legacy system stack', async () => {
  let captured = null;
  const fetchImpl = async (_url, init) => {
    captured = JSON.parse(init.body);
    return Response.json({
      choices: [{ message: { role: 'assistant', content: 'Luận giải tiếng Việt.' }, finish_reason: 'stop' }],
      usage: { total_tokens: 3 },
    });
  };
  await executeProviderChain(
    aiConfig(),
    {
      serviceId: 'tuvi--tim-hieu-ban-than--tinh-cach',
      locale: 'vi',
      messages: [{ role: 'user', content: 'DỮ LIỆU {}' }],
    },
    async () => 'k',
    { fetchImpl, allowHosts: ['api.openai.com'] },
  );
  const system = captured.messages.filter(m => m.role === 'system').map(m => m.content);
  assert.ok(system.some(c => c.includes('VIETNAMESE ADMIN SYSTEM PROMPT')));
  assert.ok(system.some(c => c.includes('tiếng Việt')));
});

test('English response with a long Han run triggers the English repair, not Vietnamese repair', async () => {
  let calls = 0;
  const bodies = [];
  const fetchImpl = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    calls++;
    if (calls === 1)
      return Response.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Reading in English. 这是一段很长的中文内容不应出现在英文结果中. More text.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { total_tokens: 3 },
      });
    return Response.json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '{"translations":["a long Chinese passage that should not appear in English output"]}',
          },
          finish_reason: 'stop',
        },
      ],
      usage: { total_tokens: 3 },
    });
  };
  const r = await executeProviderChain(
    aiConfig(),
    {
      serviceId: 'tuvi--tim-hieu-ban-than--tinh-cach',
      locale: 'en',
      messages: [{ role: 'user', content: 'CHART {}' }],
    },
    async () => 'k',
    { fetchImpl, allowHosts: ['api.openai.com'] },
  );
  assert.equal(
    r.attempts.some(a => a.purpose === 'language_repair'),
    true,
  );
  assert.equal(bodies[1].temperature, 0);
  assert.equal(JSON.stringify(bodies[1]).includes('tiếng Việt'), false);
});
