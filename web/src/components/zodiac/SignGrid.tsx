'use client';

/**
 * SignGrid — băng 12 cung hoàng đạo (bản tinh giản v5.1).
 * Nguyên tắc "single accent": toàn bộ ring một màu mực trung tính;
 * màu chỉ xuất hiện ở 2 nơi — cung của bạn (son) và cung đang chọn (kim).
 * Bỏ CardTilt/ShimmerText khỏi lưới để bớt noise; hover chỉ nhấc nhẹ.
 */
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './Zodiac.module.css';
import { ZODIAC_SIGNS, signDateRange } from '@/lib/zodiac';

interface SignGridProps {
  mySignId: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SignGrid({ mySignId, selectedId, onSelect }: SignGridProps) {
  const en = useLocale().locale === 'en';
  return (
    <div className={styles.signs} role="group" aria-label={en ? 'Select a zodiac sign' : 'Chọn cung hoàng đạo'}>
      {ZODIAC_SIGNS.map(sign => (
        <button key={sign.id} aria-pressed={selectedId === sign.id} onClick={() => onSelect(sign.id)}>
          <span aria-hidden="true">{sign.symbol.replace(/\uFE0F/g, '')}&#xfe0e;</span>
          <strong>{en ? sign.en : sign.name}</strong>
          <small>{mySignId === sign.id ? (en ? 'Your sign' : 'Cung của bạn') : signDateRange(sign)}</small>
        </button>
      ))}
    </div>
  );
}
