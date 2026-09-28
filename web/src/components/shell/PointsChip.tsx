'use client';

/**
 * PointsChip — số dư AstroX Point trên header, đặt trái avatar. Bấm vào mở
 * màn Ví Point (/hoso?section=points). Cùng palette với thẻ ví trong AuthMenu
 * (ngọc đậm #244e42 + chữ vàng kem), số chạy NumberPopIn khi đổi giá trị.
 */
import { useLocale } from '@/i18n/LocaleProvider';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usePointsBalance } from '@/lib/points';
import { NumberPopIn } from '@/components/motion';
import { PointCoin } from '@/components/points/PointCoin';
import styles from './PointsChip.module.css';

export function PointsChip() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const { loggedIn, astroxUser } = useAuth();
  const preview = astroxUser?.id === 'localhost-preview';
  const { points, status, market } = usePointsBalance(!preview);
  if (!loggedIn || !astroxUser) return null;
  const unit = market ? (market === 'US' ? 'Credits' : 'Point') : en ? 'Credits' : 'Point';
  const value = preview ? 1000 : points;
  const label = value === null ? null : value.toLocaleString(en ? 'en-US' : 'vi-VN');
  return (
    <Link
      href={en ? '/en/profile?section=points' : '/hoso?section=points'}
      className={styles.chip}
      aria-label={`${en ? 'AstroX wallet' : 'Ví AstroX'}${label ? ` — ${label} ${unit}` : ''}`}
    >
      <PointCoin size={16} className={styles.coin} />
      {label === null ? (
        <span className={styles.dots} aria-hidden="true">
          {status === 'error' ? '—' : '•••'}
        </span>
      ) : (
        <span className={styles.value}>
          <NumberPopIn value={label} />
        </span>
      )}
    </Link>
  );
}
