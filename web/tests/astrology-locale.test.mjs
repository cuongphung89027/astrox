import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

async function mods() {
  const en = await load('i18n/astrology-en.ts');
  const tuvi = await load('lib/tuvi.ts');
  const batu = await load('lib/batu.ts');
  const zodiac = await load('lib/zodiac.ts');
  return { en, tuvi, batu, zodiac };
}

test('zi wei chart facts are identical across locales except labels (invariants hold)', async () => {
  const { tuvi } = await mods();
  const input = { dob: '1990-05-05', gender: 'Nam', hourChi: 'Tý (23:00–00:59)', place: 'Hà Nội' };
  const vi = tuvi.buildZiweiChart(input, 'vi');
  const en = tuvi.buildZiweiChart(input, 'en');
  assert.equal(vi.palaces.length, en.palaces.length);
  // meta.zodiac/soul are display labels: they localize, they never re-compute.
  assert.notEqual(vi.meta.zodiac, en.meta.zodiac);
  assert.match(String(en.meta.zodiac), /^[a-z]+$/i);
  assert.match(String(en.meta.soul), /^[a-z]+(\s[a-z]+)?$/i);
  // English chart carries English palace/star names.
  const viNames = vi.palaces.map(p => p.name).join(',');
  const enNames = en.palaces.map(p => p.name).join(',');
  assert.notEqual(viNames, enNames);
  assert.match(enNames, /^[a-zA-Z][a-zA-Z ]*(,[a-zA-Z][a-zA-Z ]*)*$/);
});

test('ba zi pillars keep stems/branches/objects identical; only labels localize', async () => {
  const { batu } = await mods();
  const input = { dob: '1990-05-05', gender: 'Nam', hourChi: 'Ngọ (11:00–12:59)', place: 'Hà Nội' };
  const vi = batu.buildBatuChart(input, 'vi');
  const en = batu.buildBatuChart(input, 'en');
  assert.equal(vi.pillars.year.hanGan, en.pillars.year.hanGan); // raw stem id (甲) unchanged
  assert.equal(vi.pillars.day.hanZhi, en.pillars.day.hanZhi);
  for (const key of ['year', 'month', 'day', 'time']) {
    assert.notEqual(vi.pillars[key].viGan, en.pillars[key].viGan, `${key} stem label`);
    assert.match(en.pillars[key].viGan, /^[A-Z][a-z]+/);
  }
  assert.equal(vi.wuxing.kim, en.wuxing.kim); // element counts are facts
});

test('english label tables cover every Vietnamese key they claim to mirror', async () => {
  const { en, batu, tuvi, zodiac } = await mods();
  for (const key of Object.keys(batu.BATU_STEM_VI)) assert.ok(en.BATU_STEM_EN[key], `stem ${key}`);
  for (const key of Object.keys(batu.BATU_BRANCH_VI)) assert.ok(en.BATU_BRANCH_EN[key], `branch ${key}`);
  for (const key of Object.keys(batu.BATU_SHISHEN_VI)) assert.ok(en.BATU_SHISHEN_EN[key], `shishen ${key}`);
  for (const topic of tuvi.TUVI_TOPICS) {
    assert.ok(en.TUVI_TOPICS_EN[topic.id], `topic ${topic.id}`);
    for (const sub of topic.subs) assert.ok(en.TUVI_TOPICS_EN[topic.id].subs[sub.id], `sub ${topic.id}/${sub.id}`);
  }
  for (const sign of zodiac.ZODIAC_SIGNS) {
    assert.ok(en.ZODIAC_TRAITS_EN[sign.id], `traits ${sign.id}`);
    assert.ok(en.ZODIAC_ELEMENT_EN[sign.element], `element ${sign.element}`);
    assert.ok(en.ZODIAC_QUALITY_EN[sign.quality], `quality ${sign.quality}`);
    assert.ok(sign.en && sign.en.length > 1, `en name ${sign.id}`);
  }
});

test('natal chart for English carries English planet names and sign names', async () => {
  const { zodiac } = await mods();
  const profile = {
    name: 'An',
    gender: 'Nam',
    dob: '1990-05-05',
    hourChi: 'Ngọ (11:00–12:59)',
    birthTime: '11:30',
    place: 'Hà Nội',
  };
  const vi = zodiac.buildNatalChart(profile, 'vi');
  const en = zodiac.buildNatalChart(profile, 'en');
  assert.equal(vi.big3.sun.sign.name, 'Kim Ngưu');
  assert.equal(en.big3.sun.sign.name, 'Taurus');
  assert.equal(en.planets[0].name, 'Sun');
  assert.equal(vi.planets[0].name, 'Mặt Trời');
  assert.match(en.aspects.every(a => /^[A-Z][a-z]+/.test(a.aspect)) ? 'ok' : 'bad', /ok/);
  // Positions must be byte-identical: localization never re-computes astronomy.
  assert.equal(vi.big3.sun.longitude.toFixed(6), en.big3.sun.longitude.toFixed(6));
  for (let i = 0; i < vi.planets.length; i++)
    assert.equal(vi.planets[i].longitude.toFixed(6), en.planets[i].longitude.toFixed(6));
});

