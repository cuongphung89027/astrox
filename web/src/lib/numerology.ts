import { managedPrompt } from "./managed-prompts";
/**
 * Thần Số Học — hệ Pythagoras. Port trung thực từ index.html (MODULE 6 — THAN
 * SO HOC): toàn bộ công thức giữ nguyên cách tính của app cũ (Số Chủ Đạo rút
 * gọn khác cách 4 Đỉnh Cao, Thử Thách rút gọn cứng rồi lấy hiệu, v.v.).
 */

/* ------------------------------------------------------------------ */
/* Bảng chữ cái → số (1–9)                                             */
/* ------------------------------------------------------------------ */

const LETTER_VALS: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < L.length; i++) m[L[i]] = (i % 9) + 1;
  return m;
})();

/** Giá trị Pythagoras của 1 ký tự (không phân biệt hoa/thường), null nếu không phải A–Z. */
export function letterValue(ch: string): number | null {
  const v = LETTER_VALS[ch.toUpperCase()];
  return typeof v === "number" ? v : null;
}

export function stripVN(str: string): string {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function lettersOnly(text: string): string {
  return stripVN(text)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/* ------------------------------------------------------------------ */
/*Toán rút gọn số                                                      */
/* ------------------------------------------------------------------ */

function digitSumOnce(n: number): number {
  return String(Math.abs(Math.trunc(n)))
    .split("")
    .reduce((a, c) => a + Number(c), 0);
}

function fullyReduce(n: number, keepMaster = true): number {
  let v = Math.abs(Math.trunc(n));
  while (v > 9 && !(keepMaster && (v === 11 || v === 22 || v === 33))) v = digitSumOnce(v);
  return v;
}

function hardReduce(n: number): number {
  let v = Math.abs(Math.trunc(n));
  while (v > 9) v = digitSumOnce(v);
  return v;
}

function reduceChain(n: number): number[] {
  const chain = [Math.abs(Math.trunc(n))];
  let v = chain[0];
  while (v > 9) {
    v = digitSumOnce(v);
    chain.push(v);
  }
  return chain;
}

function hasKarmicDebt(n: number): boolean {
  return reduceChain(n).some((v) => v === 13 || v === 14 || v === 16 || v === 19);
}

const NUM_VOWELS = new Set(["A", "E", "I", "O", "U"]);

function sumAllLetters(clean: string): number {
  let s = 0;
  for (const ch of clean) s += LETTER_VALS[ch] || 0;
  return s;
}

function sumVowels(clean: string): number {
  let s = 0;
  for (const ch of clean) if (NUM_VOWELS.has(ch)) s += LETTER_VALS[ch] || 0;
  return s;
}

function sumConsonants(clean: string): number {
  let s = 0;
  for (const ch of clean) if (!NUM_VOWELS.has(ch)) s += LETTER_VALS[ch] || 0;
  return s;
}

function digitGrid(y: number, m: number, d: number): NumerologyGrid {
  const str = String(d).padStart(2, "0") + String(m).padStart(2, "0") + String(y);
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  for (const ch of str) {
    const n = Number(ch);
    if (n >= 1 && n <= 9) counts[n]++;
  }
  const missing = Object.keys(counts)
    .map(Number)
    .filter((n) => counts[n] === 0);
  return { counts, missing };
}

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu + biểu đồ                                              */
/* ------------------------------------------------------------------ */

export interface NumerologyGrid {
  counts: Record<number, number>;
  missing: number[];
}

export interface NumerologyPeriod {
  startAge: number;
  endAge: number;
  pinnacle: number;
  challenge: number;
}

export interface NumerologyKarmic {
  label: string;
  raw: number;
}

export interface NumerologyChart {
  name: string;
  lifePath: number;
  destiny: number;
  soulUrge: number;
  personality: number;
  birthday: number;
  attitude: number;
  maturity: number;
  personalYear: number;
  personalMonth: number;
  personalDay: number;
  pinnacles: NumerologyPeriod[];
  karmicDebts: NumerologyKarmic[];
  grid: NumerologyGrid;
  now: { year: number; month: number; day: number; age: number };
}

export interface NumerologyInput {
  /** Họ tên khai sinh đầy đủ (hoặc tên thường gọi nếu không có). */
  fullName: string;
  /** Ngày sinh dương lịch YYYY-MM-DD. */
  dob: string;
}

export function buildNumerologyChart(input: NumerologyInput, nowDate?: Date): NumerologyChart {
  if (!input || !input.dob) throw new Error("Thiếu ngày sinh.");
  const fullName = (input.fullName && input.fullName.trim()) || "";
  if (!fullName) throw new Error("Thiếu họ tên.");
  const clean = lettersOnly(fullName);
  if (!clean) throw new Error("Họ tên không có ký tự chữ cái hợp lệ.");
  const [y, m, d] = input.dob.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Ngày sinh không hợp lệ.");
  const now = nowDate || new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const curD = now.getDate();

  // Số Chủ Đạo: tổng RÚT GỌN MỘT LẦN của ngày/tháng/năm, cộng lại rồi mới rút
  // gọn toàn phần — KHÔNG rút gọn ngày/tháng/năm trước khi cộng (vd 19 -> 10,
  // không rút thành 1), đã đối chiếu ví dụ mẫu từ nguồn tham khảo.
  const lifePathRaw = digitSumOnce(d) + digitSumOnce(m) + digitSumOnce(y);
  const lifePath = fullyReduce(lifePathRaw);
  const destinyRaw = sumAllLetters(clean);
  const destiny = fullyReduce(destinyRaw);
  const soulRaw = sumVowels(clean);
  const soulUrge = fullyReduce(soulRaw);
  const personality = fullyReduce(sumConsonants(clean));
  const birthday = fullyReduce(d);
  const attitude = fullyReduce(digitSumOnce(d) + digitSumOnce(m));
  const maturity = fullyReduce(lifePath + destiny);

  const personalYear = fullyReduce(m + d + curY, false);
  const personalMonth = fullyReduce(personalYear + curM, false);
  const personalDay = fullyReduce(personalMonth + curD, false);

  // 4 Đỉnh Cao: rút gọn TOÀN PHẦN (giữ số chủ) từng phần tháng/ngày/năm trước,
  // rồi cộng cặp và rút gọn lại — khác cách tính Số Chủ Đạo ở trên.
  const rm = fullyReduce(m);
  const rd = fullyReduce(d);
  const ry = fullyReduce(y);
  const p1 = fullyReduce(rm + rd);
  const p2 = fullyReduce(rd + ry);
  const p3 = fullyReduce(p1 + p2);
  const p4 = fullyReduce(rm + ry);
  // 4 Thử Thách: rút gọn CỨNG (không giữ số chủ) rồi lấy hiệu tuyệt đối.
  const hm = hardReduce(m);
  const hd = hardReduce(d);
  const hy = hardReduce(y);
  const c1 = Math.abs(hm - hd);
  const c2 = Math.abs(hd - hy);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(hm - hy);
  const end1 = Math.max(1, 36 - lifePath);
  const periods: NumerologyPeriod[] = [
    { startAge: 0, endAge: end1, pinnacle: p1, challenge: c1 },
    { startAge: end1, endAge: end1 + 9, pinnacle: p2, challenge: c2 },
    { startAge: end1 + 9, endAge: end1 + 18, pinnacle: p3, challenge: c3 },
    { startAge: end1 + 18, endAge: 999, pinnacle: p4, challenge: c4 },
  ];

  const karmicDebts: NumerologyKarmic[] = [];
  if (hasKarmicDebt(lifePathRaw)) karmicDebts.push({ label: "Số Chủ Đạo", raw: lifePathRaw });
  if (hasKarmicDebt(destinyRaw)) karmicDebts.push({ label: "Số Sứ Mệnh", raw: destinyRaw });
  if (hasKarmicDebt(soulRaw)) karmicDebts.push({ label: "Số Linh Hồn", raw: soulRaw });
  if ([13, 14, 16, 19].includes(d)) karmicDebts.push({ label: "Số Ngày Sinh", raw: d });

  const age = curY - y - (curM < m || (curM === m && curD < d) ? 1 : 0);
  return {
    name: fullName,
    lifePath,
    destiny,
    soulUrge,
    personality,
    birthday,
    attitude,
    maturity,
    personalYear,
    personalMonth,
    personalDay,
    pinnacles: periods,
    karmicDebts,
    grid: digitGrid(y, m, d),
    now: { year: curY, month: curM, day: curD, age: Math.max(0, age) },
  };
}

/* ------------------------------------------------------------------ */
/* Chỉ số hiển thị (tên + mô tả ngắn — theo đúng bộ tile của app cũ)   */
/* ------------------------------------------------------------------ */

export interface NumerologyMetric {
  key: string;
  value: number;
  label: string;
  desc: string;
}

export function coreMetrics(c: NumerologyChart): NumerologyMetric[] {
  return [
    { key: "lifePath", value: c.lifePath, label: "Số Chủ Đạo", desc: "Đường đời — bài học lớn nhất và hướng đi tự nhiên của cả đời người." },
    { key: "destiny", value: c.destiny, label: "Số Sứ Mệnh", desc: "Số Biểu Đạt — điều cần hoàn thành và tài năng bẩm sinh trong tên gọi." },
    { key: "soulUrge", value: c.soulUrge, label: "Số Linh Hồn", desc: "Khao khát thật sự sâu bên trong con người bạn." },
    { key: "personality", value: c.personality, label: "Số Nhân Cách", desc: "Hình ảnh mà người khác nhìn thấy ở bạn." },
  ];
}

export function extraMetrics(c: NumerologyChart): NumerologyMetric[] {
  return [
    { key: "birthday", value: c.birthday, label: "Số Ngày Sinh", desc: "Năng lực đặc biệt mang theo từ ngày mình sinh ra." },
    { key: "attitude", value: c.attitude, label: "Số Thái Độ", desc: "Cách bạn tiếp cận cuộc sống trong những năm đầu đời." },
    { key: "maturity", value: c.maturity, label: "Số Trưởng Thành", desc: "Chủ đề của nửa sau đời — kết hợp Chủ Đạo và Sứ Mệnh." },
  ];
}

export function personalMetrics(c: NumerologyChart): NumerologyMetric[] {
  return [
    { key: "personalYear", value: c.personalYear, label: "Năm cá nhân", desc: `Chủ đề vận hành của năm ${c.now.year} trong chu kỳ 9 năm.` },
    { key: "personalMonth", value: c.personalMonth, label: "Tháng cá nhân", desc: "Sắc thái riêng của tháng này trong năm cá nhân." },
    { key: "personalDay", value: c.personalDay, label: "Ngày cá nhân", desc: "Năng lượng nổi bật của ngày hôm nay." },
  ];
}

/* ------------------------------------------------------------------ */
/* Chủ đề luận giải AI (port NUMEROLOGY_TOPICS)                        */
/* ------------------------------------------------------------------ */

export interface NumerologyTopic {
  id: string;
  icon: string;
  title: string;
  desc: string;
  prompt: string;
}

export const NUMEROLOGY_TOPICS: NumerologyTopic[] = [
  {
    id: "life-path",
    icon: "①",
    title: "Số Chủ Đạo",
    desc: "Hành trình cuộc đời",
    prompt:
      "Phân tích ý nghĩa Số Chủ Đạo (Life Path) — bài học cốt lõi, xu hướng tự nhiên và hướng đi phù hợp của cả cuộc đời. Chia đoạn có tiêu đề in đậm: **Bản chất cốt lõi**, **Bài học cuộc đời**, **Lời khuyên**. ~260-440 từ.",
  },
  {
    id: "destiny",
    icon: "②",
    title: "Sứ Mệnh",
    desc: "Tài năng bẩm sinh",
    prompt:
      "Phân tích Số Sứ Mệnh (Destiny/Expression) — điều mệnh chủ được sinh ra để hoàn thành và tài năng bẩm sinh thể hiện qua họ tên. ~240-410 từ.",
  },
  {
    id: "inner-self",
    icon: "③",
    title: "Nội tâm",
    desc: "Linh Hồn đối chiếu Nhân Cách",
    prompt:
      "So sánh và phân tích Số Linh Hồn (khao khát nội tâm thật sự) với Số Nhân Cách (hình ảnh mà người khác nhìn thấy ở mệnh chủ) — chỉ ra điểm tương đồng hoặc mâu thuẫn giữa hai mặt này. ~240-410 từ.",
  },
  {
    id: "birth-grid",
    icon: "④",
    title: "Biểu đồ ngày sinh",
    desc: "Số lặp & số khuyết",
    prompt:
      "Phân tích biểu đồ ngày sinh (ma trận Pythagoras): ý nghĩa các số lặp (điểm mạnh nổi bật), số khuyết (khoảng trống cần bù đắp), và bất kỳ hàng/cột/đường chéo nào có đủ 3 số liên tiếp cùng xuất hiện. ~260-440 từ.",
  },
  {
    id: "cycles",
    icon: "⑤",
    title: "Chu kỳ",
    desc: "Đỉnh cao & thử thách",
    prompt:
      "Phân tích 4 giai đoạn Đỉnh Cao (Pinnacles) và Thử Thách (Challenges) tương ứng theo độ tuổi đã tính — mỗi giai đoạn nêu cơ hội chính (từ số Đỉnh Cao) và rào cản cần vượt qua (từ số Thử Thách). ~280-480 từ.",
  },
  {
    id: "personal-year",
    icon: "⑥",
    title: "Năm cá nhân",
    desc: "Chủ đề năm nay",
    prompt:
      "Phân tích Năm Cá Nhân hiện tại trong chu kỳ 9 năm — chủ đề chính của năm nay và gợi ý cách tận dụng. ~220-370 từ.",
  },
];

/* ------------------------------------------------------------------ */
/* Prompt (port numerologyPromptBody + profileContextText)             */
/* ------------------------------------------------------------------ */

export interface PromptProfile {
  name?: string;
  gender?: string;
  dob?: string;
  hourChi?: string;
  place?: string;
}

function formatDobVi(iso?: string): string {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

export function profileContextText(profile: PromptProfile | null): string {
  if (!profile) return "";
  return managedPrompt("numerology.profileContextText.0", [profile.name || "", profile.gender || "", formatDobVi(profile.dob), profile.hourChi || "", profile.place || ""]);
}

export function numerologyContextText(chart: NumerologyChart): string {
  return managedPrompt("numerology.numerologyContextText.0", [JSON.stringify(chart)]);
}

export function numerologyPromptBody(
  taskText: string,
  chart: NumerologyChart,
  profile: PromptProfile | null,
): string {
  const line = numerologyContextText(chart);
  return managedPrompt("numerology.numerologyPromptBody.0", [profileContextText(profile), line, taskText]);
}
