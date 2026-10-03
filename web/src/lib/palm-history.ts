import { parsePalmReading, type PalmReading } from './palm';
export type PalmHistoryEntry = {
  id: string;
  savedAt: number;
  locale: 'vi' | 'en';
  side: string;
  dominant: string;
  question: string;
  reading: PalmReading;
};
type Store = Pick<Storage, 'getItem' | 'setItem'>;
function sanitize(value: unknown): PalmHistoryEntry {
  if (!value || typeof value !== 'object') throw new Error('INVALID_PALM_HISTORY');
  const e = value as PalmHistoryEntry;
  if (
    typeof e.id !== 'string' ||
    e.id.length > 100 ||
    !Number.isFinite(e.savedAt) ||
    !['vi', 'en'].includes(e.locale) ||
    !['Tay trái', 'Tay phải'].includes(e.side) ||
    !['Tay trái', 'Tay phải', 'Cả hai tay'].includes(e.dominant) ||
    typeof e.question !== 'string' ||
    e.question.length > 100000
  )
    throw new Error('INVALID_PALM_HISTORY');
  const reading = parsePalmReading(JSON.stringify(e.reading));
  if (reading.quality !== 'ok') throw new Error('INVALID_PALM_HISTORY');
  return {
    id: e.id,
    savedAt: e.savedAt,
    locale: e.locale,
    side: e.side,
    dominant: e.dominant,
    question: e.question,
    reading: { ...reading, lines: reading.lines.map(line => ({ ...line, points: [], overlayVerified: false })) },
  };
}
function stored(storage: Store, key: string): PalmHistoryEntry[] {
  const raw = storage.getItem(key);
  if (!raw || raw.length > 1500000) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 40).flatMap(e => {
      try {
        return [sanitize(e)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}
export function readPalmHistory(storage: Store, key: string, locale: 'vi' | 'en'): PalmHistoryEntry[] {
  try {
    return stored(storage, key)
      .filter(e => e.locale === locale)
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, 20);
  } catch {
    return [];
  }
}
export function savePalmHistory(storage: Store, key: string, entry: PalmHistoryEntry): void {
  const clean = sanitize(entry);
  const previous = stored(storage, key).filter(e => e.id !== clean.id || e.locale !== clean.locale);
  const next = [clean, ...previous].slice(0, 20);
  while (JSON.stringify(next).length > 1500000 && next.length > 1) next.pop();
  storage.setItem(key, JSON.stringify(next));
}
export function deletePalmHistory(storage: Store, key: string, id: string): void {
  storage.setItem(key, JSON.stringify(stored(storage, key).filter(e => e.id !== id)));
}
