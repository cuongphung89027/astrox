/**
 * BÁT TỰ (Tứ Trụ) — module độc lập, port trung thực từ MODULE "BAT TU (Tu Tru)"
 * của index.html: tính Tứ Trụ bằng lunar-typescript (app cũ gọi qua
 * window.LunarKit — bản Next.js import trực tiếp), giữ nguyên công thức hiệu
 * chỉnh giờ Mặt Trời theo kinh độ, bảng Thập Thần, quan hệ Địa Chi và Đại Vận.
 */
import { Solar } from "lunar-typescript";
import type { Profile } from "./types";

/* ------------------------------------------------------------------ */
/* Bảng.can/chi/Thập Thần — port 1:1                                   */
/* ------------------------------------------------------------------ */

export interface StemInfo {
  vi: string;
  wxKey: WxKey | "";
  yy: string;
}

export interface BranchInfo {
  vi: string;
  wxKey: WxKey | "";
  animal: string;
}

export type WxKey = "moc" | "hoa" | "tho" | "kim" | "thuy";

export const BATU_STEM_VI: Record<string, StemInfo> = {
  甲: { vi: "Giáp", wxKey: "moc", yy: "Dương" },
  乙: { vi: "Ất", wxKey: "moc", yy: "Âm" },
  丙: { vi: "Bính", wxKey: "hoa", yy: "Dương" },
  丁: { vi: "Đinh", wxKey: "hoa", yy: "Âm" },
  戊: { vi: "Mậu", wxKey: "tho", yy: "Dương" },
  己: { vi: "Kỷ", wxKey: "tho", yy: "Âm" },
  庚: { vi: "Canh", wxKey: "kim", yy: "Dương" },
  辛: { vi: "Tân", wxKey: "kim", yy: "Âm" },
  壬: { vi: "Nhâm", wxKey: "thuy", yy: "Dương" },
  癸: { vi: "Quý", wxKey: "thuy", yy: "Âm" },
};

export const BATU_BRANCH_VI: Record<string, BranchInfo> = {
  子: { vi: "Tý", wxKey: "thuy", animal: "Chuột" },
  丑: { vi: "Sửu", wxKey: "tho", animal: "Trâu" },
  寅: { vi: "Dần", wxKey: "moc", animal: "Hổ" },
  卯: { vi: "Mão", wxKey: "moc", animal: "Mèo" },
  辰: { vi: "Thìn", wxKey: "tho", animal: "Rồng" },
  巳: { vi: "Tỵ", wxKey: "hoa", animal: "Rắn" },
  午: { vi: "Ngọ", wxKey: "hoa", animal: "Ngựa" },
  未: { vi: "Mùi", wxKey: "tho", animal: "Dê" },
  申: { vi: "Thân", wxKey: "kim", animal: "Khỉ" },
  酉: { vi: "Dậu", wxKey: "kim", animal: "Gà" },
  戌: { vi: "Tuất", wxKey: "tho", animal: "Chó" },
  亥: { vi: "Hợi", wxKey: "thuy", animal: "Lợn" },
};

/** Thập Thần — thư viện trả về Hán ngữ chuẩn; "日主" = Nhật Chủ (bản thân). */
export const BATU_SHISHEN_VI: Record<string, string> = {
  比肩: "Tỷ Kiên",
  劫财: "Kiếp Tài",
  食神: "Thực Thần",
  伤官: "Thương Quan",
  偏财: "Thiên Tài",
  正财: "Chính Tài",
  七杀: "Thất Sát",
  偏官: "Thất Sát",
  正官: "Chính Quan",
  偏印: "Thiên Ấn",
  正印: "Chính Ấn",
  日主: "Nhật Chủ (bản thân)",
};

export const BATU_WX_LABEL: Record<WxKey, string> = { moc: "Mộc", hoa: "Hoả", tho: "Thổ", kim: "Kim", thuy: "Thuỷ" };

/** Màu ngũ hành dùng cho UI (Kim vàng / Mộc ngọc / Thuỷ chàm / Hoả son / Thổ nâu). */
export const BATU_WX_COLOR: Record<WxKey, string> = {
  kim: "var(--color-kim-deep)",
  moc: "var(--color-ngoc-deep)",
  thuy: "var(--color-cham)",
  hoa: "var(--color-son-deep)",
  tho: "#8a5a2b",
};

/* ------------------------------------------------------------------ */
/* Quan hệ Địa Chi — Lục Hợp / Lục Xung / Tam Hợp / Lục Hại / Hình     */
/* ------------------------------------------------------------------ */

