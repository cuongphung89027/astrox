"use client";

/**
 * TarotCardSlot — một vị trí trên bàn trải: nhãn vị trí (hiện sau khi lật),
 * lá bài flip 3D (back.webp mặt úp → ảnh lá, preserve-3d + rotateY), tên lá
 * VN/EN, chip xuôi/ngược, từ khoá và ý nghĩa ngắn từ cards.json.
 * Ảnh dùng <img> thường với width/height cố định (220×385) chống CLS.
 */
import { useLayoutEffect, useRef } from "react";
import styles from "./Tarot.module.css";
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
  const flightRef = useRef<HTMLDivElement>(null);
  const cardId = slot?.entry.id;
  useLayoutEffect(() => {
    const target = flightRef.current;
    if (!cardId || !target || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced") return;
    const source = target.closest("[data-tarot-table]")?.querySelector("[data-tarot-source]");
    if (!source) return;
    const from = source.getBoundingClientRect(), to = target.getBoundingClientRect();
    const dx = from.left + from.width / 2 - to.left - to.width / 2;
    const dy = from.top + 82 - to.top - to.height / 2;
    const scale = Math.min(1, 82 / target.offsetWidth);
    const pose = (x: number, y: number, size: number, angle: number) => `translate(${overlay ? y : x}px,${overlay ? -x : y}px) scale(${size}) rotate(${angle}deg)`;
    // Lift from the fan, float while turning, then settle into this exact slot.
    const flight = target.animate([
      { transform: pose(dx,dy,scale,overlay ? -99 : -9), opacity: 0, offset: 0 },
      { transform: pose(dx,dy-75,1.04,overlay ? -95 : -5), opacity: 1, offset: .24 },
      { transform: pose(dx*.65,dy-95,1.09,overlay ? -86 : 4), opacity: 1, offset: .53 },
      { transform: pose(0,-10,1.025,-1), opacity: 1, offset: .9 },
      { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1, offset: 1 },
    ], { duration: 1300, easing: "cubic-bezier(.25,.65,.3,1)", fill: "both" });
    target.dataset.flying = "true";
    flight.onfinish = () => { delete target.dataset.flying; flight.cancel(); };
    return () => { flight.cancel(); delete target.dataset.flying; };
  }, [cardId, overlay]);
  const card = slot ? tarotCardById(slot.entry.id) : undefined;
  const meaning = slot ? (slot.entry.reversed ? card?.rev : card?.up) : undefined;

  // Vị trí chưa có lá — khung nét đứt báo trước nơi lá sẽ xếp vào.
  if (!slot) {
    return (
      <div className={`${styles.slot} flex w-[var(--tarot-card-width,100px)] flex-col items-center sm:w-[124px] lg:w-[150px] ${className ?? ""}`}>
        <p aria-hidden="true" className="mb-1.5 min-h-8 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/50">
          {label}
        </p>
        <div
          aria-hidden="true"
          className={`${styles.emptySlot} aspect-[220/385] w-[var(--tarot-card-width,100px)] sm:w-[124px] lg:w-[150px]`}
        ><span>{String(index + 1).padStart(2,"0")}</span></div>
        <div className={styles.cardCaption}/>
      </div>
    );
  }

  const flip = (
    <div
      ref={flightRef}
      data-tarot-card={index}
      className={`${styles.cardArrival} relative [perspective:1200px] aspect-[220/385] w-[var(--tarot-card-width,100px)] transition-shadow duration-500 sm:w-[124px] lg:w-[150px] ${
        selecting && !slot.revealed ? "rounded-xl shadow-[0_8px_28px_rgba(36,77,64,0.18)]" : ""
      }`}
    >
      <div
        className="relative h-full w-full transition-transform duration-700 ease-[var(--ease-viet)]  [transform-style:preserve-3d]"
        style={{ transform: slot.flipped ? "rotateY(0deg)" : "rotateY(180deg)" }}
      >
        {/* Mặt trước — ảnh lá bài (ngược thì xoay 180°) */}
        <img
          src={tarotCardImage(deck, slot.entry.id)}
          alt={card ? `${card.nameEn}${slot.entry.reversed ? " — ngược" : ""}` : slot.entry.id}
          width={220}
          height={385}
          loading="eager"
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
          loading="eager"
          className="absolute inset-0 h-full w-full rounded-xl object-cover [backface-visibility:hidden] [transform:rotateY(180deg)]"
        />
      </div>

    </div>
  );

  if (overlay) {
    return <div className={`absolute left-0 top-[38px] z-10 aspect-[220/385] w-[var(--tarot-card-width,100px)] sm:w-[124px] lg:w-[150px] [transform:rotate(90deg)] ${className}`}>{flip}</div>;
  }

  return (
    <div className={`${styles.slot} flex w-[var(--tarot-card-width,100px)] flex-col items-center sm:w-[124px] lg:w-[150px] ${className}`}>
      {/* Nhãn vị trí — chỉ hiện sau khi lá đã lật xong */}
      <p
        aria-hidden={!slot.revealed}
        className={`mb-1.5 min-h-8 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/65 transition-opacity duration-500 ${
          slot.revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </p>
      {flip}

      {/* Kết quả lá — hiện sau khi lật */}
      <div className={styles.cardCaption}>
      {slot.revealed ? (
        <details className={styles.cardDetails}>
          <summary><strong>{card?.nameEn ?? slot.entry.id}</strong><span>{slot.entry.reversed ? "Ngược" : "Xuôi"} · Chi tiết</span></summary>
          <p>{meaning?.text}</p>
        </details>
      ) : null}
      </div>
    </div>
  );
}
