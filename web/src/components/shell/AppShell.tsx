'use client';

/**
 * Khung app AstroX v6.3 — "Mặt Trời Đông Sơn".
 *
 * - Top bar LIQUID GLASS (ax-liquid-topbar) FIXED — luôn đè lên phần đầu nội
 *   dung (trang chủ: đè lên đỉnh video hero). Nav desktop chỉ hiện ≥lg với
 *   underline trượt màu theo module; <lg dùng BOTTOM DOCK. Nội dung trang
 *   thường (khác trang chủ) chừa pt-16 để khỏi chui dưới bar.
 * - Giảm chuyển động theo setting thiết bị (prefers-reduced-motion).
 * - Mobile (<lg): BOTTOM DOCK glass 4 mục + "Thêm" mở sheet (BottomDock).
 * - Logo: /assets/logo.png (logo AstroX chính thức, có sẵn wordmark).
 * - Nav/label theo locale từ web/src/lib/nav.ts (Task 05).
 */
import { FeatureReporting } from './FeatureReporting';
import { RuntimeReporting } from './RuntimeReporting';
import { PaidReadingConsent } from '@/components/kit/PaidReadingConsent';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/motion/toast';
import { ProfileModalProvider } from '@/components/profile/ProfileModal';
import { PreferencesEffect } from '@/components/profile/PreferencesEffect';
import { AuthMenu } from './AuthMenu';
import { BottomDock } from './BottomDock';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LoginPrompt } from './LoginPrompt';
import { MarketGuard } from './MarketGuard';
import { PointsChip } from './PointsChip';
import { PublishedNotice } from './PublishedNotice';
import { navItems, mobileTitleFor } from '@/lib/nav';
import { moduleRoute } from '@/lib/locale';
import { useLocale } from '@/i18n/LocaleProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useLocale();
  const NAV = useMemo(() => navItems(t.locale), [t.locale]);
  const homeHref = moduleRoute('home', t.locale);
  const isHome = pathname === homeHref;
  const mobileTitle = !isHome ? mobileTitleFor(pathname, t.locale) : '';
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero: HTMLElement | null = document.querySelector('[data-nav-hero]');
    const update = () => {
      const end = hero ? hero.getBoundingClientRect().bottom + window.scrollY : window.innerHeight;
      const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, end)));
      headerRef.current?.style.setProperty('--nav-progress', String(progress));
    };
    update();
    const observer = new ResizeObserver(update);
    if (hero) observer.observe(hero);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('pageshow', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('pageshow', update);
    };
  }, [pathname, isHome]);

  return (
    <ToastProvider>
      <PreferencesEffect />
      <RuntimeReporting />
      <FeatureReporting />
      <div className="flex min-h-dvh flex-col">
        <header
          ref={headerRef}
          className="ax-liquid-topbar fixed inset-x-0 top-0 z-40 border-x-0 border-t-0"
          style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-kim) 40%, transparent)' }}
        >
          <div className="ax-top-inner relative mx-auto flex h-16 max-w-7xl items-center gap-1.5 px-4 md:gap-2 md:px-6">
            {/* Logo AstroX chính thức (PNG, có wordmark) */}
            <Link href={homeHref} className="flex shrink-0 items-center py-1.5" aria-label={t.t('shell.logoAria')}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, logo PNG tĩnh */}
              <img src="/assets/logo.png" alt="AstroX" width={1254} height={1254} className="h-10 w-auto" />
            </Link>

            {/* Tiêu đề mobile dùng phần trống thực tế giữa logo và controls.
                Truncate tiêu đề dài thay vì chồng lên nút đổi ngôn ngữ/ví. */}
            {mobileTitle && (
              <p className="pointer-events-none min-w-0 flex-1 truncate px-1 text-center text-[14px] leading-tight sm:text-[16px] font-semibold text-muc lg:hidden" title={mobileTitle}>
                {mobileTitle}
              </p>
            )}

            {/* Nav desktop: underline trượt màu theo module (chỉ ≥lg — dưới đó
                là bottom dock, tránh nav vỡ dòng ở màn vừa) */}
            <nav aria-label={t.t('shell.navAria')} className="mx-auto hidden lg:block">
              <ul className="flex items-center">
                {NAV.map(item => {
                  const active =
                    item.href === homeHref
                      ? pathname === homeHref
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className="ax-nav-link whitespace-nowrap"
                        style={{ ['--nav-accent' as string]: item.accent }}
                      >
                        <FeatureIconSafe id={item.id} />
                        <span className="ax-nav-label">{item.label}</span>
                        <span aria-hidden="true" className="ax-nav-underline" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="relative z-[5] ml-auto flex shrink-0 items-center gap-2">
              <LanguageSwitcher className="rounded-full border border-black/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-muc hover:bg-white/60" />
              <PointsChip />
              <AuthMenu />
            </div>
          </div>
        </header>

        <ProfileModalProvider>
          {/* Trang chủ hero tràn từ mép trên (header đè lên video); trang khác
              chừa pt-16 đúng chiều cao header. pb-28 <lg = chừa bottom dock. */}
          <main className="flex-1 pb-[calc(112px+env(safe-area-inset-bottom))] lg:pb-0 pt-16">
            <PublishedNotice>{children}</PublishedNotice>
          </main>
        </ProfileModalProvider>

        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-5 px-5 py-5 pb-32 text-sm text-muc-2 lg:pb-5">
          <Link href={moduleRoute('pricing', t.locale)}>{t.t('shell.pricingLink')}</Link>
          <Link href={moduleRoute('terms', t.locale)}>{t.t('shell.termsLink')}</Link>
          <a href="mailto:support@theastrox.space">{t.t('shell.support')}</a>
        </div>
        <PaidReadingConsent />
        <BottomDock key={pathname} />
        <LoginPrompt />
        <MarketGuard />
      </div>
    </ToastProvider>
  );
}

import { FeatureIcon, FEATURE_BY_ID } from '@/components/kit/FeatureIcon';
function FeatureIconSafe({ id }: { id: string }) {
  const name = FEATURE_BY_ID[id];
  return name ? <FeatureIcon name={name} size={19} className="ax-nav-icon shrink-0" /> : null;
}
