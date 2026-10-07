'use client';
import Link from 'next/link';
import { FeatureIcon } from './FeatureIcon';
import { useLocale } from '@/i18n/LocaleProvider';
import { moduleRoute } from '@/lib/locale';

export function DevelopmentNotice() {
  const { locale } = useLocale();
  const en = locale === 'en';
  return (
    <section className="ax-development-notice" aria-labelledby="development-title">
      <div className="ax-development-icon" aria-hidden="true">
        <FeatureIcon name="palm" size={36} />
      </div>
      <p className="ax-development-badge">{en ? 'Under development' : 'Đang phát triển'}</p>
      <h1 id="development-title">{en ? 'Palm Reading' : 'Chỉ tay'}</h1>
      <p>
        {en
          ? 'We’re improving this experience. Palm reading is temporarily unavailable. Please come back later.'
          : 'AstroX đang cải tiến trải nghiệm này. Tính năng xem chỉ tay tạm thời chưa khả dụng. Bạn vui lòng quay lại sau.'}
      </p>
      <Link href={moduleRoute('home', locale)}>
        {en ? 'Back to home' : 'Về trang chủ'} <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
