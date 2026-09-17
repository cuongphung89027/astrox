/**
 * Dải mây Lý – Trần — divider hoạ tiết Việt: cụm mây 3 vòng xoáy nối đuôi,
 * lặp seamless bằng SVG <pattern>. Màu kế thừa currentColor.
 */
import { useId } from "react";

interface LyCloudDividerProps {
  className?: string;
  /** Chiều cao dải mây (px). */
  height?: number;
  label?: string;
}

const UNIT = 48; // chu kỳ lặp ngang của 1 cụm mây

export function LyCloudDivider({ className, height = 30, label }: LyCloudDividerProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pid = `ax-lycloud-${uid}`;
  return (
    <div className={className} role={label ? "img" : "separator"} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg width="100%" height={height} preserveAspectRatio="none" focusable="false">
        <defs>
          <pattern id={pid} width={UNIT} height={height} patternUnits="userSpaceOnUse">
            {/* Cụm mây: ba vòng cung khuyết dần + vẫy đuôi */}
            <path
              d={`M4 ${height - 6}
                  A 8 8 0 1 1 20 ${height - 6}
                  A 5 5 0 1 1 30 ${height - 6}
                  Q 34 ${height - 6} 38 ${height - 9}
                  Q 41 ${height - 6} 45 ${height - 6}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Chấm nhỏ giữa hai cụm */}
            <circle cx={UNIT - 1} cy={height - 10} r={1.6} fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${pid})`} />
      </svg>
    </div>
  );
}
