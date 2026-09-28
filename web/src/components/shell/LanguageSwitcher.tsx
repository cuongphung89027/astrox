'use client';

/**
 * Language switcher (plan Task 04). Full navigation is mandatory: the vi and en
 * trees live under different root layouts, so client-side routing cannot cross
 * them. The axlang cookie is a display preference only — never auth, never
 * market. Hidden on pages without a counterpart (e.g. /admin, /chuyengia).
 */
import { usePathname } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleProvider';
import { crossLocalePath, type Locale } from '@/lib/locale';

export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname() || '/';
  const t = useLocale();
  const target: Locale = t.locale === 'vi' ? 'en' : 'vi';
  const base = crossLocalePath(pathname, target);
  if (!base) return null;

  const switchLocale = () => {
    document.cookie = `axlang=${target}; path=/; max-age=31536000; samesite=lax; secure`;
    window.location.assign(base + (window.location.search || ''));
  };

  return (
    <button type="button" onClick={switchLocale} aria-label={t.t('locale.switchTo')} className={className}>
      {target === 'en' ? 'EN' : 'VI'}
    </button>
  );
}
