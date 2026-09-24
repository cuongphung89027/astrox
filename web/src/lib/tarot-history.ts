"use client";

/**
 * Tarot history — nhật ký các lượt trải đã luận giải (localStorage riêng của
 * module, pattern giống astrox_kd_history_v1 của Kinh Dịch). Mỗi entry tự chứa
 * đủ dữ liệu để dựng lại lượt trải (câu hỏi, kiểu trải, khung, các lá + chiều,
 * toàn văn luận giải) nên xem lại không phụ thuộc cards.json hay aiCache.
 */
import { trackFeature } from "./feature-telemetry";
import { accountStorageKey, notifyDataDirty, cacheFingerprint, getState, subscribe } from "./state";

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
  fingerprint?: string;
  recovered?: boolean;
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
const DELETED_KEY = "astrox_tarot_history_deleted_v1";
const TAROT_HISTORY_MAX = 24;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

function storedEntries(): TarotHistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(accountStorageKey(TAROT_HISTORY_KEY)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((e): e is TarotHistoryEntry =>
      !!e && typeof e.id === "string" && Array.isArray(e.cards) && typeof e.text === "string" && Number.isFinite(e.savedAt)) : [];
  } catch { return []; }
}
function deletedEntries(): Record<string, string[]> {
  try {
    const parsed = JSON.parse(localStorage.getItem(accountStorageKey(DELETED_KEY)) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

/** Both dashboard and journal use this same profile-scoped projection.
 * Legacy cache text remains readable regardless of prompt revision/expiry.
 * Missing card metadata is never reconstructed from a hash. */
export function readTarotHistory(): TarotHistoryEntry[] {
  if (typeof window === "undefined" || !getState().profile) return [];
  const fingerprint = cacheFingerprint();
  const cache = getState().aiCache.profiles[fingerprint]?.tarot || {};
  const deleted = deletedEntries()[fingerprint];
  const hidden = new Set(Array.isArray(deleted) ? deleted : []);
  const rows = new Map<string, TarotHistoryEntry>();
  for (const entry of storedEntries()) {
    if (entry.fingerprint === fingerprint || (!entry.fingerprint && cache[entry.id]?.text)) rows.set(entry.id, entry);
  }
  for (const [id, entry] of Object.entries(cache)) {
    if (!entry?.text || rows.has(id)) continue;
    rows.set(id, {
      id, fingerprint, recovered: true, savedAt: entry.updatedAt || entry.createdAt || 0,
      question: "Luận giải đã lưu", deckId: "", spreadId: entry.topic || "",
      spreadName: "Bản luận giải cũ", frameLabel: "", cards: [], text: entry.text,
    });
  }
  return [...rows.values()].filter(entry => !hidden.has(entry.id))
    .sort((a, b) => b.savedAt - a.savedAt).slice(0, TAROT_HISTORY_MAX);
}

export function pushTarotHistory(entry: TarotHistoryEntry): TarotHistoryEntry[] {
  const fingerprint = entry.fingerprint || cacheFingerprint();
  const next = { ...entry, fingerprint };
  const previous = storedEntries();
  const alreadySaved = previous.some(e => e.id === entry.id && (e.fingerprint === fingerprint || !e.fingerprint));
  const stored = previous.filter(e => !(e.id === entry.id && (e.fingerprint === fingerprint || !e.fingerprint)));
  try {
    localStorage.setItem(accountStorageKey(TAROT_HISTORY_KEY), JSON.stringify([next, ...stored]));
    if (!alreadySaved) trackFeature("result_save", "tarot", "saved");
    const deleted = deletedEntries();
    if (Array.isArray(deleted[fingerprint])) {
      deleted[fingerprint] = deleted[fingerprint].filter(id => id !== entry.id);
      localStorage.setItem(accountStorageKey(DELETED_KEY), JSON.stringify(deleted));
    }
  } catch { /* Cache text remains available if the separate journal cannot be stored. */ }
  emit();notifyDataDirty();
  return readTarotHistory();
}

export function removeTarotHistory(id: string): TarotHistoryEntry[] {
  const fingerprint = cacheFingerprint();
  const deleted = deletedEntries();
  deleted[fingerprint] = [...new Set([...(Array.isArray(deleted[fingerprint]) ? deleted[fingerprint] : []), id])];
  // Persist the dismissal before removing metadata; failures must be visible to the caller.
  localStorage.setItem(accountStorageKey(DELETED_KEY), JSON.stringify(deleted));
  localStorage.setItem(accountStorageKey(TAROT_HISTORY_KEY), JSON.stringify(storedEntries().filter(e =>
    !(e.id === id && (e.fingerprint === fingerprint || !e.fingerprint)))));
  emit();notifyDataDirty();
  return readTarotHistory();
}

export function subscribeTarotHistory(listener: () => void): () => void {
  listeners.add(listener);
  const unsubscribe = subscribe(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === accountStorageKey(TAROT_HISTORY_KEY) || event.key === accountStorageKey(DELETED_KEY)) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); unsubscribe(); window.removeEventListener("storage", onStorage); };
}
