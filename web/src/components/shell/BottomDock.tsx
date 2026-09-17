"use client";

/**
 * BottomDock — điều hướng mobile (<md): dock glass cố định dưới màn hình
 * với 4 mục chính + "Thêm" mở sheet glass (Bát Tự, Thần Số, Tarot, Tương Hợp,
 * công tắc giảm chuyển động). Desktop ẩn hoàn toàn.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DongSonSun } from "@/components/kit/motifs/DongSonSun";
import { MotionToggle } from "./MotionToggle";

interface DockItem {
  href: string;
  label: string;
  accent: string;
  icon: React.ReactNode;
}

/* ---- Icon 24px nét tròn, kế thừa currentColor ---- */
const iconProps = {
  viewBox: "0 0 24 24",
  className: "size-[22px]",
  fill: "none",
  "aria-hidden": true as const,
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const DOCK: DockItem[] = [
  {
    href: "/",
    label: "Trang chủ",
    accent: "var(--color-son)",
    icon: (
      <svg {...iconProps}>
        <path d="M4 11.2 12 4.5l8 6.7" />
        <path d="M6.2 10.2V19a.8.8 0 0 0 .8.8h10a.8.8 0 0 0 .8-.8v-8.8" />
      </svg>
    ),
  },
  {
    href: "/tuvi",
    label: "Tử Vi",
    accent: "var(--color-son)",
    icon: <DongSonSun size={22} />,
  },
  {
    href: "/hoangdao",
    label: "Hoàng Đạo",
    accent: "var(--color-sen)",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3.6l2.3 4.9 5.3.7-3.9 3.7 1 5.3L12 15.6l-4.7 2.6 1-5.3L4.4 9.2l5.3-.7L12 3.6Z" />
      </svg>
    ),
  },
  {
    href: "/kinhdich",
    label: "Kinh Dịch",
    accent: "var(--color-cham)",
    icon: (
      <svg {...iconProps}>
        <path d="M5.5 6.5h13M5.5 12h13M5.5 17.5h4.5m4.5 0h4" />
      </svg>
    ),
  },
];

const SHEET_LINKS = [
  { href: "/battu", label: "Bát Tự", desc: "Bốn trụ ngũ hành" },
  { href: "/thanso", label: "Thần Số", desc: "Số chủ đạo & vòng năm" },
  { href: "/tarot", label: "Tarot", desc: "Rút lá & lời ngỏ" },
  { href: "/tuonghop", label: "Tương Hợp", desc: "Độ hợp của hai người" },
];

export function BottomDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Escape đóng sheet; đóng khi đổi route.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      {/* Sheet "Thêm" — luôn mounted, animate bằng ax-panel/ax-fade */}
      <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className="ax-fade absolute inset-0 bg-muc/35 backdrop-blur-[2px]" data-open={open} onClick={() => setOpen(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Thêm mục"
          className="ax-panel glass-strong absolute inset-x-3 bottom-[86px] rounded-[var(--radius-card)] p-2"
          data-open={open}
        >
          <ul className="grid">
            {SHEET_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-colors hover:bg-white/70"
                >
                  <span aria-hidden="true" className="size-2 rounded-full bg-son" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-muc">{l.label}</span>
                    <span className="block text-xs text-muc-2">{l.desc}</span>
                  </span>
                  <svg viewBox="0 0 20 20" className="size-4 text-muc-2" fill="none" aria-hidden="true">
                    <path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-muc/10 p-2">
            <MotionToggle className="w-full" />
          </div>
        </div>
      </div>

      {/* Dock chính */}
      <nav
        aria-label="Điều hướng dưới (mobile)"
        className="glass-strong fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[22px] px-1.5 py-1.5 md:hidden"
      >
        {DOCK.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              style={active ? { color: item.accent } : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10.5px] font-bold transition-colors ${
                active ? "bg-white/75 text-muc" : "text-muc-2"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10.5px] font-bold transition-colors ${
            open ? "bg-white/75 text-muc" : "text-muc-2"
          }`}
        >
          <svg {...iconProps}>
            <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="6.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="6.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          Thêm
        </button>
      </nav>
    </>
  );
}
