/**
 * Skeleton — khối placeholder shimmer (pattern skeleton-reveal của transitions.dev):
 * khối hiện dần (fade + blur-out) rồi sheen sáng chạy ngang lặp.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={`ax-skeleton ${className ?? ""}`} />;
}
