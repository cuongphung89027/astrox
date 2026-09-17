/**
 * GlassCard — panel liquid glass bo góc card của AstroX.
 * - variant "premium": cộng .gold-ring + tint vàng kim rất nhẹ.
 * - Có href => render <Link> (toàn card bấm được).
 * Lưu ý: muốn đổi nền đậm (vd. card Kinh Dịch chàm) thì tự dựng <Link>
 * thay vì ép bg-* lên .glass (class custom không nằm @layer nên thắng utility).
 */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  variant?: "default" | "premium";
  href?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function GlassCard({ children, variant = "default", href, className, style, ariaLabel }: GlassCardProps) {
  const cls = [
    "glass relative block rounded-[var(--radius-card)]",
    variant === "premium" ? "gold-ring" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={cls} style={style} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}
