"use client";

/**
 * SignGrid — băng 12 cung hoàng đạo: mỗi cung 1 GlassCard, glyph đặt trong
 * DrumRing (vòng trống đồng — signature của app). Cung của người xem viền son
 * + chip "Cung của bạn" + ShimmerText; cung đang chọn viền kim.
 */
import { Chip, GlassCard } from "@/components/kit";
import { DrumRing } from "@/components/kit/motifs";
import { CardTilt, ShimmerText } from "@/components/motion";
import { ELEMENT_TONE, ZODIAC_SIGNS, signDateRange } from "@/lib/zodiac";

interface SignGridProps {
  mySignId: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
}

const TONE_RING: Record<string, string> = {
  son: "text-son",
  ngoc: "text-ngoc",
  cham: "text-cham",
  sen: "text-sen",
};

export function SignGrid({ mySignId, selectedId, onSelect }: SignGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {ZODIAC_SIGNS.map((sign) => {
        const mine = sign.id === mySignId;
        const active = sign.id === selectedId;
        return (
          <li key={sign.id}>
            <CardTilt max={5} className="h-full">
              <GlassCard
                className={`h-full ${mine ? "ring-2 ring-son" : active ? "ring-2 ring-kim-deep shadow-[0_0_0_5px_rgba(242,169,18,0.16)]" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(sign.id)}
                  aria-pressed={active}
                  className="flex h-full w-full cursor-pointer flex-col items-center gap-2 px-3 pb-5 pt-6 text-center"
                >
                  <DrumRing
                    size={86}
                    className={mine ? TONE_RING.son : active ? "text-kim-deep" : `${TONE_RING[ELEMENT_TONE[sign.element]]} opacity-70`}
                  >
                    <span aria-hidden="true" className="text-[28px] leading-none text-muc">
                      {sign.symbol}
                    </span>
                  </DrumRing>
                  <span className="mt-1 font-display text-[15px] font-extrabold leading-tight text-muc">
                    {mine ? <ShimmerText text={sign.name} /> : sign.name}
                  </span>
                  <span className="text-[11px] font-semibold text-muc-2">{signDateRange(sign)}</span>
                  {mine ? (
                    <Chip tone="son" className="mt-0.5">
                      Cung của bạn
                    </Chip>
                  ) : null}
                </button>
              </GlassCard>
            </CardTilt>
          </li>
        );
      })}
    </ul>
  );
}
