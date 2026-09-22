import { managedPrompt } from "./managed-prompts";
/**
 * KINH DỊCH — Mai Hoa Dịch Số (Số Pháp).
 * Port trung thực 1:1 từ MODULE 3 của index.html (TRIGRAMS, castHexagram,
 * ngHeQuanHe, prompt luận giải) — KHÔNG đổi kết quả tính.
 * App cũ không có bảng tên 64 quẻ riêng: tên quẻ ghép từ tượng quái
 * (vd. "Trời Đất"); tên gọi cổ điển do AI xác định trong phần luận giải.
 */
import { PROMPT_VERSION } from "./config";
import type { Profile } from "./types";

/* ------------------------------------------------------------------ */
/* Bát Quái — Tiên Thiên số dùng cho gieo quẻ (1–8)                    */
/* ------------------------------------------------------------------ */

export interface Trigram {
  idx: number;
  name: string;
  symbol: string;
  nature: string;
  elem: string;
  dir: string;
  /** 3 hào từ dưới lên: 1 = dương, 0 = âm. */
  bits: [number, number, number];
}

export const TRIGRAMS: Trigram[] = [
  { idx: 1, name: "Càn", symbol: "☰", nature: "Trời", elem: "Kim", dir: "Tây Bắc", bits: [1, 1, 1] },
  { idx: 2, name: "Đoài", symbol: "☱", nature: "Đầm", elem: "Kim", dir: "Tây", bits: [1, 1, 0] },
  { idx: 3, name: "Ly", symbol: "☲", nature: "Lửa", elem: "Hoả", dir: "Nam", bits: [1, 0, 1] },
  { idx: 4, name: "Chấn", symbol: "☳", nature: "Sấm", elem: "Mộc", dir: "Đông", bits: [1, 0, 0] },
  { idx: 5, name: "Tốn", symbol: "☴", nature: "Gió", elem: "Mộc", dir: "Đông Nam", bits: [0, 1, 1] },
  { idx: 6, name: "Khảm", symbol: "☵", nature: "Nước", elem: "Thuỷ", dir: "Bắc", bits: [0, 1, 0] },
  { idx: 7, name: "Cấn", symbol: "☶", nature: "Núi", elem: "Thổ", dir: "Đông Bắc", bits: [0, 0, 1] },
  { idx: 8, name: "Khôn", symbol: "☷", nature: "Đất", elem: "Thổ", dir: "Tây Nam", bits: [0, 0, 0] },
];

const NGU_HANH_SINH: Record<string, string> = { Mộc: "Hoả", Hoả: "Thổ", Thổ: "Kim", Kim: "Thuỷ", Thuỷ: "Mộc" };
const NGU_HANH_KHAC: Record<string, string> = { Mộc: "Thổ", Thổ: "Thuỷ", Thuỷ: "Hoả", Hoả: "Kim", Kim: "Mộc" };

export const HAO_NAMES: Record<number, string> = {
  1: "Sơ Hào",
  2: "Hào Nhị",
  3: "Hào Tam",
  4: "Hào Tứ",
  5: "Hào Ngũ",
  6: "Hào Thượng",
};

/* ------------------------------------------------------------------ */
/* Toán pháp Mai Hoa                                                   */
/* ------------------------------------------------------------------ */

export function trigramByIdx(i: number): Trigram {
  return TRIGRAMS.find((t) => t.idx === i) as Trigram;
}

export function trigramFromBits(b: number[]): Trigram {
  return TRIGRAMS.find((t) => t.bits[0] === b[0] && t.bits[1] === b[1] && t.bits[2] === b[2]) as Trigram;
}

export function mod8(n: number): number {
  let v = n % 8;
  if (v <= 0) v += 8;
  return v;
}

export function mod6(n: number): number {
  let v = n % 6;
  if (v <= 0) v += 6;
  return v;
}

export interface KdRelation {
  key: string;
  label: string;
  desc: string;
}

export function ngHeQuanHe(theElem: string, dungElem: string): KdRelation {
  if (theElem === dungElem) {
    return { key: "dong-hanh", label: "Thể – Dụng đồng hành", desc: "Rất thuận lợi. Bạn đang đi đúng hướng, mọi thứ hài hoà." };
  }
  if (NGU_HANH_SINH[dungElem] === theElem) {
    return { key: "dung-sinh-the", label: "Dụng sinh Thể", desc: "Rất thuận lợi. Ngoại cảnh chủ động hỗ trợ bạn." };
  }
  if (NGU_HANH_SINH[theElem] === dungElem) {
    return { key: "the-sinh-dung", label: "Thể sinh Dụng", desc: "Chậm chạp, tiêu hao năng lượng. Bạn cho đi nhiều hơn nhận lại." };
  }
  if (NGU_HANH_KHAC[theElem] === dungElem) {
    return { key: "the-khac-dung", label: "Thể khắc Dụng", desc: "Thuận lợi. Bạn nắm thế chủ động, kiểm soát được tình hình." };
  }
  if (NGU_HANH_KHAC[dungElem] === theElem) {
    return { key: "dung-khac-the", label: "Dụng khắc Thể", desc: "Khó khăn, bất lợi. Áp lực từ ngoại cảnh khá mạnh." };
  }
  return { key: "khac", label: "Trung tính", desc: "Mối quan hệ ngũ hành trung tính." };
}

export interface HexLine {
  /** Vị trí 1–6 đếm từ dưới lên. */
  pos: number;
  /** 1 = dương, 0 = âm. */
  bit: number;
  moving: boolean;
}

