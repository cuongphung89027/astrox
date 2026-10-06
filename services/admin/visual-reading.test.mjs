import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapVisualPrompt, visualInput, saveVisualReading, readVisualReading } from './visual-reading.ts';
import { scopeForReading } from '../backend/service-unlocks.mjs';
import { original, serviceId, fixture } from '../../web/tests/support/visual-fixtures.mjs';
test('versioned descriptor is deterministic, retains original, excludes sessions', () => {
  const a = wrapVisualPrompt(original, serviceId, 'vi');
  assert.deepEqual(a, wrapVisualPrompt(original, serviceId, 'vi'));
  assert.equal(a.values[2], original);
  assert.equal(wrapVisualPrompt(original, 'tarot--reading', 'vi'), original);
});
test('canonical snapshot ignores client-supplied visual facts and binds exact locale/service', () => {
  const node = wrapVisualPrompt(original, serviceId, 'vi');
  node.values[1] = '{"fakeScore":99}';
  const input = visualInput(node, serviceId, 'vi');
  assert.equal(input.facts[0].value, 5);
  assert.ok(!JSON.stringify(input).includes('fakeScore'));
  assert.throws(() => visualInput(node, serviceId, 'en'));
  assert.throws(() => visualInput(node, 'numerology--destiny', 'vi'));
});
test('report validation preserves snapshot and rejects foreign refs, scores, duplicate ids, truncation', () => {
  const input = visualInput(wrapVisualPrompt(original, serviceId, 'vi'), serviceId, 'vi');
  const raw = fixture(input);
  const saved = saveVisualReading(JSON.stringify(raw), input);
  assert.deepEqual(readVisualReading(saved).snapshot, input);
  input.facts[0].value = 88;
  assert.equal(readVisualReading(saved).snapshot.facts[0].value, 5);
  for (const edit of [
    r => (r.chapters[0].insights[0].sourceFactIds = ['foreign']),
    r => (r.chapters[0].visual.score = 90),
    r => (r.chapters[1].insights[0].id = r.chapters[0].insights[0].id),
    r => (r.locale = 'en'),
    r => (r.chapters[0].insights[0].detail = '**vague**'),
  ]) {
    const bad = structuredClone(raw);
    edit(bad);
    assert.throws(() => saveVisualReading(JSON.stringify(bad), readVisualReading(saved).snapshot));
  }
  assert.throws(() => saveVisualReading('{', input));
});
test('wrapper retains the already purchased scope', async () => {
  assert.deepEqual(
    await scopeForReading(serviceId, wrapVisualPrompt(original, serviceId, 'vi')),
    await scopeForReading(serviceId, original),
  );
});
test('a structurally valid but shallow report cannot silently become a saved reading', () => {
  const input = visualInput(wrapVisualPrompt(original, serviceId, 'vi'), serviceId, 'vi'),
    report = fixture(input);
  for (const c of report.chapters)
    for (const i of c.insights) {
      i.detail = 'Hãy quan sát hành vi trong hoàn cảnh cụ thể để hiểu mình hơn trước khi ra một quyết định.';
      i.rationale = 'Dữ kiện đầu vào là cơ sở diễn giải theo trường phái này.';
      i.example = 'Ví dụ giả định: hãy thử một việc mới.';
      i.action = 'Ghi lại một việc muốn thử.';
    }
  assert.throws(() => saveVisualReading(JSON.stringify(report), input));
});
test('real numerology calculator retains the related raw lesson value without exposing unrelated debts', async () => {
  const { load } = await import('../../web/tests/support/load.mjs');
  const { buildNumerologyChart } = await load('lib/numerology.ts');
  const chart = buildNumerologyChart({ fullName: 'Trần Minh An', dob: '2001-03-08' }, new Date(2026, 9, 6, 12));
  const node = structuredClone(original);
  node.values[1].values[0] = JSON.stringify(chart);
  const input = visualInput(wrapVisualPrompt(node, serviceId, 'vi'), serviceId, 'vi');
  assert.ok(input.facts.some(f => f.sourcePath.startsWith('karmicDebts.') && f.value === 14));
  assert.ok(!input.facts.some(f => f.sourcePath.startsWith('karmicDebts.') && f.value === 49));
});
