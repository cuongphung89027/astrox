"use client";

/**
 * TarotClient — nghi thức trải bài Tarot, port tinh thần từ view "tarot" của
 * app cũ: chọn bộ bài (raccoon khả dụng) → câu hỏi (tuỳ chọn) → chọn kiểu
 * trải (1 lá / 3 lá 3 khung / Thánh Giá / Tình Yêu / Celtic Cross) → rút bài
 * ngẫu nhiên kèm chiều xuôi/ngược → tự rút và lật đủ lá (flip 3D) →
 * AI tổng hợp (cache "tarot"). Tarot tự do rút bài; AI cần hồ sơ.
 */
import { LoadingWhisper } from "@/components/kit/LoadingWhisper";
import { ReadingQuestion } from "@/components/kit/ReadingQuestion";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/kit";
import { useToast } from "@/components/motion/toast";
import { useProfile } from "@/lib/use-store";
import {
  loadTarotCards,
  peekTarotCards,
  drawCards,
  tarotDeckById,
  tarotCardById,
  tarotPositionsForFlow,
  tarotSpreadById,
  TAROT_DECKS,
  TAROT_SPREADS,
  type DrawnCard,
  type TarotCard,
} from "@/lib/tarot";
import { InterpretationPanel } from "./InterpretationPanel";
import { TarotHistory } from "./TarotHistory";
import { TarotCardSlot, type DrawnSlot } from "./TarotCardSlot";
import { TarotFan } from "./TarotFan";
import styles from "./Tarot.module.css";
import { DeckPicker } from "./DeckPicker";
import { useTarotHistoryCount } from "@/lib/use-tarot-history";

