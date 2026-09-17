/**
 * Mặt Trời Đông Sơn — motif trung tâm của design system AstroX v5.
 * Geometry tự dựng bằng SVG: 12 tia tam giác + vòng đồng tâm + chấm tròn tâm
 * (mô phỏng tâm mặt trời trên mặt trống đồng Đông Sơn). Vector gốc, không asset ngoài.
 */
import type { CSSProperties } from "react";

interface DongSonSunProps {
  /** Kích thước cạnh (px). */
  size?: number;
  /** Màu nét/đổ — mặc định kế thừa currentColor để nhuộm bằng class text-*. */
  color?: string;
  /** Nhãn accessibility; bỏ qua => trang trí (aria-hidden). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const CX = 100;
const CY = 100;
const RAYS = 12;
const RAY_INNER = 52;
const RAY_OUTER = 97;

/** Điểm trên vòng tròn bán kính r, góc a (độ). */
function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** Một tia tam giác nhọn dần ra ngoài — dựng từ đáy ± offset vuông góc. */
function rayPath(deg: number): string {
  const rad = (deg * Math.PI) / 180;
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);
  const [bx, by] = polar(RAY_INNER, deg);
  const [ax, ay] = polar(RAY_OUTER, deg);
  const half = 7.2;
  const [x1, y1] = [bx + nx * half, by + ny * half];
  const [x2, y2] = [bx - nx * half, by - ny * half];
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} L${ax.toFixed(2)} ${ay.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

export function DongSonSun({ size = 48, color, label, className, style }: DongSonSunProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      style={{ color, ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {/* Chấm tròn tâm */}
      <circle cx={CX} cy={CY} r={7} fill="currentColor" />
      {/* Vòng đồng tâm: đặc – chấm bi – đặc */}
      <circle cx={CX} cy={CY} r={21} fill="none" stroke="currentColor" strokeWidth={3.4} />
      <circle
        cx={CX}
        cy={CY}
        r={33}
        fill="none"
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeDasharray="0.5 8.2"
      />
      <circle cx={CX} cy={CY} r={43} fill="none" stroke="currentColor" strokeWidth={3.4} />
      {/* Chấm bi giữa các tia */}
      {Array.from({ length: RAYS }, (_, i) => {
        const [x, y] = polar(72, (i + 0.5) * (360 / RAYS));
        return <circle key={i} cx={x} cy={y} r={2.6} fill="currentColor" />;
      })}
      {/* 12 tia tam giác */}
      {Array.from({ length: RAYS }, (_, i) => (
        <path key={i} d={rayPath(i * (360 / RAYS))} fill="currentColor" />
      ))}
    </svg>
  );
}
