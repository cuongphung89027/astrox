import { Solar } from "lunar-typescript";
import { managedPrompt } from "./managed-prompts";
/**
 * Versioned Kinh Dịch calculations. Lines are always stored bottom to top.
 * New Mai Hoa readings use the static trigram as Thể; legacy replay preserves v1.
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
  method?: KdMethod;
  algorithmVersion?: string;
  movingPositions?: number[];
  metadata?: Record<string, string | number | boolean | number[][] | number[]>;
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
  if (![s1,s2,s3].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error("Số lập quẻ không hợp lệ.");
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
  const theIsLower = movingPos > 3;
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

  return { method: "numbers", algorithmVersion: "maihoa-v2", movingPositions: [movingPos], s1, s2, s3, upper, lower, lines, movingPos, the, dung, relation, bienUpper, bienLower, hoUpper, hoLower, theIsLower };
}

/** Fixed Vietnamese King Wen name, independent of AI. */
export function hexagramName(upper: Trigram, lower: Trigram): string {
  return hexagramInfo(upper, lower).name;
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
  return managedPrompt("kinhdich.buildKdPrompt.v2", [JSON.stringify(kdPromptData(result)), question, profileLine]);
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
  // Historical paid readings keep their original identity.
  if (result.algorithmVersion === "legacy-v1") return stableHash(JSON.stringify({ question, s1: result.s1, s2: result.s2, s3: result.s3, movingPos: result.movingPos, promptVersion: PROMPT_VERSION }));
  return stableHash(
    JSON.stringify({ question, method: result.method, version: result.algorithmVersion, lines: result.lines, metadata: result.metadata, s1: result.s1, s2: result.s2, s3: result.s3, promptVersion: PROMPT_VERSION }),
  );
}

