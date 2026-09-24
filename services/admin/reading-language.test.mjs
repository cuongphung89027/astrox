import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectReading,
  applyTranslations,
  languageRepairMessages,
  translateKnownTerms,
  hasHan,
  LANGUAGE_POLICY_VERSION,
} from './reading-language.ts';

test('Han detection includes supplementary ideographs and escaped JSON string values', () => {
  assert.equal(hasHan('The Fool · Tử Vi'), false);
  assert.equal(hasHan('𠀀'), true);
  assert.deepEqual(inspectReading('{"advice":"\\u7532"}').spans, ['甲']);
  assert.equal(typeof LANGUAGE_POLICY_VERSION, 'string');
});
test('repair changes only exact foreign spans; preserves named facts, numbers and Markdown', () => {
  const source = '**Tử Vi** ở cung Mệnh năm 2026: 财星 và The Fool. 财星 xuất hiện 2 lần.';
  const plan = inspectReading(source);
  assert.deepEqual(plan.spans, ['财星']);
  assert.equal(
    applyTranslations(plan, JSON.stringify({ translations: ['sao Tài'] })),
    '**Tử Vi** ở cung Mệnh năm 2026: sao Tài và The Fool. sao Tài xuất hiện 2 lần.',
  );
});
test('structured results retain keys, number values, nesting and escaped characters', () => {
  const source = JSON.stringify({
    percent: 42,
    strengths: ['财星'],
    watchouts: [],
    advice: 'Giữ "The Fool"',
    meta: { ok: true, x: null },
  });
  const result = JSON.parse(applyTranslations(inspectReading(source), '{"translations":["sao Tài"]}'));
  assert.deepEqual(result, {
    percent: 42,
    strengths: ['sao Tài'],
    watchouts: [],
    advice: 'Giữ "The Fool"',
    meta: { ok: true, x: null },
  });
});
test('foreign JSON keys fail closed instead of silently changing schema', () =>
  assert.throws(() => inspectReading('{"财星":"abc"}'), /READING_LANGUAGE_INVALID/));
test('bounded repairs reject extra fields, added facts, residual Han and wrong number of translations', () => {
  const plan = inspectReading('财星 ở Mệnh');
  for (const value of [
    { translations: [] },
    { translations: ['sao Tài', 'thêm'] },
    { translations: ['财星'] },
    { translations: ['sao Tài 99'] },
    { translations: ['sao Tài'], extra: true },
    { translations: [''] },
    { translations: ['\n# sai'] },
  ])
    assert.throws(() => applyTranslations(plan, JSON.stringify(value)), /READING_LANGUAGE_INVALID/);
});
test('repair instruction treats spans as data and does not transmit whole private reading', () => {
  const messages = languageRepairMessages(inspectReading('Tên riêng bí mật: 财星'));
  assert.ok(messages[0].content.includes('JSON'));
  assert.ok(!JSON.stringify(messages).includes('Tên riêng bí mật'));
});
test('known terminology translates only whole Han spans and keeps unknown text for explicit handling', () => {
  assert.equal(translateKnownTerms('Nhật Chủ 日主, 正财; 未知词'), 'Nhật Chủ Nhật Chủ, Chính Tài; 未知词');
});
test('composed known can chi and star facts cannot be renamed by a translation model', () => {
  assert.equal(
    applyTranslations(inspectReading('Nhật trụ 甲子.'), '{"translations":["Bính Ngọ"]}'),
    'Nhật trụ Giáp Tý.',
  );
});
test('JSON repair preserves original numeric lexemes including integers beyond JS precision', () => {
  const original = '{"id":9007199254740993,"rate":1.00,"advice":"财星"}';
  assert.equal(
    applyTranslations(inspectReading(original), '{"translations":["sao Tài"]}'),
    '{"id":9007199254740993,"rate":1.00,"advice":"sao Tài"}',
  );
});
