import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapVisualPrompt, visualInput, saveVisualReading, readVisualReading } from './visual-reading.ts';
import { renderServicePrompt, defaultPromptSettings } from './prompt-engine.ts';
import { fixture } from '../../web/tests/support/visual-fixtures.mjs';
const asOf = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const label = asOf.split('-').reverse().join('/');
const profile = module => ({
  id: `${module}.profileContextText.0`,
  values: ['An', 'Nam', '08/03/2001', 'Tý', 'Hà Nội'],
});
const natal = {
  solarDate: '2001-03-08',
  palaces: [{ name: 'Mệnh', earthlyBranch: 'Mão', majorStars: [{ name: 'Thiên Tướng' }] }],
};
function tuvi(period = 'today') {
  const samples =
    period === 'today'
      ? 'Lưu Nhật nhập cung Quan Lộc, Hóa Lộc tại Thiên Cơ.'
      : 'hôm nay: Lưu Nhật nhập Quan Lộc.\n+2 ngày (08/10): Lưu Nhật nhập Phúc Đức.\n+4 ngày (10/10): Lưu Nhật nhập Mệnh.\n+6 ngày (12/10): Lưu Nhật nhập Thiên Di.';
  return {
    id: 'tuvi.tuviPromptBody.0',
    values: [
      profile('tuvi'),
      { id: 'tuvi.ziweiContextText.0', values: [JSON.stringify(natal)] },
      {
        id: 'tuvi.periodPresentation',
        values: [
          { id: `tuvi.tuviPeriodPromptText.${{ today: 1, week: 2, month: 3 }[period]}`, values: [label, samples] },
        ],
      },
    ],
  };
}
test('Tu Vi period descriptors become a dated native timeline with actual moving-palace evidence', () => {
  const serviceId = 'tuvi--period--today',
    original = tuvi();
  const wrapped = wrapVisualPrompt(original, serviceId, 'vi');
  assert.equal(wrapped.id, 'tuvi.visualPeriod.v1');
  const input = visualInput(wrapped, serviceId, 'vi');
  assert.equal(input.period.asOf, asOf);
  assert.equal(input.period.start, asOf);
  assert.equal(input.period.end, asOf);
  assert.equal(input.chapters[0].kind, 'period-timeline');
  assert.equal(input.period.samples.length, 1);
  assert.ok(input.facts.some(f => String(f.value).includes('Hóa Lộc tại Thiên Cơ')));
  assert.equal(wrapped.values[2], original);
});
test('weekly timeline uses only provided calculation dates and retains samples beyond the calendar boundary', () => {
  const serviceId = 'tuvi--period--week';
  const input = visualInput(wrapVisualPrompt(tuvi('week'), serviceId, 'en'), serviceId, 'en');
  assert.equal(input.period.samples.length, 4);
  assert.deepEqual(
    input.period.samples.map(s => s.offsetDays),
    [0, 2, 4, 6],
  );
  assert.ok(input.period.samples.every(s => input.facts.some(f => f.id === s.factId)));
  assert.equal(new Date(input.period.end + 'T00:00:00Z').getUTCDay(), 0);
});
test('Zodiac forecasts preserve the actual transit and phase data instead of inventing scores', () => {
  const serviceId = 'zodiac--period--week';
  const original = {
    id: 'zodiac.zodiacPeriodPrompt.1',
    values: [
      {
        id: 'zodiac.zodiacPromptBody.0',
        values: [
          profile('zodiac'),
          {
            id: 'zodiac.natalContextText.0',
            values: [JSON.stringify({ planets: [{ name: 'Mặt Trời', sign: { name: 'Song Ngư', degree: 17 } }] })],
          },
          { id: 'zodiac.zodiacPeriodPrompt.0', values: ['Song Ngư', 'Pisces', 'Nước', 'Neptune'] },
        ],
      },
      {
        id: 'zodiac.periodGuide.week',
        values: ['hôm nay: Mặt Trăng ở Sư Tử. Pha Mặt Trăng: trăng khuyết.\n+2 ngày (08/10): Sao Kim ở Thiên Bình.'],
      },
    ],
  };
  const input = visualInput(wrapVisualPrompt(original, serviceId, 'vi'), serviceId, 'vi');
  assert.equal(input.period.samples.length, 2);
  assert.ok(input.facts.some(f => String(f.value).includes('Sao Kim ở Thiên Bình')));
  assert.ok(!JSON.stringify(input).includes('luckScore'));
});
test('a saved forecast reopens with its original window and complete deep content', () => {
  const serviceId = 'tuvi--period--week';
  const input = visualInput(wrapVisualPrompt(tuvi('week'), serviceId, 'vi'), serviceId, 'vi');
  const saved = readVisualReading(saveVisualReading(JSON.stringify(fixture(input)), input));
  assert.deepEqual(saved.snapshot.period, input.period);
  assert.equal(saved.report.chapters.length, 4);
  assert.equal(saved.report.chapters[0].visual.kind, 'period-timeline');
});
test('period prompts request grounded temporal analysis and prohibit technical fact IDs in prose', () => {
  const serviceId = 'tuvi--period--week';
  const prompt = renderServicePrompt(
    wrapVisualPrompt(tuvi('week'), serviceId, 'vi'),
    serviceId,
    defaultPromptSettings(),
  );
  assert.match(prompt, /period-timeline/);
  assert.match(prompt, /factId chỉ dùng trong|fact IDs only in/);
  assert.ok(prompt.includes('Lưu Nhật nhập Quan Lộc'));
});
test('timeline anchor stays attached to calculation time when a monthly prompt is reused later', () => {
  const original = tuvi('month');
  const guide = original.values[2].values[0];
  guide.calculatedAt = '2026-10-01';
  guide.values[1] =
    'đầu tháng (hôm nay): Lưu Nhật nhập Quan Lộc.\nngày +10: Lưu Nhật nhập Phúc Đức.\nngày +20: Lưu Nhật nhập Mệnh.';
  const clock = Date.UTC(2026, 9, 15, 12);
  const sid = 'tuvi--period--month';
  const input = visualInput(wrapVisualPrompt(original, sid, 'vi', clock), sid, 'vi', clock);
  assert.equal(input.period.asOf, '2026-10-01');
  assert.deepEqual(
    input.period.samples.map(s => s.date),
    ['2026-10-01', '2026-10-11', '2026-10-21'],
  );
});

test('Zodiac forecast without exact natal data visualizes real transits and records its narrower scope', () => {
  const sid = 'zodiac--period--today';
  const original = {
    id: 'zodiac.zodiacPeriodPrompt.1',
    values: [
      {
        id: 'zodiac.zodiacPromptBody.0',
        values: [
          profile('zodiac'),
          '',
          { id: 'zodiac.zodiacPeriodPrompt.0', values: ['Song Ngư', 'Pisces', 'Nước', 'Neptune'] },
        ],
      },
      { id: 'zodiac.periodGuide.today', values: ['hôm nay: Mặt Trăng ở Sư Tử, pha trăng khuyết.'] },
    ],
  };
  const input = visualInput(wrapVisualPrompt(original, sid, 'vi'), sid, 'vi');
  assert.ok(input);
  assert.equal(input.period.samples.length, 1);
  assert.ok(input.facts.some(f => f.sourcePath === 'period.natalUnavailable'));
  assert.ok(!input.facts.some(f => f.sourcePath.startsWith('planets.') || f.sourcePath.startsWith('points.')));
});
