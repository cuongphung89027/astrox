import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';
const { readPalmHistory, savePalmHistory, deletePalmHistory } = await load('lib/palm-history.ts');
const storage = () => {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};
const entry = (id = '1') => ({
  id,
  savedAt: 100,
  locale: 'vi',
  side: 'Tay trái',
  dominant: 'Tay phải',
  question: 'Q',
  reading: {
    quality: 'ok',
    message: '',
    summary: 'Một bài đọc',
    lines: [
      {
        name: 'Tâm đạo',
        observation: 'Nếp rõ',
        reading: 'Chiêm nghiệm',
        points: [
          [0.1, 0.2],
          [0.2, 0.3],
        ],
        overlayVerified: true,
      },
    ],
  },
  photo: 'data:image/jpeg;base64,PRIVATE',
  image: 'PRIVATE',
});
test('saved snapshots whitelist fields and remove photo/base64/geometry', () => {
  const s = storage();
  savePalmHistory(s, 'a', entry());
  const raw = s.getItem('a');
  assert.doesNotMatch(raw, /PRIVATE|base64|photo|image|overlayVerified.*true/);
  assert.deepEqual(readPalmHistory(s, 'a', 'vi')[0].reading.lines[0].points, []);
});
test('account key and locale are isolated, corrupted data is ignored', () => {
  const s = storage();
  savePalmHistory(s, 'account:a', entry());
  assert.equal(readPalmHistory(s, 'account:b', 'vi').length, 0);
  assert.equal(readPalmHistory(s, 'account:a', 'en').length, 0);
  s.setItem('bad', '{');
  assert.deepEqual(readPalmHistory(s, 'bad', 'vi'), []);
});
test('history caps at 20, re-save replaces immutable ID, delete removes it', () => {
  const s = storage();
  for (let i = 0; i < 25; i++) savePalmHistory(s, 'a', { ...entry(String(i)), savedAt: i });
  assert.equal(readPalmHistory(s, 'a', 'vi').length, 20);
  savePalmHistory(s, 'a', { ...entry('24'), question: 'Edited' });
  assert.equal(readPalmHistory(s, 'a', 'vi').filter(e => e.id === '24').length, 1);
  deletePalmHistory(s, 'a', '24');
  assert.ok(!readPalmHistory(s, 'a', 'vi').some(e => e.id === '24'));
});
test('quota errors and retake results are not reported as saved', () => {
  assert.throws(
    () =>
      savePalmHistory(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error('quota');
          },
        },
        'a',
        entry(),
      ),
    /quota/,
  );
  assert.throws(() =>
    savePalmHistory(storage(), 'a', {
      ...entry(),
      reading: { quality: 'retake', message: 'Chụp lại', summary: '', lines: [] },
    }),
  );
});

test('long questions are preserved and oversized history prunes oldest entries', () => {
  const s = storage();
  for (let i = 0; i < 20; i++)
    savePalmHistory(s, 'a', { ...entry(String(i)), question: 'q'.repeat(80000), savedAt: i });
  assert.ok(s.getItem('a').length <= 1500000);
  assert.equal(readPalmHistory(s, 'a', 'vi')[0].question.length, 80000);
  assert.equal(readPalmHistory(s, 'a', 'vi')[0].id, '19');
});
