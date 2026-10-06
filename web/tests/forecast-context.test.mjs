import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';
test('transit evidence is recalculated for each natal context rather than sharing the first profile of the day', async () => {
  const zodiac = await load('lib/zodiac.ts');
  const moving = zodiac.transitChartFor(new Date());
  const sun = moving.find(p => p.name === 'Mặt Trời');
  const first = { planets: [{ name: 'Natal A', longitude: sun.longitude }] };
  const second = { planets: [{ name: 'Natal B', longitude: sun.longitude }] };
  const a = zodiac.periodSkyText('today', first);
  const b = zodiac.periodSkyText('today', second);
  assert.ok(a.includes('Natal A'));
  assert.ok(b.includes('Natal B'));
  assert.ok(!b.includes('Natal A'));
});
