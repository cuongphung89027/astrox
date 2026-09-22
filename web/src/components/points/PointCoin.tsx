/**
 * PointCoin — đồng xu AstroX Point: mặt trời 4 cánh trống đồng trong vòng
 * tròn kép. currentColor để dùng chung cho chip (vàng trên ngọc) lẫn hero.
 */
export function PointCoin({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9.4" fill="currentColor" opacity="0.14" />
      <circle cx="12" cy="12" r="9.4" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <circle cx="12" cy="12" r="6.6" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.55" />
      <path
        d="M12 5.9 13.86 10.14 18.1 12 13.86 13.86 12 18.1 10.14 13.86 5.9 12 10.14 10.14 Z"
        fill="currentColor"
      />
    </svg>
  );
}
