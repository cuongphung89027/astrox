"use client";

/**
 * KinhDichClient — điều phối trang /kinhdich (Mai Hoa Dịch Số).
 * Port flow từ index.html: nhập câu hỏi → Gieo quẻ (nghi thức CastRitual với
 * 3 số sinh đúng cách cũ: 1 + floor(random*999)) → castHexagram → kết quả
 * 2 cột + AI luận giải + lịch sử 5 quẻ gần đây (localStorage riêng module).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Btn, GlassCard, SectionTitle } from "@/components/kit";
import { DongSonSun } from "@/components/kit/motifs";
import { useToast } from "@/components/motion";
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

  const motionOff = useCallback(() => {
    if (typeof window === "undefined") return true;
    if (document.documentElement.dataset.motion === "off") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const applyCast = useCallback(
    (s1: number, s2: number, s3: number) => {
      const result = castHexagram(s1, s2, s3);
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
      setNumbers([s1, s2, s3]);
      if (motionOff()) {
        // Giảm chuyển động: bỏ nghi thức, vào thẳng kết quả (toán pháp giữ nguyên).
        applyCast(s1, s2, s3);
        return;
      }
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
    const s1 = parseInt(manual.s1, 10);
    const s2 = parseInt(manual.s2, 10);
    const s3 = parseInt(manual.s3, 10);
    if (!s1 || !s2 || !s3 || s1 < 1 || s2 < 1 || s3 < 1) {
      show("Nhập đủ ba số nguyên dương.", "error");
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
    setCast(result);
    setCastCount((c) => c + 1);
    setPhase("result");
  }, []);

  useEffect(() => {
    if (phase === "result") {
      const t = setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const currentName = cast ? hexagramName(cast.upper, cast.lower) : "";
  const currentHao = cast ? HAO_NAMES[cast.movingPos] : "";

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-10 md:py-14">
      <SectionTitle
        eyebrow="Kinh Dịch"
        title="Kinh Dịch — Mai Hoa Dịch Số"
        sub="Đặt một câu hỏi cụ thể. AstroX dùng 3 số để tính thượng quái, hạ quái, hào động và quan hệ Thể–Dụng."
      />

      {/* Bước 1 — câu hỏi */}
      <GlassCard variant="premium" className="mt-8 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="kd-question" className="text-[15px] font-bold text-muc">
            Câu hỏi bạn đang băn khoăn
          </label>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-son-deep">Bước 1</span>
        </div>
        <textarea
          id="kd-question"
          rows={3}
          maxLength={200}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ví dụ: Tôi có nên nhận công việc mới trong tháng này không?"
          className="mt-3 w-full resize-none rounded-xl border border-white/80 bg-white/70 px-3.5 py-2.5 text-[15px] text-muc shadow-inner outline-none transition-colors placeholder:text-muc/40 focus:border-son"
        />
        <p className="mt-1 text-right text-[11px] font-semibold tabular-nums text-muc-2" aria-live="off">
          {question.length}/200
        </p>

        {/* Bước 2 — gieo quẻ */}
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-son/20 bg-gradient-to-br from-son-tint/70 to-white/50 p-4.5 sm:p-5">
          {/* Mặt trời Đông Sơn mờ quay chậm — chất nghi thức ngay cả khi đang chờ */}
          <DongSonSun
            size={150}
            className="ax-spin-slow pointer-events-none absolute -right-8 -top-10 text-son/10"
          />
          <div className="relative flex items-center justify-between gap-3">
            <p className="text-[13px] font-extrabold text-muc">Ba con số lập quẻ</p>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-son-deep">Bước 2</span>
          </div>
          <p className="mt-2 text-center text-xs italic leading-relaxed text-muc-2">
            Tĩnh tâm, thắp một nén hương lòng — thành tâm thì quẻ mới linh.{" "}
            <b className="not-italic text-son-deep">Lấy đúng số đầu tiên hiện ra</b>, chớ đổi vì thấy số &ldquo;không đẹp&rdquo;.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Btn variant="primary" size="lg" onClick={onGieo} disabled={phase === "ritual"} className="font-display">
              Gieo quẻ
            </Btn>
            <Btn variant="ghost" size="md" onClick={() => setManualOpen((v) => !v)} ariaLabel="Tự nhập ba số để lập quẻ">
              Tự nhập số
            </Btn>
          </div>

          {manualOpen ? (
            <div className="mt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["s1", "Số 1", "VD: giờ hiện tại"],
                    ["s2", "Số 2", "VD: phút hiện tại"],
                    ["s3", "Số 3", "VD: số bất kỳ"],
                  ] as const
                ).map(([key, label, ph]) => (
                  <div key={key}>
                    <label htmlFor={`kd-manual-${key}`} className="mb-1 block text-xs font-semibold text-muc-2">
                      {label}
                    </label>
                    <input
                      id={`kd-manual-${key}`}
                      type="number"
                      min={1}
                      value={manual[key]}
                      onChange={(e) => setManual((m) => ({ ...m, [key]: e.target.value }))}
                      placeholder={ph}
                      className={MANUAL_INPUT_CLASS}
                    />
                  </div>
                ))}
              </div>
              <Btn variant="primary" size="md" className="mt-3 w-full" onClick={onManualCast}>
                Lập quẻ từ 3 số này
              </Btn>
            </div>
          ) : null}

          <p className="mt-4 text-[11.5px] leading-relaxed text-muc-2">
            Mẹo lấy số khách quan (theo Số Pháp): số seri tờ tiền, biển số xe, giờ:phút hiện tại, số trang sách lật ngẫu nhiên... Dùng
            đúng số đầu tiên xuất hiện, đừng đổi vì thấy &ldquo;không đẹp&rdquo;.
          </p>
        </div>
      </GlassCard>

      {/* Kết quả */}
      <div ref={resultRef} className="scroll-mt-20" aria-live="polite">
        {phase === "result" && cast ? (
          <>
            <KdResultPanel result={cast} />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <KdAiPanel key={castCount} result={cast} question={question} onReset={onReset} />
              <GlassCard className="hidden p-6 text-sm leading-relaxed text-muc-2 lg:block">
                <p>
                  <span className="font-extrabold text-muc">Ba số đã gieo:</span> {cast.s1} · {cast.s2} · {cast.s3} — thượng quái
                  (mod 8), hạ quái (mod 8), hào động (tổng mod 6). Cùng quẻ, cùng câu hỏi sẽ cho cùng luận giải (có cache).
                </p>
              </GlassCard>
            </div>
            <p className="sr-only">
              Quẻ {currentName}, hào động {currentHao}.
            </p>
          </>
        ) : null}
      </div>

      <KdHistory entries={history} onSelect={onSelectHistory} onRemove={(savedAt) => setHistory(removeKdHistory(savedAt))} />

      {phase === "ritual" ? (
        <CastRitual numbers={numbers} onComplete={() => applyCast(numbers[0], numbers[1], numbers[2])} onCancel={() => setPhase("input")} />
      ) : null}
    </section>
  );
}
