/**
 * Hoa sen cách điệu — các lớp cánh lens-shape xếp lớp với fill-opacity giảm dần
 * để tạo chiều sâu. Vector gốc AstroX, tô currentColor.
 */
interface LotusProps {
  size?: number;
  color?: string;
  label?: string;
  className?: string;
}

export function Lotus({ size = 56, color, label, className }: LotusProps) {
  return (
    <svg
      viewBox="0 0 96 64"
      width={size}
      height={Math.round((size * 64) / 96)}
      className={className}
      style={{ color }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {/* Cánh ngoài cùng — mờ nhất */}
      <g fill="currentColor" fillOpacity={0.42}>
        <path d="M48 58 Q 20 54 6 38 Q 28 44 48 58 Z" />
        <path d="M48 58 Q 76 54 90 38 Q 68 44 48 58 Z" />
      </g>
      {/* Cánh giữa */}
      <g fill="currentColor" fillOpacity={0.68}>
        <path d="M48 58 Q 26 48 20 26 Q 38 40 48 58 Z" />
        <path d="M48 58 Q 70 48 76 26 Q 58 40 48 58 Z" />
      </g>
      {/* Cánh tâm — đậm nhất */}
      <path fill="currentColor" d="M48 58 Q 37 40 48 10 Q 59 40 48 58 Z" />
      {/* Đế sen */}
      <path
        fill="currentColor"
        fillOpacity={0.9}
        d="M33 58 Q 48 64 63 58 Q 48 62 33 58 Z"
      />
    </svg>
  );
}
