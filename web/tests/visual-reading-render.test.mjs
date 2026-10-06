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
test('native reader shows chapters, calculated evidence and all deep fields without injecting markup', async () => {
  const input = visualInput(wrapVisualPrompt(original, serviceId, 'vi'), serviceId, 'vi');
  const saved = readVisualReading(saveVisualReading(JSON.stringify(fixture(input)), input));
  const { VisualReading } = await load('components/kit/VisualReading.tsx');
  const html = renderToStaticMarkup(createElement(VisualReading, { saved }));
  assert.match(html, /data-lean="right"/);
  assert.match(html, /role="tablist"/);
  assert.equal((html.match(/role="tab"/g) || []).length, 4);
  assert.match(html, /Số chủ đạo/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Khám phá có định hướng/);
  assert.doesNotMatch(html, /innerHTML|<img|<canvas/);
});
test('request descriptor helper retains originals and applies same version for quote and inference', async () => {
  const { managedPrompt, promptDescriptor, readingPromptDescriptor } = await load('lib/managed-prompts.ts');
  const chart = managedPrompt('numerology.numerologyContextText.0', [JSON.stringify({ lifePath: 5 })]);
  const profile = managedPrompt('numerology.profileContextText.0', ['An', 'Nam', '08/03/2001', 'Tý', 'Hà Nội']);
  const text = managedPrompt('numerology.numerologyPromptBody.0', [profile, chart, 'task']);
  assert.equal(promptDescriptor(text).id, 'numerology.numerologyPromptBody.0');
  assert.deepEqual(readingPromptDescriptor(text, serviceId, 'vi'), readingPromptDescriptor(text, serviceId, 'vi'));
  assert.equal(readingPromptDescriptor(text, serviceId, 'vi').id, 'numerology.visualReport.v1');
});
test('element flow shows computed counts and does not draw a stream for a zero element', async () => {
  const snapshot = visualInput(wrapVisualPrompt(original, serviceId, 'vi'), serviceId, 'vi');
  snapshot.module = 'batu';
  snapshot.serviceId = 'batu--tinh-cach';
  snapshot.chapters[0] = { id: 'portrait', title: 'Dấu ấn riêng', kind: 'element-flow' };
  snapshot.facts = ['moc', 'hoa', 'tho', 'kim', 'thuy'].map((label, i) => ({
    id: `fact-${i + 1}`,
    label,
    value: [0, 2, 3, 2, 1][i],
    sourcePath: `wuxing.${label}`,
  }));
  const saved = readVisualReading(saveVisualReading(JSON.stringify(fixture(snapshot)), snapshot));
  const { VisualReading } = await load('components/kit/VisualReading.tsx');
  const html = renderToStaticMarkup(createElement(VisualReading, { saved }));
  assert.equal((html.match(/data-reveal="true"/g) || []).length, 4);
  for (const count of [0, 1, 2, 3]) assert.ok(html.includes(`>${count}</text>`));
  for (const label of ['Mộc', 'Hỏa', 'Thổ', 'Kim', 'Thủy']) assert.ok(html.includes(label));
});
test('period reader renders actual dated samples with accessible selection and retained calendar context', async () => {
  const asOf = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const descriptor = {
    id: 'tuvi.tuviPromptBody.0',
    values: [
      { id: 'tuvi.profileContextText.0', values: ['An', 'Nam', '08/03/2001', 'Tý', 'Hà Nội'] },
      {
        id: 'tuvi.ziweiContextText.0',
        values: [JSON.stringify({ palaces: [{ name: 'Mệnh', majorStars: [{ name: 'Thiên Tướng' }] }] })],
      },
      {
        id: 'tuvi.periodPresentation',
        values: [
          {
            id: 'tuvi.tuviPeriodPromptText.2',
            values: [
              asOf,
              'hôm nay: Lưu Nhật nhập Quan Lộc.\n+2 ngày: Lưu Nhật nhập Phúc Đức.\n+4 ngày: Lưu Nhật nhập Mệnh.\n+6 ngày: Lưu Nhật nhập Thiên Di.',
            ],
          },
        ],
      },
    ],
  };
  const id = 'tuvi--period--week',
    input = visualInput(wrapVisualPrompt(descriptor, id, 'vi'), id, 'vi');
  const saved = readVisualReading(saveVisualReading(JSON.stringify(fixture(input)), input));
  const { VisualReading } = await load('components/kit/VisualReading.tsx');
  const html = renderToStaticMarkup(createElement(VisualReading, { saved }));
  assert.match(html, /data-period-timeline/);
  assert.match(html, /Mốc tính trong kỳ/);
  assert.equal((html.match(/data-sample-date=/g) || []).length, 4);
  assert.ok(html.includes(input.period.asOf));
  assert.ok(html.includes('Lưu Nhật nhập Quan Lộc'));
  assert.ok(!html.includes('phép đo tính cách'));
  assert.doesNotMatch(html, /<img|<canvas|innerHTML/);
});
