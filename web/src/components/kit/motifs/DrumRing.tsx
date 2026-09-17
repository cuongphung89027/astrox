/**
 * Vòng trống đồng — khung hoa văn bao quanh avatar / biểu tượng con giáp
 * (signature app): vòng đặc + vòng chấm bi + 12 tia ngắn + vòng trong mảnh.
 * Nội dung đặt giữa vòng, không transform nên không bị méo.
 */
import type { CSSProperties, ReactNode } from "react";

interface DrumRingProps {
  /** Kích thước cạnh tổng của khung (px). */
  size?: number;
  color?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

export function DrumRing({ size = 96, color, children, className, style, label }: DrumRingProps) {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const rad = ((i * 30 - 90) * Math.PI) / 180;
    const x1 = 50 + 33.5 * Math.cos(rad);
    const y1 = 50 + 33.5 * Math.sin(rad);
    const x2 = 50 + 37.5 * Math.cos(rad);
    const y2 = 50 + 37.5 * Math.sin(rad);
    return { x1, y1, x2, y2, key: i };
  });

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className ?? ""}`}
      style={{ width: size, height: size, color, ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" focusable="false">
        <circle cx={50} cy={50} r={47.5} fill="none" stroke="currentColor" strokeWidth={2.6} />
        <circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray="0.5 6.5"
        />
        {rays.map((r) => (
          <line
            key={r.key}
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        ))}
        <circle cx={50} cy={50} r={30} fill="none" stroke="currentColor" strokeWidth={1.4} opacity={0.55} />
      </svg>
      {/* Nội dung nằm gọn trong vòng trong */}
      <span
        className="relative z-10 grid place-items-center overflow-hidden rounded-full"
        style={{ width: size * 0.56, height: size * 0.56 }}
      >
        {children}
      </span>
    </span>
  );
}
