"use client";

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
 */
import Link from "next/link";
import { FeatureIcon, FEATURE_BY_PATH } from "@/components/kit/FeatureIcon";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { LyCloudDivider } from "@/components/kit/motifs/LyCloudDivider";
import { ToastProvider } from "@/components/motion/toast";
import { ProfileModalProvider } from "@/components/profile/ProfileModal";
import { PreferencesEffect } from "@/components/profile/PreferencesEffect";
import { AuthMenu } from "./AuthMenu";
import { BottomDock } from "./BottomDock";
import { LoginPrompt } from "./LoginPrompt";
import { PointsChip } from "./PointsChip";
import { PublishedNotice } from "./PublishedNotice";

interface NavItem {
  href: string;
  label: string;
  /** Màu active (CSS var) — dùng cho underline + chữ khi đang ở trang đó. */
  accent: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "Trang chủ", accent: "#187650" },
  { href: "/tuvi", label: "Tử Vi", accent: "#187650" },
  { href: "/cunghoangdao", label: "Cung Hoàng Đạo", accent: "#187650" },
  { href: "/kinhdich", label: "Kinh Dịch", accent: "#187650" },
  { href: "/battu", label: "Bát Tự", accent: "#187650" },
  { href: "/thansohoc", label: "Thần Số Học", accent: "#187650" },
  { href: "/tarot", label: "Tarot", accent: "#187650" },
  { href: "/hoso", label: "Hồ sơ", accent: "#187650" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const mobileTitle = !isHome ? NAV.find(item => item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)))?.label ?? (pathname === "/tuonghop" ? "Tương Hợp" : "") : "";
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero: HTMLElement | null = document.querySelector("[data-nav-hero]");
    const update = () => {
      const end = hero ? hero.getBoundingClientRect().bottom + window.scrollY : window.innerHeight;
      const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, end)));
      headerRef.current?.style.setProperty("--nav-progress", String(progress));
    };
    update();
    const observer = new ResizeObserver(update);
    if (hero) observer.observe(hero);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("pageshow", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("pageshow", update);
    };
  }, [pathname, isHome]);

  return (
    <ToastProvider>
      <PreferencesEffect />
      <div className="flex min-h-dvh flex-col">
        <header
          ref={headerRef}
          className="ax-liquid-topbar fixed inset-x-0 top-0 z-40 border-x-0 border-t-0"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-kim) 40%, transparent)" }}
        >
          <div className="ax-top-inner relative mx-auto flex h-16 max-w-7xl items-center gap-1.5 px-4 md:gap-2 md:px-6">
            {/* Logo AstroX chính thức (PNG, có wordmark) */}
            <Link href="/" className="flex shrink-0 items-center py-1.5" aria-label="AstroX — về trang chủ">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, logo PNG tĩnh */}
              <img src="/assets/logo.png" alt="AstroX" width={1254} height={1254} className="h-10 w-auto" />
            </Link>

            {/* Tiêu đề trang (mobile <lg). Co ô chữ theo 3 dải width để không
                đè chip Point + avatar: 56/168 (<360), 64/124 (360–439),
                đối xứng 72/72 từ 440px (font 14px + tiêu đề dài nhất an toàn). */}
            {mobileTitle && <p className="pointer-events-none absolute left-[56px] right-[168px] min-[360px]:left-[64px] min-[360px]:right-[124px] min-[440px]:left-[72px] min-[440px]:right-[72px] text-center text-[14px] leading-tight sm:text-[16px] font-semibold text-muc lg:hidden">{mobileTitle}</p>}

            {/* Nav desktop: underline trượt màu theo module (chỉ ≥lg — dưới đó
                là bottom dock, tránh nav vỡ dòng ở màn vừa) */}
            <nav aria-label="Điều hướng chính" className="mx-auto hidden lg:block">
              <ul className="flex items-center">
                {NAV.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className="ax-nav-link whitespace-nowrap"
                        style={{ ["--nav-accent" as string]: item.accent }}
                      >
                        <FeatureIcon name={FEATURE_BY_PATH[item.href]} size={19} className="mr-1.5 hidden shrink-0 xl:block" />{item.label}
                        <span aria-hidden="true" className="ax-nav-underline" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <PointsChip />
              <AuthMenu />
            </div>
          </div>
        </header>

        <ProfileModalProvider>
          {/* Trang chủ hero tràn từ mép trên (header đè lên video); trang khác
              chừa pt-16 đúng chiều cao header. pb-28 <lg = chừa bottom dock. */}
          <main className="flex-1 pb-[calc(112px+env(safe-area-inset-bottom))] lg:pb-0 pt-16"><PublishedNotice>{children}</PublishedNotice></main>
        </ProfileModalProvider>

        {/* Footer: dải mây Lý–Trần + credit + link Tương Hợp.
            pb-28 <lg = chừa chỗ cho bottom dock. */}
        {!isHome && pathname !== "/tuvi" && pathname !== "/tarot" && pathname !== "/hoso" && pathname !== "/cunghoangdao" && pathname !== "/kinhdich" && pathname !== "/battu" && pathname !== "/thansohoc" && pathname !== "/tuonghop" && <footer className="mt-20 pb-28 lg:mt-28 lg:pb-10">
          <LyCloudDivider className="mx-auto max-w-5xl text-muc/25" />
          <div className="mx-auto max-w-6xl px-5 pt-6 text-center text-sm text-muc-2">
            <p className="font-display text-base font-extrabold text-muc/80">
              Astro<span className="text-son">X</span>
            </p>
            <p className="mx-auto mt-1.5 max-w-xl leading-relaxed">
              Họa tiết Việt lấy cảm hứng trống đồng Đông Sơn &amp; mây Lý–Trần, vector gốc AstroX.
            </p>
            <p className="mt-3">
              <Link href="/tuonghop" className="font-semibold text-son underline-offset-4 transition-colors hover:text-son-deep hover:underline">
                Tương Hợp — thử độ hợp của hai người →
              </Link>
            </p>
          </div>
        </footer>}

        <BottomDock />
        <LoginPrompt />
      </div>
    </ToastProvider>
  );
}
