import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

test('Vietnamese reading dates switch at Vietnam midnight, including the formerly incorrect 0–7 am window', async () => {
  const { readingDay } = await load('lib/reading-day.ts');
  for (const [instant, expected] of [
    ['2026-10-06T16:59:59.999Z', '2026-10-06'],
    ['2026-10-06T17:00:00.000Z', '2026-10-07'],
    ['2026-10-06T19:00:00.000Z', '2026-10-07'],
    ['2026-10-06T23:59:59.999Z', '2026-10-07'],
    ['2026-10-07T00:00:00.000Z', '2026-10-07'],
  ]) {
    assert.equal(readingDay(new Date(instant), 'vi', 'America/Los_Angeles'), expected, instant);
  }
});

test('English reading dates follow the current device zone rather than treating the whole US as Eastern time', async () => {
  const { readingDay } = await load('lib/reading-day.ts');
  const instant = new Date('2026-10-07T04:30:00.000Z');
  assert.equal(readingDay(instant, 'en', 'America/New_York'), '2026-10-07');
  assert.equal(readingDay(instant, 'en', 'America/Los_Angeles'), '2026-10-06');
});

test('New York reading dates account for the spring daylight-saving transition', async () => {
  const { readingDay } = await load('lib/reading-day.ts');
  assert.equal(readingDay(new Date('2026-03-08T04:30:00Z'), 'en', 'America/New_York'), '2026-03-07');
  assert.equal(readingDay(new Date('2026-03-09T04:30:00Z'), 'en', 'America/New_York'), '2026-03-09');
});

test('New York reading dates account for the fall daylight-saving transition', async () => {
  const { readingDay } = await load('lib/reading-day.ts');
  assert.equal(readingDay(new Date('2026-11-01T04:30:00Z'), 'en', 'America/New_York'), '2026-11-01');
  assert.equal(readingDay(new Date('2026-11-02T04:30:00Z'), 'en', 'America/New_York'), '2026-11-01');
});

test('Los Angeles reading dates account for both daylight-saving transitions', async () => {
  const { readingDay } = await load('lib/reading-day.ts');
  for (const [instant, expected] of [
    ['2026-03-08T07:30:00Z', '2026-03-07'],
    ['2026-03-09T07:30:00Z', '2026-03-09'],
    ['2026-11-01T07:30:00Z', '2026-11-01'],
    ['2026-11-02T07:30:00Z', '2026-11-01'],
  ]) {
    assert.equal(readingDay(new Date(instant), 'en', 'America/Los_Angeles'), expected, instant);
  }
});

test('Phoenix retains its own non-DST date boundary in summer and winter', async () => {
  const { readingDay } = await load('lib/reading-day.ts');
  for (const month of ['01', '07']) {
    assert.equal(readingDay(new Date(`2026-${month}-07T06:59:59Z`), 'en', 'America/Phoenix'), `2026-${month}-06`);
    assert.equal(readingDay(new Date(`2026-${month}-07T07:00:00Z`), 'en', 'America/Phoenix'), `2026-${month}-07`);
  }
});

test('Honolulu retains its own non-DST date boundary in summer and winter', async () => {
  const { readingDay } = await load('lib/reading-day.ts');
  for (const month of ['01', '07']) {
    assert.equal(readingDay(new Date(`2026-${month}-07T09:59:59Z`), 'en', 'Pacific/Honolulu'), `2026-${month}-06`);
    assert.equal(readingDay(new Date(`2026-${month}-07T10:00:00Z`), 'en', 'Pacific/Honolulu'), `2026-${month}-07`);
  }
});

test('New Year rolls over on the selected reading calendar, not the UTC calendar', async () => {
  const { readingDay } = await load('lib/reading-day.ts');
  assert.equal(readingDay(new Date('2025-12-31T17:00:00Z'), 'vi'), '2026-01-01');
  const instant = new Date('2026-01-01T07:30:00Z');
  assert.equal(readingDay(instant, 'en', 'America/New_York'), '2026-01-01');
  assert.equal(readingDay(instant, 'en', 'America/Los_Angeles'), '2025-12-31');
});

test('the reading time zone is fixed for Vietnamese and uses the selected device zone for English', async () => {
  const { readingTimeZone } = await load('lib/reading-day.ts');
  assert.equal(readingTimeZone('vi', 'America/New_York'), 'Asia/Ho_Chi_Minh');
  assert.equal(readingTimeZone('vi', 'Pacific/Honolulu'), 'Asia/Ho_Chi_Minh');
  assert.equal(readingTimeZone('en', 'America/New_York'), 'America/New_York');
  assert.equal(readingTimeZone('en', 'America/Los_Angeles'), 'America/Los_Angeles');
});

test('the Vietnamese reference almanac keeps its UTC+7 calendar even when English reading dates differ', async () => {
  const { referenceAlmanacDay, readingDay } = await load('lib/reading-day.ts');
  const instant = new Date('2026-10-06T19:00:00Z');
  assert.equal(referenceAlmanacDay(instant), '2026-10-07');
  assert.equal(readingDay(instant, 'vi'), referenceAlmanacDay(instant));
  assert.equal(readingDay(instant, 'en', 'America/Los_Angeles'), '2026-10-06');
  assert.equal(referenceAlmanacDay(new Date('2026-10-06T16:59:59Z')), '2026-10-06');
});