export interface CastResult {
  s1: number;
  s2: number;
  s3: number;
  upper: Trigram;
  lower: Trigram;
  lines: HexLine[];
  movingPos: number;
  the: Trigram;
  dung: Trigram;
  relation: KdRelation;
  bienUpper: Trigram;
  bienLower: Trigram;
  hoUpper: Trigram;
  hoLower: Trigram;
  theIsLower: boolean;
}

export function castHexagram(s1: number, s2: number, s3: number): CastResult {
  const upperIdx = mod8(s1);
  const lowerIdx = mod8(s2);
  const movingPos = mod6(s1 + s2 + s3);
  const upper = trigramByIdx(upperIdx);
  const lower = trigramByIdx(lowerIdx);
  const lines: HexLine[] = []; // vị trí 1..6 từ dưới lên
  for (let pos = 1; pos <= 6; pos++) {
    const bit = pos <= 3 ? lower.bits[pos - 1] : upper.bits[pos - 4];
    lines.push({ pos, bit, moving: pos === movingPos });
  }
  const theIsLower = movingPos <= 3;
  const the = theIsLower ? lower : upper;
  const dung = theIsLower ? upper : lower;
  const relation = ngHeQuanHe(the.elem, dung.elem);

  // Quẻ biến: đảo bit hào động rồi dựng lại hai quái
  const changedBits = lines.map((l) => (l.moving ? 1 - l.bit : l.bit));
  const bienLower = trigramFromBits(changedBits.slice(0, 3));
  const bienUpper = trigramFromBits(changedBits.slice(3, 6));

  // Quẻ hỗ: hào 2-3-4 làm nội, hào 3-4-5 làm ngoại
  const hoLowerBits = [lines[1].bit, lines[2].bit, lines[3].bit];
  const hoUpperBits = [lines[2].bit, lines[3].bit, lines[4].bit];
  const hoLower = trigramFromBits(hoLowerBits);
  const hoUpper = trigramFromBits(hoUpperBits);

  return { s1, s2, s3, upper, lower, lines, movingPos, the, dung, relation, bienUpper, bienLower, hoUpper, hoLower, theIsLower };
}

/** Tên quẻ theo cách ghép tượng của app cũ (vd. "Trời Đất"). */
export function hexagramName(upper: Trigram, lower: Trigram): string {
  return `${upper.nature} ${lower.nature}`;
}

/** Cách app cũ sinh số gieo: số nguyên dương 1–999. */
export function randomCastNumber(): number {
  return 1 + Math.floor(Math.random() * 999);
}

export function randomCastNumbers(): [number, number, number] {
  return [randomCastNumber(), randomCastNumber(), randomCastNumber()];
}

/* ------------------------------------------------------------------ */
/* Prompt luận giải AI — port từ performCast của index.html            */
/* ------------------------------------------------------------------ */

export function buildKdPrompt(result: CastResult, question: string, profile: Profile | null): string {
  const profileLine = profile
    ? managedPrompt("kinhdich.buildKdPrompt.0", [profile.name, profile.gender, profile.dob.split("-").reverse().join("/"), profile.hourChi, profile.place])
    : "";
  return managedPrompt("kinhdich.buildKdPrompt.1", [profileLine, result.s1, result.s2, result.s3, question, result.upper.name, result.upper.symbol, result.upper.nature, result.upper.elem, result.upper.dir, result.lower.name, result.lower.symbol, result.lower.nature, result.lower.elem, result.lower.dir, result.movingPos, result.the.name, result.the.symbol, result.the.elem, result.dung.name, result.dung.symbol, result.dung.elem, result.relation.label, result.relation.desc, result.bienUpper.name, result.bienUpper.symbol, result.bienLower.name, result.bienLower.symbol, result.hoUpper.name, result.hoUpper.symbol, result.hoLower.name, result.hoLower.symbol, result.upper.nature, result.lower.nature, result.upper.nature, result.lower.nature, result.movingPos, result.the.name, result.theIsLower ? "Hạ" : "Thượng", result.relation.label, result.bienUpper.name, result.bienLower.name, result.hoUpper.name, result.hoLower.name]);
}

/* ------------------------------------------------------------------ */
/* Cache key + lịch sử gieo quẻ (localStorage riêng module, tối đa 5)  */
/* ------------------------------------------------------------------ */

/** Cùng thuật toán stableHash của state.ts (không export nên copy cục bộ). */
export function stableHash(value: string): string {
  const hash = (seed: number) => {
    let h = seed;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  return hash(2166136261) + hash(374761393) + hash(668265263) + hash(2246822519);
}

export function kdCacheKey(result: CastResult, question: string): string {
  return stableHash(
    JSON.stringify({ question, s1: result.s1, s2: result.s2, s3: result.s3, movingPos: result.movingPos, promptVersion: PROMPT_VERSION }),
  );
}

export interface KdHistoryEntry {
  question: string;
  s1: number;
  s2: number;
  s3: number;
  name: string;
  movingPos: number;
  savedAt: number;
}

const KD_HISTORY_KEY = "astrox_kd_history_v1";
const KD_HISTORY_MAX = 5;

export function readKdHistory(): KdHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KD_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, KD_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function pushKdHistory(entry: KdHistoryEntry): KdHistoryEntry[] {
  const next = [entry, ...readKdHistory().filter((e) => !(e.s1 === entry.s1 && e.s2 === entry.s2 && e.s3 === entry.s3))].slice(
    0,
    KD_HISTORY_MAX,
  );
  try {
    localStorage.setItem(KD_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* đầy bộ nhớ — bỏ qua */
  }
  return next;
}

export function removeKdHistory(savedAt: number): KdHistoryEntry[] {
  const next = readKdHistory().filter((e) => e.savedAt !== savedAt);
  try {
    localStorage.setItem(KD_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* bỏ qua */
  }
  return next;
}
