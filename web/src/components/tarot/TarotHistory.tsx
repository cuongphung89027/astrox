'use client';

/**
 * TarotHistory — nhật ký các lượt trải đã luận giải: danh sách lượt trải gần
 * đây (mỗi lượt hiện bộ bài mini, câu hỏi, kiểu trải, ngày dd/mm/yyyy), nhấn
 * xem lại toàn bộ các lá + luận giải; xoá từng lượt. Đọc localStorage sau
 * mount để không lệch hydration với HTML tĩnh.
 */
import { useParityCopy } from '@/i18n/parity-copy';
import { useLocale } from '@/i18n/LocaleProvider';
import { trackFeature } from '@/lib/feature-telemetry';
import { useEffect, useRef, useState } from 'react';
import { GlassCard } from '@/components/kit';
import { useToast } from '@/components/motion/toast';
import { removeTarotHistory, type TarotHistoryEntry } from '@/lib/tarot-history';
import { TAROT_DECKS, tarotCardImage, tarotDeckById } from '@/lib/tarot';
import { TarotReading } from './TarotReading';
import { useTarotHistory } from '@/lib/use-tarot-history';
import { cacheFingerprint } from '@/lib/state';
import styles from './Tarot.module.css';

const two = (n: number) => String(n).padStart(2, '0');
const day = (ts: number, en = false) => {
  if (en) return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const d = new Date(ts);
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const dayTime = (ts: number, en = false) => {
  if (en)
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  const d = new Date(ts);
  return `${day(ts)} · ${two(d.getHours())}:${two(d.getMinutes())}`;
};
const deckFor = (deckId: string) => tarotDeckById(deckId) ?? TAROT_DECKS[0];

export function TarotHistory({ onClose }: { onClose: () => void }) {
  const parityCopy = useParityCopy();

  const en = useLocale().locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  const entries = useTarotHistory();
  const [selection, setSelection] = useState<{ id: string; fingerprint: string } | null>(null);
  const selected =
    selection?.fingerprint === cacheFingerprint() ? entries.find(entry => entry.id === selection.id) : undefined;
  const lastReported = useRef<string | null>(null);
  useEffect(() => {
    if (!selected) {
      lastReported.current = null;
      return;
    }
    if (lastReported.current === selected.id) return;
    lastReported.current = selected.id;
    trackFeature('result_view', 'tarot', 'saved');
  }, [selected]);
  const setSelected = (entry: TarotHistoryEntry | null) =>
    setSelection(entry ? { id: entry.id, fingerprint: cacheFingerprint() } : null);
  const { show } = useToast();
  const remove = (entry: TarotHistoryEntry) => {
    if (!confirm(copy('Xoá lượt trải này khỏi nhật ký?', 'Remove this reading from your journal?'))) return;
    try {
      removeTarotHistory(entry.id);
      if (selected?.id === entry.id) setSelected(null);
      show(copy('Đã xoá lượt trải khỏi nhật ký.', 'Reading removed from your journal.'), 'success');
    } catch {
      show(
        copy(
          'Chưa xoá được nhật ký. Vui lòng kiểm tra bộ nhớ trình duyệt.',
          'Unable to remove this reading. Check your browser storage.',
        ),
        'error',
      );
    }
  };

  /* ------------------------------ Xem 1 lượt ------------------------------ */
  if (selected) {
    const deck = deckFor(selected.deckId);
    return (
      <article className={`${styles.history} ${styles.ritual}`}>
        <header className={styles.ritualHeader}>
          <button
            onClick={() => setSelected(null)}
            aria-label={copy('Quay lại danh sách lượt trải', 'Back to readings')}
          >
            ←
          </button>
          <div>
            <span>
              {(selected.spreadName + (selected.frameLabel ? ` · ${selected.frameLabel}` : '')).toUpperCase()}
            </span>
            <h2>
              {selected.savedAt > 0
                ? `${en ? 'Reading from' : 'Lượt trải ngày'} ${day(selected.savedAt, en)}`
                : copy('Luận giải đã lưu', 'Saved reading')}
            </h2>
          </div>
          {selected.cards.length > 0 && (
            <span className={styles.ritualCount}>
              {selected.cards.length}
              <i> {en ? 'cards' : 'lá'}</i>
            </span>
          )}
        </header>
        {selected.question && <p className={styles.ritualQuestion}>{selected.question}</p>}
        {selected.cards.length > 0 ? (
          <div className={styles.historyTable}>
            <p className={styles.historyTableNote}>{parityCopy('NHỮNG LÁ BÀI CỦA LƯỢT TRẢI NÀY')}</p>
            <div className={styles.historyStrip}>
              {selected.cards.map((card, i) => (
                <figure
                  key={`${card.id}-${i}`}
                  className={styles.historyCard}
                  style={{ ['--i' as string]: String(Math.min(i, 10)) }}
                >
                  <img
                    src={tarotCardImage(deck, card.id)}
                    alt={`${card.nameEn}${card.reversed ? (en ? ' — reversed' : ' — ngược') : ''}`}
                    width={220}
                    height={385}
                    loading="lazy"
                    className={card.reversed ? styles.historyCardReversed : undefined}
                  />
                  <figcaption>
                    <b>{card.nameEn}</b>
                    <span>{card.position || `${en ? 'Card' : 'Lá'} ${i + 1}`}</span>
                    {card.reversed && <i>{copy('Ngược', 'Reversed')}</i>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : (
          <p className={styles.recoveredNote}>
            {copy(
              'Nội dung luận giải cũ vẫn được giữ lại. Bản lưu này không còn thông tin các lá bài.',
              'Your earlier interpretation is preserved. Card details are unavailable for this saved reading.',
            )}
          </p>
        )}
        <GlassCard className={`${styles.readingEnter} mt-4 p-5 sm:p-6`}>
          <TarotReading text={selected.text} />
        </GlassCard>
      </article>
    );
  }

  /* ----------------------------- Danh sách lượt ---------------------------- */
  return (
    <div className={`${styles.history} ${styles.ritual}`}>
      <header className={styles.ritualHeader}>
        <button onClick={onClose} aria-label={copy('Quay lại trải bài', 'Back to your spread')}>
          ←
        </button>
        <div>
          <span>{copy('NHẬT KÝ TRẢI BÀI', 'READING JOURNAL')}</span>
          <h2>{copy('Các lượt trải đã luận giải', 'Your interpreted readings')}</h2>
        </div>
        <span className={styles.ritualCount}>
          {entries?.length ?? 0}
          <i> {en ? 'readings' : 'lượt'}</i>
        </span>
      </header>

      <p className={styles.recoveredNote}>
        {copy(
          'Tối đa 24 lượt gần đây trong hồ sơ này, lưu trên thiết bị của bạn.',
          'The latest 24 readings for this profile are saved on your device.',
        )}
      </p>
      {entries.length === 0 ? (
        <div className={styles.historyEmpty}>
          <img src={TAROT_DECKS[0].back} alt="" width={220} height={385} aria-hidden="true" />
          <h3>{copy('Chưa có lượt trải nào được lưu', 'No saved readings yet')}</h3>
          <p>
            {copy(
              'Khi bạn hoàn tất một lượt luận giải, AstroX tự lưu vào đây để bạn đọc lại bất cứ lúc nào.',
              'Completed interpretations are saved here automatically so you can revisit them anytime.',
            )}
          </p>
          <button onClick={onClose}>
            {copy('Trải bài ngay', 'Start a reading')} <span aria-hidden="true">↗</span>
          </button>
        </div>
      ) : (
        <ul className={styles.historyRows}>
          {entries.map((entry, i) => {
            const deck = deckFor(entry.deckId);
            return (
              <li key={entry.id} className={styles.historyRow} style={{ ['--i' as string]: String(Math.min(i, 8)) }}>
                <button type="button" className={styles.historyOpen} onClick={() => setSelected(entry)}>
                  <span className={styles.historyFan} aria-hidden="true">
                    {entry.cards.slice(0, 3).map((card, ci) => (
                      <img
                        key={ci}
                        src={tarotCardImage(deck, card.id)}
                        alt=""
                        width={88}
                        height={154}
                        loading="lazy"
                        className={card.reversed ? styles.historyFanReversed : undefined}
                      />
                    ))}
                    {entry.cards.length > 3 && <b>+{entry.cards.length - 3}</b>}
                  </span>
                  <span className={styles.historyInfo}>
                    <strong>{entry.question || copy('Trải tổng quát', 'General reading')}</strong>
                    <small>
                      {entry.spreadName}
                      {entry.frameLabel ? ` · ${entry.frameLabel}` : ''}
                    </small>
                    {entry.savedAt > 0 && (
                      <time dateTime={new Date(entry.savedAt).toISOString()}>{dayTime(entry.savedAt, en)}</time>
                    )}
                  </span>
                  <span className={styles.historyChevron} aria-hidden="true">
                    ↗
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.historyRemove}
                  onClick={() => remove(entry)}
                  aria-label={
                    en
                      ? `Remove reading from ${dayTime(entry.savedAt, en)}`
                      : `Xoá lượt trải ngày ${dayTime(entry.savedAt, en)} khỏi nhật ký`
                  }
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
