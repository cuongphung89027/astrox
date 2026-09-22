/**
 * HexagramSvg — vẽ 6 hào quẻ bằng SVG gốc (không WebGL):
 * hào dương = thanh son đặc, hào âm = hai khúc chàm; hào động có viền vàng kim
 * + nhấp nháy nhẹ (chỉ opacity). Hào 1 (Sơ) ở dưới cùng như bản quẻ thật.
 */
import type { HexLine } from "@/lib/kinhdich";

const W = 200;
const H_LINE = 14;
const GAP = 8;
const YIN_GAP = 10;

interface HexagramSvgProps {
  lines: HexLine[];
  /** Nhãn accessibility mô tả quẻ. */
  label: string;
  className?: string;
}

export function HexagramSvg({ lines, label, className }: HexagramSvgProps) {
  // Render từ hào 6 (trên cùng) xuống hào 1 (dưới cùng).
  const ordered = [...lines].sort((a, b) => b.pos - a.pos);
  const height = ordered.length * H_LINE + (ordered.length - 1) * GAP;

  return (
    <svg
      viewBox={`-8 -8 ${W + 32} ${height + 16}`}
      width={W}
      height={height}
      role="img"
      aria-label={label}
      className={className}
      focusable="false"
    >
      <style>{`@keyframes ax-kd-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
      {ordered.map((line) => {
        const y = (6 - line.pos) * (H_LINE + GAP);
        const moving = line.moving;
        return (
          <g key={line.pos}>
            {line.bit === 1 ? (
              <rect x={0} y={y} width={W} height={H_LINE} rx={5} fill="currentColor" />
            ) : (
              <>
                <rect x={0} y={y} width={(W - YIN_GAP) / 2} height={H_LINE} rx={5} fill="currentColor" />
                <rect
                  x={(W + YIN_GAP) / 2}
                  y={y}
                  width={(W - YIN_GAP) / 2}
                  height={H_LINE}
                  rx={5}
                  fill="currentColor"
                />
              </>
            )}
            {moving ? (
              <>
                <rect
                  x={-5}
                  y={y - 5}
                  width={W + 10}
                  height={H_LINE + 10}
                  rx={9}
                  fill="none"
                  stroke="var(--color-kim-deep)"
                  strokeWidth={2.4}

                />
                <circle cx={W + 16} cy={y + H_LINE / 2} r={4} fill="var(--color-kim-deep)" />
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Nhãn 6 hào (Sơ Hào → Hào Thượng) — dùng cho mô tả accessibility. */
export function hexagramAriaLabel(lines: HexLine[], name: string): string {
  const parts = [...lines]
    .sort((a, b) => b.pos - a.pos)
    .map((l) => `hào ${l.pos} ${l.bit === 1 ? "dương" : "âm"}${l.moving ? " (động)" : ""}`);
  return `Quẻ ${name}: ${parts.join(", ")}`;
}