const BATU_REL_HOP = [
  ["Tý", "Sửu"],
  ["Dần", "Hợi"],
  ["Mão", "Tuất"],
  ["Thìn", "Dậu"],
  ["Tỵ", "Thân"],
  ["Ngọ", "Mùi"],
];
const BATU_REL_XUNG = [
  ["Tý", "Ngọ"],
  ["Sửu", "Mùi"],
  ["Dần", "Thân"],
  ["Mão", "Dậu"],
  ["Thìn", "Tuất"],
  ["Tỵ", "Hợi"],
];
const BATU_REL_HAI = [
  ["Tý", "Mùi"],
  ["Sửu", "Ngọ"],
  ["Dần", "Tỵ"],
  ["Mão", "Thìn"],
  ["Thân", "Hợi"],
  ["Dậu", "Tuất"],
];
const BATU_REL_TAMHOP = [
  ["Thân", "Tý", "Thìn"],
  ["Hợi", "Mão", "Mùi"],
  ["Dần", "Ngọ", "Tuất"],
  ["Tỵ", "Dậu", "Sửu"],
];
const BATU_REL_HINH_PAIR = [
  ["Dần", "Tỵ"],
  ["Tỵ", "Thân"],
  ["Dần", "Thân"],
  ["Sửu", "Tuất"],
  ["Tuất", "Mùi"],
  ["Sửu", "Mùi"],
  ["Tý", "Mão"],
];
const BATU_REL_TUHINH = ["Thìn", "Ngọ", "Dậu", "Hợi"];

export type BatuRelType = "hop" | "xung" | "hai" | "hinh" | "none";

export interface BatuRelation {
  type: BatuRelType;
  text: string;
}

function batuPairIn(list: string[][], a: string, b: string): boolean {
  return list.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
}

export function detectBatuRelations(items: { label: string; zhi: string }[]): BatuRelation[] {
  const out: BatuRelation[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (batuPairIn(BATU_REL_HOP, a.zhi, b.zhi)) out.push({ type: "hop", text: `Lục Hợp: ${a.label}–${b.label} (${a.zhi}·${b.zhi})` });
      if (batuPairIn(BATU_REL_XUNG, a.zhi, b.zhi)) out.push({ type: "xung", text: `Lục Xung: ${a.label}–${b.label} (${a.zhi}·${b.zhi})` });
      if (batuPairIn(BATU_REL_HAI, a.zhi, b.zhi)) out.push({ type: "hai", text: `Lục Hại: ${a.label}–${b.label} (${a.zhi}·${b.zhi})` });
      if (batuPairIn(BATU_REL_HINH_PAIR, a.zhi, b.zhi)) out.push({ type: "hinh", text: `Tương Hình: ${a.label}–${b.label} (${a.zhi}·${b.zhi})` });
      if (a.zhi === b.zhi && BATU_REL_TUHINH.includes(a.zhi)) out.push({ type: "hinh", text: `Tự Hình: ${a.label}–${b.label} (${a.zhi})` });
    }
  }
  BATU_REL_TAMHOP.forEach((trio) => {
    const found = trio.map((z) => items.find((p) => p.zhi === z)).filter(Boolean) as { label: string; zhi: string }[];
    if (found.length === 3) out.push({ type: "hop", text: `Tam Hợp: ${found.map((f) => f.label).join("–")} (${trio.join("·")})` });
  });
  if (out.length === 0) out.push({ type: "none", text: "Không có quan hệ Xung/Hợp/Hình/Hại nổi bật giữa 4 Địa Chi." });
  return out;
}

/* ------------------------------------------------------------------ */
/* Tính Tứ Trụ                                                         */
/* ------------------------------------------------------------------ */

export interface BatuPillar {
  label: string;
  hanGan: string;
  hanZhi: string;
  viGan: string;
  viZhi: string;
  wxKeyGan: WxKey | "";
  wxKeyZhi: WxKey | "";
  yinYang: string;
  animal: string;
  shishenGan: string;
  shishenZhi: string[];
}

export interface BatuDayunItem {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  hanGanZhi: string;
  viGanZhi: string;
}

export interface BatuChart {
  pillars: { year: BatuPillar; month: BatuPillar; day: BatuPillar; time: BatuPillar };
  wuxing: Record<WxKey, number>;
  relations: BatuRelation[];
  dayun: BatuDayunItem[];
  lunarText: string;
}

/** 12 kinh độ VN dùng ở app cũ (ngoài 5 thành phố lớn → mặc định Hà Nội). */
const VN_COORDS: Record<string, [number, number]> = {
  "Hà Nội": [21.0285, 105.8542],
  "TP. Hồ Chí Minh": [10.8231, 106.6297],
  "Đà Nẵng": [16.0544, 108.2022],
  "Hải Phòng": [20.8449, 106.6881],
  "Cần Thơ": [10.0452, 105.7469],
};

/** Giờ giữa can chi (giờ sinh dùng điểm giữa). */
const CHI_MID_HOUR: Record<string, number> = {
  Tý: 0,
  Tí: 0,
  Sửu: 2,
  Dần: 4,
  Mão: 6,
  Thìn: 8,
  Tỵ: 10,
  Ngọ: 12,
  Mùi: 14,
  Thân: 16,
  Dậu: 18,
  Tuất: 20,
  Hợi: 22,
};

