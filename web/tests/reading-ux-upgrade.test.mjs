import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

test('glossary lookups work in Vietnamese and English', async () => {
  const { lookupGlossary } = await load('lib/glossary.ts');

  // Deities
  const tlVi = lookupGlossary('Thanh Long', 'vi');
  assert.ok(tlVi);
  assert.equal(tlVi.term, 'Thanh Long');
  assert.ok(tlVi.brief.includes('cát lợi'));

  const tlEn = lookupGlossary('Azure Dragon', 'en');
  assert.ok(tlEn);
  assert.equal(tlEn.term, 'Azure Dragon');
  assert.ok(tlEn.brief.includes('auspicious'));

  // Zi Wei concepts
  const cucVi = lookupGlossary('Kim Tứ Cục', 'vi');
  assert.ok(cucVi);
  assert.ok(cucVi.brief.includes('Kim'));

  const tdVi = lookupGlossary('Thiên Đồng', 'vi');
  assert.ok(tdVi);
  assert.ok(tdVi.brief.includes('Thủy'));

  // Taboos
  const tnVi = lookupGlossary('Tam nương', 'vi');
  assert.ok(tnVi);

  // Unknown term returns null
  assert.equal(lookupGlossary('random-nonexistent-term-xyz'), null);
});

test('day guide maps 12 deities to concise suitable and avoid activities', async () => {
  const { getDayGuideByName, formatDaySummary } = await load('lib/day-guide.ts');

  const guide = getDayGuideByName('Ngọc Đường');
  assert.ok(guide);
  assert.equal(guide.isGood, true);

  const summaryVi = formatDaySummary(guide, 'vi');
  assert.ok(summaryVi.suitable.length > 0);

  const summaryEn = formatDaySummary(guide, 'en');
  assert.ok(summaryEn.suitable.length > 0);

  const darkGuide = getDayGuideByName('Thiên Hình');
  assert.ok(darkGuide);
  assert.equal(darkGuide.isGood, false);
});

test('navGroups builds 4 structured navigation groups for VI and EN', async () => {
  const { navGroups } = await load('lib/nav.ts');

  const viGroups = navGroups('vi');
  const enGroups = navGroups('en');

  // Home link
  assert.equal(viGroups[0].type, 'link');
  assert.equal(viGroups[0].href, '/');
  assert.equal(enGroups[0].type, 'link');
  assert.equal(enGroups[0].href, '/en');

  // Tìm hiểu bản thân (Self) group
  const viSelf = viGroups.find(g => g.type === 'group' && g.id === 'self');
  const enSelf = enGroups.find(g => g.type === 'group' && g.id === 'self');
  assert.ok(viSelf && viSelf.type === 'group');
  assert.ok(enSelf && enSelf.type === 'group');
  assert.equal(viSelf.label, 'Tìm hiểu bản thân');
  assert.equal(enSelf.label, 'Know Yourself');
  assert.deepEqual(viSelf.items.map(i => i.id), ['tuvi', 'batu', 'numerology', 'zodiac']);
  assert.deepEqual(enSelf.items.map(i => i.id), ['tuvi', 'batu', 'numerology', 'zodiac']);

  // Hỏi đáp (QA) group
  const viQa = viGroups.find(g => g.type === 'group' && g.id === 'qa');
  const enQa = enGroups.find(g => g.type === 'group' && g.id === 'qa');
  assert.ok(viQa && viQa.type === 'group');
  assert.ok(enQa && enQa.type === 'group');
  assert.equal(viQa.label, 'Hỏi đáp');
  assert.equal(enQa.label, 'Ask');
  assert.deepEqual(viQa.items.map(i => i.id), ['tarot', 'kinhdich', 'palm']);
  assert.deepEqual(enQa.items.map(i => i.id), ['tarot', 'kinhdich', 'palm']);

  // Lunar calendar link
  assert.ok(viGroups.some(g => g.type === 'link' && g.id === 'lunar-calendar'));
  assert.ok(enGroups.some(g => g.type === 'link' && g.id === 'lunar-calendar'));

  // Experts: only in VI, omitted in EN
  assert.ok(viGroups.some(g => g.type === 'link' && g.id === 'experts'));
  assert.ok(!enGroups.some(g => g.type === 'link' && g.id === 'experts'));
});
