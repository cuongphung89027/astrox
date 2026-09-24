"use client";
import { trackFeature } from "@/lib/feature-telemetry";

/**
 * KinhDichClient — điều phối trang /kinhdich (Mai Hoa Dịch Số).
 * Port flow từ index.html: nhập câu hỏi → Gieo quẻ (nghi thức CastRitual với
 * 3 số sinh đúng cách cũ: 1 + floor(random*999)) → castHexagram → kết quả
 * 2 cột + AI luận giải + lịch sử 5 quẻ gần đây (localStorage riêng module).
 */
import { ReadingQuestion } from "@/components/kit/ReadingQuestion";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./KinhDich.module.css";
import { DivinationTube } from "./DivinationTube";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { useToast } from "@/components/motion";
import { playShakeAudio } from "./shakeAudio";
import { CastRitual } from "./CastRitual";
import { KdAiPanel } from "./KdAiPanel";
import { KdHistory } from "./KdHistory";
import { KdResultPanel } from "./KdResultPanel";
import {
  HAO_NAMES,
  castHexagram,
  hexagramName,
  pushKdHistory,
  randomCastNumbers,
  readKdHistory,
  removeKdHistory,
} from "@/lib/kinhdich";
import type { CastResult, KdHistoryEntry } from "@/lib/kinhdich";

type Phase = "input" | "ritual" | "result";

const MANUAL_INPUT_CLASS =
  "w-full rounded-xl border border-white/80 bg-white/70 px-3.5 py-2.5 text-[15px] text-muc outline-none transition-colors placeholder:text-muc/40 focus:border-son";

export function KinhDichClient() {
  const stopSound = useRef<(() => void) | null>(null);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [numbers, setNumbers] = useState<[number, number, number]>([0, 0, 0]);
  const [cast, setCast] = useState<CastResult | null>(null);
  const [castCount, setCastCount] = useState(0);
  const [history, setHistory] = useState<KdHistoryEntry[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ s1: "", s2: "", s3: "" });
  const resultRef = useRef<HTMLDivElement | null>(null);
  const { show } = useToast();

  useEffect(() => {
    // Đọc lịch sử sau khi mount (localStorage là hệ thống ngoài — tránh setState
    // đồng bộ trong effect và tránh lệch hydration với HTML tĩnh).
    const t = setTimeout(() => setHistory(readKdHistory()), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "ritual") stopSound.current?.();
  }, [phase]);
  useEffect(() => () => stopSound.current?.(), []);

  useEffect(() => {
    if (phase !== "result") return;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const motionOff = useCallback(() => {
    if (typeof window === "undefined") return true;
    if (document.documentElement.dataset.motion === "reduced") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const applyCast = useCallback(
    (s1: number, s2: number, s3: number) => {
      const result = castHexagram(s1, s2, s3);
      trackFeature("result_view", "kinhdich", "calculation");
      setCast(result);
      setCastCount((c) => c + 1);
      setPhase("result");
      setHistory(
        pushKdHistory({
          question: question.trim(),
          s1,
          s2,
          s3,
          name: hexagramName(result.upper, result.lower),
          movingPos: result.movingPos,
          savedAt: Date.now(),
        }),
      );
    },
    [question],
  );

  const startRitual = useCallback(
    (s1: number, s2: number, s3: number) => {
      trackFeature("feature_start", "kinhdich", "calculation");
      setNumbers([s1, s2, s3]);
      if (motionOff()) {
        // Giảm chuyển động: bỏ nghi thức, vào thẳng kết quả (toán pháp giữ nguyên).
        applyCast(s1, s2, s3);
        return;
      }
      stopSound.current?.();
      stopSound.current = playShakeAudio();
      setPhase("ritual");
    },
    [applyCast, motionOff],
  );

  const onGieo = useCallback(() => {
    const [s1, s2, s3] = randomCastNumbers();
    setManualOpen(false);
    startRitual(s1, s2, s3);
  }, [startRitual]);

  const onManualCast = useCallback(() => {
    const s1 = Number(manual.s1);
    const s2 = Number(manual.s2);
    const s3 = Number(manual.s3);
    if (![s1,s2,s3].every(value=>Number.isSafeInteger(value)&&value>=1&&value<=999)) {
      show("Nhập ba số nguyên từ 1 đến 999.", "error");
      return;
    }
    startRitual(s1, s2, s3);
  }, [manual, show, startRitual]);

  const onReset = useCallback(() => {
    setCast(null);
    setQuestion("");
    setPhase("input");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onSelectHistory = useCallback((entry: KdHistoryEntry) => {
    setQuestion(entry.question);
    const result = castHexagram(entry.s1, entry.s2, entry.s3);
    trackFeature("result_view", "kinhdich", "saved");
    setCast(result);
    setCastCount((c) => c + 1);
    setPhase("result");
  }, []);

  const currentName = cast ? hexagramName(cast.upper, cast.lower) : "";
  const currentHao = cast ? HAO_NAMES[cast.movingPos] : "";

  return <section className={styles.page}>
    <h1 className="sr-only">Kinh Dịch</h1>
    {phase !== "result" ? <div className={styles.setup}>
      <div className={styles.intro}><span className={styles.eyebrow}>MAI HOA DỊCH SỐ</span><h2>Một câu hỏi.<br/>Một góc nhìn mới.</h2><DivinationTube/></div>
      <div className={styles.inputPanel}><label htmlFor="kd-question">Điều bạn đang băn khoăn <span>Tuỳ chọn</span></label><textarea id="kd-question" rows={3} maxLength={200} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Viết điều bạn muốn hỏi…"/><div className={styles.questionCount}>{question.length}/200</div><button className={styles.primary} onClick={onGieo} disabled={phase === "ritual"}>Xóc quẻ <span>↗</span></button><button className={styles.manualToggle} onClick={()=>setManualOpen(v=>!v)} aria-expanded={manualOpen}>Tự chọn ba số <span>{manualOpen ? "−" : "+"}</span></button>{manualOpen && <div className={styles.manual}><div>{(["s1","s2","s3"] as const).map((key,i)=><label key={key}>Số {i+1}<input type="number" min={1} max={999} step={1} value={manual[key]} onChange={e=>setManual(m=>({...m,[key]:e.target.value}))}/></label>)}</div><button className={styles.primary} onClick={onManualCast}>Lập quẻ từ ba số ↗</button></div>}<p className={styles.method}>Lập quẻ theo phương pháp ba số Mai Hoa.</p></div>
    </div> : cast && <div ref={resultRef} className={styles.result}>
      <header className={styles.resultHeader}><button onClick={onReset} aria-label="Gieo quẻ khác">←</button><div><h2>Quẻ của bạn</h2></div><FeatureIcon name="kinhdich" size={28}/></header>
      <ReadingQuestion>{question}</ReadingQuestion>
      <KdResultPanel result={cast}/><div className={styles.ai}><KdAiPanel key={castCount} result={cast} question={question} onReset={onReset}/></div><p className="sr-only">Hào động {currentHao}</p>
    </div>}
    <KdHistory entries={history} onSelect={onSelectHistory} onRemove={savedAt=>setHistory(removeKdHistory(savedAt))}/>
    {phase === "ritual" && <CastRitual numbers={numbers} onComplete={()=>applyCast(...numbers)} onCancel={()=>setPhase("input")}/>}
  </section>;
}
