import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';
import * as bt from '../src/lib/birth-time.ts';
import * as bl from '../src/lib/birth-location.ts';

async function libs() {
  return { bt, bl };
}

test('Los Angeles: PDT in summer, PST in winter (reference: tzdata America/Los_Angeles)', async () => {
  const { bt } = await libs();
  const summer = bt.wallTimeToInstant({ year: 2026, month: 7, day: 4, hour: 12, minute: 0 }, 'America/Los_Angeles');
  assert.equal(summer.offsetMinutes, -420); // UTC-7
  assert.equal(new Date(summer.epochMs).toISOString(), '2026-07-04T19:00:00.000Z');
  const winter = bt.wallTimeToInstant({ year: 2026, month: 1, day: 15, hour: 12, minute: 0 }, 'America/Los_Angeles');
  assert.equal(winter.offsetMinutes, -480); // UTC-8
  assert.equal(new Date(winter.epochMs).toISOString(), '2026-01-15T20:00:00.000Z');
  assert.equal(summer.ambiguous, false);
  assert.equal(summer.nonexistent, false);
});

test('New York: DST spring-forward gap is flagged nonexistent', async () => {
  const { bt } = await libs();
  // US DST 2026 starts Sun Mar 8, 02:00→03:00 local.
  const gap = bt.wallTimeToInstant({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, 'America/New_York');
  assert.equal(gap.nonexistent, true);
  assert.equal(gap.ambiguous, false);
});

test('New York: fall-back overlap is flagged ambiguous and resolves to first occurrence', async () => {
  const { bt } = await libs();
  // US DST 2026 ends Sun Nov 1, 02:00→01:00 local: 01:30 happens twice.
  const overlap = bt.wallTimeToInstant({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, 'America/New_York');
  assert.equal(overlap.ambiguous, true);
  assert.equal(overlap.nonexistent, false);
  assert.equal(overlap.offsetMinutes, -240); // first occurrence = EDT (UTC-4)
});

test('Arizona and Hawaii observe no DST', async () => {
  const { bt } = await libs();
  const azSummer = bt.wallTimeToInstant({ year: 2026, month: 7, day: 4, hour: 12, minute: 0 }, 'America/Phoenix');
  const azWinter = bt.wallTimeToInstant({ year: 2026, month: 1, day: 15, hour: 12, minute: 0 }, 'America/Phoenix');
  assert.equal(azSummer.offsetMinutes, -420);
  assert.equal(azWinter.offsetMinutes, -420);
  const hi = bt.wallTimeToInstant({ year: 2026, month: 7, day: 4, hour: 12, minute: 0 }, 'Pacific/Honolulu');
  assert.equal(hi.offsetMinutes, -600);
});

test('Vietnam is UTC+7 year-round; legacy VN profiles keep the exact +07:00 instant', async () => {
  const { bt, bl } = await libs();
  const hanoi = bt.wallTimeToInstant({ year: 1990, month: 5, day: 5, hour: 23, minute: 30 }, bl.VN_ZONE);
  assert.equal(hanoi.offsetMinutes, 420);
  assert.equal(new Date(hanoi.epochMs).toISOString(), '1990-05-05T16:30:00.000Z');
  // The pre-international formula `new Date("1990-05-05T23:30:00+07:00")` matches exactly.
  assert.equal(hanoi.epochMs, new Date('1990-05-05T23:30:00+07:00').getTime());
});

test('near-midnight wall times stay on their civil date', async () => {
  const { bt } = await libs();
  const ny = bt.wallTimeToInstant({ year: 2026, month: 1, day: 1, hour: 0, minute: 30 }, 'America/New_York');
  assert.equal(new Date(ny.epochMs).toISOString(), '2026-01-01T05:30:00.000Z');
});

test('invalid zones and malformed clock/date inputs are rejected, not guessed', async () => {
  const { bt } = await libs();
  assert.equal(bt.wallTimeToInstant({ year: 2026, month: 1, day: 1, hour: 0, minute: 0 }, 'Not/AZone'), null);
  assert.equal(bt.isValidZone('America/Nowhere_Fake'), false);
  assert.equal(bt.parseClock('25:00'), null);
  assert.equal(bt.parseClock(undefined), null);
  assert.equal(bt.parseClock('07:05'), 425);
  assert.equal(bt.parseIsoDate('1990-5-5'), null);
  assert.deepEqual(bt.parseIsoDate('1990-05-05'), { year: 1990, month: 5, day: 5 });
});

test('zone resolution: placeTz wins; VN legacy falls back to Asia/Ho_Chi_Minh', async () => {
  const { bl } = await libs();
  assert.equal(bl.resolveProfileZone({ placeTz: 'America/Denver', place: 'Colorado' }), 'America/Denver');
  assert.equal(bl.resolveProfileZone({ place: 'Hà Nội' }), bl.VN_ZONE);
  assert.equal(bl.resolveProfileZone({}), bl.VN_ZONE);
  assert.equal(bl.resolveProfileZone({ placeTz: 'Fake/Zone' }), bl.VN_ZONE);
});

test('birth place search: offline, deterministic, includes VN + US + world; never reads the browser zone', async () => {
  const { bl } = await libs();
  const vn = bl.vnProvincePlace('Hà Nội');
  assert.deepEqual(vn, { label: 'Hà Nội', zone: 'Asia/Ho_Chi_Minh', group: 'VN' });
  assert.equal(bl.vnProvincePlace('Los Angeles'), null);
  assert.ok(bl.US_STATE_ZONES.Arizona === 'America/Phoenix');
  assert.ok(bl.searchBirthPlaces('york').some(p => p.label === 'New York'));
  assert.ok(bl.searchBirthPlaces('hà').some(p => p.label === 'Hà Nội'));
  assert.ok(bl.searchBirthPlaces('tokyo').length === 1);
  assert.ok(bl.searchBirthPlaces('').length <= 24);
});

test('two locales feed the same wall data to the same instant (math is locale-free)', async () => {
  const { bt } = await libs();
  const wall = { year: 2000, month: 2, day: 29, hour: 6, minute: 15 };
  const a = bt.wallTimeToInstant(wall, 'America/New_York');
  const b = bt.wallTimeToInstant(wall, 'America/New_York');
  assert.equal(a.epochMs, b.epochMs);
  assert.equal(new Date(a.epochMs).toISOString(), '2000-02-29T11:15:00.000Z');
});

test('natalTime: legacy VN profiles keep byte-identical instants; US zone shifts the instant', async () => {
  const { natalTime } = await load('lib/zodiac.ts');
  const legacy = natalTime({ dob: '1990-05-05', hourChi: 'Tý (23–1)', birthTime: '23:30' });
  assert.equal(legacy.getTime(), new Date('1990-05-05T23:30:00+07:00').getTime());
  const us = natalTime({
    dob: '1990-05-05',
    hourChi: 'Tý (23–1)',
    birthTime: '23:30',
    place: 'California',
    placeTz: 'America/Los_Angeles',
  });
  assert.equal(new Date(us).toISOString(), '1990-05-06T06:30:00.000Z');
  const noon = natalTime({ dob: '2000-02-29', hourChi: '', placeTz: 'America/New_York' });
  assert.equal(new Date(noon).toISOString(), '2000-02-29T17:00:00.000Z');
});

test('natalTime: ambiguous DST birth honors the explicit occurrence choice', async () => {
  const { natalTime } = await load('lib/zodiac.ts');
  const base = { dob: '2026-11-01', hourChi: '', birthTime: '01:30', placeTz: 'America/New_York' };
  const first = natalTime({ ...base });
  const second = natalTime({ ...base, birthDst: 'second' });
  assert.equal(new Date(first).toISOString(), '2026-11-01T05:30:00.000Z'); // EDT
  assert.equal(new Date(second).toISOString(), '2026-11-01T06:30:00.000Z'); // EST
});
