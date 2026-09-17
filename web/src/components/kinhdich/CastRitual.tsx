"use client";

/**
 * CastRitual — nghi thức "cầu quẻ" (đại sản của trang Kinh Dịch):
 * Mặt Trời Đông Sơn lớn quay nhanh dần rồi chậm (điều khiển bằng transform +
 * transition theo state, không restart animation → không giật), Chim Lạc bay
 * ngang, 3 con số hiện lần lượt NumberPopIn (timing port từ
 * animateOrbsThenCast: 14 tick × 70ms/số, nghỉ 700ms giữa các số, dựng quẻ
 * sau 650ms). Toán pháp sinh số nằm ở caller — component này chỉ diễn.
 */
import { useEffect, useRef, useState } from "react";
import { DongSonSun, LacBird } from "@/components/kit/motifs";
import { NumberPopIn } from "@/components/motion";

const SEEK_TICKS = 14;
const SEEK_TICK_MS = 70;
const BETWEEN_MS = 700;
const BUILD_MS = 650;

interface CastRitualProps {
  numbers: [number, number, number];
  onComplete: () => void;
  onCancel: () => void;
}

const NUM_LABELS = [
  { title: "☰ Thượng quái", sub: "Số thứ nhất" },
  { title: "☷ Hạ quái", sub: "Số thứ hai" },
  { title: "◉ Hào động", sub: "Số thứ ba" },
];

export function CastRitual({ numbers, onComplete, onCancel }: CastRitualProps) {
  const [vals, setVals] = useState<[number, number, number]>([0, 0, 0]);
  const [seeking, setSeeking] = useState<boolean[]>([true, true, true]);
  const [settled, setSettled] = useState(0);
  /** Góc quay hiện tại + transition — cộng dồn để "nhanh dần rồi chậm". */
  const [spin, setSpin] = useState({ deg: 0, durMs: 900, ease: "linear" });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const cleanup = () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      timers.forEach(clearTimeout);
    };

    const seekCoin = (i: number) => {
      if (cancelled) return;
      // Quay nhanh: +720° trong suốt cửa sổ gieo số (~1s) — linear.
      setSpin((s) => ({ deg: s.deg + 720, durMs: SEEK_TICKS * SEEK_TICK_MS, ease: "linear" }));
      let ticks = 0;
      interval = setInterval(() => {
        if (cancelled) return;
        ticks++;
        if (ticks < SEEK_TICKS) {
          const rnd = 1 + Math.floor(Math.random() * 999);
          setVals((v) => {
            const next = [...v] as [number, number, number];
            next[i] = rnd;
            return next;
          });
          return;
        }
        if (interval) clearInterval(interval);
        interval = null;
        // Số thật hiện ra — NumberPopIn replay nhờ key=value ở phần render.
        setVals((v) => {
          const next = [...v] as [number, number, number];
          next[i] = numbers[i];
          return next;
        });
        setSeeking((s) => {
          const next = [...s];
          next[i] = false;
          return next;
        });
        setSettled(i + 1);
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            if (i < 2) {
              seekCoin(i + 1);
              return;
            }
            // Đủ 3 số · đang dựng quẻ — mặt trời chậm dần (+240° ease-out dài).
            setSpin((s) => ({ deg: s.deg + 240, durMs: 2200, ease: "cubic-bezier(0.22, 1, 0.36, 1)" }));
            timers.push(setTimeout(() => onCompleteRef.current(), BUILD_MS));
          }, BETWEEN_MS),
        );
      }, SEEK_TICK_MS);
    };

    const t = setTimeout(() => seekCoin(0), 350);
    timers.push(t);
    panelRef.current?.focus();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prev = typeof document !== "undefined" ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prev instanceof HTMLElement && prev.isConnected) prev.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageLabel =
    settled >= 3
      ? "Đã thu đủ ba số · đang dựng quẻ"
      : `Đang gieo ${["số Thượng quái", "số Hạ quái", "số Hào động"][settled]} — giữ câu hỏi trong tâm`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nghi thức gieo quẻ"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="fixed inset-0 z-[80] grid place-items-center bg-muc/45 p-4 backdrop-blur-sm"
    >
      <style>{`@keyframes ax-kd-fly { from { transform: translateX(-90px); } to { transform: translateX(430px); } }`}</style>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="glass-strong gold-ring relative w-full max-w-sm overflow-hidden rounded-[26px] p-6 text-center outline-none sm:p-7"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Huỷ gieo quẻ"
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-white/60 text-muc-2 transition-colors hover:bg-white hover:text-son"
        >
          ✕
        </button>

        {/* Chim Lạc bay ngang phía sau mặt trời */}
        <div aria-hidden="true" className="pointer-events-none absolute left-0 top-16 w-full">
          <span className="block w-fit" style={{ animation: "ax-kd-fly 3.2s linear infinite" }}>
            <LacBird size={58} className="text-kim-deep/45" />
          </span>
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-son-deep">Đang cầu quẻ</p>
        <p className="mt-1 font-display text-xl font-extrabold text-muc">Tĩnh tâm — thành tâm thì quẻ linh</p>

        {/* Mặt Trời Đông Sơn: quay nhanh dần rồi chậm (transform + transition) */}
        <div className="mx-auto mt-3 grid h-40 w-40 place-items-center">
          <DongSonSun
            size={150}
            className="text-son"
            style={{
              transform: `rotate(${spin.deg}deg)`,
              transition: `transform ${spin.durMs}ms ${spin.ease}`,
              willChange: "transform",
            }}
          />
        </div>

        {/* Ba con số lập quẻ */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {NUM_LABELS.map((lbl, i) => (
            <div
              key={lbl.title}
              className={`rounded-2xl border px-2 py-3 transition-all duration-300 ${
                settled > i ? "border-kim/60 bg-white/85 shadow-[var(--shadow-glass)]" : "border-white/70 bg-white/50"
              }`}
            >
              <span aria-hidden="true" className="block font-display text-[26px] font-extrabold leading-none text-muc tabular-nums">
                {seeking[i] ? (
                  vals[i] || "?"
                ) : (
                  <NumberPopIn key={`${i}-${vals[i]}`} value={vals[i] || "?"} />
                )}
              </span>
              <span className="mt-1.5 block text-[10px] font-extrabold leading-tight text-son-deep">{lbl.title}</span>
              <span className="block text-[9.5px] leading-tight text-muc-2">{lbl.sub}</span>
            </div>
          ))}
        </div>

        {/* Chấm tiến trình 3 số */}
        <div className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`size-2.5 rounded-full transition-all duration-300 ${
                settled > i ? "scale-110 bg-son" : "bg-muc/15"
              }`}
            />
          ))}
        </div>

        <p aria-live="polite" className="mt-3 min-h-5 text-xs font-semibold italic text-muc-2">
          {stageLabel}
        </p>
      </div>
    </div>
  );
}
