"use client";
import { useEffect, useRef, useState } from "react";
import { TAROT_DECKS, type TarotDeck } from "@/lib/tarot";
import styles from "./Tarot.module.css";

/** Video giới thiệu của slide đang chọn — mount/play khi active, pause khi rời slide. */
function DeckIntro({ deck, soundOn, onToggleSound }: { deck: TarotDeck; soundOn: boolean; onToggleSound: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.muted = !soundOn;
    void element.play().catch(() => { /* autoplay tắt tiếng không bị chặn — bỏ qua lỗi hiếm gặp */ });
    return () => element.pause();
  }, [soundOn]);
  return <div className={styles.deckVideoWrap}>
    <video ref={video} className={styles.deckVideo} src={`${deck.base}intro.mp4`} poster={deck.back} autoPlay loop playsInline muted={!soundOn} preload="metadata" aria-label={`Giới thiệu bộ bài ${deck.nameVi}`} disablePictureInPicture controlsList="nodownload noremoteplayback" />
    <button type="button" className={styles.deckSound} aria-pressed={soundOn} onClick={onToggleSound} aria-label={soundOn ? "Tắt tiếng video giới thiệu bộ bài" : "Bật tiếng video giới thiệu bộ bài"} title={soundOn ? "Tắt tiếng" : "Bật tiếng"}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6.5 9H3.5v6h3L11 19z" />
        {soundOn ? <>
          <path d="M14.5 9.5a4 4 0 0 1 0 5" />
          <path d="M17.2 7a7.6 7.6 0 0 1 0 10" />
        </> : <>
          <path d="m16 9.5 5 5" />
          <path d="m21 9.5-5 5" />
        </>}
      </svg>
    </button>
  </div>;
}

export function DeckPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  // Âm thanh mặc định tắt tiếng — người dùng bật lại bằng nút loa, giữ nguyên khi đổi bộ.
  const [soundOn, setSoundOn] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  // Chỉ coi scroll là "đổi bộ" khi có ý định thật (vuốt/bánh xe/nút/mũi tên).
  // Khi load, scroll-snap có thể tự re-snap sang slide kề — không được hiểu là chọn bộ.
  // Cờ tắt theo THỜI GIAN IM (180ms không cuộn) chứ không theo vị trí: sự kiện
  // scroll đầu của smooth animation xuất phát cách điểm snap 1–2px, nếu so vị trí
  // sẽ tắt cờ ngay nhịp đầu → rail trôi mà value đứng yên (mất đồng bộ dot/deck).
  const scrollIntent = useRef(false);
  const scrollSettle = useRef<number | undefined>(undefined);
  const armIntent = (ms: number) => {
    scrollIntent.current = true;
    window.clearTimeout(scrollSettle.current);
    scrollSettle.current = window.setTimeout(() => { scrollIntent.current = false; }, ms);
  };
  useEffect(() => () => window.clearTimeout(scrollSettle.current), []);
  const index = TAROT_DECKS.findIndex(deck => deck.id === value);
  const go = (next: number) => {
    const element = rail.current;
    if (!element) return;
    armIntent(600);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
    element.scrollTo({left: next * element.clientWidth, behavior: reduced ? "instant" : "smooth"});
  };
  return <div className={styles.deckPreview}>
    <div ref={rail} className={styles.deckRail} role="region" aria-label="Chọn bộ bài Tarot" tabIndex={0}
      onPointerDown={() => armIntent(400)}
      onWheel={() => armIntent(400)}
      onKeyDown={event => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); go(Math.max(0, Math.min(TAROT_DECKS.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)))); }
      }} onScroll={event => {
        if (!scrollIntent.current) return;
        const el = event.currentTarget;
        const next = Math.round(el.scrollLeft / el.clientWidth);
        if (TAROT_DECKS[next] && TAROT_DECKS[next].id !== value) onChange(TAROT_DECKS[next].id);
        armIntent(180); // im 180ms coi như hết cú cuộn
      }}>
      {TAROT_DECKS.map((deck, i) => <article key={deck.id} className={styles.deckSlide} aria-label={`${i + 1} / ${TAROT_DECKS.length}: ${deck.nameVi}${deck.isNew ? " (mới ra mắt)" : ""}`}>
        {deck.status === "available" ? <div className={styles.deckArt}>
          {deck.isNew && <span className={styles.deckNewBadge}>Mới</span>}
          {[-1,1].map(side => <img key={side} src={deck.back} alt="" width={220} height={385} style={{transform: `translateX(calc(${side} * var(--deck-side-offset))) rotate(${side * 13}deg)`}} />)}
          {value === deck.id
            ? <DeckIntro deck={deck} soundOn={soundOn} onToggleSound={() => setSoundOn(on => !on)} />
            : <video className={styles.deckVideo} poster={deck.back} preload="none" tabIndex={-1} aria-hidden="true" />}
        </div> : <div className={`${styles.teaserArt} ${styles.shibaTeaser}`} aria-hidden="true"><i /><i /><div className={styles.sealedCard}><span>ASTROX COLLECTION</span><div className={styles.teaserSeal}>柴</div><small>MỘT NGƯỜI BẠN MỚI</small></div></div>}
        <div className={styles.deckCaption}><span>{deck.status === "available" ? "SẴN SÀNG KHÁM PHÁ" : "SẮP RA MẮT"}</span><h2>{deck.nameVi}</h2></div>
        <p className={styles.deckHint}>{i === 0 ? "Vuốt để khám phá các bộ bài" : "Vuốt để đổi bộ bài bất cứ lúc nào."}</p>
      </article>)}
    </div>
    <div className={styles.deckNavigation}><button aria-label="Bộ bài trước" disabled={index === 0} onClick={() => go(index - 1)}>←</button><div>{TAROT_DECKS.map((deck, i) => <button key={deck.id} aria-label={deck.nameVi} aria-current={i === index ? "true" : undefined} onClick={() => go(i)}><span /></button>)}</div><button aria-label="Bộ bài tiếp theo" disabled={index === TAROT_DECKS.length - 1} onClick={() => go(index + 1)}>→</button></div>
  </div>;
}
