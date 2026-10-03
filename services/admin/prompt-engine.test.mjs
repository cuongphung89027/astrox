import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPrompt, renderServicePrompt, defaultPromptSettings, ORIGINAL_SYSTEM_PROMPT } from './prompt-engine.ts';
import { defaultEnglishPromptSettings } from './english-prompts.ts';
test('nested chart context survives template edits without evaluating values', () => {
  const p = {
    id: 'tuvi.tuviPromptBody.0',
    values: ['PROFILE', { id: 'tuvi.ziweiContextText.0', values: ['{"palaces":["Mệnh"]}'] }, 'TASK'],
  };
  const settings = defaultPromptSettings();
  settings.templates[p.id] = '{{v1}}\nChỉ dùng dữ liệu.\n{{v2}}';
  const text = renderPrompt(p, settings.templates);
  assert.ok(text.includes('{"palaces":["Mệnh"]}'));
  assert.ok(text.endsWith('TASK'));
  assert.ok(!text.includes('PROFILE'));
});
test('reject unknown templates and missing variables', () => {
  assert.throws(() => renderPrompt({ id: 'unknown', values: [] }));
  assert.throws(() => renderPrompt({ id: 'tuvi.ziweiContextText.0', values: [] }));
});
test('original system rules and all legacy leaf tasks are retained', () => {
  assert.ok(ORIGINAL_SYSTEM_PROMPT.includes('KHÔNG tự bịa'));
  const t = defaultPromptSettings().tasks;
  assert.equal(Object.keys(t).filter(k => k.startsWith('tuvi--')).length, 42);
  assert.equal(Object.keys(t).filter(k => k.startsWith('zodiac--')).length, 18);
});
test('service task edit preserves resolved zodiac sign', async () => {
  const { renderServicePrompt } = await import('./prompt-engine.ts');
  const s = defaultPromptSettings(),
    id = 'zodiac--tinh-cach-cung--dac-diem-cot-loi';
  s.tasks[id] = 'Luận kỹ cung {SIGN}.';
  const node = {
    id: 'zodiac.zodiacPromptBody.0',
    values: [
      'P',
      '{}',
      'Phân tích tính cách chi tiết của cung Ma Kết (Capricorn), gắn với dữ liệu tính trực tiếp. ~260-440 từ.',
    ],
  };
  assert.ok(renderServicePrompt(node, id, s).includes('Luận kỹ cung Ma Kết (Capricorn).'));
});
test('compatibility respects every gender pairing even with a published template override', async () => {
  const { renderServicePrompt } = await import('./prompt-engine.ts');
  const settings = defaultPromptSettings();
  settings.templates['compat.original'] = 'Người 1: {{v0}} ({{v1}}). Người 2: {{v5}} ({{v6}}).';
  for (const [a, b] of [
    ['Nam', 'Nam'],
    ['Nữ', 'Nữ'],
    ['Nam', 'Nữ'],
    ['Nữ', 'Nam'],
  ]) {
    const text = renderServicePrompt(
      { id: 'compat.original', values: ['An', a, '01-01-1990', 'Tí', 'Hà Nội', 'Bình', b, '02-02-1991'] },
      'compat--pair',
      settings,
    );
    assert.ok(text.includes(`An (${a})`));
    assert.ok(text.includes(`Bình (${b})`));
    assert.match(text, /LGBTQ\+/);
    assert.match(text, /không.*giảm.*tương hợp/i);
    assert.match(text, /vợ.*chồng/);
  }
});

test('new pair template overrides retain inclusive guidance', () => {
  for (const id of ['compat.tuviPair.v1', 'compat.batuPair.v1'])
    assert.match(renderPrompt({ id, values: ['{}'] }, { [id]: '{{v0}}' }), /LGBTQ\+/);
});

test('published Tu Vi overrides retain detailed adverse-star guidance and the exact chart/task', () => {
  const settings = defaultPromptSettings();
  settings.templates['tuvi.tuviPromptBody.0'] = '{{v0}}\n{{v1}}\n{{v2}}';
  const chart = '{"palaces":[{"name":"Mệnh","stars":["Tử Vi","Hóa Kỵ","Kình Dương"]}]}';
  const result = renderServicePrompt(
    { id: 'tuvi.tuviPromptBody.0', values: ['PROFILE', chart, 'CUSTOM TASK'] },
    'tuvi',
    settings,
  );
  assert.ok(result.includes(chart));
  assert.ok(result.includes('CUSTOM TASK'));
  assert.match(result, /sao tốt.*sao xấu/i);
  assert.match(result, /tên sao.*cung.*ảnh hưởng.*hoá giải/i);
  assert.match(result, /không.*bịa/i);
});

test('Tu Vi period overrides keep their length requirement and balanced chart guidance', () => {
  const settings = defaultPromptSettings();
  settings.templates['tuvi.tuviPeriodPromptText.1'] = 'Dữ liệu: {{v1}}. Đúng 3 bullet.';
  const result = renderServicePrompt(
    { id: 'tuvi.tuviPeriodPromptText.1', values: ['2026-10-03', '{"Hóa Kỵ":"Quan Lộc"}'] },
    'tuvi--period--today',
    settings,
  );
  assert.match(result, /Đúng 3 bullet/);
  assert.match(result, /sao tốt.*sao xấu/i);
  assert.match(result, /độ dài/i);
});

test('English published Tu Vi overrides receive English adverse-star guidance', () => {
  const settings = defaultEnglishPromptSettings();
  settings.templates['tuvi.tuviPromptBody.0'] = '{{v0}}\n{{v1}}\n{{v2}}';
  const result = renderServicePrompt(
    { id: 'tuvi.tuviPromptBody.0', values: ['PROFILE', 'CHART', 'TASK'] },
    'tuvi',
    settings,
    { locale: 'en' },
  );
  assert.match(result, /favorable.*adverse/i);
  assert.match(result, /star.*palace.*impact.*mitigation/i);
  assert.doesNotMatch(result, /sao tốt|sao xấu|hoá giải/);
});

test('nested and joined English templates preserve locale-specific compatibility guidance', () => {
  const node = {
    id: '$join',
    values: [{ id: 'zodiac.zodiacPeriodPrompt.1', values: [{ id: 'compat.tuviPair.v1', values: ['CHART'] }, 'TASK'] }],
  };
  const result = renderPrompt(
    node,
    {
      'zodiac.zodiacPeriodPrompt.1': '{{v0}}\n{{v1}}',
      'compat.tuviPair.v1': '{{v0}}',
    },
    0,
    'en',
  );
  assert.match(result, /LGBTQ\+/);
  assert.doesNotMatch(result, /Tôn trọng|không suy đoán|vợ\/chồng/i);
});

test('missing English overrides fail closed even in joined or nested prompts', () => {
  for (const node of [
    { id: '$join', values: [{ id: 'tuvi.ziweiContextText.0', values: ['CHART'] }] },
    { id: 'tuvi.tuviPromptBody.0', values: ['PROFILE', { id: 'tuvi.ziweiContextText.0', values: ['CHART'] }, 'TASK'] },
  ]) {
    assert.throws(() => renderPrompt(node, { 'tuvi.tuviPromptBody.0': '{{v1}}' }, 0, 'en'), /EN_PROMPT_MISSING/);
  }
});
