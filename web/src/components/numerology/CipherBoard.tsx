"use client";

/**
 * CipherBoard — bảng cipher tương tác: họ tên người dùng tách thành từng chữ
 * cái, mỗi chữ gắn con số Pythagoras (1–9) pop-in khi tính (NumberPopIn).
 * Kèm dải chú giải số → màu (bảng màu sơn mài). Bấm/hover số trong chú giải
 * để làm nổi bật các chữ mang đúng số đó.
 */
import { useState } from "react";
import { NumberPopIn } from "@/components/motion";
import { letterValue, lettersOnly } from "@/lib/numerology";

interface CipherLetter {
  ch: string;
  value: number;
}

const VALUE_STYLES: Record<number, { dot: string; chip: string }> = {
  1: { dot: "bg-son", chip: "bg-son-tint text-son-deep" },
  2: { dot: "bg-sen", chip: "bg-sen-tint text-sen-deep" },
  3: { dot: "bg-kim", chip: "bg-kim-tint text-kim-deep" },
  4: { dot: "bg-ngoc", chip: "bg-ngoc-tint text-ngoc-deep" },
  5: { dot: "bg-cham", chip: "bg-cham/10 text-cham" },
  6: { dot: "bg-son-tint ring-1 ring-son/40", chip: "bg-son-tint/70 text-son-deep" },
  7: { dot: "bg-cham-deep", chip: "bg-cham-deep/10 text-cham-deep" },
  8: { dot: "bg-ngoc-deep", chip: "bg-ngoc-deep/10 text-ngoc-deep" },
  9: { dot: "bg-kim-deep", chip: "bg-kim-deep/10 text-kim-deep" },
};

const LEGEND_LABELS: Record<number, string> = {
  1: "son",
  2: "sen",
  3: "kim",
  4: "ngọc",
  5: "chàm",
  6: "son tint",
  7: "chàm đậm",
  8: "ngọc đậm",
  9: "kim đậm",
};

function toWords(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

export function CipherBoard({ name, calcSeq }: { name: string; calcSeq: number }) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const words = toWords(name);

  return (
    <div>
      {/* Chữ cái của tên — nhóm theo từ */}
      <div role="list" aria-label={`Bảng cipher của tên ${name}`} className="flex flex-wrap items-end gap-x-5 gap-y-4">
        {words.map((word, wi) => {
          const letters: CipherLetter[] = lettersOnly(word)
            .split("")
            .map((ch) => ({ ch, value: letterValue(ch) ?? 0 }))
            .filter((l) => l.value > 0);
          if (letters.length === 0) return null;
          return (
            <div key={`${word}-${wi}`} className="flex gap-1.5 sm:gap-2">
              {letters.map((l, li) => {
                const st = VALUE_STYLES[l.value];
                const dim = highlight !== null && highlight !== l.value;
                return (
                  <div
                    key={`${l.ch}-${li}-${calcSeq}`}
                    role="listitem"
                    aria-label={`${l.ch} = ${l.value}`}
                    className={`flex w-9 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-opacity duration-300 sm:w-11 ${st.chip} ${
                      dim ? "opacity-35" : "opacity-100"
                    }`}
                  >
                    <span aria-hidden="true" className="font-display text-lg font-extrabold leading-none sm:text-xl">
                      {l.ch}
                    </span>
                    <NumberPopIn
                      value={l.value}
                      className="text-sm font-black tabular-nums opacity-90 sm:text-base"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Chú giải số → màu */}
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Chú giải số và màu tương ứng">
        {Object.keys(VALUE_STYLES).map(Number).map((n) => {
          const active = highlight === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              onClick={() => setHighlight(active ? null : n)}
              onMouseEnter={() => setHighlight(n)}
              onMouseLeave={() => setHighlight(null)}
              className={`glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-muc-2 transition-all duration-200 hover:-translate-y-0.5 ${
                active ? "gold-ring text-muc" : ""
              }`}
            >
              <span aria-hidden="true" className={`size-3 rounded-full ${VALUE_STYLES[n].dot}`} />
              {n} · {LEGEND_LABELS[n]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
