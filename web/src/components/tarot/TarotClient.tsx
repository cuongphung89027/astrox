"use client";

/**
 * TarotClient — nghi thức trải bài Tarot, port tinh thần từ view "tarot" của
 * app cũ: chọn bộ bài (raccoon khả dụng) → câu hỏi (tuỳ chọn) → chọn kiểu
 * trải (1 lá / 3 lá 3 khung / Thánh Giá / Tình Yêu / Celtic Cross) → rút bài
 * ngẫu nhiên kèm chiều xuôi/ngược → lật từng lá từ quạt bài úp (flip 3D) →
 * AI tổng hợp (cache "tarot"). Tarot tự do rút bài; AI cần hồ sơ.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Btn, Chip, GlassCard, SectionTitle, TopicTabs } from "@/components/kit";
import { useToast } from "@/components/motion/toast";
import { useProfile } from "@/lib/use-store";
import {
  loadTarotCards,
  peekTarotCards,
  drawCards,
  tarotDeckById,
  tarotPositionsForFlow,
  tarotSpreadById,
  TAROT_DECKS,
  TAROT_SPREADS,
  type DrawnCard,
  type TarotCard,
} from "@/lib/tarot";
import { InterpretationPanel } from "./InterpretationPanel";
import { TarotCardSlot, type DrawnSlot } from "./TarotCardSlot";
import { TarotFan } from "./TarotFan";

export function TarotClient() {
  const profile = useProfile();
  const { show } = useToast();

  const [deckId, setDeckId] = useState("raccoon");
  const [spreadId, setSpreadId] = useState("three");
  const [frameId, setFrameId] = useState("ppf");
  const [question, setQuestion] = useState("");
  const [cardsData, setCardsData] = useState<TarotCard[] | null>(peekTarotCards());
  const [cardsErr, setCardsErr] = useState(false);

  const [phase, setPhase] = useState<"setup" | "ritual">("setup");
  const [pool, setPool] = useState<DrawnCard[]>([]);
  const [drawn, setDrawn] = useState<DrawnSlot[]>([]);
  const [busy, setBusy] = useState(false);

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
    const timers = timersRef.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  /* --------------------- Nghi thức rút bài --------------------- */
  const startDraw = () => {
    if (!cardsData || cardsData.length === 0) {
      fetchCards();
      return;
    }
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setPool(drawCards(cardsData, spread.count));
    setDrawn([]);
    setBusy(false);
    setPhase("ritual");
    later(() => boardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  const drawNext = () => {
    if (busy || phase !== "ritual") return;
    const nextIdx = drawn.length;
    if (nextIdx >= pool.length) return;
    setBusy(true);
    const entry = pool[nextIdx];
    setDrawn((prev) => [...prev, { entry, flipped: false, revealed: false }]);
    // 380ms giữ lá úp + hào quang → lật 3D (transition 700ms) → lộ nhãn + kết quả
    later(() => {
      setDrawn((prev) => prev.map((s, i) => (i === nextIdx ? { ...s, flipped: true } : s)));
    }, 380);
    later(() => {
      setDrawn((prev) => prev.map((s, i) => (i === nextIdx ? { ...s, revealed: true } : s)));
      setBusy(false);
    }, 1150);
  };

  const resetToSetup = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setPool([]);
    setDrawn([]);
    setBusy(false);
    setPhase("setup");
  };

  useEffect(() => {
    if (complete) later(() => interpRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  const title = spread.frames ? `${spread.name} — ${spread.frames.find((f) => f.id === frameId)?.label ?? ""}` : spread.name;

  /* ------------------------------ Render ------------------------------ */
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <SectionTitle
        eyebrow="Tarot"
        title="AstroX Tarot"
        sub="Chọn bộ bài, đặt câu hỏi và kiểu trải bài để AstroX giúp bạn tìm ra câu trả lời nhé."
      />

      {phase === "setup" ? (
        <>
          {/* ------------------------- Chọn bộ bài ------------------------- */}
          <GlassCard className="mt-8 p-5 sm:p-6">
            <p className="font-display text-base font-extrabold text-muc">Chọn bộ bài bạn muốn dùng</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {TAROT_DECKS.map((d) => {
                const available = d.status === "available";
                const active = d.id === deckId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-disabled={!available}
                    aria-pressed={available ? active : undefined}
                    onClick={() => {
                      if (!available) {
                        show("Bộ bài này sắp ra mắt — hãy đón chờ nhé.", "info");
                        return;
                      }
                      setDeckId(d.id);
                    }}
                    className={`glass flex flex-col rounded-[var(--radius-card)] p-3 text-left transition-all duration-200 ${
                      available ? "hover:-translate-y-0.5" : "cursor-not-allowed opacity-60"
                    } ${active ? "gold-ring" : ""}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <Chip tone={available ? "ngoc" : "neutral"}>{available ? "Mặc định" : "Sắp ra mắt"}</Chip>
                    </span>
                    {available ? (
                      <img
                        src={d.back}
                        alt={`Mặt sau bộ ${d.name}`}
                        width={110}
                        height={193}
                        loading="lazy"
                        className="mx-auto mt-3 h-36 w-auto rounded-lg object-cover shadow-[var(--shadow-glass)]"
                      />
                    ) : (
                      <span className="mx-auto mt-3 grid h-36 w-full place-items-center rounded-lg bg-kem-2 text-3xl" aria-hidden="true">
                        🂠
                      </span>
                    )}
                    <span className="mt-3 block font-display text-sm font-extrabold text-muc">{d.name}</span>
                    <span className="block text-[12.5px] font-semibold text-muc-2">{d.nameVi}</span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-muc-2">{d.desc}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* ----------------------- Câu hỏi + kiểu trải ----------------------- */}
          <GlassCard className="mt-4 p-5 sm:p-6">
            <label htmlFor="tarot-question" className="block text-[12.5px] font-bold text-muc">
              Câu hỏi bạn đang băn khoăn <span className="font-medium text-muc-2">(tuỳ chọn)</span>
            </label>
            <textarea
              id="tarot-question"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ví dụ: Mối quan hệ này nên tiếp tục theo hướng nào?"
              className="glass mt-2 w-full resize-y rounded-2xl px-4 py-3 text-sm font-semibold text-muc outline-none placeholder:font-normal placeholder:text-muc-2/60"
            />

            <p className="mt-5 font-display text-base font-extrabold text-muc">Chọn kiểu trải bài</p>
            <div className="mt-3">
              <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">
                <TopicTabs
                  items={TAROT_SPREADS.map((s) => ({ id: s.id, label: s.name }))}
                value={spreadId}
                onChange={(id) => {
                  setSpreadId(id);
                  const s = tarotSpreadById(id);
                  if (s?.frames) setFrameId(s.frames[0].id);
                }}
                ariaLabel="Kiểu trải bài"
                />
              </div>
            </div>
            <p className="mt-3 text-[13px] font-semibold text-muc-2">
              {spread.desc} <Chip tone="sen" className="ml-1">{spread.count} lá</Chip>
            </p>
            {spread.frames ? (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Khung diễn giải cho trải 3 lá">
                {spread.frames.map((f) => {
                  const active = f.id === frameId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFrameId(f.id)}
                      className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all duration-200 hover:-translate-y-0.5 ${
                        active ? "bg-son text-white shadow-[var(--shadow-pop)]" : "glass text-muc-2 hover:text-muc"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {cardsErr ? (
              <div role="alert" className="mt-4 rounded-2xl bg-son-tint px-4 py-3">
                <p className="text-sm font-semibold text-son-deep">Không tải được dữ liệu lá bài.</p>
                <div className="mt-2">
                  <Btn size="sm" variant="ghost" onClick={fetchCards}>
                    Thử lại
                  </Btn>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Btn size="lg" arrow onClick={startDraw} disabled={!cardsData}>
                {cardsData ? "Trải bài" : "Đang tải bộ bài…"}
              </Btn>
              <span className="text-[12px] text-muc-2">
                {deck.name} · {title}
              </span>
            </div>
          </GlassCard>
        </>
      ) : (
        /* ============================ BÀN TRẢI ============================ */
        <div ref={boardRef} className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-xl font-extrabold text-muc">{title}</p>
            <div className="flex items-center gap-2">
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-muc-2">
                <img src={deck.back} alt="" width={20} height={35} className="h-7 w-4 rounded-[3px] object-cover" loading="lazy" />
                {deck.nameVi}
              </span>
              <Btn variant="ghost" size="sm" onClick={resetToSetup}>
                Trải bài khác
              </Btn>
            </div>
          </div>

          <GlassCard className="mt-4 p-5 sm:p-7">
            {/* Quạt bài úp — bấm lá phát sáng để rút */}
            <TarotFan
              deck={deck}
              remaining={pool.length - drawn.length}
              drawnCount={drawn.length}
              total={spread.count}
              disabled={busy || complete}
              onDraw={drawNext}
            />

            {/* Bàn trải — vị trí theo kiểu trải */}
            <p className="sr-only" role="status">
              {complete
                ? `Đã rút đủ ${spread.count} lá. Cuộn xuống để xem luận giải.`
                : `Đã rút ${drawn.length} trên ${spread.count} lá.`}
            </p>

            <div className="mt-8">
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
                            <p aria-live="polite" className="mt-2 w-[150px] text-center text-[10.5px] font-semibold leading-snug text-muc-2 sm:w-[190px]">
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
          </GlassCard>

          {/* --------------------- Luận giải AI --------------------- */}
          <GlassCard className="mt-4 p-5 sm:p-6">
            <p className="font-display text-base font-extrabold text-muc">Luận giải bằng trí tuệ nhân tạo</p>
            <div ref={interpRef} className="mt-4">
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
          </GlassCard>

          <div className="glass mt-6 rounded-[var(--radius-card)] p-4">
            <p className="text-[12px] leading-relaxed text-muc-2">
              Không có lá bài tốt hay xấu tuyệt đối — mỗi lá phản ánh một xu hướng năng lượng tại thời điểm rút bài,
              không phải một định mệnh cố định.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/** Nhãn gọn cho lá cắt ngang (Celtic Cross). */
function labelCross(entry: { reversed: boolean }): string {
  return entry.reversed ? "ngược" : "xuôi";
}
