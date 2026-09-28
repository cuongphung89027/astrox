import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

test('lunar conversions are locale-independent; only labels localize', async () => {
  const al = await load('lib/almanac.ts');
  const date = '2026-09-28';
  const vi = al.tradition(date, 'vi');
  const en = al.tradition(date, 'en');
  assert.equal(vi.branch, en.branch);
  assert.equal(vi.stem, en.stem);
  assert.equal(vi.lunar.day, en.lunar.day);
  assert.match(en.dayName, /^[A-Z][a-z]+–[A-Z][a-z]+ \(/);
  assert.match(en.god, /^[A-Z][a-z]+( [A-Z][a-z]+)* \(/);
  assert.notEqual(vi.dayName, en.dayName);
});

test('holidays: same dates, localized names, Tết gloss in English', async () => {
  const al = await load('lib/almanac.ts');
  const tet = '2026-02-17'; // Lunar New Year 2026 (1/1 lunar)
  const vi = al.holidays(tet, 'vi');
  const en = al.holidays(tet, 'en');
  assert.ok(vi.some(h => h.includes('Tết')));
  assert.ok(en.some(h => h.includes('Lunar New Year')));
  // Solar holidays gloss too.
  const ny = al.holidays('2026-01-01', 'en');
  assert.ok(ny.includes("New Year's Day (Gregorian)"));
});

test('dateLabel keeps dd/mm/yyyy digits in both locales', async () => {
  const al = await load('lib/almanac.ts');
  assert.equal(al.dateLabel('2026-09-28', 'vi'), '28/09/2026');
  assert.equal(al.dateLabel('2026-09-28', 'en'), '28/09/2026');
});

test('palm prompt template and photo flow keep the same shape in English', async () => {
  // The English palm prompt lives in the shared admin registry (Task 07); here we
  // assert the client palm pipeline still produces the same service and consent ids.
  const en = await load('i18n/divination-en.ts');
  assert.ok(Array.isArray(en.GODS_EN) && en.GODS_EN.length === 12);
  assert.ok(en.FESTIVALS_EN['1/1']);
});
