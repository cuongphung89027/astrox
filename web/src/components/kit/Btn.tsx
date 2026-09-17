/**
 * Btn — nút/anchor chuẩn của AstroX: 3 biến thể (primary son / ghost glass /
 * gold kim) × 3 cỡ. Hỗ trợ href (render <Link>) hoặc button. Hover nâng nhẹ.
 */
import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

interface BtnProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  /** Hiện mũi tên → chạy nhẹ khi hover. */
  arrow?: boolean;
  className?: string;
  ariaLabel?: string;
}

const SIZES: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-son text-white shadow-[var(--shadow-pop)] hover:-translate-y-0.5 active:translate-y-0",
  ghost: "glass text-muc hover:-translate-y-0.5 active:translate-y-0",
  gold: "bg-kim text-muc shadow-[0_14px_34px_-12px_rgba(199,134,10,0.55)] hover:-translate-y-0.5 active:translate-y-0",
};

export function Btn({
  children,
  variant = "primary",
  size = "md",
  href,
  type = "button",
  onClick,
  disabled,
  arrow = false,
  className,
  ariaLabel,
}: BtnProps) {
  const cls = [
    "group/btn inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200",
    SIZES[size],
    VARIANTS[variant],
    disabled ? "pointer-events-none opacity-50" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <span>{children}</span>
      {arrow ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-[1.1em] transition-transform duration-200 group-hover/btn:translate-x-1"
          fill="none"
        >
          <path
            d="M3.5 10h12m0 0-4.5-4.5M15.5 10 11 14.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}