export interface KdHistoryEntry {
  id?: string;
  snapshot?: CastResult;
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
    return parsed.filter(isKdHistoryEntry).slice(0, KD_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function pushKdHistory(entry: KdHistoryEntry): KdHistoryEntry[] {
  const next = [entry, ...readKdHistory().filter((e) => !entry.id || e.id !== entry.id)].slice(
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

export function removeKdHistory(id: string | number): KdHistoryEntry[] {
  const next = readKdHistory().filter((e) => typeof id === "string" ? e.id !== id : e.savedAt !== id);
  try {
    localStorage.setItem(KD_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* bỏ qua */
  }
  return next;
}

export type KdMethod = "coins" | "numbers" | "time" | "serial" | "phone" | "digits";
export const KD_METHODS: Record<KdMethod, string> = { coins: "Ba đồng xu", numbers: "Mai Hoa báo số", time: "Mai Hoa thời gian", serial: "Sê-ri tiền", phone: "Số điện thoại", digits: "Dãy số tùy chọn" };
export const KD_RULES: Record<KdMethod, string> = {
  coins: "Gieo 3 đồng xu đủ 6 lần, lập hào từ dưới lên. Ngửa = 3, sấp = 2. Tổng 6 là âm động, 7 dương tĩnh, 8 âm tĩnh, 9 dương động. Có thể có 0–6 hào động; không áp dụng Thể–Dụng Mai Hoa.",
  numbers: "Nhập ba số nguyên 1–999. Số thứ nhất chia 8 lấy thượng quái, số thứ hai chia 8 lấy hạ quái; tổng ba số chia 6 lấy hào động. Dư 0 tính là 8 hoặc 6. Quái tĩnh là Thể, quái động là Dụng.",
  time: "Dùng giờ Việt Nam (Asia/Ho_Chi_Minh), đổi ngày lúc 00:00. Ngày âm dùng lịch Trung Hoa chuẩn UTC+8 (lunar-typescript), có thể khác lịch âm Việt Nam vào một số ngày. Chi năm và chi giờ đánh số Tý = 1 đến Hợi = 12. Tổng chi năm + tháng âm + ngày âm chia 8 lấy thượng; cộng chi giờ chia 8 lấy hạ và chia 6 lấy hào động. Tháng nhuận dùng cùng số thứ tự tháng.",
  serial: "Biến thể quy đổi số của AstroX: bỏ tiền tố chữ, giữ mọi chữ số kể cả số 0 đầu. Chia chuỗi làm hai ở vị trí phần nguyên của độ dài/2. Tổng chữ số nửa đầu/nửa sau chia 8 lấy thượng/hạ; tổng cả chuỗi chia 6 lấy hào động. Dư 0 là 8 hoặc 6.",
  phone: "Biến thể quy đổi số của AstroX, không chấm điểm SIM. Chuẩn hóa +84 hoặc 0084 thành 0. Chia đôi chuỗi; tổng chữ số mỗi nửa chia 8 lấy thượng/hạ, tổng cả chuỗi chia 6 lấy hào động. Dư 0 là 8 hoặc 6. Lịch sử chỉ giữ số đã che; không gửi số cho AI.",
  digits: "Biến thể quy đổi số của AstroX: giữ số 0 đầu; chia tại phần nguyên của độ dài/2. Tổng chữ số mỗi nửa chia 8 lấy thượng/hạ; tổng cả chuỗi chia 6 lấy hào động. Dư 0 là 8 hoặc 6. Chỉ nhập chữ số, từ 2–32 ký tự.",
};
// King Wen ordering, upper/lower trigram indices (Early Heaven). Data, never AI naming.
const HEXAGRAM_PAIRS = [[1,1],[8,8],[6,4],[7,6],[6,1],[1,6],[8,6],[6,8],[5,1],[1,2],[8,1],[1,8],[1,3],[3,1],[8,7],[4,8],[2,4],[7,5],[8,2],[5,8],[3,4],[7,3],[7,8],[8,4],[1,4],[7,1],[7,4],[2,5],[6,6],[3,3],[2,7],[4,5],[1,7],[4,1],[3,8],[8,3],[5,3],[3,2],[6,7],[4,6],[7,2],[5,4],[2,1],[1,5],[2,8],[8,5],[2,6],[6,5],[2,3],[3,5],[4,4],[7,7],[5,7],[4,2],[4,3],[3,7],[5,5],[2,2],[5,6],[6,2],[5,2],[4,7],[6,3],[3,6]];
const HEXAGRAM_NAMES = "Thuần Càn|Thuần Khôn|Thủy Lôi Truân|Sơn Thủy Mông|Thủy Thiên Nhu|Thiên Thủy Tụng|Địa Thủy Sư|Thủy Địa Tỷ|Phong Thiên Tiểu Súc|Thiên Trạch Lý|Địa Thiên Thái|Thiên Địa Bĩ|Thiên Hỏa Đồng Nhân|Hỏa Thiên Đại Hữu|Địa Sơn Khiêm|Lôi Địa Dự|Trạch Lôi Tùy|Sơn Phong Cổ|Địa Trạch Lâm|Phong Địa Quán|Hỏa Lôi Phệ Hạp|Sơn Hỏa Bí|Sơn Địa Bác|Địa Lôi Phục|Thiên Lôi Vô Vọng|Sơn Thiên Đại Súc|Sơn Lôi Di|Trạch Phong Đại Quá|Thuần Khảm|Thuần Ly|Trạch Sơn Hàm|Lôi Phong Hằng|Thiên Sơn Độn|Lôi Thiên Đại Tráng|Hỏa Địa Tấn|Địa Hỏa Minh Di|Phong Hỏa Gia Nhân|Hỏa Trạch Khuê|Thủy Sơn Kiển|Lôi Thủy Giải|Sơn Trạch Tổn|Phong Lôi Ích|Trạch Thiên Quải|Thiên Phong Cấu|Trạch Địa Tụy|Địa Phong Thăng|Trạch Thủy Khốn|Thủy Phong Tỉnh|Trạch Hỏa Cách|Hỏa Phong Đỉnh|Thuần Chấn|Thuần Cấn|Phong Sơn Tiệm|Lôi Trạch Quy Muội|Lôi Hỏa Phong|Hỏa Sơn Lữ|Thuần Tốn|Thuần Đoài|Phong Thủy Hoán|Thủy Trạch Tiết|Phong Trạch Trung Phu|Lôi Sơn Tiểu Quá|Thủy Hỏa Ký Tế|Hỏa Thủy Vị Tế".split("|");
export function hexagramInfo(upper: Trigram, lower: Trigram) {
  const index = HEXAGRAM_PAIRS.findIndex(([u,l]) => u === upper.idx && l === lower.idx);
  if (index < 0) throw new Error("Quái không hợp lệ.");
  return { number: index + 1, name: HEXAGRAM_NAMES[index] };
}
export function coinValue(faces: number[]): number {
  if (faces.length !== 3 || !faces.every(n => n === 0 || n === 1)) throw new Error("Cần đủ ba mặt xu.");
  return faces.reduce<number>((sum,n) => sum + n + 2, 0);
}
export function throwCoins(): number[] {
  const bytes = new Uint8Array(3); crypto.getRandomValues(bytes);
  return Array.from(bytes, n => n & 1);
}
export function castCoins(values: number[], faces?: number[][]): CastResult {
  if (values.length !== 6 || !values.every(n => [6,7,8,9].includes(n))) throw new Error("Cần đủ sáu hào có giá trị 6, 7, 8 hoặc 9.");
  if (faces && (faces.length !== 6 || faces.some((f,i) => coinValue(f) !== values[i]))) throw new Error("Mặt xu không khớp giá trị hào.");
  const lines = values.map((n,i) => ({ pos: i+1, bit: n%2, moving: n===6 || n===9 }));
  const bits = lines.map(l => l.bit), changed = lines.map(l => l.moving ? 1-l.bit : l.bit);
  // Compatibility fields remain for legacy consumers. Coins intentionally omit these from UI and AI DTO.
  return { ...castHexagram(0,0,0), method: "coins", algorithmVersion: "coins-v1", lines, movingPositions: lines.filter(l=>l.moving).map(l=>l.pos), movingPos: 0, upper: trigramFromBits(bits.slice(3)), lower: trigramFromBits(bits.slice(0,3)), bienUpper: trigramFromBits(changed.slice(3)), bienLower: trigramFromBits(changed.slice(0,3)), metadata: { values: [...values], ...(faces ? { faces: faces.map(f=>[...f]) } : {}) } };
}
export function normalizeDigits(method: "serial"|"phone"|"digits", input: string): string {
  let value = input.trim();
  if (method === "phone") {
    if (!/^[+\d\s().-]+$/.test(value)) throw new Error("Số điện thoại không hợp lệ.");
    value = value.replace(/[\s().-]/g, "").replace(/^(\+84|0084)/, "0");
    if (!/^0(?:[35789]\d{8}|2\d{9})$/.test(value)) throw new Error("Nhập số điện thoại Việt Nam hợp lệ (10 hoặc 11 chữ số).");
  } else if (method === "serial") {
    if (!/^[a-zA-Z]*\d{2,32}$/.test(value)) throw new Error("Sê-ri gồm tiền tố chữ tùy chọn và 2–32 chữ số.");
    value = value.replace(/^[a-zA-Z]+/, "");
  } else if (!/^\d{2,32}$/.test(value)) throw new Error("Nhập từ 2–32 chữ số, không có chữ hoặc dấu.");
  return value;
}
export function castDigits(method: "serial"|"phone"|"digits", input: string): CastResult {
  const digits = normalizeDigits(method,input), mid = Math.floor(digits.length/2);
  const sum = (v: string) => [...v].reduce((a,b)=>a+Number(b),0);
  const a = sum(digits.slice(0,mid)), b = sum(digits.slice(mid));
  return {...castHexagram(a,b,0), method, algorithmVersion: "digit-sums-v1", metadata: { normalized: method === "phone" ? `${digits.slice(0,3)}${"•".repeat(digits.length-5)}${digits.slice(-2)}` : digits, firstSum:a, secondSum:b } };
}
export function castTime(timestamp: string): CastResult {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) throw new Error("Thời điểm không hợp lệ.");
  const local = new Date(date.getTime()+7*3600000);
  const lunar = Solar.fromYmdHms(local.getUTCFullYear(),local.getUTCMonth()+1,local.getUTCDate(),12,0,0).getLunar();
  const yearBranch = ((lunar.getYear()-4)%12+12)%12+1, hourBranch = Math.floor((local.getUTCHours()+1)/2)%12+1;
  const month = Math.abs(lunar.getMonth()), total = yearBranch + month + lunar.getDay();
  return {...castHexagram(total,total+hourBranch,-total+6*Math.ceil(total/6)), method:"time",algorithmVersion:"time-v1",metadata:{timestamp:date.toISOString(),timezone:"Asia/Ho_Chi_Minh",lunarConvention:"Chinese-standard-UTC+8",lunarYear:lunar.getYear(),lunarMonth:month,lunarDay:lunar.getDay(),leapMonth:lunar.getMonth()<0,yearBranch,hourBranch}};
}
export function kdPromptData(result: CastResult) {
  const base = { method: result.method || "numbers", algorithmVersion: result.algorithmVersion || "legacy-v1", main: hexagramInfo(result.upper,result.lower), changed: hexagramInfo(result.bienUpper,result.bienLower), lines: result.lines, movingPositions: result.lines.filter(l=>l.moving).map(l=>l.pos) };
  return result.method === "coins" ? base : {...base, the:result.the.name,dung:result.dung.name,relation:result.relation.label,mutual:hexagramInfo(result.hoUpper,result.hoLower)};
}
export function createKdHistory(result: CastResult, question: string): KdHistoryEntry {
  return { id: crypto.randomUUID(), snapshot: JSON.parse(JSON.stringify(result)), question, s1:result.s1,s2:result.s2,s3:result.s3,name:hexagramName(result.upper,result.lower),movingPos:result.movingPos,savedAt:Date.now() };
}
export function replayKdHistory(entry: KdHistoryEntry): CastResult {
  if (entry.snapshot) return JSON.parse(JSON.stringify(entry.snapshot));
  const result = castHexagram(entry.s1,entry.s2,entry.s3);
  // Old records were computed with the moving trigram as The; preserve that historical rule.
  return {...result,algorithmVersion:"legacy-v1",the:result.dung,dung:result.the,theIsLower:!result.theIsLower,relation:ngHeQuanHe(result.dung.elem,result.the.elem)};
}

/** Local storage is an untrusted boundary; ignore malformed records instead of crashing the page. */
function isKdHistoryEntry(value: unknown): value is KdHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const e = value as KdHistoryEntry;
  if (typeof e.question !== "string" || typeof e.name !== "string" || !Number.isFinite(e.savedAt) || ![e.s1,e.s2,e.s3].every(n=>Number.isSafeInteger(n)&&n>=0)) return false;
  if (!e.snapshot) return [e.s1,e.s2,e.s3].every(n=>n>=1&&n<=999) && Number.isInteger(e.movingPos) && e.movingPos>=1 && e.movingPos<=6;
  const r = e.snapshot;
  if (!r.method || !Object.prototype.hasOwnProperty.call(KD_METHODS,r.method) || typeof r.algorithmVersion !== "string" || !Array.isArray(r.lines) || r.lines.length!==6) return false;
  if (!r.lines.every((l,i)=>l && l.pos===i+1 && (l.bit===0||l.bit===1) && typeof l.moving==="boolean")) return false;
  if (r.method === "coins") {
    const values = r.metadata?.values;
    if (!Array.isArray(values) || values.length !== 6 || !values.every((v,i)=>typeof v === "number" && [6,7,8,9].includes(v) && r.lines[i].bit===v%2 && r.lines[i].moving===(v===6||v===9))) return false;
  }
  const trigrams = [r.upper,r.lower,r.the,r.dung,r.bienUpper,r.bienLower,r.hoUpper,r.hoLower];
  if (!trigrams.every(t=>t && TRIGRAMS.some(c=>JSON.stringify(c)===JSON.stringify(t)))) return false;
  const changed = r.lines.map(l=>l.moving?1-l.bit:l.bit);
  if (JSON.stringify([...r.lower.bits,...r.upper.bits]) !== JSON.stringify(r.lines.map(l=>l.bit)) || JSON.stringify([...r.bienLower.bits,...r.bienUpper.bits])!==JSON.stringify(changed)) return false;
  return !!r.relation && typeof r.relation.label === "string" && typeof r.relation.desc === "string";
}
