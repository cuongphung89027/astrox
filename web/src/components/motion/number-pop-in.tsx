"use client";

/**
 * NumberPopIn — số pop vào khi đổi giá trị (pattern number-pop-in,
 * transitions.dev): từng ký tự pop + 2 ký tự cuối stagger. Replay bằng cách
 * mount lại group (key = value) nên animation chạy lại tự nhiên.
 */
interface NumberPopInProps {
  value: string | number;
  className?: string;
}

export function NumberPopIn({ value, className }: NumberPopInProps) {
  const chars = String(value).split("");
  return (
    <span key={String(value)} className={`ax-digit-group is-animating ${className ?? ""}`}>
      {chars.map((ch, i) => {
        const lastTwo = chars.length - i; // 1 = cuối, 2 = áp cuối
        return (
          <span
            key={i}
            className="ax-digit"
            data-stagger={lastTwo <= 2 ? String(lastTwo) : undefined}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
