'use client';

/**
 * LockPanel — panel khoá module khi tài khoản chưa được cấp quyền "tuvi"
 * (useAuth().isModuleAllowed === false). Port ngữ cảnh gate của app cũ.
 */
import Link from 'next/link';
import { useLocale } from '@/i18n/LocaleProvider';
import { ModuleLockBadge } from '@/components/kit';

export function LockPanel() {
  const en = useLocale().locale === 'en';
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-20">
      <div className="glass flex flex-col items-center gap-4 rounded-[var(--radius-card)] p-10 text-center">
        <ModuleLockBadge />
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-muc">
          {en ? 'Zi Wei access is not enabled' : 'Chưa được cấp quyền truy cập Tử Vi'}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muc-2">
          {en
            ? 'This feature is not enabled for your account. View pricing or contact AstroX for help; adding Credits does not automatically change access.'
            : 'Tính năng này hiện chưa được mở cho tài khoản của bạn. Xem bảng giá và liên hệ AstroX để được hỗ trợ; nạp Point không tự động thay đổi quyền truy cập.'}
        </p>
        <Link
          href={en ? '/en/pricing' : '/banggia'}
          className="inline-flex items-center gap-2 rounded-full bg-son px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-pop)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-son"
        >
          {en ? 'View pricing →' : 'Xem bảng giá →'}
        </Link>
      </div>
    </section>
  );
}
