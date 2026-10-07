import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load } from './support/load.mjs';
import { original, serviceId, fixture } from './support/visual-fixtures.mjs';
import {
  wrapVisualPrompt,
  visualInput,
  saveVisualReading,
  readVisualReading,
} from '../../services/admin/visual-reading.ts';

test('plain text export removes syntax while preserving meaningful punctuation and structure', async () => {
  const { readingPlainText } = await load('lib/reading-text.ts');
  const input =
    '# Góc nhìn\n\n**Điểm mạnh** và *linh hoạt*. C#; 2 * 3 = 6; snake_case; #1.\n- _Thử một việc_\n- `a_b * c`\n\n```txt\n# literal * symbols\n```';
  assert.equal(
    readingPlainText(input),
    'Góc nhìn\n\nĐiểm mạnh và linh hoạt. C#; 2 * 3 = 6; snake_case; #1.\n• Thử một việc\n• a_b * c\n\n# literal * symbols',
  );
});

test('visual export includes every chapter, example, source and action without technical JSON', async () => {
  const input = visualInput(wrapVisualPrompt(original, serviceId, 'vi'), serviceId, 'vi');
  const saved = readVisualReading(saveVisualReading(JSON.stringify(fixture(input)), input));
  const { visualReadingText } = await load('lib/reading-text.ts');
  const text = visualReadingText(saved);
  for (const c of saved.report.chapters) {
    assert.ok(text.includes(c.title));
    for (const i of c.insights)
      for (const k of ['label', 'summary', 'detail', 'rationale', 'example', 'action']) assert.ok(text.includes(i[k]));
  }
  for (const fact of saved.snapshot.facts)
    if (saved.report.chapters.some(c => c.insights.some(i => i.sourceFactIds.includes(fact.id))))
      assert.ok(text.includes(fact.label));
  assert.ok(!text.includes('sourceFactIds'));
  assert.ok(!text.includes('astrox.saved-visual-reading'));
});

test('dashboard uses a real report summary and never the serialized visual envelope', async () => {
  const input = visualInput(wrapVisualPrompt(original, serviceId, 'vi'), serviceId, 'vi');
  const raw = saveVisualReading(JSON.stringify(fixture(input)), input);
  const { dashboardReadingPreview } = await load('lib/dashboard-reading.ts');
  assert.equal(dashboardReadingPreview(raw), fixture(input).summary);
});

test('traditional day suggestions cite actual taboos and avoid contradictory major-start advice', async () => {
  const { dayFacts } = await load('lib/almanac.ts');
  const { almanacInsights } = await load('lib/dashboard-reading.ts');
  const facts = dayFacts('2026-10-07');
  const insights = almanacInsights(facts, 'vi');
  assert.ok(insights.some(i => i.basis.includes('Tam nương')));
  assert.ok(insights.every(i => !Object.values(i).some(s => /\d+%/.test(s))));
  assert.ok(!insights.some(i => i.body.includes('Khởi sự lớn')));
});

test('native visual reports expose the shared copy toolbar', async () => {
  const input = visualInput(wrapVisualPrompt(original, serviceId, 'vi'), serviceId, 'vi');
  const saved = readVisualReading(saveVisualReading(JSON.stringify(fixture(input)), input));
  const { VisualReading } = await load('components/kit/VisualReading.tsx');
  const html = renderToStaticMarkup(createElement(VisualReading, { saved }));
  assert.match(html, /role="toolbar"/);
  assert.match(html, /Sao chép/);
});

test('reference hour guidance never wraps into a passed morning window at night', async () => {
  const { nextReferenceHour } = await load('lib/dashboard-reading.ts');
  const hours = Array.from({ length: 12 }, (_, i) => ({
    branch: String(i),
    name: `Hour ${i}`,
    good: [0, 1, 11].includes(i),
    range: 'test',
  }));
  assert.equal(nextReferenceHour(hours, new Date('2026-10-07T23:30:00+07:00')).range, '23:00–24:00');
  hours[0].good = false;
  assert.equal(nextReferenceHour(hours, new Date('2026-10-07T23:30:00+07:00')), null);
});