test('international birth without coordinates still yields planet positions (degraded, no houses)', async () => {
  const { zodiac } = await mods();
  const us = {
    name: 'Sam',
    gender: 'Nam',
    dob: '1990-05-05',
    hourChi: 'Ngọ (11:00–12:59)',
    birthTime: '11:30',
    place: 'California',
    placeTz: 'America/Los_Angeles',
  };
  const chart = zodiac.buildNatalChart(us, 'en');
  assert.ok(chart);
  assert.equal(chart.planets.length > 0, true);
  assert.deepEqual(chart.houses, []);
  assert.equal(chart.big3, null);
  const withCoords = zodiac.buildNatalChart({ ...us, placeLat: 37.2, placeLon: -119.4 }, 'en');
  assert.equal(withCoords.houses.length, 12);
  assert.ok(withCoords.big3);
  assert.equal(withCoords.points?.ascendant.name, 'Ascendant');
});

test('hour chi labels display per locale without touching stored values', async () => {
  const { en } = await mods();
  assert.equal(en.hourChiLabel('Tý (23:00–00:59)', 'vi'), 'Tý (23:00–00:59)');
  assert.equal(en.hourChiLabel('Tý (23:00–00:59)', 'en'), 'Zi (11pm–1am)');
  assert.equal(en.hourChiLabel('Ngọ (11:00–12:59)', 'en'), 'Wu (11am–1pm)');
});

test('Ba Zi English rendering retains every computed branch relationship', async () => {
  const { buildBatuChart } = await load('lib/batu.ts');
  for (const dob of ['1990-01-01', '1995-06-15', '2000-02-20']) {
    const input = { name: 'Test', dob, gender: 'Nam', hourChi: 'Tý', place: 'Hà Nội' };
    const vi = buildBatuChart(input, 'vi'),
      en = buildBatuChart(input, 'en');
    assert.deepEqual(
      en.relations.map(x => x.type),
      vi.relations.map(x => x.type),
    );
    assert.deepEqual(en.wuxing, vi.wuxing);
  }
});

test('English Zi Wei branches retain the same board positions, zodiac assets and life palace', async () => {
  const { buildZiweiChart, menhPalace } = await load('lib/tuvi.ts');
  const { earthlyBranch, zodiacAsset } = await load('lib/earthly-branches.ts');
  const p = { name: 'Alex', gender: 'Nam', dob: '1990-01-01', hourChi: 'Tý (23:00–01:00)', place: 'Hà Nội' };
  const vi = buildZiweiChart(p, 'vi'),
    en = buildZiweiChart(p, 'en');
  assert.equal(menhPalace(en)?.index, menhPalace(vi)?.index);
  for (let i = 0; i < 12; i++) {
    assert.equal(earthlyBranch(en.palaces[i].earthlyBranch)?.name, earthlyBranch(vi.palaces[i].earthlyBranch)?.name);
    assert.equal(zodiacAsset(en.palaces[i].earthlyBranch), zodiacAsset(vi.palaces[i].earthlyBranch));
  }
});

test('Zi Wei English star labels preserve the same element colors', async () => {
  const { tuvi } = await mods(),
    input = { dob: '1990-05-05', gender: 'Nam', hourChi: 'Tý (23:00–00:59)', place: 'Hà Nội' };
  const vi = tuvi.buildZiweiChart(input, 'vi'),
    en = tuvi.buildZiweiChart(input, 'en');
  for (let i = 0; i < vi.palaces.length; i++)
    for (const field of ['majorStars', 'minorStars', 'adjectiveStars']) {
      const a = vi.palaces[i][field] ?? [],
        b = en.palaces[i][field] ?? [];
      for (let j = 0; j < a.length; j++)
        assert.equal(tuvi.starElement(b[j].name), tuvi.starElement(a[j].name), `${a[j].name} / ${b[j].name}`);
    }
  assert.equal(tuvi.starElement('emperor'), tuvi.starElement('Tử Vi'));
});
