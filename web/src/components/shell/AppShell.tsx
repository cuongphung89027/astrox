"use client";

/**
 * Khung trang (placeholder chức năng — Giai đoạn B1 sẽ thay bằng thiết kế
 * Đông Sơn mới). Giữ mốc semantic: header điều hướng + main + footer.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMenu } from "./AuthMenu";
import { ProfileModalProvider } from "@/components/profile/ProfileModal";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/tuvi", label: "Tử Vi" },
  { href: "/hoangdao", label: "Hoàng Đạo" },
  { href: "/kinhdich", label: "Kinh Dịch" },
  { href: "/battu", label: "Bát Tự" },
  { href: "/thanso", label: "Thần Số" },
  { href: "/tarot", label: "Tarot" },
  { href: "/tuonghop", label: "Tương Hợp" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <nav aria-label="Điều hướng chính" className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
            AstroX
          </Link>
          <ul className="ml-4 flex flex-wrap items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                      active ? "bg-son text-white" : "text-muc hover:bg-white/60"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="ml-auto">
            <AuthMenu />
          </div>
        </nav>
      </header>

      <ProfileModalProvider>
        <main className="flex-1">{children}</main>
      </ProfileModalProvider>

      <footer className="mt-16 border-t border-muc/10 px-5 py-8 text-center text-sm text-muc-2">
        AstroX — sản phẩm tử vi công nghệ mang chất Việt.
      </footer>
    </div>
  );
}
