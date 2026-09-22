"use client";

/**
 * Tarot history — nhật ký các lượt trải đã luận giải (localStorage riêng của
 * module, pattern giống astrox_kd_history_v1 của Kinh Dịch). Mỗi entry tự chứa
 * đủ dữ liệu để dựng lại lượt trải (câu hỏi, kiểu trải, khung, các lá + chiều,
 * toàn văn luận giải) nên xem lại không phụ thuộc cards.json hay aiCache.
 */
export interface TarotHistoryCard {
  id: string;
  reversed: boolean;
  /** Nhãn vị trí theo khung diễn giải lúc trải (vd "Quá khứ"). */
  position: string;
  /** Tên tiếng Anh của lá — lưu sẵn để nhật ký tự chứa (cards.json có thể chưa tải). */
  nameEn: string;
}

export interface TarotHistoryEntry {
  /** Khoá cache của lượt trải — "Tạo lại" cùng trải chỉ thay thế entry cũ. */
  id: string;
  savedAt: number;
  question: string;
  deckId: string;
  spreadId: string;
  spreadName: string;
  frameLabel: string;
  cards: TarotHistoryCard[];
  text: string;
}

const TAROT_HISTORY_KEY = "astrox_tarot_history_v1";
const TAROT_HISTORY_MAX = 24;
/** Giới hạn an toàn cho văn luận giải của một entry (dự phòng prompt lỗi dài bất thường). */
const TAROT_TEXT_MAX = 24000;

export function readTarotHistory(): TarotHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TAROT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is TarotHistoryEntry =>
        !!e && typeof e === "object" && typeof e.id === "string" && Array.isArray(e.cards) && typeof e.text === "string")
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, TAROT_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function pushTarotHistory(entry: TarotHistoryEntry): TarotHistoryEntry[] {
  const sanitized: TarotHistoryEntry = { ...entry, text: entry.text.slice(0, TAROT_TEXT_MAX) };
  const next = [sanitized, ...readTarotHistory().filter((e) => e.id !== sanitized.id)].slice(0, TAROT_HISTORY_MAX);
  try {
    localStorage.setItem(TAROT_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* đầy bộ nhớ — bỏ qua, nhật ký chỉ là tiện ích xem lại */
  }
  return next;
}

export function removeTarotHistory(id: string): TarotHistoryEntry[] {
  const next = readTarotHistory().filter((e) => e.id !== id);
  try {
    localStorage.setItem(TAROT_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* bỏ qua */
  }
  return next;
}
