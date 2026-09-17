"use client";

/**
 * KdHistory — lịch sử gieo quẻ gần đây (localStorage riêng module, tối đa 5,
 * click xem lại). Nhỏ gọn: hàng pill cuộn ngang trên mobile.
 */
import { HAO_NAMES } from "@/lib/kinhdich";
import type { KdHistoryEntry } from "@/lib/kinhdich";

interface KdHistoryProps {
  entries: KdHistoryEntry[];
  onSelect: (entry: KdHistoryEntry) => void;
  onRemove: (savedAt: number) => void;
}

function timeAgo(ts: number): string {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

export function KdHistory({ entries, onSelect, onRemove }: KdHistoryProps) {
  if (entries.length === 0) return null;
  return (
    <section aria-label="Lịch sử gieo quẻ gần đây" className="mt-10">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-muc-2">Quẻ gần đây</h2>
      <ul className="mt-3 flex snap-x gap-2.5 overflow-x-auto pb-2">
        {entries.map((e) => (
          <li key={e.savedAt} className="shrink-0 snap-start">
            <div className="glass flex items-center gap-2 rounded-full py-2 pl-4 pr-2">
              <button
                type="button"
                onClick={() => onSelect(e)}
                className="text-left transition-colors hover:text-son-deep"
                aria-label={`Xem lại quẻ ${e.name}${e.question ? ` cho câu hỏi ${e.question}` : ""}`}
              >
                <span className="block text-[13px] font-extrabold text-muc">{e.name}</span>
                <span className="block max-w-56 truncate text-[11px] font-medium text-muc-2">
                  {HAO_NAMES[e.movingPos]} · {timeAgo(e.savedAt)}
                  {e.question ? ` · ${e.question}` : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(e.savedAt)}
                aria-label={`Xoá quẻ ${e.name} khỏi lịch sử`}
                className="grid size-7 shrink-0 place-items-center rounded-full bg-white/60 text-xs text-muc-2 transition-colors hover:bg-white hover:text-son"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
