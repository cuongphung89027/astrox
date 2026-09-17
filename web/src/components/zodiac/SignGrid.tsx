"use client";

/**
 * SignGrid — băng 12 cung hoàng đạo (bản tinh giản v5.1).
 * Nguyên tắc "single accent": toàn bộ ring một màu mực trung tính;
 * màu chỉ xuất hiện ở 2 nơi — cung của bạn (son) và cung đang chọn (kim).
 * Bỏ CardTilt/ShimmerText khỏi lưới để bớt noise; hover chỉ nhấc nhẹ.
 */
import { DrumRing } from "@/components/kit/motifs";
import { ZODIAC_SIGNS, signDateRange } from "@/lib/zodiac";

interface SignGridProps {
  mySignId: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SignGrid({ mySignId, selectedId, onSelect }: SignGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 sm:gap-3" role="listbox" aria-label="Chọn cung hoàng đạo">
      {ZODIAC_SIGNS.map((sign) => {
        const mine = sign.id === mySignId;
        const active = sign.id === selectedId;
        return (
          <li key={sign.id}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(sign.id)}
              className={`group flex h-full w-full cursor-pointer flex-col items-center gap-1.5 rounded-2xl px-3 pb-4 pt-5 text-center transition-[background-color,box-shadow,transform] duration-300 ease-[var(--ease-viet)] hover:-translate-y-0.5 ${
                mine
                  ? "bg-son-tint/60 ring-1 ring-son/40"
                  : active
                    ? "bg-white/55 ring-1 ring-kim-deep/50 shadow-[0_0_0_4px_rgba(242,169,18,0.10)]"
                    : "bg-white/35 ring-1 ring-white/50 hover:bg-white/50"
              }`}
            >
              <DrumRing
                size={74}
                className={mine ? "text-son" : active ? "text-kim-deep" : "text-muc/35 transition-colors duration-300 group-hover:text-muc/55"}
              >
                <span aria-hidden="true" className="text-[24px] leading-none text-muc">
                  {sign.symbol}
                </span>
              </DrumRing>
              <span className="mt-0.5 text-[13.5px] font-semibold leading-tight text-muc">{sign.name}</span>
              <span className="text-[10.5px] font-medium tracking-wide text-muc-2/80">{signDateRange(sign)}</span>
              {mine ? <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-son">Cung của bạn</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
