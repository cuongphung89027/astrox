/**
 * Chim Lạc cách điệu — silhouette mượt ghép từ các lưỡi liềm (cánh) + thân
 * giọt nước + lông đuôi uốn lượn, mô phỏng chim Lạc trên trống đồng.
 * Vector gốc AstroX, tô currentColor.
 */
interface LacBirdProps {
  size?: number;
  color?: string;
  label?: string;
  className?: string;
}

export function LacBird({ size = 64, color, label, className }: LacBirdProps) {
  return (
    <svg
      viewBox="0 0 128 76"
      width={size}
      height={Math.round((size * 76) / 128)}
      className={className}
      style={{ color }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <g fill="currentColor">
        {/* Cánh sau — lưỡi liềm vút cao */}
        <path d="M4 40 Q 34 4 68 32 Q 34 22 4 40 Z" />
        {/* Cánh trước — đè nhẹ, thấp hơn */}
        <path d="M24 46 Q 56 14 90 40 Q 56 30 24 46 Z" />
        {/* Thân + đầu: giọt nước nghiêng */}
        <path d="M62 36 Q 76 26 87 34 Q 94 42 85 51 Q 70 58 57 47 Q 55 39 62 36 Z" />
        {/* Mỏ */}
        <path d="M88 33 L 101 37 L 88 41 Z" />
        {/* Lông đuôi — hai dải lượn */}
        <path d="M52 48 Q 28 56 6 70 Q 32 62 54 52 Z" />
        <path d="M58 52 Q 42 62 30 74 Q 46 64 60 56 Z" />
      </g>
    </svg>
  );
}
