/**
 * Tách dòng trong một đoạn luận giải AI thành cụm prose / bullet.
 *
 * AI đôi khi trả bullet markdown "*" dù hệ thống yêu cầu "-", và hay gộp
 * "**Tiêu đề**" cùng các dòng bullet trong một đoạn. Renderer (AiText) dùng
 * kết quả này để vẽ cụm prose thành <p> và cụm bullet thành <ul> hiển thị
 * marker "•" thay vì hiện nguyên dấu "*".
 */
export type ReadingSegment = { type: 'p' | 'ul'; lines: string[] };

const BULLET_RE = /^\s*[-•*]\s+/;

export function isBulletLine(line: string): boolean {
  return BULLET_RE.test(line);
}

export function stripBullet(line: string): string {
  return line.replace(BULLET_RE, '');
}

/** Gom các dòng liên tiếp cùng loại: prose → 'p', bullet (- / • / *) → 'ul'. */
export function readingSegments(lines: string[]): ReadingSegment[] {
  const segments: ReadingSegment[] = [];
  for (const line of lines) {
    const type: ReadingSegment['type'] = isBulletLine(line) ? 'ul' : 'p';
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.lines.push(line);
    else segments.push({ type, lines: [line] });
  }
  return segments;
}
