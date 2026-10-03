import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePalmReading } from '../src/lib/palm.ts';
const reading = points =>
  JSON.stringify({
    quality: 'ok',
    message: '',
    summary: 'Tổng quan',
    lines: [{ name: 'Tâm đạo', observation: 'Nếp rõ', reading: 'Góc nhìn', points }],
  });
test('missing geometry preserves a valid textual observation', () => {
  assert.equal(parsePalmReading(reading(undefined)).lines[0].observation, 'Nếp rõ');
  assert.deepEqual(parsePalmReading(reading(undefined)).lines[0].points, []);
});
test('bounded model coordinates are not evidence of verified creases', () => {
  assert.equal(
    parsePalmReading(
      reading([
        [0.2, 0.3],
        [0.4, 0.5],
      ]),
    ).lines[0].overlayVerified,
    false,
  );
});
test('out-of-bounds geometry is discarded without losing the reading', () => {
  assert.deepEqual(
    parsePalmReading(
      reading([
        [20, 30],
        [40, 50],
      ]),
    ).lines[0].points,
    [],
  );
});

test('empty interpretation cannot masquerade as a successful reading', () => {
  const d = JSON.parse(reading([]));
  d.lines[0].reading = '';
  assert.throws(() => parsePalmReading(JSON.stringify(d)));
});
test('retake cannot carry a contradictory summary', () =>
  assert.throws(() =>
    parsePalmReading(JSON.stringify({ quality: 'retake', message: 'Chụp lại', summary: 'Bạn thực tế', lines: [] })),
  ));
test('new line visibility/uncertainty are validated, legacy defaults stay readable', () => {
  const d = JSON.parse(reading([]));
  d.lines[0].visibility = 'partial';
  d.lines[0].uncertainty = 'Phần cuối bị che';
  assert.equal(parsePalmReading(JSON.stringify(d)).lines[0].uncertainty, 'Phần cuối bị che');
  assert.equal(parsePalmReading(reading([])).lines[0].visibility, 'uncertain');
  d.lines[0].visibility = 'verified';
  assert.throws(() => parsePalmReading(JSON.stringify(d)));
});

test('success needs at least one observed line', () =>
  assert.throws(() =>
    parsePalmReading(JSON.stringify({ quality: 'ok', message: '', summary: 'Tổng quan', lines: [] })),
  ));
