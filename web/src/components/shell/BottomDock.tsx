"use client";

/**
 * Mobile navigation with a raised discovery button anchoring the gooey menu.
 */
import Link from "next/link";
import styles from "./DiscoverySheet.module.css";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, type CSSProperties } from "react";
import { Fragment } from "react";
import { FeatureIcon, FEATURE_BY_PATH } from "@/components/kit/FeatureIcon";
import { MODULES } from "../../../../services/admin/modules.ts";

interface DockItem {
  href: string;
  label: string;
  accent: string;
  icon: React.ReactNode;
}

const DOCK: DockItem[] = [
  {
    href: "/",
    label: "Trang chủ",
    accent: "#187650",
    icon: <FeatureIcon name="home" size={26} />,
  },
  {
    href: "/tuvi",
    label: "Tử Vi",
    accent: "#187650",
    icon: <FeatureIcon name="tuvi" size={26} />,
  },
  {
    href: "/tarot", label: "Tarot", accent: "#187650",
    icon: <FeatureIcon name="tarot" size={26} />,
  },
];

const SHEET_LINKS = MODULES.filter(m => m.id !== "tuvi").map(m => ({ href: m.route, label: m.name, desc: m.description }));

export function BottomDock() {
  const pathname = usePathname();
  const dockRef = useRef<HTMLElement>(null);
  const [dockWidth, setDockWidth] = useState(366);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const observer = new ResizeObserver(() => setDockWidth(dock.getBoundingClientRect().width));
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);

  // Escape đóng sheet; đóng khi đổi route.

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => triggerRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const links = panelRef.current?.querySelectorAll<HTMLElement>("a[href]");
        const items = [triggerRef.current, ...Array.from(links ?? [])].filter((item): item is HTMLElement => item !== null);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const media = window.matchMedia("(min-width: 1024px)");
    const desktop = () => { if (media.matches) setOpen(false); };
    media.addEventListener("change", desktop);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", desktop);
      document.body.style.overflow = previous;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const dockShape = `M22 28 H${dockWidth / 2 - 45} C${dockWidth / 2 - 27} 28 ${dockWidth / 2 - 25} 14 ${dockWidth / 2} 14 C${dockWidth / 2 + 25} 14 ${dockWidth / 2 + 27} 28 ${dockWidth / 2 + 45} 28 H${dockWidth - 22} Q${dockWidth - 1} 28 ${dockWidth - 1} 49 V70 Q${dockWidth - 1} 91 ${dockWidth - 22} 91 H22 Q1 91 1 70 V49 Q1 28 22 28 Z`;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      <div className={styles.overlay} data-open={open} aria-hidden={!open} inert={!open}>
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
        <div id="discovery-menu" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="discovery-title" className={styles.panel}>
          <h2 id="discovery-title" className="sr-only">Khám phá</h2>
          <svg className={styles.goo} viewBox="0 0 300 480" aria-hidden="true">
            <defs><filter id="astrox-discovery-goo" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
              <feComposite in="SourceGraphic" operator="atop" />
            </filter></defs>
            <g filter="url(#astrox-discovery-goo)" fill="#fbf6ec">
              <circle cx="150" cy="444" r="27" />

              {SHEET_LINKS.map((item, i) => <circle key={item.href} cx="150" cy="444" r="27" className={styles.blob} style={{ '--x': `${[-96, 0, 96][i % 3]}px`, '--y': `${(-360 + Math.floor(i / 3) * 116)}px`, '--delay': `${i * 28}ms` } as CSSProperties} />)}
            </g>
          </svg>
          <div className={styles.grid}>
            {SHEET_LINKS.map((item, i) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={styles.tile} style={{ "--x": `${[-96, 0, 96][i % 3]}px`, "--y": `${(-360 + Math.floor(i / 3) * 116)}px`, "--delay": `${i * 28}ms` } as CSSProperties} aria-current={isActive(item.href) ? "page" : undefined}>
                <FeatureIcon name={FEATURE_BY_PATH[item.href]} className={styles.icon} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Dock chính */}
      <nav
        ref={dockRef}
        aria-label="Điều hướng dưới (mobile)"
        className={`${styles.dock} fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[60] grid h-16 grid-cols-5 px-1 py-1.5 sm:px-1.5 lg:hidden`}
      >
        <div aria-hidden="true" className={styles.dockGlass} style={{ clipPath: `path("${dockShape}")` }} />
        <svg className={styles.dockSurface} width="100%" height="92" viewBox={`0 0 ${dockWidth} 92`} aria-hidden="true">
          <path d={dockShape} />
        </svg>
        {DOCK.map((item) => {
          const active = isActive(item.href);
          return (
            <Fragment key={item.href}>
            {item.href === "/tarot" && (
              <div className={styles.discoverySlot} data-active={open || SHEET_LINKS.some(item => item.href !== "/tarot" && isActive(item.href))}>
                <button
                  type="button"
                  ref={triggerRef}
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  aria-controls="discovery-menu"
                  aria-haspopup="dialog"
                  aria-label={open ? "Đóng Khám phá" : "Khám phá"}
                  data-open={open}
                  className={styles.trigger}
                >
                  <span aria-hidden="true"><FeatureIcon name="explore" size={28} /></span>
                </button>
                <span className={styles.triggerLabel}>Khám phá</span>
              </div>
            )}
            <Link
              key={item.href}
              href={item.href}
              inert={open}
              aria-current={active ? "page" : undefined}
              style={active ? { color: item.accent } : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-[11px] min-[380px]:text-[12px] font-bold transition-colors ${
                active ? "bg-white/75 text-muc" : "text-black"
              }`}
            >
              {item.icon}
              <span className="max-w-full whitespace-nowrap">{item.label}</span>
            </Link>
            </Fragment>
          );
        })}
        <Link href="/hoso" inert={open} aria-current={pathname === "/hoso" ? "page" : undefined} style={{ color: pathname === "/hoso" ? "#187650" : "#000" }} className="flex flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-[11px] min-[380px]:text-[12px] font-bold">
          <FeatureIcon name="profile" size={26} />Hồ sơ
        </Link>
      </nav>
    </>
  );
}
