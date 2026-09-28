'use client';
import { useState } from 'react';
import { lettersOnly, letterValue } from '@/lib/numerology';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './Numerology.module.css';
export function CipherBoard({ name }: { name: string; calcSeq: number }) {
  const t = useLocale();
  const en = t.locale === 'en';
  const [active, setActive] = useState<number | null>(null);
  const lettersAria = en ? `Letter values in the name ${name}` : `Quy đổi chữ cái trong tên ${name}`;
  const statusActive = en ? `Highlighting letters carrying ${active}.` : `Đang làm nổi bật các chữ mang số ${active}.`;
  const statusIdle = en ? 'Tap a number to find it in your name.' : 'Chạm một số để tìm trong tên của bạn.';
  return (
    <>
      <div className={styles.letters} aria-label={lettersAria}>
        {name
          .trim()
          .split(/\s+/)
          .map((word, wi) => (
            <div key={wi}>
              {lettersOnly(word)
                .split('')
                .map((ch, i) => {
                  const value = letterValue(ch);
                  return value ? (
                    <span key={i} data-dim={active !== null && active !== value}>
                      <strong>{ch}</strong>
                      <small>{value}</small>
                    </span>
                  ) : null;
                })}
            </div>
          ))}
      </div>
      <div
        className={styles.numberFilter}
        role="group"
        aria-label={en ? 'Pick a number from the name' : 'Chọn con số trong tên'}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} aria-pressed={active === n} onClick={() => setActive(active === n ? null : n)}>
            {n}
          </button>
        ))}
      </div>
      <p className={styles.gridStatus}>{active ? statusActive : statusIdle}</p>
    </>
  );
}
