"use client";

/** Decorative fan accompanying automatic drawing; no per-card interaction. */
import { LoadingWhisper } from "@/components/kit/LoadingWhisper";
import type { CSSProperties } from "react";
import styles from "./Tarot.module.css";
import type { TarotDeck } from "@/lib/tarot";

interface TarotFanProps {
  deck: TarotDeck;
  remaining: number;
  drawnCount: number;
  total: number;
}

export function TarotFan({ deck, remaining, drawnCount, total }: TarotFanProps) {
  const shown = remaining > 0 ? 7 : 0;
  return <div className={styles.fanArea}>
    <div className={styles.fanProgress} aria-label={`Đã rút ${drawnCount} trên ${total} lá`}>{Array.from({length:total},(_,i)=><i key={i} data-done={i < drawnCount} />)}</div>
    <div className={styles.fan} data-tarot-source aria-hidden="true">
      {Array.from({length:shown},(_,i)=><div className={styles.fanCard} key={i} style={{"--fan-angle":`${(i-3)*9}deg`,"--fan-x":`${(i-3)*25}px`,"--fan-y":`${Math.abs(i-3)*7}px`,"--fan-delay":`${i*35}ms`} as CSSProperties}><img src={deck.back} alt="" width={220} height={385} draggable={false} /></div>)}
    </div>
    <p aria-live="polite">{remaining === 0 ? "Trải bài của bạn" : <LoadingWhisper kind="tarot"/>}</p>
  </div>;
}
