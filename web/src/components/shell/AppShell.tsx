"use client";

/**
 * Khung app AstroX v5 — "Mặt Trời Đông Sơn".
 *
 * - Desktop (>=md): top bar glass MỎNG sticky full-width (không phải pill nổi
 *   như v4), hairline vàng kim dưới bar. Nav giữa với underline trượt, màu
 *   theo module (tuvi=son, hoangdao=sen, kinhdich=cham, battu=ngoc,
 *   thanso=kim, tarot=sen-deep). Phải: công tắc giảm chuyển động + AuthMenu.
 * - Mobile (<md): BOTTOM DOCK glass 4 mục + "Thêm" mở sheet (BottomDock).
 * - ToastProvider bọc toàn shell; ProfileModalProvider bọc main; AuthMenu
 *   nằm ngoài Provider nhưng vẫn mở được modal qua registry uỷ quyền.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DongSonSun } from "@/components/kit/motifs/DongSonSun";
import { LyCloudDivider } from "@/components/kit/motifs/LyCloudDivider";
import { ToastProvider } from "@/components/motion/toast";
import { ProfileModalProvider } from "@/components/profile/ProfileModal";
import { AuthMenu } from "./AuthMenu";
import { BottomDock } from "./BottomDock";
import { MOTION_BOOT, MotionToggle, useMotionSync } from "./MotionToggle";

interface NavItem {
  href: string;
  label: string;
  /** Màu active (CSS var) — dùng cho underline + chữ khi đang ở trang đó. */
  accent: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "Trang chủ", accent: "var(--color-son)" },
  { href: "/tuvi", label: "Tử Vi", accent: "var(--color-son)" },
  { href: "/hoangdao", label: "Hoàng Đạo", accent: "var(--color-sen)" },
  { href: "/kinhdich", label: "Kinh Dịch", accent: "var(--color-cham)" },
  { href: "/battu", label: "Bát Tự", accent: "var(--color-ngoc)" },
  { href: "/thanso", label: "Thần Số", accent: "var(--color-kim-deep)" },
  { href: "/tarot", label: "Tarot", accent: "var(--color-sen-deep)" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useMotionSync();

  return (
    <ToastProvider>
      {/* Quyết định trạng thái giảm chuyển động TRƯỚC paint (không flash). */}
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />

      <div className="flex min-h-dvh flex-col">
        <header
          className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-kim) 40%, transparent)" }}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 md:gap-3 md:px-6">
            {/* Logo: mặt trời Đông Sơn + wordmark */}
            <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="AstroX — về trang chủ">
              <DongSonSun size={33} className="text-son ax-spin-slow" style={{ ["--sun-spin-dur" as string]: "70s" }} />
              <span className="font-display text-xl font-extrabold tracking-tight text-muc">
                Astro<span className="text-son">X</span>
              </span>
            </Link>

            {/* Nav desktop: underline trượt màu theo module */}
            <nav aria-label="Điều hướng chính" className="mx-auto hidden md:block">
              <ul className="flex items-center">
                {NAV.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className="ax-nav-link"
                        style={{ ["--nav-accent" as string]: item.accent }}
                      >
                        {item.label}
                        <span aria-hidden="true" className="ax-nav-underline" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
              <MotionToggle className="hidden md:inline-flex" />
              <AuthMenu />
            </div>
          </div>
        </header>

        <ProfileModalProvider>
          <main className="flex-1 pb-8 md:pb-0">{children}</main>
        </ProfileModalProvider>

        {/* Footer: dải mây Lý–Trần + credit + link Tương Hợp.
            pb-28 mobile = chừa chỗ cho bottom dock. */}
        <footer className="mt-20 pb-28 md:mt-28 md:pb-10">
          <LyCloudDivider className="mx-auto max-w-5xl text-muc/25" />
          <div className="mx-auto max-w-6xl px-5 pt-6 text-center text-sm text-muc-2">
            <p className="font-display text-base font-extrabold text-muc/80">
              Astro<span className="text-son">X</span>
            </p>
            <p className="mx-auto mt-1.5 max-w-md leading-relaxed">
              Họa tiết Việt lấy cảm hứng trống đồng Đông Sơn &amp; mây Lý–Trần, vector gốc AstroX.
            </p>
            <p className="mt-3">
              <Link href="/tuonghop" className="font-semibold text-son underline-offset-4 transition-colors hover:text-son-deep hover:underline">
                Tương Hợp — thử độ hợp của hai người →
              </Link>
            </p>
          </div>
        </footer>

        <BottomDock />
      </div>
    </ToastProvider>
  );
}
