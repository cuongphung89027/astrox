import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

async function mods() {
  const en = await load('i18n/divination-en.ts');
  const tarot = await load('lib/tarot.ts');
  const kd = await load('lib/kinhdich.ts');
  const ns = await load('lib/numerology.ts');
  return { en, tarot, kd, ns };
}

test('every tarot spread and position has an English mirror', async () => {
  const { en, tarot } = await mods();
  for (const s of tarot.TAROT_SPREADS) {
    const mirror = en.TAROT_SPREADS_EN[s.id];
    assert.ok(mirror, `spread ${s.id}`);
    const viPositions = s.positions?.map(p => p.label) ?? [];
    assert.equal(mirror.positions.length, viPositions.length, `positions ${s.id}`);
    for (const f of s.frames ?? []) {
      assert.ok(mirror.frames?.[f.id], `frame ${s.id}/${f.id}`);
      assert.equal(mirror.frames[f.id].positions.length, f.positions.length, `frame positions ${s.id}/${f.id}`);
    }
  }
  for (const d of tarot.TAROT_DECKS) assert.ok(typeof en.TAROT_DECK_DESC_EN[d.id] === 'string', `deck ${d.id}`);
});

test('every trigram, line, relation and all 64 hexagram names have English mirrors', async () => {
  const { en, kd } = await mods();
  for (const t of kd.TRIGRAMS) {
    const mirror = en.TRIGRAMS_EN[t.idx];
    assert.ok(mirror, `trigram ${t.idx}`);
    assert.ok(mirror.name && mirror.nature && mirror.elem && mirror.dir);
  }
  for (const pos of [1, 2, 3, 4, 5, 6]) assert.ok(en.HAO_NAMES_EN[pos]);
  for (const key of ['dong-hanh', 'dung-sinh-the', 'the-sinh-dung', 'the-khac-dung', 'dung-khac-the', 'khac'])
    assert.ok(en.KD_RELATION_EN[key], `relation ${key}`);
  assert.equal(en.HEXAGRAM_NAMES_EN.length, 64);
  // Vietnamese table must stay the source of truth for numbers.
  const upper = kd.TRIGRAMS.find(t => t.idx === 1);
  const lower = kd.TRIGRAMS.find(t => t.idx === 6);
  const info = kd.hexagramInfo(upper, lower);
  // VI table is the source of truth for numbering: Càn above + Khảm below = #6 Thiên Thủy Tụng.
  assert.equal(en.HEXAGRAM_NAMES_EN[info.number - 1], 'Conflict');
});

test('hexagram math is locale-independent: same bits, same number', async () => {
  const { kd } = await mods();
  const a = kd.castHexagram(3, 7, 5);
  const b = kd.castHexagram(3, 7, 5);
  assert.equal(a.upper.idx, b.upper.idx);
  assert.equal(a.movingPos, b.movingPos);
  assert.equal(kd.hexagramInfo(a.upper, a.lower).number, kd.hexagramInfo(b.upper, b.lower).number);
});

test('numerology: same name and birth date compute identical numbers; topics have EN mirrors', async () => {
  const { en, ns } = await mods();
  for (const topic of ns.NUMEROLOGY_TOPICS) assert.ok(en.NUMEROLOGY_TOPICS_EN[topic.id], `topic ${topic.id}`);
});

test('tarot spread ids and numerology name math are untouched by localization', async () => {
  const { tarot } = await mods();
  assert.deepEqual(
    tarot.TAROT_SPREADS.map(s => s.id),
    ['one', 'three', 'cross5', 'relationship5', 'celtic10'],
  );
});

test('US I Ching accepts NANP phone formats and keeps Vietnamese normalization unchanged', async () => {
  const kd = await load('lib/kinhdich.ts');
  assert.equal(kd.normalizeDigits('phone', '+1 (415) 555-1234', 'en'), '4155551234');
  assert.equal(kd.normalizeDigits('phone', '4155551234', 'en'), '4155551234');
  assert.equal(kd.normalizeDigits('phone', '+84 912 345 678'), '0912345678');
  assert.throws(() => kd.normalizeDigits('phone', '+44 20 7123 4567', 'en'));
  const us = kd.castDigits('phone', '+1 415 555 1234', 'en');
  assert.ok(!JSON.stringify(us).includes('4155551234'));
  assert.deepEqual(kd.replayKdHistory(kd.createKdHistory(us, 'Question')), us);
});
