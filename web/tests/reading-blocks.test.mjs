import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

test('markdown "*" bullets are treated as list lines like "-" and "•"', async () => {
  const { readingSegments, stripBullet } = await load('lib/reading-blocks.ts');
  const segments = readingSegments(['**Điểm mạnh**', '* Tử Vi tọa Mệnh', '* Lộc Tồn hội Quyền', 'Đoạn kết.']);
  assert.deepEqual(segments, [
    { type: 'p', lines: ['**Điểm mạnh**'] },
    { type: 'ul', lines: ['* Tử Vi tọa Mệnh', '* Lộc Tồn hội Quyền'] },
    { type: 'p', lines: ['Đoạn kết.'] },
  ]);
  assert.equal(stripBullet('* Tử Vi tọa Mệnh'), 'Tử Vi tọa Mệnh');
  assert.equal(stripBullet('- Lộc Tồn hội Quyền'), 'Lộc Tồn hội Quyền');
  assert.equal(stripBullet('• Không sao'), 'Không sao');
});

test('pure prose block stays a single paragraph segment', async () => {
  const { readingSegments } = await load('lib/reading-blocks.ts');
  assert.deepEqual(readingSegments(['Dòng một.', 'Dòng hai.']), [{ type: 'p', lines: ['Dòng một.', 'Dòng hai.'] }]);
});

test('emphasis like *từ* giữa câu không bị nhầm thành bullet', async () => {
  const { isBulletLine } = await load('lib/reading-blocks.ts');
  assert.equal(isBulletLine('Đây là *nhấn mạnh* trong câu.'), false);
  assert.equal(isBulletLine('* mục bắt đầu bằng sao'), true);
  assert.equal(isBulletLine('*một dòng thiếu khoảng trắng sau sao'), false);
});

test('bullet list sau tiêu đề rồi quay lại prose tạo 3 cụm', async () => {
  const { readingSegments } = await load('lib/reading-blocks.ts');
  const segments = readingSegments(['- a', '- b', 'Tiêu đề mới', '- c']);
  assert.deepEqual(
    segments.map(s => s.type),
    ['ul', 'p', 'ul'],
  );
});
