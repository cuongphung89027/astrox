'use client';
import { useLocale } from '@/i18n/LocaleProvider';
import { TAROT_SPREADS_EN } from '@/i18n/divination-en';
import { trackFeature } from '@/lib/feature-telemetry';

/**
 * TarotClient — nghi thức trải bài Tarot, port tinh thần từ view "tarot" của
 * app cũ: chọn bộ bài (raccoon khả dụng) → câu hỏi (tuỳ chọn) → chọn kiểu
 * trải (1 lá / 3 lá 3 khung / Thánh Giá / Tình Yêu / Celtic Cross) → rút bài
 * ngẫu nhiên kèm chiều xuôi/ngược → tự rút và lật đủ lá (flip 3D) →
 * AI tổng hợp (cache "tarot"). Tarot tự do rút bài; AI cần hồ sơ.
 */
import { LoadingWhisper } from '@/components/kit/LoadingWhisper';
import { ReadingQuestion } from '@/components/kit/ReadingQuestion';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/kit';
import { useToast } from '@/components/motion/toast';
import { useProfile } from '@/lib/use-store';
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
} from '@/lib/tarot';
import { InterpretationPanel } from './InterpretationPanel';
import { TarotHistory } from './TarotHistory';
import { TarotCardSlot, type DrawnSlot } from './TarotCardSlot';
import { TarotFan } from './TarotFan';
import styles from './Tarot.module.css';
import { DeckPicker } from './DeckPicker';
import { TarotAutoSelect } from './TarotAutoSelect';
import { selectionReason, type TarotSelection } from '@/lib/tarot-selection';
import { useTarotHistoryCount } from '@/lib/use-tarot-history';

