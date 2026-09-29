'use client';

/**
 * Nút đổi ngôn ngữ — biểu tượng quả địa cầu (Sơn 29/09). Điều hướng full là
 * bắt buộc: hai cây vi/en nằm dưới root layout khác nhau nên client routing
 * không vượt qua được. Cookie axlang chỉ là tuỳ chọn hiển thị.
 *
 * Đang đăng nhập thì KHÔNG chuyển ngay: tài khoản gắn một quốc gia (Zalo→VN,
 * Google→US) nên popup cảnh báo sẽ logout trước khi chuyển (MarketGuard).
 * Ẩn trên trang không có bản đối ánh (vd. /admin, /chuyengia).
 */
import { usePathname } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleProvider';
import { crossLocalePath, type Locale } from '@/lib/locale';
import { useAuth } from '@/lib/auth';
import { openMarketGuard } from '@/lib/market-guard';

export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname() || '/';
  const t = useLocale();
  const { loggedIn } = useAuth();
  const target: Locale = t.locale === 'vi' ? 'en' : 'vi';
  const base = crossLocalePath(pathname, target);
  if (!base) return null;

  const switchLocale = () => {
    document.cookie = `axlang=${target}; path=/; max-age=31536000; samesite=lax; secure`;
    window.location.assign(base + (window.location.search || ''));
  };

  const onClick = () => {
    if (loggedIn) openMarketGuard('switch', { locale: target, href: base + (window.location.search || '') });
    else switchLocale();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t.t('locale.switchTo')}
      title={t.t('locale.switchTo')}
      className={className}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </button>
  );
}
