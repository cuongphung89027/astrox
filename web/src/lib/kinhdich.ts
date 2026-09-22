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
    ? `Thông tin người xem: ${profile.name}, ${profile.gender}, sinh dương lịch ${profile.dob.split("-").reverse().join("-")}, giờ ${profile.hourChi}, tại ${profile.place}.\n`
    : "";
  return `${profileLine}Luận giải quẻ Kinh Dịch theo phương pháp Mai Hoa Dịch Số (Số Pháp), dùng 3 số ngẫu nhiên ${result.s1}, ${result.s2}, ${result.s3}.
Câu hỏi của người gieo quẻ: "${question}"

Dữ liệu quẻ đã tính chính xác theo toán pháp:
- Thượng quái (ngoại quái): ${result.upper.name} ${result.upper.symbol} — tượng ${result.upper.nature}, ngũ hành ${result.upper.elem}, phương ${result.upper.dir}.
- Hạ quái (nội quái): ${result.lower.name} ${result.lower.symbol} — tượng ${result.lower.nature}, ngũ hành ${result.lower.elem}, phương ${result.lower.dir}.
- Hào động: hào thứ ${result.movingPos} (đếm từ dưới lên: Sơ Hào=1, Hào Nhị=2, Hào Tam=3, Hào Tứ=4, Hào Ngũ=5, Hào Thượng=6).
- Thể quái (quái CHỨA hào động, đại diện người hỏi): ${result.the.name} ${result.the.symbol} (${result.the.elem}).
- Dụng quái (quái KHÔNG chứa hào động, đại diện sự việc): ${result.dung.name} ${result.dung.symbol} (${result.dung.elem}).
- Quan hệ Thể-Dụng theo ngũ hành: ${result.relation.label} — ${result.relation.desc}
- Quẻ biến (sau khi đảo hào động): Thượng ${result.bienUpper.name} ${result.bienUpper.symbol}, Hạ ${result.bienLower.name} ${result.bienLower.symbol}.
- Quẻ hỗ (hào 2-3-4 làm nội, hào 3-4-5 làm ngoại): Thượng ${result.hoUpper.name} ${result.hoUpper.symbol}, Hạ ${result.hoLower.name} ${result.hoLower.symbol}.

Nhiệm vụ của bạn (theo đúng phép luận Thể-Dụng của Mai Hoa Dịch Số):
1. Xác định và nêu rõ **tên quẻ chính** theo tên gọi cổ điển trong Kinh Dịch (ghép từ tượng ${result.upper.nature} trên + ${result.lower.nature} dưới, ví dụ dạng "Thiên Địa Bĩ", "Địa Thiên Thái"...). Nếu không chắc chắn 100% tên riêng cổ điển chính xác, hãy nói rõ tên ghép theo tượng (ví dụ "quẻ ${result.upper.nature} ${result.lower.nature}") thay vì đoán bừa tên riêng.
2. Giải nghĩa ý nghĩa tổng quát của quẻ chính, gắn với câu hỏi.
3. Diễn giải hào động (hào thứ ${result.movingPos}) — đây là trọng tâm lời khuyên. Hào động nằm ở quái ${result.the.name}, vì vậy ${result.theIsLower ? "Hạ" : "Thượng"} quái là **Thể** (bản thân người hỏi), quái còn lại là **Dụng** (sự việc được hỏi).
4. Diễn giải ý nghĩa quan hệ Thể-Dụng đã tính ở trên (${result.relation.label}) trong bối cảnh câu hỏi — đây là lõi của phép luận Mai Hoa.
5. Gợi ý ngắn từ quẻ biến (${result.bienUpper.name} trên ${result.bienLower.name} dưới) và quẻ hỗ (${result.hoUpper.name} trên ${result.hoLower.name} dưới) — quẻ hỗ là động lực ngầm bên trong, quẻ biến là xu hướng nếu tình hình tiếp diễn.
6. Kết luận bằng 1 lời khuyên hành động cụ thể, ngắn gọn.

Trình bày ngắn gọn khoảng 180–280 từ, đúng ba phần: **Điều đáng chú ý** (2–3 câu trả lời trực tiếp điều người dùng hỏi), **Gợi ý cho bạn** (tối đa 3 hành động hoặc điều cần cân nhắc cụ thể), **Cơ sở luận quẻ** (giải thích ngắn hào động, Thể-Dụng, quẻ biến và quẻ hỗ). Không lời chào, không nhắc lại câu hỏi, không kể lại dữ liệu sinh hay danh sách dữ liệu quẻ. Dùng ngôn ngữ đời thường ở hai phần đầu, chỉ đưa thuật ngữ vào phần cơ sở. Không khẳng định tương lai chắc chắn; đây là gợi ý chiêm nghiệm, không phải phán quyết định mệnh.`;
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
