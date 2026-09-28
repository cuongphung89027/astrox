'use client';

import { useEffect, useState } from 'react';
import { AUTH_API_BASE } from '@/lib/config';
import { formatHistoryDelta } from '@/lib/format-history-delta';
import { useLocale } from '@/i18n/LocaleProvider';
import { PointCoin } from './PointCoin';
import styles from './PointsHome.module.css';

type CreditEntry = { id: string; delta: number; kind: string; created_at: string };
const labels: Record<string, [string, string]> = {
  purchase: ['Nạp Credits', 'Credit purchase'],
  bonus: ['Thưởng Credits', 'Bonus credits'],
  spend: ['Dùng Credits', 'Credits spent'],
  release: ['Hủy giữ Credits', 'Reservation released'],
  refund: ['Thu hồi Credits do hoàn tiền', 'Purchase refund'],
  adjustment: ['Điều chỉnh', 'Adjustment'],
};

export function CreditsHistory({ userId, refreshKey }: { userId: string; refreshKey?: unknown }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const numberLocale = en ? 'en-US' : 'vi-VN';
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<{ owner: string; entries: CreditEntry[]; error?: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`${AUTH_API_BASE}/api/credits/history?limit=50`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error('history_unavailable');
        const data = await response.json();
        if (!Array.isArray(data.entries)) throw new Error('invalid_history');
        if (active) setPage({ owner: userId, entries: data.entries });
      })
      .catch(() => {
        if (active) setPage({ owner: userId, entries: [], error: true });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, refreshKey, attempt]);
  const current = page?.owner === userId ? page : null;
  return (
    <section className={styles.ledger} aria-label={en ? 'Credits history' : 'Lịch sử Credits'}>
      <h3>{en ? 'Recent transactions' : 'Giao dịch gần đây'}</h3>
      <p>{en ? 'Up to 50 latest Credits transactions.' : 'Tối đa 50 giao dịch Credits mới nhất.'}</p>
      {!current ? (
        <p role="status">{en ? 'Loading…' : 'Đang tải…'}</p>
      ) : current.error ? (
        <p role="alert">
          {en ? 'Could not load history. ' : 'Chưa tải được lịch sử. '}
          <button type="button" onClick={() => setAttempt(n => n + 1)}>
            {en ? 'Try again' : 'Thử lại'}
          </button>
        </p>
      ) : current.entries.length === 0 ? (
        <p>{en ? 'No transactions yet.' : 'Chưa có giao dịch.'}</p>
      ) : (
        <div className={styles.rows}>
          {current.entries.map(entry => (
            <div
              key={entry.id}
              className={styles.row}
              data-dir={entry.delta < 0 ? 'out' : entry.delta > 0 ? 'in' : 'pending'}
            >
              <span className={styles.rowIcon}>
                <PointCoin />
              </span>
              <div className={styles.rowMain}>
                <p className={styles.rowLabel}>
                  {labels[entry.kind]?.[en ? 1 : 0] ?? (en ? 'Adjustment' : 'Điều chỉnh')}
                </p>
                <time className={styles.rowWhen} dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleString(numberLocale)}
                </time>
              </div>
              <p className={styles.rowDelta}>{formatHistoryDelta(entry.delta, numberLocale)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
