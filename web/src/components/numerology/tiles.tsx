"use client";

/**
 * Các khối hiển thị chỉ số Thần Số — port từ renderNumerologyView của app cũ
 * (num-tile, num-grid3, num-cycle-strip, num-missing-chip).
 */
import type { ReactNode } from "react";
import { NumberPopIn } from "@/components/motion";
import type { NumerologyChart, NumerologyMetric, NumerologyPeriod } from "@/lib/numerology";

/** Ô chỉ số: con số to font-display + tên + mô tả ngắn. */
export function NumTile({ metric, numberClass = "text-son-deep" }: { metric: NumerologyMetric; numberClass?: string }) {
  return (
    <div className="flex h-full flex-col items-center gap-1 px-3 py-4 text-center">
      <NumberPopIn value={metric.value} className={`font-display text-4xl font-extrabold leading-none sm:text-[42px] ${numberClass}`} />
      <p className="mt-1 text-[12.5px] font-bold text-muc">{metric.label}</p>
      <p className="text-[11.5px] leading-snug text-muc-2">{metric.desc}</p>
    </div>
  );
}

/** Lưới 3x3 biểu đồ ngày sinh (thứ tự hàng 3-6-9 / 2-5-8 / 1-4-7 như app cũ). */
export function PythagorasGrid({ chart }: { chart: NumerologyChart }) {
  const gridOrder = [3, 6, 9, 2, 5, 8, 1, 4, 7];
  return (
    <div className="grid w-[168px] grid-cols-3 gap-1.5" role="img" aria-label="Biểu đồ ngày sinh 3x3">
      {gridOrder.map((n) => {
        const cnt = chart.grid.counts[n] || 0;
        const has = cnt > 0;
        return (
          <div
            key={n}
            className={`flex h-[52px] flex-col items-center justify-center rounded-xl border ${
              has ? "border-son/50 bg-son-tint text-son-deep" : "border-muc/10 bg-white/50 text-muc-2"
            }`}
          >
            <span className="font-display text-lg font-extrabold leading-none">{n}</span>
            {has ? <span className="text-[10.5px] font-bold">×{cnt}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/** Dải chip số khuyết / số nợ nghiệp. */
export function ChipRow({ items, emptyText, tone = "warn" }: { items: ReactNode[]; emptyText: string; tone?: "warn" | "ok" }) {
  if (items.length === 0) {
    return <p className={`text-[12.5px] font-semibold ${tone === "ok" ? "text-ngoc-deep" : "text-muc-2"}`}>{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full bg-kim-tint px-3 py-1 text-[12px] font-bold text-kim-deep"
        >
          {it}
        </span>
      ))}
    </div>
  );
}

/** 4 Đỉnh Cao & 4 Thử Thách — giai đoạn đang diễn ra được viền vàng kim. */
export function PinnacleStrip({ chart }: { chart: NumerologyChart }) {
  const periods: NumerologyPeriod[] = chart.pinnacles;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {periods.map((p, i) => {
        const current = chart.now.age >= p.startAge && chart.now.age < p.endAge;
        return (
          <div
            key={i}
            className={`glass relative flex flex-col items-center rounded-2xl px-3 py-4 text-center ${
              current ? "gold-ring" : ""
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muc-2">
              {p.startAge}–{p.endAge === 999 ? "…" : p.endAge} tuổi
            </p>
            <NumberPopIn value={p.pinnacle} className="mt-1.5 font-display text-3xl font-extrabold text-kim-deep" />
            <p className="mt-1.5 text-[11.5px] font-semibold text-muc-2">
              Đỉnh Cao {i + 1} · Thử Thách {p.challenge}
            </p>
            {current ? (
              <span className="mt-2 inline-flex rounded-full bg-kim-tint px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-kim-deep">
                Đang diễn ra
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
