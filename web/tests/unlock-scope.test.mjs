import test from 'node:test';
import assert from 'node:assert/strict';
import { graph } from './support/load.mjs';
import { scopeForReading } from '../../services/backend/service-unlocks.mjs';
import { visualInput, saveVisualReading, readVisualReading } from '../../services/admin/visual-reading.ts';
import { fixture } from './support/visual-fixtures.mjs';
import { SERVICE_CATALOG } from '../../services/admin/catalog.ts';

test('real managed prompts for every persistent feature derive a server scope', async () => {
  const load = graph();
  const { promptDescriptor, readingPromptDescriptor } = await load('lib/managed-prompts.ts');
  const p = {
    name: 'Kiểm thử',
    gender: 'Nam',
    dob: '2000-01-15',
    hourChi: 'Tý',
    place: 'Hà Nội',
    birthTime: '00:00',
    fullName: 'Kiểm thử',
  };
  const t = await load('lib/tuvi.ts'),
    z = await load('lib/zodiac.ts'),
    b = await load('lib/batu.ts'),
    n = await load('lib/numerology.ts');
  const readings = [];
  const tc = t.buildZiweiChart(p);
  const calculationDate = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10).split('-').reverse().join('/');
  for (const topic of t.TUVI_TOPICS)
    for (const sub of topic.subs) readings.push([`tuvi--${topic.id}--${sub.id}`, t.tuviPromptBody(p, tc, sub.prompt)]);
  for (const period of ['today', 'week', 'month'])
    readings.push([
      `tuvi--period--${period}`,
      t.tuviPromptBody(p, tc, t.tuviPeriodPromptText(p, calculationDate, period, period)),
    ]);
  const natal = z.buildNatalChart(p);
  for (const topic of z.ZODIAC_DEEP_TOPICS)
    readings.push([`zodiac--${topic.id}--${topic.subId}`, z.zodiacPromptBody(p, natal, topic.prompt)]);
  for (const period of ['today', 'week', 'month'])
    readings.push([`zodiac--period--${period}`, z.zodiacPeriodPrompt(z.getZodiacSign(p.dob), period, p, natal)]);
  const bc = b.buildBatuChart(p);
  for (const topic of b.BATU_TOPICS) readings.push([`batu--${topic.id}`, b.buildBatuPromptBody(topic.prompt, bc, p)]);
  const nc = n.buildNumerologyChart({ fullName: p.fullName, dob: p.dob });
  for (const topic of n.NUMEROLOGY_TOPICS)
    readings.push([`numerology--${topic.id}`, n.numerologyPromptBody(topic.prompt, nc, p)]);
  const couples = await load('lib/couples.ts');
  for (const mode of ['tuvi', 'batu']) {
    const reading = couples.buildCoupleReading(mode, p, { ...p, name: 'Người B', dob: '1992-02-02', hourChi: 'Ngọ' });
    readings.push([`compat--${mode}-pair`, couples.couplePrompt(reading)]);
  }
  const signs = z.ZODIAC_SIGNS;
  readings.push(['compat--pair', z.compatPrompt(signs[0], signs[1], z.compatAnalysis(signs[0], signs[1]), p)]);
  const failures = [];
  for (const [id, prompt] of readings) {
    try {
      const scoped = await scopeForReading(id, promptDescriptor(prompt));
      assert.equal(scoped.module, id.split('--')[0]);
      for (const locale of ['vi', 'en']) {
        const wrapped = readingPromptDescriptor(prompt, id, locale);
        assert.deepEqual(await scopeForReading(id, wrapped), scoped, `${id} ${locale} purchase scope`);
        const input = visualInput(wrapped, id, locale);
        const policy = SERVICE_CATALOG.find(s => s.id === id).policy;
        if (['profile', 'period'].includes(policy)) {
          assert.ok(input, `${id} is integrated`);
          assert.ok(input.facts.length > 0);
          assert.equal(
            readVisualReading(saveVisualReading(JSON.stringify(fixture(input)), input)).report.serviceId,
            id,
          );
          if (policy === 'period') {
            assert.equal(input.chapters[0].kind, 'period-timeline');
            assert.ok(input.period.samples.every(s => input.facts.some(f => f.id === s.factId)));
          }
        } else assert.equal(input, null);
      }
    } catch (e) {
      failures.push([id, e.message]);
    }
  }
  assert.deepEqual(failures, []);
  assert.equal(readings.length, SERVICE_CATALOG.filter(s => s.id !== s.module && s.policy !== 'session').length);
});
test('Zodiac without an exact birth time still has a stable profile scope', async () => {
  const load = graph();
  const { promptDescriptor } = await load('lib/managed-prompts.ts');
  const z = await load('lib/zodiac.ts');
  const profile = { name: 'Mai', gender: 'Nữ', dob: '1992-06-10', hourChi: 'unknown', place: 'Hà Nội' };
  const text = z.zodiacPromptBody(profile, null, 'Phân tích tính cách');
  const scoped = await scopeForReading('zodiac--tinh-cach-cung--dac-diem-cot-loi', promptDescriptor(text));
  assert.equal(scoped.module, 'zodiac');
});
