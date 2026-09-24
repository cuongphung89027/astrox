"use client";

/**
 * KdHistory — lịch sử gieo quẻ gần đây (localStorage riêng module, tối đa 5,
 * click xem lại). Nhỏ gọn: hàng pill cuộn ngang trên mobile.
 */
import styles from "./KinhDich.module.css";
import { HAO_NAMES, KD_METHODS } from "@/lib/kinhdich";
import type { KdHistoryEntry } from "@/lib/kinhdich";

interface KdHistoryProps {
  entries: KdHistoryEntry[];
  onSelect: (entry: KdHistoryEntry) => void;
  onRemove: (id: string | number) => void;
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
  return <section className={styles.history} aria-label="Lịch sử gieo quẻ gần đây"><h2>Quẻ gần đây</h2><ul>{entries.map(entry=><li key={entry.id || entry.savedAt}><button onClick={()=>onSelect(entry)} aria-label={`Xem lại quẻ ${entry.name}`}><span>{entry.name}</span><small>{entry.question || HAO_NAMES[entry.movingPos]}</small><time>{entry.snapshot ? KD_METHODS[entry.snapshot.method || "numbers"] : "Ba số · bản cũ"} · {timeAgo(entry.savedAt)}</time></button><button aria-label={`Xoá quẻ ${entry.name} khỏi lịch sử`} onClick={()=>onRemove(entry.id || entry.savedAt)}>×</button></li>)}</ul></section>;
}
