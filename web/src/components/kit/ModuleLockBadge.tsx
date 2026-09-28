'use client';
import { useLocale } from '@/i18n/LocaleProvider';
/**
 * ModuleLockBadge — huy hiệu vàng kim đánh dấu module trả phí
 * (Tử Vi / Cung Hoàng Đạo / Bát Tự / Thần Số).
 */
import { DongSonSun } from './motifs/DongSonSun';

export function ModuleLockBadge({ className }: { className?: string }) {
  const en = useLocale().locale === 'en';
  return (
    <span
      title={en ? 'Premium feature' : 'Tính năng Premium'}
      className={`gold-ring inline-flex items-center gap-1.5 rounded-full bg-kim-tint px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-kim-deep ${className ?? ''}`}
    >
      <DongSonSun size={13} className="text-kim-deep" />
      Premium
    </span>
  );
}