/** "Tí (23:00–00:59)" → "Tí" → 0. Trả về -1 nếu không đọc được. */
export function hourChiMidHour(hourChi: string): number {
  const label = String(hourChi || "").split(" (")[0].trim();
  if (CHI_MID_HOUR[label] !== undefined) return CHI_MID_HOUR[label];
  // fallback: quét tên chi nằm trong chuỗi
  for (const key of Object.keys(CHI_MID_HOUR)) {
    if (label.includes(key)) return CHI_MID_HOUR[key];
  }
  return -1;
}

function batuGenderNum(g: string): number {
  return g === "Nam" ? 1 : 0;
}

export interface BatuInput {
  gender: string;
  dob: string;
  hourChi: string;
  place?: string;
}

/**
 * buildEightChar: tính Tứ Trụ bằng lunar-typescript. Giờ sinh dùng điểm giữa
 * can chi, hiệu chỉnh giờ Mặt Trời thật theo kinh độ so với kinh tuyến chuẩn
 * 105°E (~4 phút/độ) — cộng vào offset +07:00 rồi đọc lại Y/M/D/H/Min qua UTC
 * để tránh phụ thuộc múi giờ hệ thống (port 1:1 từ index.html).
 */
export function buildBatuChart(input: BatuInput): BatuChart {
  if (!input || !input.dob || !input.hourChi) throw new Error("Thiếu ngày giờ sinh.");
  const mid = hourChiMidHour(input.hourChi);
  if (mid < 0) throw new Error("Không đọc được giờ sinh — hãy chọn lại can giờ.");
  const instant = new Date(`${input.dob}T${String(mid).padStart(2, "0")}:00:00+07:00`).getTime();
  if (!Number.isFinite(instant)) throw new Error("Ngày sinh không hợp lệ.");
  const [, lon] = VN_COORDS[input.place || ""] || VN_COORDS["Hà Nội"];
  const offsetMin = 420 + (lon - 105) * 4;
  const wd = new Date(instant + offsetMin * 60000);
  const y = wd.getUTCFullYear();
  const mo = wd.getUTCMonth() + 1;
  const da = wd.getUTCDate();
  const hh = wd.getUTCHours();
  const mi = wd.getUTCMinutes();
  const solar = Solar.fromYmdHms(y, mo, da, hh, mi, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const mkPillar = (label: string, gan: string, zhi: string, ssGan: string, ssZhi: string[]): BatuPillar => {
    const g = BATU_STEM_VI[gan] || { vi: gan, wxKey: "", yy: "" };
    const z = BATU_BRANCH_VI[zhi] || { vi: zhi, wxKey: "", animal: "" };
    return {
      label,
      hanGan: gan,
      hanZhi: zhi,
      viGan: g.vi,
      viZhi: z.vi,
      wxKeyGan: g.wxKey,
      wxKeyZhi: z.wxKey,
      yinYang: g.yy,
      animal: z.animal,
      shishenGan: BATU_SHISHEN_VI[ssGan] || ssGan || "",
      shishenZhi: (ssZhi || []).map((s) => BATU_SHISHEN_VI[s] || s),
    };
  };
  const pillars = {
    year: mkPillar("Năm", ec.getYearGan(), ec.getYearZhi(), ec.getYearShiShenGan(), ec.getYearShiShenZhi()),
    month: mkPillar("Tháng", ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthShiShenGan(), ec.getMonthShiShenZhi()),
    day: mkPillar("Ngày", ec.getDayGan(), ec.getDayZhi(), ec.getDayShiShenGan(), ec.getDayShiShenZhi()),
    time: mkPillar("Giờ", ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeShiShenGan(), ec.getTimeShiShenZhi()),
  };
  const wxCount: Record<WxKey, number> = { moc: 0, hoa: 0, tho: 0, kim: 0, thuy: 0 };
  Object.values(pillars).forEach((p) => {
    if (p.wxKeyGan && wxCount[p.wxKeyGan] !== undefined) wxCount[p.wxKeyGan]++;
    if (p.wxKeyZhi && wxCount[p.wxKeyZhi] !== undefined) wxCount[p.wxKeyZhi]++;
  });
  const relations = detectBatuRelations([
    { label: "Năm", zhi: pillars.year.viZhi },
    { label: "Tháng", zhi: pillars.month.viZhi },
    { label: "Ngày", zhi: pillars.day.viZhi },
    { label: "Giờ", zhi: pillars.time.viZhi },
  ]);
  let dayun: BatuDayunItem[] = [];
  try {
    const yun = ec.getYun(batuGenderNum(input.gender));
    dayun = yun
      .getDaYun(9)
      .filter((d) => d.getIndex() >= 1)
      .map((d) => {
        const gz = d.getGanZhi();
        const gan = gz.charAt(0);
        const zhi = gz.charAt(1);
        const g = BATU_STEM_VI[gan] || { vi: gan };
        const z = BATU_BRANCH_VI[zhi] || { vi: zhi };
        return {
          startAge: d.getStartAge(),
          endAge: d.getEndAge(),
          startYear: d.getStartYear(),
          endYear: d.getEndYear(),
          hanGanZhi: gz,
          viGanZhi: `${g.vi} ${z.vi}`,
        };
      });
  } catch {
    dayun = [];
  }
  const lunarText = `Ngày ${lunar.getDay()} tháng ${Math.abs(lunar.getMonth())}${lunar.getMonth() < 0 ? " (nhuận)" : ""} âm lịch, năm ${pillars.year.viGan} ${pillars.year.viZhi}`;
  return { pillars, wuxing: wxCount, relations, dayun, lunarText };
}

/* ------------------------------------------------------------------ */
/* Prompt luận giải — port batuPromptBody/profileContextText           */
/* ------------------------------------------------------------------ */

export function buildBatuPromptBody(taskText: string, chart: BatuChart, profile: Profile | null): string {
  const profileLine = profile
    ? `Thông tin người xem: ${profile.name}, ${profile.gender}, sinh dương lịch ${profile.dob.split("-").reverse().join("-")}, giờ ${profile.hourChi}, tại ${profile.place}.\n`
    : "";
  const chartLine = `DỮ LIỆU LÁ SỐ BÁT TỰ ĐÃ TÍNH (đầy đủ, AI phải dùng trực tiếp — không được nói thiếu dữ liệu): ${JSON.stringify(chart)}`;
  return `${profileLine}${chartLine}\n\nQUY TẮC PHÂN TÍCH BÁT TỰ: bắt đầu ngay từ dữ liệu Tứ Trụ, Thập Thần và tỷ lệ Ngũ Hành đã cho — không được nói "thiếu dữ liệu" hay yêu cầu bổ sung ngày giờ sinh. Nếu một chi tiết thật sự không có trong JSON thì bỏ qua chi tiết đó và phân tích phần còn lại.\n\n${taskText}`;
}

/* ------------------------------------------------------------------ */
/* Chủ đề luận giải — port BATU_TOPICS                                 */
/* ------------------------------------------------------------------ */

export interface BatuTopic {
  id: string;
  icon: string;
  title: string;
  desc: string;
  prompt: string;
}

export const BATU_TOPICS: BatuTopic[] = [
  {
    id: "tinh-cach",
    icon: "☯",
    title: "Tính cách",
    desc: "Tính cách, khí chất qua Nhật Chủ, Ngũ Hành và Thập Thần.",
    prompt:
      "Phân tích tính cách, khí chất qua Thiên Can Nhật Chủ (trụ Ngày), tỷ lệ Ngũ Hành và các Thập Thần xuất hiện trong lá số Bát Tự. Chia đoạn có tiêu đề in đậm: **Điểm mạnh**, **Điểm cần lưu ý**, **Lời khuyên rèn luyện**. ~260-440 từ.",
  },
  {
    id: "su-nghiep-tien-tai",
    icon: "⌂",
    title: "Sự nghiệp & tiền tài",
    desc: "Xu hướng sự nghiệp, tài lộc qua trụ Tháng và Thập Thần Tài/Quan.",
    prompt:
      "Phân tích sự nghiệp và tiền tài dựa trên trụ Tháng và các Thập Thần Tài/Quan/Ấn xuất hiện trong lá số Bát Tự. ~260-440 từ.",
  },
  {
    id: "tinh-duyen",
    icon: "❤",
    title: "Tình duyên",
    desc: "Tình duyên, hôn nhân qua trụ Ngày và Thập Thần liên quan.",
    prompt:
      "Phân tích tình duyên và hôn nhân dựa trên Địa Chi trụ Ngày (cung Phối ngẫu) và các Thập Thần Tài/Quan/Sát trong lá số Bát Tự. ~240-410 từ.",
  },
  {
    id: "suc-khoe",
    icon: "✚",
    title: "Sức khoẻ",
    desc: "Xu hướng sức khoẻ qua sự cân bằng Ngũ Hành trong lá số.",
    prompt:
      "Phân tích xu hướng sức khoẻ dựa trên sự dư/thiếu cân bằng Ngũ Hành trong lá số Bát Tự (hành nào vượng, hành nào thiếu) theo quan niệm Ngũ Hành tương ứng ngũ tạng trong văn hoá truyền thống. Nói rõ đây là góc nhìn văn hoá tham khảo, không thay thế chẩn đoán y khoa. ~220-370 từ.",
  },
];