export function TarotClient() {
  const profile = useProfile();
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inHistory = searchParams.get("history") === "1";

  const [deckId, setDeckId] = useState("raccoon");
  const [spreadId, setSpreadId] = useState("three");
  const [frameId, setFrameId] = useState("ppf");
  const [question, setQuestion] = useState("");
  const [cardsData, setCardsData] = useState<TarotCard[] | null>(peekTarotCards());
  const [cardsErr, setCardsErr] = useState(false);

  const [phase, setPhase] = useState<"setup" | "shuffling" | "ritual">("setup");
  const [pool, setPool] = useState<DrawnCard[]>([]);
  const [drawn, setDrawn] = useState<DrawnSlot[]>([]);
  const historyCount = useTarotHistoryCount();

  const timersRef = useRef<number[]>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const interpRef = useRef<HTMLDivElement | null>(null);

  const deck = tarotDeckById(deckId) ?? TAROT_DECKS[0];
  const spread = tarotSpreadById(spreadId) ?? TAROT_SPREADS[1];
  const positionLabels = tarotPositionsForFlow(spread, frameId);
  const complete =
    pool.length > 0 && drawn.length >= pool.length && drawn.every((s) => s.flipped && s.revealed);

  /* --------------------- Tải dữ liệu lá bài --------------------- */
  const fetchCards = useCallback(() => {
    setCardsErr(false);
    loadTarotCards()
      .then((data) => setCardsData(data))
      .catch(() => {
        setCardsErr(true);
        show("Không tải được dữ liệu lá bài — thử lại sau.", "error");
      });
  }, [show]);

  useEffect(() => {
    if (!peekTarotCards()) fetchCards();
  }, [fetchCards]);


  // Dọn timer khi rời trang
  useEffect(() => {
    return () => timersRef.current.forEach((t) => clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  /* --------------------- Nghi thức rút bài --------------------- */
  const startDraw = () => {
    if (deck.status !== "available") return;
    if (!cardsData || cardsData.length === 0) {
      fetchCards();
      return;
    }
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    const nextPool = drawCards(cardsData, spread.count);
    setPool(nextPool);
    setDrawn([]);
    setPhase("shuffling");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
    const shuffleMs = reduced ? 80 : 1050;
    later(() => setPhase("ritual"), shuffleMs);
    nextPool.forEach((entry, index) => {
      const arrival = shuffleMs + (reduced ? 0 : index * 850);
      later(() => setDrawn(previous => [...previous, { entry, flipped: false, revealed: false }]), arrival);
      later(() => setDrawn(previous => previous.map((slot, i) => i === index ? { ...slot, flipped: true } : slot)), arrival + (reduced ? 20 : 420));
      later(() => setDrawn(previous => previous.map((slot, i) => i === index ? { ...slot, revealed: true } : slot)), arrival + (reduced ? 40 : 1350));
    });
  };

  const resetToSetup = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setPool([]);
    setDrawn([]);
    setPhase("setup");
  };

  /* ------------------------------ Render ------------------------------ */
  return (
    <section className={styles.page}>
      <h1 className="sr-only">Tarot</h1>
      {phase === "setup" ? (
        inHistory ? (
          <TarotHistory onClose={() => router.push("/tarot")} />
        ) : (
        <div className={styles.setup}>
          <DeckPicker value={deckId} onChange={setDeckId} />
          <div className={styles.controls}>
            <label className={styles.question} htmlFor="tarot-question">Điều bạn đang nghĩ tới <span>Tuỳ chọn</span></label>
            <textarea id="tarot-question" rows={2} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Viết câu hỏi của bạn…" className={styles.textarea} />
            <div className={styles.sectionLabel}>Kiểu trải bài <span>{spread.count} lá</span></div>
            <div className={styles.spreadChoices} role="group" aria-label="Kiểu trải bài">{TAROT_SPREADS.map(s => <button type="button" key={s.id} aria-pressed={spreadId === s.id} onClick={() => { setSpreadId(s.id); if (s.frames) setFrameId(s.frames[0].id); }}>
              <SpreadDiagram id={s.id} />
              <span>{({one:"Một lá",three:"Ba lá",cross5:"Thánh giá",relationship5:"Tình yêu",celtic10:"Celtic Cross"} as Record<string,string>)[s.id]}</span>
              <small>{s.count} lá</small>
            </button>)}</div>
            <p className={styles.spreadDescription} aria-live="polite">{spread.desc}</p>
            {spread.frames && <label className={styles.frame}>Góc nhìn<select value={frameId} onChange={event => setFrameId(event.target.value)}>{spread.frames.map(frame => <option key={frame.id} value={frame.id}>{frame.label}</option>)}</select></label>}
            {cardsErr && <div role="alert" className={styles.error}>Không tải được bộ bài. <button onClick={fetchCards}>Thử lại</button></div>}
            <button className={styles.start} onClick={startDraw} disabled={!cardsData || deck.status !== "available"}>{deck.status !== "available" ? "Bộ bài đang được chuẩn bị" : cardsData ? "Bắt đầu trải bài" : "Đang tải bộ bài…"}<span aria-hidden="true">↗</span></button>
            <Link href="/tarot?history=1" className={styles.historyLink}>
              <span>Nhật ký trải bài</span>
              <span>{historyCount > 0 ? `${historyCount} lượt đã luận giải ` : "Chưa có lượt nào "}<i aria-hidden="true">↗</i></span>
            </Link>
          </div>
        </div>
        )
      ) : phase === "shuffling" ? (
        <div className={styles.shuffleStage} role="status"><div className={styles.shuffleStack}>{[0,1,2].map(i=><img key={i} src={deck.back} width={220} height={385} alt="" />)}</div><p><LoadingWhisper kind="shuffle"/></p></div>
      ) : (
        /* ============================ BÀN TRẢI ============================ */
        <div ref={boardRef} className={styles.ritual}>
          <div className={styles.ritualHeader}>
            <button onClick={resetToSetup} aria-label="Trải bài khác">←</button>
            <div><span>{deck.nameVi}</span><h2>{spread.name}</h2></div>
            <span className={styles.ritualCount}>{drawn.filter(card => card.revealed).length}<i> / {spread.count}</i></span>
          </div>
          <ReadingQuestion>{question}</ReadingQuestion>
          <div className={styles.readingTable} data-tarot-table>
            <div className={styles.tableHeading}><span>{complete ? "NHỮNG LÁ BÀI CỦA BẠN" : "MỘT KHOẢNG LẶNG CHO BẠN"}</span><p>{complete ? "Lắng nghe điều được hé mở" : "Những lá bài đang được mở"}</p></div>
            {/* Quạt bài minh hoạ cho quá trình tự rút. */}
            <TarotFan
              deck={deck}
              remaining={pool.length - drawn.filter(card => card.revealed).length}
              drawnCount={drawn.filter(card => card.revealed).length}
              total={spread.count}
            />

            {/* Bàn trải — vị trí theo kiểu trải */}
            <p className="sr-only" role="status">
              {complete
                ? `Đã rút đủ ${spread.count} lá. Cuộn xuống để xem luận giải.`
                : `Đã rút ${drawn.length} trên ${spread.count} lá.`}
            </p>

            <div className={styles.placedCards}>
              {spread.layout === "cross5" ? (
                <div className="mx-auto grid w-fit grid-cols-3 place-items-center gap-x-3 gap-y-5 sm:gap-x-6">
                  <TarotCardSlot deck={deck} slot={drawn[3]} label={positionLabels[3]} index={3} selecting={drawn.length === 4} className="col-start-2 row-start-1" />
                  <TarotCardSlot deck={deck} slot={drawn[0]} label={positionLabels[0]} index={0} selecting={drawn.length === 1} className="col-start-1 row-start-2" />
                  <TarotCardSlot deck={deck} slot={drawn[1]} label={positionLabels[1]} index={1} selecting={drawn.length === 2} className="col-start-2 row-start-2" />
                  <TarotCardSlot deck={deck} slot={drawn[4]} label={positionLabels[4]} index={4} selecting={drawn.length === 5} className="col-start-3 row-start-2" />
                  <TarotCardSlot deck={deck} slot={drawn[2]} label={positionLabels[2]} index={2} selecting={drawn.length === 3} className="col-start-2 row-start-3" />
                </div>
              ) : spread.layout === "5rel" ? (
                <div className="mx-auto grid w-fit grid-cols-2 place-items-center gap-x-4 gap-y-5 sm:gap-x-8">
                  <TarotCardSlot deck={deck} slot={drawn[4]} label={positionLabels[4]} index={4} selecting={drawn.length === 5} className="col-span-2" />
                  <TarotCardSlot deck={deck} slot={drawn[0]} label={positionLabels[0]} index={0} selecting={drawn.length === 1} />
                  <TarotCardSlot deck={deck} slot={drawn[1]} label={positionLabels[1]} index={1} selecting={drawn.length === 2} />
                  <TarotCardSlot deck={deck} slot={drawn[3]} label={positionLabels[3]} index={3} selecting={drawn.length === 4} />
                  <TarotCardSlot deck={deck} slot={drawn[2]} label={positionLabels[2]} index={2} selecting={drawn.length === 3} />
                </div>
              ) : spread.layout === "celtic" ? (
                <div>
                  <div className="mx-auto grid w-fit grid-cols-3 place-items-center gap-x-3 gap-y-5 sm:gap-x-6">
                    <TarotCardSlot deck={deck} slot={drawn[4]} label={positionLabels[4]} index={4} selecting={drawn.length === 5} className="col-start-2 row-start-1" />
                    <TarotCardSlot deck={deck} slot={drawn[3]} label={positionLabels[3]} index={3} selecting={drawn.length === 4} className="col-start-1 row-start-2" />
                    <div className="relative col-start-2 row-start-2">
                      <div className="relative">
                        <TarotCardSlot deck={deck} slot={drawn[0]} label={positionLabels[0]} index={0} selecting={drawn.length === 1} />
                        {drawn[1] ? (
                          <>
                            <TarotCardSlot deck={deck} slot={drawn[1]} label={positionLabels[1]} index={1} overlay />
                            <p aria-live="polite" className="mt-2 w-[var(--tarot-card-width,100px)] text-center text-[10.5px] font-semibold leading-snug text-muc-2 sm:w-[190px]">
                              Lá cắt ngang — {positionLabels[1]}: {labelCross(drawn[1].entry)}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <TarotCardSlot deck={deck} slot={drawn[5]} label={positionLabels[5]} index={5} selecting={drawn.length === 6} className="col-start-3 row-start-2" />
                    <TarotCardSlot deck={deck} slot={drawn[2]} label={positionLabels[2]} index={2} selecting={drawn.length === 3} className="col-start-2 row-start-3" />
                  </div>
                  <div className="mx-auto mt-7 grid w-fit grid-cols-2 place-items-center gap-x-4 gap-y-5 md:grid-cols-4 md:gap-x-6">
                    {[6, 7, 8, 9].map((i) => (
                      <TarotCardSlot key={i} deck={deck} slot={drawn[i]} label={positionLabels[i]} index={i} selecting={drawn.length === i + 1} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto flex w-fit flex-wrap items-start justify-center gap-x-4 gap-y-6 sm:gap-x-8">
                  {Array.from({ length: spread.count }, (_, i) => (
                    <TarotCardSlot key={i} deck={deck} slot={drawn[i]} label={positionLabels[i]} index={i} selecting={drawn.length === i + 1} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --------------------- Luận giải AI --------------------- */}
          {complete && <GlassCard className={`${styles.readingEnter} mt-4 p-5 sm:p-6`}>

            <div ref={interpRef}>
              {complete ? (
                <InterpretationPanel
                  spread={spread}
                  frameLabel={spread.frames?.find((f) => f.id === frameId)?.label}
                  deck={deck}
                  question={question.trim()}
                  drawn={drawn.map((s) => s.entry)}
                  positionLabels={positionLabels}
                  profile={profile}
                />
              ) : (
                <p className="text-sm text-muc-2">Rút đủ {spread.count} lá để AstroX bắt đầu luận giải.</p>
              )}
            </div>
          </GlassCard>}

        </div>
      )}
    </section>
  );
}

/** Nhãn gọn cho lá cắt ngang (Celtic Cross). */
function labelCross(entry: DrawnCard): string {
  return `${tarotCardById(entry.id)?.nameEn ?? entry.id} — ${entry.reversed ? "ngược" : "xuôi"}`;
}

function SpreadDiagram({id}: {id:string}) {
  // A shared card face keeps all five diagrams in the same visual family.
  const layouts: Record<string, {x:number;y:number;r?:number}[]> = {
    one: [{x:42,y:24}],
    three: [{x:19,y:26,r:-10},{x:42,y:21},{x:65,y:26,r:10}],
    cross5: [{x:42,y:3},{x:17,y:27},{x:42,y:27},{x:67,y:27},{x:42,y:51}],
    relationship5: [{x:17,y:11,r:-8},{x:67,y:11,r:8},{x:42,y:28},{x:23,y:51,r:8},{x:61,y:51,r:-8}],
    celtic10: [{x:33,y:27},{x:33,y:27,r:90},{x:33,y:2},{x:9,y:27},{x:33,y:52},{x:57,y:27},{x:81,y:1},{x:81,y:21},{x:81,y:41},{x:81,y:61}],
  };
  return <svg className={styles.spreadDiagram} viewBox="0 0 108 88" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="54" cy="79" rx={id === "one" ? 15 : 39} ry="2.5" fill="currentColor" fillOpacity=".06" stroke="none" />
    {layouts[id].map(({x,y,r=0},i)=><g key={i} transform={`translate(${x} ${y}) rotate(${r} 8 12)`}>
      <rect x="1" y="1.5" width="16" height="24" rx="2.8" fill="currentColor" fillOpacity=".08" stroke="none" />
      <rect width="16" height="24" rx="2.5" fill="var(--spread-card-fill)" />
      <rect x="2.5" y="2.5" width="11" height="19" rx="1" strokeOpacity=".35" strokeWidth=".6" />
      <path d="M8 7.5 9.3 10.7 12 12 9.3 13.3 8 16.5 6.7 13.3 4 12 6.7 10.7Z" fill="currentColor" fillOpacity=".12" strokeWidth=".65" />
      <circle cx="8" cy="4.6" r=".65" fill="currentColor" stroke="none" />
      <circle cx="8" cy="19.4" r=".65" fill="currentColor" stroke="none" />
    </g>)}
  </svg>;
}
