"use client";

/**
 * SuccessCheck — check mark "earned moment" (pattern success-check,
 * transitions.dev): fade + xoay vào + bob + vẽ nét path SVG.
 * Dùng data-state="in"/"out" để điều khiển; component chỉ lo phần hiện.
 */
interface SuccessCheckProps {
  size?: number;
  className?: string;
  /** true => chạy animation vào (mặc định). */
  shown?: boolean;
}

export function SuccessCheck({ size = 24, className, shown = true }: SuccessCheckProps) {
  return (
    <span className={`ax-check ${className ?? ""}`} data-state={shown ? "in" : "out"} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4.5 4.5L19 7"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
