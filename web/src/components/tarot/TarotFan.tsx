"use client";

/**
 * TarotFan — quạt bài úp: dàn 5–7 lá úp (back.webp) lướt qua nhau, lá kế tiếp
 * có hào quang vàng kim mời gọi. Bấm/Enter/Space trên lá kế tiếp để rút.
 * Mobile (<md) quạt tự xếp thành lưới úp (flex-wrap, không chồng lên nhau).
 */
import type { TarotDeck } from "@/lib/tarot";

interface TarotFanProps {
  deck: TarotDeck;
  remaining: number;
  drawnCount: number;
  total: number;
  disabled: boolean;
  onDraw: () => void;
}

export function TarotFan({ deck, remaining, drawnCount, total, disabled, onDraw }: TarotFanProps) {
  // Hiển thị tối đa 7 lá úp trên quạt; lá kế tiếp là lá PHẢI cùng (cú rút tự nhiên).
  const shown = Math.min(remaining, 7);
  const cards = Array.from({ length: shown }, (_, i) => i);
  const center = (shown - 1) / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex flex-wrap items-end justify-center gap-2.5 md:flex-nowrap md:gap-0 md:py-4"
        aria-label={`Quạt bài — còn ${remaining} lá cần rút trên ${total}`}
      >
        {cards.map((i) => {
          const isNext = i === shown - 1 && !disabled;
          const rot = (i - center) * 6;
          const lift = Math.abs(i - center) * 5;
          return (
            <div
              key={i}
              className={`relative transition-transform duration-300 ease-[var(--ease-viet)] ${
                i > 0 ? "md:-ml-14" : ""
              } ${isNext ? "z-10 md:-translate-y-3" : ""}`}
            >
              {isNext ? (
                <button
                  type="button"
                  onClick={onDraw}
                  disabled={disabled}
                  aria-label={`Rút lá bài thứ ${drawnCount + 1} trên ${total}`}
                  className="group relative block aspect-[220/385] w-[84px] cursor-pointer rounded-xl outline-none transition-transform duration-300 hover:-translate-y-2 focus-visible:-translate-y-2 active:scale-[0.98] sm:w-[96px] md:w-[92px]"
                >
                  <img
                    src={deck.back}
                    alt=""
                    width={220}
                    height={385}
                    loading={drawnCount === 0 ? "eager" : "lazy"}
                    className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-[var(--shadow-glass)]"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1.5 animate-pulse rounded-2xl"
                    style={{ border: "2px solid var(--color-kim)", boxShadow: "0 0 26px -2px rgba(242,169,18,0.85)" }}
                  />
                </button>
              ) : (
                <div
                  aria-hidden="true"
                  className="relative block aspect-[220/385] w-[84px] sm:w-[96px] md:w-[92px]"
                  style={{ transform: `rotate(${rot}deg) translateY(${lift}px)` }}
                >
                  <img
                    src={deck.back}
                    alt=""
                    width={220}
                    height={385}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full rounded-xl object-cover opacity-95 shadow-[var(--shadow-glass)]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[12px] font-semibold text-muc-2" aria-live="polite">
        {remaining > 0
          ? `Bấm vào lá úp phát sáng để rút — lá thứ ${drawnCount + 1}/${total}`
          : `Đã rút đủ ${total} lá`}
      </p>
    </div>
  );
}
