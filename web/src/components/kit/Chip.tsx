/**
 * Chip — tag nhỏ nền tint theo tone (màu sắc lấy từ bảng màu sơn mài).
 */
import type { ReactNode } from "react";

type Tone = "son" | "ngoc" | "kim" | "sen" | "cham" | "neutral";

const TONES: Record<Tone, string> = {
  son: "bg-son-tint text-son-deep",
  ngoc: "bg-ngoc-tint text-ngoc-deep",
  kim: "bg-kim-tint text-kim-deep",
  sen: "bg-sen-tint text-sen-deep",
  cham: "bg-cham/10 text-cham",
  neutral: "bg-white/70 text-muc-2",
};

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${TONES[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
