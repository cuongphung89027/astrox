'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ReadingQuestion } from '@/components/kit/ReadingQuestion';
import { trackFeature } from '@/lib/feature-telemetry';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { KdAiPanel } from './KdAiPanel';
import { KdHistory } from './KdHistory';
import { KdResultPanel } from './KdResultPanel';
import { DivinationTube } from './DivinationTube';
import {
  KD_METHODS,
  castHexagram,
  castCoins,
  castDigits,
  castTime,
  coinValue,
  throwCoins,
  createKdHistory,
  replayKdHistory,
  readKdHistory,
  pushKdHistory,
  removeKdHistory,
} from '@/lib/kinhdich';
import type { CastResult, KdHistoryEntry, KdMethod } from '@/lib/kinhdich';
import styles from './KinhDich.module.css';

export function KinhDichClient() {
  const [question, setQuestion] = useState('');
  const [method, setMethod] = useState<KdMethod>('coins');
  const [cast, setCast] = useState<CastResult | null>(null);
  const [history, setHistory] = useState<KdHistoryEntry[]>([]);
  const [readingId, setReadingId] = useState('');
  const [error, setError] = useState('');
  const [numbers, setNumbers] = useState(['', '', '']);
  const [digits, setDigits] = useState('');
  const [values, setValues] = useState<number[]>([]);
  const [faces, setFaces] = useState<number[][]>([]);
  const [manual, setManual] = useState(false);
  const [manualValues, setManualValues] = useState(['', '', '', '', '', '']);
  const coinId = useId().replace(/:/g, '');
  const [phase, setPhase] = useState<'idle' | 'tossing' | 'settled'>('idle');
  const [round, setRound] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinScene = useRef<HTMLDivElement>(null);
  const sequence = useRef<number[][] | null>(null);
  const rolling = phase !== 'idle';
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    sequence.current = null;
    setPhase('idle');
    setRound(0);
    setFaces([]);
    setValues([]);
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      sequence.current = null;
    },
    [],
  );
  function reveal() {
    const all = sequence.current;
    if (!all) return;
    if (timer.current) clearTimeout(timer.current);
    sequence.current = null;
    setPhase('idle');
    finish(castCoins(all.map(coinValue), all));
  }
  function start() {
    if (sequence.current) return;
    const all = Array.from({ length: 6 }, () => throwCoins());
    sequence.current = all;
    setFaces([]);
    setValues([]);
    setError('');
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduced'
    ) {
      reveal();
      return;
    }
    coinScene.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const next = (i: number) => {
      if (sequence.current !== all) return;
      setRound(i + 1);
      setPhase('tossing');
      timer.current = setTimeout(() => {
        if (sequence.current !== all) return;
        setFaces(all.slice(0, i + 1));
        setValues(all.slice(0, i + 1).map(coinValue));
        setPhase('settled');
        timer.current = setTimeout(
          () => {
            if (sequence.current !== all) return;
            if (i === 5) reveal();
            else next(i + 1);
          },
          i === 5 ? 500 : 260,
        );
      }, 1000);
    };
    next(0);
  }
  useEffect(() => {
    const t = setTimeout(() => setHistory(readKdHistory()), 0);
    return () => clearTimeout(t);
  }, []);
  function finish(result: CastResult) {
    const entry = createKdHistory(result, question.trim());
    setCast(result);
    setReadingId(entry.id!);
    setHistory(pushKdHistory(entry));
    setError('');
    trackFeature('result_view', 'kinhdich', 'calculation');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function submit() {
    try {
      if (method === 'coins') finish(castCoins(manual ? manualValues.map(Number) : values, manual ? undefined : faces));
      else if (method === 'numbers') {
        const n = numbers.map(Number);
        if (!n.every(x => Number.isSafeInteger(x) && x >= 1 && x <= 999))
          throw new Error('Nhập ba số nguyên từ 1 đến 999.');
        finish(castHexagram(n[0], n[1], n[2]));
      } else if (method === 'time') finish(castTime(new Date().toISOString()));
      else finish(castDigits(method, digits));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lập được quẻ.');
    }
  }
  function reset() {
    stop();
    setCast(null);
    setValues([]);
    setFaces([]);
    setManualValues(['', '', '', '', '', '']);
    setError('');
  }
  return (
    <section className={styles.page}>
      <h1 className="sr-only">Kinh Dịch</h1>
      {!cast ? (
        <div className={styles.setup}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>KINH DỊCH</span>
            <h2>
              Một câu hỏi.
              <br />
              Nhiều cách tìm lời đáp.
            </h2>
            {method === 'coins' ? (
              <div ref={coinScene} className={styles.coinScene}>
                <div className={styles.coinOrbits} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div className={styles.threeCoins} aria-label="Ba đồng xu" data-phase={phase}>
                  {[0, 1, 2].map(i => {
                    const face = !manual ? faces.at(-1)?.[i] : undefined;
                    return (
                      <div className={styles.coinSlot} key={i}>
                        <div key={round} className={styles.goldCoin} data-phase={phase} data-coin={i}>
                          <svg viewBox="0 0 100 100" aria-hidden="true">
                            <defs>
                              <radialGradient id={`${coinId}-gold-${i}`} cx="30%" cy="20%" r="85%">
                                <stop stopColor="#fff0b6" />
                                <stop offset=".55" stopColor="#dfbd6e" />
                                <stop offset="1" stopColor="#a88035" />
                              </radialGradient>
                            </defs>
                            <path
                              fill={`url(#${coinId}-gold-${i})`}
                              fillRule="evenodd"
                              d="M50 2a48 48 0 1 1 0 96a48 48 0 1 1 0-96ZM39 39v22h22V39Z"
                            />
                            <circle cx="50" cy="50" r="47" fill="none" stroke="#b08a40" strokeWidth="2" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#fff0b5" strokeWidth="2" />
                            <circle cx="50" cy="50" r="39" fill="none" stroke="#b69550" strokeWidth=".7" />
                            <path d="M39 61V39h22" fill="none" stroke="#84612a" strokeWidth="2" />
                            <path d="M61 39v22H39" fill="none" stroke="#ffe7a0" strokeWidth="2" />
                            <path
                              d="M46 21h8M46 25h8M46 75h8M46 79h8M21 46v8M25 46v8M75 46v8M79 46v8"
                              stroke="#a5823e"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <span className={styles.coinCaption}>
                          {phase === 'tossing'
                            ? 'Đang gieo'
                            : face === undefined
                              ? `Xu ${i + 1}`
                              : face
                                ? 'Ngửa · 3'
                                : 'Sấp · 2'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.linePreview} aria-hidden="true">
                  {[5, 4, 3, 2, 1, 0].map(i => {
                    const v = manual ? Number(manualValues[i]) : values[i];
                    return (
                      <div key={i} data-ready={!!v} data-yang={!!v && v % 2 === 1} data-moving={v === 6 || v === 9}>
                        <i />
                        <i />
                        <span>{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
                <p className={styles.throwStatus} role="status">
                  {rolling ? `Đang gieo lượt ${round} / 6` : manual ? 'Nhập kết quả của bạn' : ''}
                </p>
                {!manual && (
                  <div className={styles.coinAction}>
                    <button className={styles.primary} onClick={start} disabled={rolling}>
                      {rolling ? `Đang gieo ${round}/6…` : 'Gieo quẻ'}
                      <span aria-hidden="true">↗</span>
                    </button>
                    {rolling && (
                      <div className={styles.ritualActions}>
                        <button onClick={stop}>Dừng gieo</button>
                        <button onClick={reveal}>Hiện quẻ ngay</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <DivinationTube />
            )}
          </div>
          <div className={styles.inputPanel}>
            <label htmlFor="kd-method">Cách lập quẻ</label>
            <select
              id="kd-method"
              className={styles.methodSelect}
              disabled={rolling}
              value={method}
              onChange={e => {
                setMethod(e.target.value as KdMethod);
                setError('');
                setDigits('');
              }}
            >
              {Object.entries(KD_METHODS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <label htmlFor="kd-question">
              Điều bạn đang băn khoăn <span>Tùy chọn</span>
            </label>
            <textarea
              id="kd-question"
              disabled={rolling}
              rows={2}
              maxLength={200}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Viết điều bạn muốn hỏi…"
            />
            {method === 'coins' && (
              <div className={styles.coinSetup}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    disabled={rolling}
                    checked={manual}
                    onChange={e => setManual(e.target.checked)}
                  />{' '}
                  Nhập kết quả gieo xu thật
                </label>
                {manual ? (
                  <div className={styles.coinGrid}>
                    {manualValues.map((v, i) => (
                      <label key={i}>
                        Hào {i + 1} {i === 0 ? '(dưới)' : i === 5 ? '(trên)' : ''}
                        <select
                          aria-label={`Giá trị hào ${i + 1}`}
                          value={v}
                          onChange={e => setManualValues(a => a.map((x, j) => (j === i ? e.target.value : x)))}
                        >
                          <option value="">Chọn</option>
                          {[6, 7, 8, 9].map(x => (
                            <option key={x} value={x}>
                              {x} · {x === 6 ? 'Âm động' : x === 7 ? 'Dương tĩnh' : x === 8 ? 'Âm tĩnh' : 'Dương động'}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <ol className={styles.coinThrows} aria-live="polite">
                      {values.map((v, i) => (
                        <li key={i}>
                          <span>Hào {i + 1}</span>
                          <span>{faces[i].map(f => (f ? 'Ngửa' : 'Sấp')).join(' · ')}</span>
                          <b>
                            {v}
                            {v === 6 || v === 9 ? ' · động' : ''}
                          </b>
                        </li>
                      ))}
                    </ol>
                    <p role="status">Đã gieo {values.length}/6 hào · từ dưới lên</p>

                    {!rolling && values.length > 0 && (
                      <button
                        className={styles.manualToggle}
                        onClick={() => {
                          setValues([]);
                          setFaces([]);
                        }}
                      >
                        Hủy và gieo lại
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            {method === 'numbers' && (
              <div className={styles.numberInputs}>
                {numbers.map((v, i) => (
                  <label key={i}>
                    Số {i + 1}
                    <input
                      aria-label={`Số ${i + 1}`}
                      type="number"
                      min={1}
                      max={999}
                      value={v}
                      onChange={e => setNumbers(a => a.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                  </label>
                ))}
              </div>
            )}
            {['serial', 'phone', 'digits'].includes(method) && (
              <div key={method} className={styles.digitInput}>
                <label htmlFor="kd-digits">{KD_METHODS[method]}</label>
                <input
                  id="kd-digits"
                  value={digits}
                  maxLength={48}
                  autoComplete="off"
                  inputMode={method === 'serial' ? 'text' : 'tel'}
                  onChange={e => setDigits(e.target.value)}
                  placeholder={method === 'serial' ? 'AB00123456' : method === 'phone' ? '0912 345 678' : '001234'}
                />
              </div>
            )}
            {error && (
              <p role="alert" className={styles.formError}>
                {error}
              </p>
            )}
            {(method !== 'coins' || manual) && (
              <button
                className={styles.primary}
                onClick={submit}
                disabled={method === 'coins' && (manual ? manualValues.some(v => !v) : values.length !== 6)}
              >
                Lập quẻ <span>↗</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.result}>
          <header className={styles.resultHeader}>
            <button onClick={reset} aria-label="Lập quẻ khác">
              ←
            </button>
            <div>
              <h2>Quẻ của bạn</h2>
            </div>
            <FeatureIcon name="kinhdich" size={28} />
          </header>
          <ReadingQuestion>{question}</ReadingQuestion>
          <KdResultPanel result={cast} />
          <div className={styles.ai}>
            <KdAiPanel key={readingId} result={cast} question={question} onReset={reset} />
          </div>
        </div>
      )}
      <KdHistory
        entries={history}
        onSelect={entry => {
          try {
            setCast(replayKdHistory(entry));
            setQuestion(entry.question);
            setReadingId(entry.id || String(entry.savedAt));
            setError('');
            window.scrollTo({ top: 0, behavior: 'instant' });
          } catch {
            setError('Bản lưu này không hợp lệ.');
          }
        }}
        onRemove={savedAt => setHistory(removeKdHistory(savedAt))}
      />
    </section>
  );
}
