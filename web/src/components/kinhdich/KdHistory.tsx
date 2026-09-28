'use client';

/**
 * KdHistory — lịch sử gieo quẻ gần đây (localStorage riêng module, tối đa 5,
 * click xem lại). Nhỏ gọn: hàng pill cuộn ngang trên mobile.
 */
import { useLocale } from '@/i18n/LocaleProvider';
import { KD_METHODS_EN, HAO_NAMES_EN, HEXAGRAM_NAMES_EN } from '@/i18n/divination-en';
import { replayKdHistory, hexagramInfo } from '@/lib/kinhdich';
import styles from './KinhDich.module.css';
import { HAO_NAMES, KD_METHODS } from '@/lib/kinhdich';
import type { KdHistoryEntry } from '@/lib/kinhdich';

interface KdHistoryProps {
  entries: KdHistoryEntry[];
  onSelect: (entry: KdHistoryEntry) => void;
  onRemove: (id: string | number) => void;
}

function timeAgo(ts: number, en = false): string {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return en ? `${mins} min ago` : `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return en ? `${hours} hr ago` : `${hours} giờ trước`;
  return en ? `${Math.round(hours / 24)} days ago` : `${Math.round(hours / 24)} ngày trước`;
}

export function KdHistory({ entries, onSelect, onRemove }: KdHistoryProps) {
  const en = useLocale().locale === 'en';
  const name = (entry: KdHistoryEntry) => {
    if (!en) return entry.name;
    try {
      const r = replayKdHistory(entry);
      return HEXAGRAM_NAMES_EN[hexagramInfo(r.upper, r.lower).number - 1];
    } catch {
      return 'Saved hexagram';
    }
  };
  if (entries.length === 0) return null;
  return (
    <section className={styles.history} aria-label={en ? 'Recent hexagrams' : 'Lịch sử gieo quẻ gần đây'}>
      <h2>{en ? 'Recent hexagrams' : 'Quẻ gần đây'}</h2>
      <ul>
        {entries.map(entry => (
          <li key={entry.id || entry.savedAt}>
            <button onClick={() => onSelect(entry)} aria-label={`${en ? 'Reopen' : 'Xem lại quẻ'} ${name(entry)}`}>
              <span>{name(entry)}</span>
              <small>{entry.question || (en ? HAO_NAMES_EN : HAO_NAMES)[entry.movingPos]}</small>
              <time>
                {entry.snapshot
                  ? (en ? KD_METHODS_EN : KD_METHODS)[entry.snapshot.method || 'numbers']
                  : en
                    ? 'Three numbers · legacy'
                    : 'Ba số · bản cũ'}{' '}
                · {timeAgo(entry.savedAt, en)}
              </time>
            </button>
            <button
              aria-label={en ? `Remove ${name(entry)} from history` : `Xoá quẻ ${entry.name} khỏi lịch sử`}
              onClick={() => onRemove(entry.id || entry.savedAt)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
