"use client";

/**
 * TarotCardSlot — một vị trí trên bàn trải: nhãn vị trí (hiện sau khi lật),
 * lá bài flip 3D (back.webp mặt úp → ảnh lá, preserve-3d + rotateY), tên lá
 * VN/EN, chip xuôi/ngược, từ khoá và ý nghĩa ngắn từ cards.json.
 * Ảnh dùng <img> thường với width/height cố định (220×385) chống CLS.
 */
import { Chip } from "@/components/kit";
import { tarotCardById, tarotCardImage, type DrawnCard, type TarotDeck } from "@/lib/tarot";

export interface DrawnSlot {
  entry: DrawnCard;
  flipped: boolean;
  revealed: boolean;
}

interface SlotProps {
  deck: TarotDeck;
  /** Chưa rút tới vị trí này thì undefined — hiển thị ô placeholder. */
  slot?: DrawnSlot;
  label: string;
  index: number;
  /** Lá đang được chọn (mới đặt xuống, chưa lật) — hào quang vàng kim. */
  selecting?: boolean;
  /** Lá cắt ngang (Celtic Cross) — chỉ khung lá, không nhãn/kết quả. */
  overlay?: boolean;
  className?: string;
}

export function TarotCardSlot({ deck, slot, label, index, selecting = false, overlay = false, className = "" }: SlotProps) {
  const card = slot ? tarotCardById(slot.entry.id) : undefined;
  const meaning = slot ? (slot.entry.reversed ? card?.rev : card?.up) : undefined;

  // Vị trí chưa có lá — khung nét đứt báo trước nơi lá sẽ xếp vào.
  if (!slot) {
    return (
      <div className={`flex flex-col items-center ${className ?? ""}`}>
        <p aria-hidden="true" className="mb-1.5 h-4 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-muc-2/50">
          {label}
        </p>
        <div
          aria-hidden="true"
          className="aspect-[220/385] w-[100px] rounded-xl border-2 border-dashed border-muc/15 bg-white/30 sm:w-[124px] lg:w-[150px]"
        />
      </div>
    );
  }

  const flip = (
    <div
      className={`relative aspect-[220/385] w-[100px] transition-shadow duration-500 sm:w-[124px] lg:w-[150px] ${
        selecting && !slot.revealed ? "gold-ring rounded-xl shadow-[0_0_30px_-2px_rgba(242,169,18,0.8)]" : ""
      }`}
    >
      <div
        className="relative h-full w-full transition-transform duration-700 ease-[var(--ease-viet)] [perspective:1200px] [transform-style:preserve-3d]"
        style={{ transform: slot.flipped ? "rotateY(0deg)" : "rotateY(180deg)" }}
      >
        {/* Mặt trước — ảnh lá bài (ngược thì xoay 180°) */}
        <img
          src={tarotCardImage(deck, slot.entry.id)}
          alt={card ? `${card.nameVi} (${card.nameEn})${slot.entry.reversed ? " — ngược" : ""}` : slot.entry.id}
          width={220}
          height={385}
          loading={index === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full rounded-xl object-cover shadow-[var(--shadow-glass)] [backface-visibility:hidden] ${
            slot.entry.reversed ? "rotate-180" : ""
          }`}
        />
        {/* Mặt sau — mặt úp của bộ bài */}
        <img
          src={deck.back}
          alt=""
          width={220}
          height={385}
          loading={index === 0 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full rounded-xl object-cover [backface-visibility:hidden] [transform:rotateY(180deg)]"
        />
      </div>
      {/* Hào quang nhấp nháy khi lá đang được chọn */}
      {selecting && !slot.revealed ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1.5 animate-pulse rounded-2xl"
          style={{ border: "2px solid var(--color-kim)", boxShadow: "0 0 26px -2px rgba(242,169,18,0.85)" }}
        />
      ) : null}
    </div>
  );

  if (overlay) {
    return <div className={`absolute inset-0 z-10 [transform:rotate(90deg)] ${className}`}>{flip}</div>;
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Nhãn vị trí — chỉ hiện sau khi lá đã lật xong */}
      <p
        aria-hidden={!slot.revealed}
        className={`mb-1.5 h-4 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-kim-deep transition-opacity duration-500 ${
          slot.revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </p>
      {flip}

      {/* Kết quả lá — hiện sau khi lật */}
      {slot.revealed ? (
        <div className="mt-2 flex w-full max-w-[170px] flex-col items-center gap-1.5 text-center">
          <p className="font-display text-[13.5px] font-extrabold leading-tight text-muc">
            {card?.nameVi ?? slot.entry.id}
            {card ? <span className="block text-[10.5px] font-semibold text-muc-2">{card.nameEn}</span> : null}
          </p>
          <Chip tone={slot.entry.reversed ? "cham" : "sen"}>{slot.entry.reversed ? "Ngược" : "Xuôi"}</Chip>
          {meaning ? (
            <>
              <div className="flex flex-wrap justify-center gap-1">
                {meaning.kw.slice(0, 3).map((kw) => (
                  <span key={kw} className="rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-semibold text-muc-2">
                    {kw}
                  </span>
                ))}
              </div>
              <p className="text-[11.5px] leading-snug text-muc-2">{meaning.text}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