export function TarotClient() {
  const en = useLocale().locale === 'en';
  const copy = useCallback((vi: string, us: string) => (en ? us : vi), [en]);
  const t = useLocale();
  const spreadEn = (id: string) => TAROT_SPREADS_EN[id];
  const spreadLabel = (s: { id: string; name: string }) =>
    t.locale === 'en' ? (spreadEn(s.id)?.name ?? s.name) : s.name;
  const profile = useProfile();
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inHistory = searchParams.get('history') === '1';

  const [deckId, setDeckId] = useState(TAROT_DECKS[0].id);
  const [spreadId, setSpreadId] = useState('three');
  const [frameId, setFrameId] = useState('ppf');
  const [question, setQuestion] = useState('');
  const [auto, setAuto] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectionIssue, setSelectionIssue] = useState('');
  const [light, setLight] = useState(-1);
  const [selection, setSelection] = useState<TarotSelection | null>(null);
  const [instantMotion, setInstantMotion] = useState(false);
  const issueRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selectionIssue) issueRef.current?.focus();
  }, [selectionIssue]);
  const [cardsData, setCardsData] = useState<TarotCard[] | null>(peekTarotCards());
  const [cardsErr, setCardsErr] = useState(false);

  const [phase, setPhase] = useState<'setup' | 'shuffling' | 'ritual'>('setup');
  const [pool, setPool] = useState<DrawnCard[]>([]);
  const [drawn, setDrawn] = useState<DrawnSlot[]>([]);
  const historyCount = useTarotHistoryCount();

  const timersRef = useRef<number[]>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const interpRef = useRef<HTMLDivElement | null>(null);

  const deck = tarotDeckById(deckId) ?? TAROT_DECKS[0];
  const spread = tarotSpreadById(spreadId) ?? TAROT_SPREADS[1];
  const englishSpread = spreadEn(spread.id);
  const positionLabels = en
    ? (englishSpread?.frames?.[frameId]?.positions ??
      englishSpread?.positions ??
      tarotPositionsForFlow(spread, frameId))
    : tarotPositionsForFlow(spread, frameId);
  const complete = pool.length > 0 && drawn.length >= pool.length && drawn.every(s => s.flipped && s.revealed);

  /* --------------------- Tải dữ liệu lá bài --------------------- */
  const fetchCards = useCallback(() => {
    setCardsErr(false);
    loadTarotCards()
      .then(data => setCardsData(data))
      .catch(() => {
        setCardsErr(true);
        show(
          copy('Không tải được dữ liệu lá bài — thử lại sau.', 'Unable to load card data. Please try again.'),
          'error',
        );
      });
  }, [show, copy]);

  useEffect(() => {
    if (peekTarotCards()) return;
    let active = true;
    loadTarotCards()
      .then(data => {
        if (active) setCardsData(data);
      })
      .catch(() => {
        if (active) {
          setCardsErr(true);
          show(
            copy('Không tải được dữ liệu lá bài — thử lại sau.', 'Unable to load card data. Please try again.'),
            'error',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [show, copy]);

  // Dọn timer khi rời trang
  useEffect(() => {
    return () => timersRef.current.forEach(t => clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  /* --------------------- Nghi thức rút bài --------------------- */
  const drawResultId = useRef<string | null>(null);
  useEffect(() => {
    if (drawResultId.current && drawn.length === spread.count && drawn.every(slot => slot.revealed)) {
      trackFeature('result_view', 'tarot', 'calculation', drawResultId.current);
      drawResultId.current = null;
    }
  }, [drawn, spread.count]);
  const startDraw = (
    selectedSpread = spreadId,
    selectedFrame = frameId,
    decision?: TarotSelection,
    instant = false,
  ) => {
    const resolved = tarotSpreadById(selectedSpread);
    if (!resolved) return;
    if (deck.status !== 'available') return;
    if (!cardsData || cardsData.length === 0) {
      fetchCards();
      return;
    }
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    trackFeature('feature_start', 'tarot', 'calculation');
    setSpreadId(resolved.id);
    setFrameId(selectedFrame);
    setSelection(decision || { status: 'selected', spreadId: resolved.id, frameId: selectedFrame, source: 'manual' });
    setSelecting(false);
    setLight(-1);
    setSelectionIssue('');
    setInstantMotion(instant);
    const nextPool = drawCards(cardsData, resolved.count);
    drawResultId.current = crypto.randomUUID();
    setPool(nextPool);
    setDrawn([]);
    setPhase('shuffling');
    const reduced =
      instant ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduced';
    const shuffleMs = reduced ? 80 : 1050;
    later(() => setPhase('ritual'), shuffleMs);
    nextPool.forEach((entry, index) => {
      const arrival = shuffleMs + (reduced ? 0 : index * 850);
      later(() => setDrawn(previous => [...previous, { entry, flipped: false, revealed: false }]), arrival);
      later(
        () => setDrawn(previous => previous.map((slot, i) => (i === index ? { ...slot, flipped: true } : slot))),
        arrival + (reduced ? 20 : 420),
      );
      later(
        () => setDrawn(previous => previous.map((slot, i) => (i === index ? { ...slot, revealed: true } : slot))),
        arrival + (reduced ? 40 : 1350),
      );
    });
  };

  const revealAll = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    setInstantMotion(true);
    boardRef.current?.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    setPhase('ritual');
    setDrawn(pool.map(entry => ({ entry, flipped: true, revealed: true })));
  };
  const cancelSelection = () => {
    setSelecting(false);
    setLight(-1);
    requestAnimationFrame(() => startRef.current?.focus());
  };
  const resetToSetup = () => {
    drawResultId.current = null;
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    setPool([]);
    setDrawn([]);
    setAuto(true);
    setSelection(null);
    setInstantMotion(false);
    setPhase('setup');
  };

  /* ------------------------------ Render ------------------------------ */
  return (
    <section className={styles.page} data-tarot-instant={instantMotion}>
      <h1 className="sr-only">Tarot</h1>
      {phase === 'setup' ? (
        inHistory ? (
          <TarotHistory onClose={() => router.push(en ? '/en/tarot' : '/tarot')} />
        ) : (
          <div className={styles.setup}>
            <div inert={selecting}>
              <DeckPicker value={deckId} onChange={setDeckId} />
            </div>
            <div className={styles.controls}>
              <label className={styles.question} htmlFor="tarot-question">
                {copy('Điều bạn đang nghĩ tới', 'What’s on your mind')} <span>{copy('Tuỳ chọn', 'Optional')}</span>
              </label>
              <textarea
                id="tarot-question"
                rows={2}
                maxLength={2000}
                disabled={selecting}
                value={question}
                onChange={e => {
                  setQuestion(e.target.value);
                  setSelectionIssue('');
                }}
                placeholder={copy('Viết câu hỏi của bạn…', 'Write your question…')}
                className={styles.textarea}
              />
              <div className={styles.sectionLabel}>
                {copy('Kiểu trải bài', 'Spread')}{' '}
                <span>
                  {auto ? copy('Theo câu hỏi', 'Based on your question') : `${spread.count} ${en ? 'cards' : 'lá'}`}
                </span>
              </div>
              <button
                type="button"
                className={styles.autoChoice}
                aria-pressed={auto}
                disabled={selecting}
                onClick={() => {
                  setAuto(true);
                  setSelectionIssue('');
                }}
              >
                <span aria-hidden>✦</span> {copy('Tự động', 'Automatic')}
              </button>
              <div className={styles.spreadChoices} role="group" aria-label={copy('Kiểu trải bài', 'Spread')}>
                {TAROT_SPREADS.map((s, index) => (
                  <button
                    type="button"
                    key={s.id}
                    aria-pressed={!auto && spreadId === s.id}
                    data-scanning={selecting && light === index}
                    disabled={selecting}
                    onClick={() => {
                      setAuto(false);
                      setSelectionIssue('');
                      setSpreadId(s.id);
                      if (s.frames) setFrameId(s.frames[0].id);
                    }}
                  >
                    <SpreadDiagram id={s.id} />
                    <span>
                      {
                        (
                          {
                            one: copy('Một lá', 'One card'),
                            three: copy('Ba lá', 'Three cards'),
                            cross5: copy('Thánh giá', 'Simple cross'),
                            relationship5: copy('Tình yêu', 'Relationships'),
                            celtic10: 'Celtic Cross',
                          } as Record<string, string>
                        )[s.id]
                      }
                    </span>
                    <small>
                      {s.count} {en ? 'cards' : 'lá'}
                    </small>
                  </button>
                ))}
              </div>
              {!auto && <p className={styles.spreadDescription}>{en ? englishSpread?.desc : spread.desc}</p>}
              {!auto && spread.frames && (
                <label className={styles.frame}>
                  {copy('Góc nhìn', 'Perspective')}
                  <select disabled={selecting} value={frameId} onChange={event => setFrameId(event.target.value)}>
                    {spread.frames.map(frame => (
                      <option key={frame.id} value={frame.id}>
                        {en ? englishSpread?.frames?.[frame.id]?.label : frame.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {cardsErr && (
                <div role="alert" className={styles.error}>
                  {copy('Không tải được bộ bài.', 'Unable to load the deck.')}{' '}
                  <button onClick={fetchCards}>{copy('Thử lại', 'Try again')}</button>
                </div>
              )}
              {selectionIssue && (
                <div ref={issueRef} tabIndex={-1} className={styles.autoError} role="alert">
                  <p>
                    {selectionIssue === 'needs_context'
                      ? copy(
                          'Bạn đang hỏi về việc gì? Thêm bối cảnh vào câu hỏi để chọn kiểu trải phù hợp.',
                          'What situation do you mean? Add context to your question to help select a spread.',
                        )
                      : selectionIssue === 'unsupported_comparison'
                        ? copy(
                            'Chưa có khung so sánh A/B. Bạn có thể thêm điều cần cân nhắc hoặc dùng 3 lá lời khuyên.',
                            'An A/B spread is not available. Add what you want to weigh up, or use three advice cards.',
                          )
                        : selectionIssue === 'rate_limited'
                          ? copy(
                              'Hãy chờ một chút hoặc tự chọn kiểu trải.',
                              'Please pause or choose a spread yourself.',
                            )
                          : copy(
                              'Chưa chọn được theo câu hỏi. Câu hỏi của bạn vẫn được giữ.',
                              'We could not select a spread. Your question is kept.',
                            )}
                  </p>
                  <div className={styles.autoActions}>
                    <button
                      type="button"
                      disabled={!cardsData?.length}
                      onClick={() =>
                        startDraw('three', 'soa', {
                          status: 'selected',
                          spreadId: 'three',
                          frameId: 'soa',
                          source: 'fallback',
                          reasonCode: 'fallback',
                        })
                      }
                    >
                      {copy('Dùng 3 lá', 'Use three cards')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuto(false);
                        setSelectionIssue('');
                      }}
                    >
                      {copy('Tự chọn', 'Choose myself')}
                    </button>
                  </div>
                </div>
              )}
              {selecting ? (
                <TarotAutoSelect
                  question={question}
                  locale={t.locale}
                  onLight={setLight}
                  onResolved={(decision, instant) =>
                    startDraw(decision.spreadId, decision.frameId || 'ppf', decision, instant)
                  }
                  onIssue={code => {
                    setSelecting(false);
                    setLight(-1);
                    setSelectionIssue(code);
                  }}
                  onCancel={cancelSelection}
                />
              ) : (
                <button
                  ref={startRef}
                  className={styles.start}
                  onClick={() => {
                    setSelectionIssue('');
                    if (auto) setSelecting(true);
                    else startDraw();
                  }}
                  disabled={!cardsData?.length || deck.status !== 'available'}
                >
                  {deck.status !== 'available'
                    ? copy('Bộ bài đang được chuẩn bị', 'This deck is being prepared')
                    : cardsData
                      ? copy('Bắt đầu trải bài', 'Start your reading')
                      : copy('Đang tải bộ bài…', 'Loading deck…')}
                  <span aria-hidden="true">↗</span>
                </button>
              )}
              <Link
                href={en ? '/en/tarot?history=1' : '/tarot?history=1'}
                onClick={() => {
                  setSelecting(false);
                  setLight(-1);
                }}
                className={styles.historyLink}
              >
                <span>{copy('Nhật ký trải bài', 'Reading journal')}</span>
                <span>
                  {historyCount > 0
                    ? `${historyCount} ${en ? 'readings' : 'lượt đã luận giải'} `
                    : copy('Chưa có lượt nào ', 'No readings yet ')}
                  <i aria-hidden="true">↗</i>
                </span>
              </Link>
            </div>
          </div>
        )
      ) : phase === 'shuffling' ? (
        <div className={styles.shuffleStage} role="status">
          <div className={styles.shuffleStack}>
            {[0, 1, 2].map(i => (
              <img key={i} src={deck.back} width={220} height={385} alt="" />
            ))}
          </div>
          <p>
            <LoadingWhisper kind="shuffle" />
          </p>
          <button type="button" className={styles.revealAll} onClick={revealAll}>
            {copy('Hiện tất cả', 'Reveal all')}
          </button>
        </div>
      ) : (
        /* ============================ BÀN TRẢI ============================ */
        <div ref={boardRef} className={styles.ritual}>
          <div className={styles.ritualHeader}>
            <button onClick={resetToSetup} aria-label={copy('Trải bài khác', 'Start another reading')}>
              ←
            </button>
            <div>
              <span>{en ? deck.name : deck.nameVi}</span>
              <h2>{spreadLabel(spread)}</h2>
            </div>
            <span className={styles.ritualCount}>
              {drawn.filter(card => card.revealed).length}
              <i> / {spread.count}</i>
            </span>
          </div>
          {selection?.reasonCode && (
            <p className={styles.selectionReason}>{selectionReason(selection.reasonCode, en)}</p>
          )}
          {!complete && (
            <button type="button" className={styles.revealAll} onClick={revealAll}>
              {copy('Hiện tất cả', 'Reveal all')}
            </button>
          )}
          <ReadingQuestion>{question}</ReadingQuestion>
          <div className={styles.readingTable} data-tarot-table>
            <div className={styles.tableHeading}>
              <span>
                {complete
                  ? copy('NHỮNG LÁ BÀI CỦA BẠN', 'YOUR CARDS')
                  : copy('MỘT KHOẢNG LẶNG CHO BẠN', 'A MOMENT OF STILLNESS')}
              </span>
              <p>
                {complete
                  ? copy('Lắng nghe điều được hé mở', 'Listen to what unfolds')
                  : copy('Những lá bài đang được mở', 'Your cards are being revealed')}
              </p>
            </div>
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
                ? en
                  ? `All ${spread.count} cards drawn. Scroll down for your reading.`
                  : `Đã rút đủ ${spread.count} lá. Cuộn xuống để xem luận giải.`
                : en
                  ? `Drawn ${drawn.length} of ${spread.count} cards.`
                  : `Đã rút ${drawn.length} trên ${spread.count} lá.`}
            </p>

            <div className={styles.placedCards}>
              {spread.layout === 'cross5' ? (
                <div className="mx-auto grid w-fit grid-cols-3 place-items-center gap-x-3 gap-y-5 sm:gap-x-6">
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[3]}
                    label={positionLabels[3]}
                    index={3}
                    selecting={drawn.length === 4}
                    className="col-start-2 row-start-1"
                  />
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[0]}
                    label={positionLabels[0]}
                    index={0}
                    selecting={drawn.length === 1}
                    className="col-start-1 row-start-2"
                  />
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[1]}
                    label={positionLabels[1]}
                    index={1}
                    selecting={drawn.length === 2}
                    className="col-start-2 row-start-2"
                  />
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[4]}
                    label={positionLabels[4]}
                    index={4}
                    selecting={drawn.length === 5}
                    className="col-start-3 row-start-2"
                  />
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[2]}
                    label={positionLabels[2]}
                    index={2}
                    selecting={drawn.length === 3}
                    className="col-start-2 row-start-3"
                  />
                </div>
              ) : spread.layout === '5rel' ? (
                <div className="mx-auto grid w-fit grid-cols-2 place-items-center gap-x-4 gap-y-5 sm:gap-x-8">
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[4]}
                    label={positionLabels[4]}
                    index={4}
                    selecting={drawn.length === 5}
                    className="col-span-2"
                  />
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[0]}
                    label={positionLabels[0]}
                    index={0}
                    selecting={drawn.length === 1}
                  />
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[1]}
                    label={positionLabels[1]}
                    index={1}
                    selecting={drawn.length === 2}
                  />
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[3]}
                    label={positionLabels[3]}
                    index={3}
                    selecting={drawn.length === 4}
                  />
                  <TarotCardSlot
                    deck={deck}
                    slot={drawn[2]}
                    label={positionLabels[2]}
                    index={2}
                    selecting={drawn.length === 3}
                  />
                </div>
              ) : spread.layout === 'celtic' ? (
                <div>
                  <div className="mx-auto grid w-fit grid-cols-3 place-items-center gap-x-3 gap-y-5 sm:gap-x-6">
                    <TarotCardSlot
                      deck={deck}
                      slot={drawn[4]}
                      label={positionLabels[4]}
                      index={4}
                      selecting={drawn.length === 5}
                      className="col-start-2 row-start-1"
                    />
                    <TarotCardSlot
                      deck={deck}
                      slot={drawn[3]}
                      label={positionLabels[3]}
                      index={3}
                      selecting={drawn.length === 4}
                      className="col-start-1 row-start-2"
                    />
                    <div className="relative col-start-2 row-start-2">
                      <div className="relative">
                        <TarotCardSlot
                          deck={deck}
                          slot={drawn[0]}
                          label={positionLabels[0]}
                          index={0}
                          selecting={drawn.length === 1}
                        />
                        {drawn[1] ? (
                          <>
                            <TarotCardSlot deck={deck} slot={drawn[1]} label={positionLabels[1]} index={1} overlay />
                            <p
                              aria-live="polite"
                              className="mt-2 w-[var(--tarot-card-width,100px)] text-center text-[10.5px] font-semibold leading-snug text-white/75 sm:w-[190px]"
                            >
                              {en ? 'Crossing card' : 'Lá cắt ngang'} — {positionLabels[1]}:{' '}
                              {labelCross(drawn[1].entry, en)}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <TarotCardSlot
                      deck={deck}
                      slot={drawn[5]}
                      label={positionLabels[5]}
                      index={5}
                      selecting={drawn.length === 6}
                      className="col-start-3 row-start-2"
                    />
                    <TarotCardSlot
                      deck={deck}
                      slot={drawn[2]}
                      label={positionLabels[2]}
                      index={2}
                      selecting={drawn.length === 3}
                      className="col-start-2 row-start-3"
                    />
                  </div>
                  <div className="mx-auto mt-7 grid w-fit grid-cols-2 place-items-center gap-x-4 gap-y-5 md:grid-cols-4 md:gap-x-6">
                    {[6, 7, 8, 9].map(i => (
                      <TarotCardSlot
                        key={i}
                        deck={deck}
                        slot={drawn[i]}
                        label={positionLabels[i]}
                        index={i}
                        selecting={drawn.length === i + 1}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto flex w-fit flex-wrap items-start justify-center gap-x-4 gap-y-6 sm:gap-x-8">
                  {Array.from({ length: spread.count }, (_, i) => (
                    <TarotCardSlot
                      key={i}
                      deck={deck}
                      slot={drawn[i]}
                      label={positionLabels[i]}
                      index={i}
                      selecting={drawn.length === i + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --------------------- Luận giải AI --------------------- */}
          {complete && (
            <GlassCard className={`${styles.readingEnter} mt-4 p-5 sm:p-6`}>
              <div ref={interpRef}>
                {complete ? (
                  <InterpretationPanel
                    spread={spread}
                    frameId={frameId}
                    selectionSource={selection?.source}
                    frameLabel={spread.frames?.find(f => f.id === frameId)?.label}
                    deck={deck}
                    question={question.trim()}
                    drawn={drawn.map(s => s.entry)}
                    positionLabels={positionLabels}
                    profile={profile}
                  />
                ) : (
                  <p className="text-sm text-muc-2">
                    Rút đủ {spread.count} {en ? 'cards' : 'lá'} để AstroX bắt đầu luận giải.
                  </p>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </section>
  );
}

/** Nhãn gọn cho lá cắt ngang (Celtic Cross). */
function labelCross(entry: DrawnCard, en = false): string {
  return `${tarotCardById(entry.id)?.nameEn ?? entry.id} — ${en ? (entry.reversed ? 'reversed' : 'upright') : entry.reversed ? 'ngược' : 'xuôi'}`;
}

function SpreadDiagram({ id }: { id: string }) {
  // A shared card face keeps all five diagrams in the same visual family.
  const layouts: Record<string, { x: number; y: number; r?: number }[]> = {
    one: [{ x: 42, y: 24 }],
    three: [
      { x: 19, y: 26, r: -10 },
      { x: 42, y: 21 },
      { x: 65, y: 26, r: 10 },
    ],
    cross5: [
      { x: 42, y: 3 },
      { x: 17, y: 27 },
      { x: 42, y: 27 },
      { x: 67, y: 27 },
      { x: 42, y: 51 },
    ],
    relationship5: [
      { x: 17, y: 11, r: -8 },
      { x: 67, y: 11, r: 8 },
      { x: 42, y: 28 },
      { x: 23, y: 51, r: 8 },
      { x: 61, y: 51, r: -8 },
    ],
    celtic10: [
      { x: 33, y: 27 },
      { x: 33, y: 27, r: 90 },
      { x: 33, y: 2 },
      { x: 9, y: 27 },
      { x: 33, y: 52 },
      { x: 57, y: 27 },
      { x: 81, y: 1 },
      { x: 81, y: 21 },
      { x: 81, y: 41 },
      { x: 81, y: 61 },
    ],
  };
  return (
    <svg
      className={styles.spreadDiagram}
      viewBox="0 0 108 88"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse
        cx="54"
        cy="79"
        rx={id === 'one' ? 15 : 39}
        ry="2.5"
        fill="currentColor"
        fillOpacity=".06"
        stroke="none"
      />
      {layouts[id].map(({ x, y, r = 0 }, i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r} 8 12)`}>
          <rect x="1" y="1.5" width="16" height="24" rx="2.8" fill="currentColor" fillOpacity=".08" stroke="none" />
          <rect width="16" height="24" rx="2.5" fill="var(--spread-card-fill)" />
          <rect x="2.5" y="2.5" width="11" height="19" rx="1" strokeOpacity=".35" strokeWidth=".6" />
          <path
            d="M8 7.5 9.3 10.7 12 12 9.3 13.3 8 16.5 6.7 13.3 4 12 6.7 10.7Z"
            fill="currentColor"
            fillOpacity=".12"
            strokeWidth=".65"
          />
          <circle cx="8" cy="4.6" r=".65" fill="currentColor" stroke="none" />
          <circle cx="8" cy="19.4" r=".65" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  );
}
