"use client";
import { useEffect, useRef } from "react";
import { TAROT_DECKS } from "@/lib/tarot";
import styles from "./Tarot.module.css";

export function DeckPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (value !== "raccoon") { element.pause(); return; }
    element.muted = false;
    const play = () => { void element.play().catch(() => { /* Retry on the next user gesture when sound autoplay is blocked. */ }); };
    play();
    document.addEventListener("pointerdown", play);
    document.addEventListener("keydown", play);
    return () => {
      document.removeEventListener("pointerdown", play);
      document.removeEventListener("keydown", play);
      element.pause();
    };
  }, [value]);
  const rail = useRef<HTMLDivElement>(null);
  const index = TAROT_DECKS.findIndex(deck => deck.id === value);
  const go = (next: number) => {
    const element = rail.current;
    if (!element) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
    element.scrollTo({left: next * element.clientWidth, behavior: reduced ? "instant" : "smooth"});
  };
  return <div className={styles.deckPreview}>
    <div ref={rail} className={styles.deckRail} role="region" aria-label="Chọn bộ bài Tarot" tabIndex={0} onKeyDown={event => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); go(Math.max(0, Math.min(TAROT_DECKS.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)))); }
    }} onScroll={event => {
      const el = event.currentTarget;
      const next = Math.round(el.scrollLeft / el.clientWidth);
      if (TAROT_DECKS[next] && TAROT_DECKS[next].id !== value) onChange(TAROT_DECKS[next].id);
    }}>
      {TAROT_DECKS.map((deck, i) => <article key={deck.id} className={styles.deckSlide} aria-label={`${i + 1} / ${TAROT_DECKS.length}: ${deck.nameVi}`}>
        {deck.status === "available" ? <div className={styles.deckArt}>
          {[-1,1].map(side => <img key={side} src={deck.back} alt="" width={220} height={385} style={{transform: `translateX(calc(${side} * var(--deck-side-offset))) rotate(${side * 13}deg)`}} />)}
          <video ref={video} className={styles.deckVideo} src="/assets/tarot/raccoon/intro.mp4" poster={deck.back} autoPlay loop playsInline preload="metadata" aria-label="Giới thiệu bộ bài Raccoon Tarot" disablePictureInPicture controlsList="nodownload noremoteplayback" />
        </div> : <div className={`${styles.teaserArt} ${styles.shibaTeaser}`} aria-hidden="true"><i /><i /><div className={styles.sealedCard}><span>ASTROX COLLECTION</span><div className={styles.teaserSeal}>柴</div><small>MỘT NGƯỜI BẠN MỚI</small></div></div>}
        <div className={styles.deckCaption}><span>{deck.status === "available" ? "SẴN SÀNG KHÁM PHÁ" : "SẮP RA MẮT"}</span><h2>{deck.nameVi}</h2></div>
        <p className={styles.deckHint}>{deck.id === "raccoon" ? "Vuốt để khám phá các bộ bài" : "Sau lớp bài úp, một chú Shiba đang chờ."}</p>
      </article>)}
    </div>
    <div className={styles.deckNavigation}><button aria-label="Bộ bài trước" disabled={index === 0} onClick={() => go(index - 1)}>←</button><div>{TAROT_DECKS.map((deck, i) => <button key={deck.id} aria-label={deck.nameVi} aria-current={i === index ? "true" : undefined} onClick={() => go(i)}><span /></button>)}</div><button aria-label="Bộ bài tiếp theo" disabled={index === TAROT_DECKS.length - 1} onClick={() => go(index + 1)}>→</button></div>
  </div>;
}
