"use client";

/**
 * CompatWheel — SVG hai vòng trống đồng (DrumRing cách điệu) giao nhau, mỗi
 * vòng một glyph cung. Motion xoay nhẹ vào vị trí (chỉ transform/opacity).
 */
import { useEffect, useState } from "react";
import type { ZodiacSign } from "@/lib/zodiac";

const RING_COLOR: Record<string, string> = {
  "Hoả": "var(--color-son)",
  "Thổ": "var(--color-ngoc)",
  "Khí": "var(--color-cham)",
  "Thuỷ": "var(--color-sen)",
};

const LABEL_COLOR: Record<string, string> = {
  "Hoả": "var(--color-son-deep)",
  "Thổ": "var(--color-ngoc-deep)",
  "Khí": "var(--color-cham-deep)",
  "Thuỷ": "var(--color-sen-deep)",
};

function ring(sign: ZodiacSign): string {
  return RING_COLOR[sign.element] || "var(--color-muc-2)";
}

function label(sign: ZodiacSign): string {
  return LABEL_COLOR[sign.element] || "var(--color-muc-2)";
}

interface CompatWheelProps {
  a: ZodiacSign;
  b: ZodiacSign;
  /** Nhãn aria thay đổi theo cặp để replay animation. */
  pairKey: string;
}

export function CompatWheel({ a, b, pairKey }: CompatWheelProps) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, [pairKey]);

  const transition = "transform 750ms var(--ease-viet), opacity 550ms var(--ease-viet)";

  return (
    <svg
      viewBox="0 0 340 216"
      role="img"
      aria-label={`Hai vòng tương hợp: ${a.name} và ${b.name}`}
      className="mx-auto h-auto w-full max-w-[360px]"
    >
      {/* Vòng cung A */}
      <g
        style={{
          transform: settled ? "rotate(0deg)" : "rotate(-14deg)",
          opacity: settled ? 1 : 0,
          transition,
          transformOrigin: "120px 108px",
        }}
      >
        <circle cx={120} cy={108} r={78} fill="var(--color-son-tint)" fillOpacity={0.55} />
        <circle cx={120} cy={108} r={78} fill="none" stroke={ring(a)} strokeWidth={2.4} />
        <circle cx={120} cy={108} r={66} fill="none" stroke={ring(a)} strokeWidth={1.4} strokeDasharray="0.5 6.5" strokeOpacity={0.7} />
        <text x={96} y={118} textAnchor="middle" fontSize={38} fontWeight={700} fill="var(--color-muc)">
          {a.symbol}
        </text>
        <text x={120} y={160} textAnchor="middle" fontSize={12} fontWeight={800} fill={label(a)}>
          {a.name}
        </text>
      </g>

      {/* Vòng cung B */}
      <g
        style={{
          transform: settled ? "rotate(0deg)" : "rotate(14deg)",
          opacity: settled ? 1 : 0,
          transition,
          transformOrigin: "220px 108px",
        }}
      >
        <circle cx={220} cy={108} r={78} fill="var(--color-sen-tint)" fillOpacity={0.45} />
        <circle cx={220} cy={108} r={78} fill="none" stroke={ring(b)} strokeWidth={2.4} />
        <circle cx={220} cy={108} r={66} fill="none" stroke={ring(b)} strokeWidth={1.4} strokeDasharray="0.5 6.5" strokeOpacity={0.7} />
        <text x={244} y={118} textAnchor="middle" fontSize={38} fontWeight={700} fill="var(--color-muc)">
          {b.symbol}
        </text>
        <text x={220} y={160} textAnchor="middle" fontSize={12} fontWeight={800} fill={label(b)}>
          {b.name}
        </text>
      </g>

      {/* Vùng giao nhau nhấn nhẹ */}
      <g style={{ opacity: settled ? 1 : 0, transition: "opacity 900ms var(--ease-viet) 250ms" }}>
        <text x={170} y={116} textAnchor="middle" fontSize={18} fill="var(--color-kim-deep)">
          ✧
        </text>
      </g>
    </svg>
  );
}
