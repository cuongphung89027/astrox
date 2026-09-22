/**
 * Logic Tử Vi Đẩu Số — port trung thực từ index.html (MODULE 1 — TU VI):
 * buildZiweiChart, ZIWEI_HOUR_INDEX, ziweiPeriodSkyText (Lưu Nhật/Lưu Nguyệt/
 * Lưu Niên), tuviPromptBody + TUVI_TOPICS + periodCacheKey.
 * Khác biệt duy nhất: app cũ gọi window.iztro qua CDN, bản này dùng iztro npm
 * (`import { branchName } from "./earthly-branches";
import { astro } from "iztro"`). Dữ liệu JSON lá số là nguồn duy nhất
 * đưa cho AI — cấm bịa.
 */
import { branchName } from "./earthly-branches";
import { astro } from "iztro";
import type { Profile } from "./types";
import { formatDob } from "./utils";

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu lá số chuẩn hoá (shape lưu vào state.ziweiChart)       */
/* ------------------------------------------------------------------ */

export interface ZiweiStar {
  name: string;
  /** Tứ hóa gắn trên sao (Hóa Lộc/Quyền/Khoa/Kỵ) nếu có. */
  mutagen?: string;
  /** Độ sáng (miếu/vang/đắc/bất...) nếu có. */
  brightness?: string;
}

export interface ZiweiPalace {
  index: number;
  name: string;
  earthlyBranch: string;
  heavenlyStem: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: ZiweiStar[];
  changSheng: string;
  /** Đại vận, dạng "4-13". */
  decadal: string;
}

export interface ZiweiChart {
  solarDate: string;
  hourChi: string;
  gender: string;
  meta: {
    fiveElementsClass: string;
    soul: string;
    body: string;
    zodiac: string;
    sign: string;
    chineseDate: string;
  };
  palaces: ZiweiPalace[];
}

export interface ZiweiInput {
  gender: string;
  /** YYYY-MM-DD dương lịch. */
  dob: string;
  /** Chuỗi HOUR_CHI_OPTIONS, vd "Tí (23:00–00:59)". */
  hourChi: string;
}

/** Lấy đúng 4 trường đầu vào lá số từ hồ sơ (không kéo theo tên/ngày khác). */
export function ziweiInputFrom(profile: Profile): ZiweiInput {
  return { gender: profile.gender, dob: profile.dob, hourChi: profile.hourChi };
}

export type TuviPeriod = "today" | "week" | "month";

/* ------------------------------------------------------------------ */
/* Giờ sinh → timeIndex — port ZIWEI_HOUR_INDEX (Tý=0 … Hợi=11)        */
/* ------------------------------------------------------------------ */

const ZIWEI_HOUR_INDEX: Record<string, number> = Object.fromEntries(
  ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"].map((chi, i) => [chi, i]),
);

/** Nhận cả "Tý" lẫn "Tí (23:00–00:59)" (HOUR_CHI_OPTIONS của hồ sơ mới). */
export function hourChiToTimeIndex(hourChi: string): number {
  const label = hourChi.split(" (")[0].trim();
  const normalized = label === "Tí" ? "Tý" : label;
  return ZIWEI_HOUR_INDEX[normalized] ?? 0;
}

/* ------------------------------------------------------------------ */
/* Helper an toàn — port safeText/palaceStars của app cũ               */
/* ------------------------------------------------------------------ */

function safeText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(safeText).filter(Boolean).join(" · ");
  if (typeof v === "object") return safeText((v as Record<string, unknown>).name ?? (v as Record<string, unknown>).label ?? "");
  return "";
}

function toStar(v: unknown): ZiweiStar | null {
  const name = safeText(v);
  if (!name) return null;
  const obj = (typeof v === "object" && v !== null ? v : {}) as { mutagen?: unknown; brightness?: unknown };
  const mutagen = safeText(obj.mutagen);
  const brightness = safeText(obj.brightness);
  return {
    name,
    ...(mutagen ? { mutagen } : {}),
    ...(brightness ? { brightness } : {}),
  };
}

function starList(stars: unknown): ZiweiStar[] {
  return Array.isArray(stars) ? stars.map(toStar).filter((s): s is ZiweiStar => !!s) : [];
}

/* ------------------------------------------------------------------ */
/* Lập lá số — port buildZiweiChart                                    */
/* ------------------------------------------------------------------ */

/** Kiểu suy ra từ iztro npm (thay cho window.iztro cũ). */
type ZiweiRaw = ReturnType<typeof astro.bySolar>;

export function buildZiweiChart(input: ZiweiInput): ZiweiChart {
  if (!input || !input.dob || !input.hourChi) throw new Error("Thiếu ngày sinh hoặc giờ sinh.");
  const [y, m, d] = input.dob.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Ngày sinh không hợp lệ.");
  // App cũ truyền ngày không pad (YYYY-M-D) — giữ nguyên để khớp kết quả.
  const date = `${y}-${m}-${d}`;
  const gender = input.gender === "Nữ" ? "女" : "男";
  const hour = hourChiToTimeIndex(input.hourChi);
  const raw = astro.bySolar(date, hour, gender, true, "vi-VN");
  const palaces = Array.isArray(raw.palaces) ? raw.palaces : [];
  if (!palaces.length) throw new Error("iztro không trả về 12 cung.");
  return {
    solarDate: input.dob,
    hourChi: input.hourChi,
    gender: input.gender,
    meta: {
      fiveElementsClass: safeText(raw.fiveElementsClass),
      soul: safeText(raw.soul),
      body: safeText(raw.body),
      zodiac: branchName(safeText(raw.zodiac)),
      sign: safeText(raw.sign),
      chineseDate: safeText(raw.chineseDate),
    },
    palaces: palaces.slice(0, 12).map((p, i) => ({
      index: i,
      name: safeText(p.name),
      earthlyBranch: safeText(p.earthlyBranch),
      heavenlyStem: safeText(p.heavenlyStem),
      isBodyPalace: !!p.isBodyPalace,
      isOriginalPalace: !!p.isOriginalPalace,
      majorStars: starList(p.majorStars),
      minorStars: starList(p.minorStars),
      adjectiveStars: starList(p.adjectiveStars),
      changSheng: safeText(p.changsheng12),
      decadal: Array.isArray(p.decadal?.range) ? `${p.decadal.range[0]}–${p.decadal.range[1]}` : "",
    })),
  };
}

/** Ngũ hành bản mệnh + Mệnh chủ/Thân chủ cho hàng tổng quan. */
export function yearStemBranch(chart: ZiweiChart): string {
  // chineseDate = "Can Chi Can Chi ..." (mỗi trụ 2 từ ở bản vi-VN); trụ năm đứng đầu.
  const tokens = chart.meta.chineseDate.split(/\s+/).filter(Boolean);
  if (tokens.length >= 8) return `${tokens[0]} ${tokens[1]}`;
  if (tokens.length === 4) return tokens[0];
  return chart.meta.chineseDate || "—";
}

export function menhPalace(chart: ZiweiChart): ZiweiPalace | undefined {
  return chart.palaces.find((p) => p.name === "Mệnh");
}

/* ------------------------------------------------------------------ */
/* Ngũ hành của sao — phục vụ tô màu chip trên bánh lá số              */
/* ------------------------------------------------------------------ */

export type StarElement = "Kim" | "Mộc" | "Thủy" | "Hỏa" | "Thổ";

/** Bảng ngũ hành 14 chính tinh + phụ tinh thông dụng (truyền thống Tử Vi). */
const STAR_ELEMENTS: Record<string, StarElement> = {
  // 14 chính tinh
  "Tử Vi": "Thổ",
  "Thiên Cơ": "Mộc",
  "Thái Dương": "Hỏa",
  "Vũ Khúc": "Kim",
  "Thiên Đồng": "Thủy",
  "Liêm Trinh": "Hỏa",
  "Thiên Phủ": "Thổ",
  "Thái Âm": "Thủy",
  "Tham Lang": "Mộc",
  "Cự Môn": "Thổ",
  "Thiên Tướng": "Thủy",
  "Thiên Lương": "Thổ",
  "Thất Sát": "Kim",
  "Phá Quân": "Thủy",
  // Lục cát
  "Tả Phù": "Thổ",
  "Hữu Bật": "Thủy",
  "Văn Xương": "Kim",
  "Văn Khúc": "Thủy",
  "Lộc Tồn": "Thổ",
  "Thiên Mã": "Hỏa",
  // Lục sát
  "Kình Dương": "Kim",
  "Đà La": "Kim",
  "Hỏa Tinh": "Hỏa",
  "Linh Tinh": "Hỏa",
  "Địa Không": "Hỏa",
  "Địa Kiếp": "Hỏa",
};

export function starElement(name: string): StarElement | null {
  const base = name.replace(/\s*·.*$/, "").trim();
  return STAR_ELEMENTS[base] ?? STAR_ELEMENTS[name] ?? null;
}

/* ------------------------------------------------------------------ */
/* Lưu Niên / Lưu Nguyệt / Lưu Nhật — port ziweiPeriodSkyText          */
/* ------------------------------------------------------------------ */

export const ZIWEI_MUTAGEN_LABELS = ["Hóa Lộc", "Hóa Quyền", "Hóa Khoa", "Hóa Kỵ"];

/** Tạo lại raw astrolabe iztro (bản cũ: ziweiRawAstrolabe). */
export function ziweiRawAstrolabe(input: ZiweiInput): ZiweiRaw | null {
  try {
    const [y, m, d] = input.dob.split("-").map(Number);
    const gender = input.gender === "Nữ" ? "女" : "男";
    return astro.bySolar(`${y}-${m}-${d}`, hourChiToTimeIndex(input.hourChi), gender, true, "vi-VN");
  } catch {
    return null;
  }
}

function allStarNames(p: { majorStars: unknown[]; minorStars: unknown[]; adjectiveStars: unknown[] }): string[] {
  return [...starList(p.majorStars), ...starList(p.minorStars), ...starList(p.adjectiveStars)].map((s) => s.name);
}

function ziweiFindStarPalaceName(rawPalaces: ZiweiRaw["palaces"], star: string): string | null {
  const found = (rawPalaces || []).find((p) => allStarNames(p).includes(star));
  return found ? safeText(found.name) : null;
}

function ziweiFmtDate(dt: Date): string {
  return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
}

function ziweiScopeText(raw: ZiweiRaw, dateStr: string, scope: "daily" | "monthly"): string {
  let h: ReturnType<ZiweiRaw["horoscope"]>;
  try {
    h = raw.horoscope(dateStr, 0);
  } catch {
    return "";
  }
  const t = scope === "daily" ? h.daily : h.monthly;
  if (!t) return "";
  const natalAtIdx = raw.palaces[t.index];
  if (!natalAtIdx) return "";
  const mutagenParts = (t.mutagen || []).map((star, i) => {
    const hostName = ziweiFindStarPalaceName(raw.palaces, star);
    return `${ZIWEI_MUTAGEN_LABELS[i] || "Hóa?"} tại ${star}${hostName ? ` (cung ${hostName} trong lá số gốc)` : ""}`;
  });
  const stars = starList(natalAtIdx.majorStars).map((s) => s.name).join(", ") || "không có chính tinh";
  return `${safeText(t.name)} (${safeText(t.heavenlyStem)} ${safeText(t.earthlyBranch)}) nhập cung ${safeText(
    natalAtIdx.name,
  )} trong lá số gốc (chính tinh tại đây: ${stars}). Tứ Hóa của kỳ này: ${mutagenParts.join("; ") || "không xác định"}.`;
}

export function ziweiPeriodSkyText(input: ZiweiInput, period: TuviPeriod): string {
  const raw = ziweiRawAstrolabe(input);
  if (!raw) return "";
  const now = new Date();
  if (period === "today") return ziweiScopeText(raw, ziweiFmtDate(now), "daily");
  if (period === "week") {
    return [0, 2, 4, 6]
      .map((d) => {
        const dt = new Date(now.getTime() + d * 86400000);
        const label = d === 0 ? "hôm nay" : `+${d} ngày (${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")})`;
        return `${label}: ${ziweiScopeText(raw, ziweiFmtDate(dt), "daily")}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  const monthly = ziweiScopeText(raw, ziweiFmtDate(now), "monthly");
  const samples = [0, 10, 20]
    .map((d) => {
      const dt = new Date(now.getTime() + d * 86400000);
      const label = d === 0 ? "đầu tháng (hôm nay)" : `ngày +${d}`;
      return `${label}: ${ziweiScopeText(raw, ziweiFmtDate(dt), "daily")}`;
    })
    .filter(Boolean)
    .join("\n");
  return `${monthly}\nMột vài mốc Lưu Nhật trong tháng:\n${samples}`;
}

/* ------------------------------------------------------------------ */
/* Prompt — port profileContextText/ziweiContextText/tuviPromptBody    */
/* ------------------------------------------------------------------ */

export function profileContextText(profile: Profile): string {
  if (!profile) return "";
  const p = profile;
  return `Thông tin người xem: ${p.name}, ${p.gender}, sinh dương lịch ${formatDob(p.dob)}, giờ ${p.hourChi}, tại ${p.place}.`;
}

export function ziweiContextText(chart: ZiweiChart): string {
  if (!chart) return "";
  return `DỮ LIỆU LÁ SỐ TỬ VI ĐÃ TÍNH (đầy đủ, AI phải dùng trực tiếp — không được nói thiếu dữ liệu): ${JSON.stringify(chart)}`;
}

/** Khung prompt chung: hồ sơ + JSON lá số + quy tắc bắt đầu từ dữ liệu thật. */
export function tuviPromptBody(profile: Profile, chart: ZiweiChart | null, taskText: string): string {
  if (!chart) return taskText;
  const chartLine = ziweiContextText(chart);
  return `${profileContextText(profile)}\n${chartLine}\n\nQUY TẮC PHÂN TÍCH LÁ SỐ: bắt đầu ngay từ dữ liệu trên — luận giải trực tiếp các sao, cung và đại vận đã cho. Cấm nói các câu như "không đọc được", "thiếu dữ liệu", "hãy bổ sung ngày giờ sinh". Nếu một chi tiết thật sự không có trong JSON thì bỏ qua chi tiết đó và phân tích phần còn lại.\n\n${taskText}`;
}

export const PERIOD_LABELS: Record<TuviPeriod, string> = { today: "hôm nay", week: "tuần này", month: "tháng này" };

/** Port tuviPeriodPromptText — dữ liệu lưu chuyển thật theo kỳ. */
export function tuviPeriodPromptText(
  input: ZiweiInput,
  label: string,
  ptext: string,
  period: TuviPeriod,
): string {
  const sky = ziweiPeriodSkyText(input, period);
  if (!sky)
    return `Hôm nay là ${label} (${ptext}). Dựa trên lá số trên, viết 3 gạch đầu dòng ngắn về sắc thái ${ptext}: 1 câu công việc, 1 câu tình cảm/quan hệ, 1 câu lời khuyên. Diễn giải theo các sao, cung và tiểu vận đã cho.`;
  const guide: Record<TuviPeriod, string> = {
    today: `DỮ LIỆU LƯU CHUYỂN HÔM NAY là ${label} (tính bằng thuật toán Tử Vi thật — Lưu Nhật, Tứ Hóa):\n${sky}\n\nNhiệm vụ: dựa trên Lưu Nhật và Tứ Hóa hôm nay ở trên, viết đúng 3 gạch đầu dòng cho HÔM NAY: 1 câu công việc, 1 câu tình cảm, 1 câu lời khuyên. Mỗi ý phải nhắc cụ thể tới cung hoặc sao lưu chuyển đã cho (tên cung Lưu Nhật Mệnh nhập, hoặc sao Hóa Lộc/Hóa Kỵ...). Cấm viết chung chung dùng được cho mọi ngày.`,
    week: `DỮ LIỆU LƯU CHUYỂN TUẦN NÀY là ${label} (mẫu Lưu Nhật các ngày trong tuần, tính bằng thuật toán Tử Vi thật):\n${sky}\n\nNhiệm vụ: dựa trên diễn biến Lưu Nhật cả tuần ở trên, viết đúng 3 gạch đầu dòng cho CẢ TUẦN: 1 câu công việc (ngày nào thuận/kỵ dựa trên cung Lưu Nhật Mệnh nhập), 1 câu tình cảm, 1 câu lời khuyên theo nhịp tuần. Phải nêu khác biệt giữa các ngày mẫu, cấm viết nội dung dùng được cho một ngày đơn lẻ.`,
    month: `DỮ LIỆU LƯU CHUYỂN THÁNG NÀY là ${label} (Lưu Nguyệt + mẫu Lưu Nhật trong tháng, tính bằng thuật toán Tử Vi thật):\n${sky}\n\nNhiệm vụ: dựa trên Lưu Nguyệt và Tứ Hóa tháng ở trên, viết đúng 3 gạch đầu dòng cho CẢ THÁNG: 1 câu công việc (giai đoạn nào bứt phá/giữ nhịp), 1 câu tình cảm, 1 câu lời khuyên chiến lược tháng. Tầm nhìn tháng, cấm viết nội dung của riêng một ngày.`,
  };
  return guide[period] || guide.today;
}

/** Port periodCacheKey — key cache theo ngày/tuần/tháng ISO. */
export function periodCacheKey(period: TuviPeriod): string {
  const now = new Date();
  if (period === "today")
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (period === "week") {
    const j = new Date(now.getFullYear(), 0, 1);
    const w = Math.ceil((((now.getTime() - j.getTime()) / 86400000) + j.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${w}`;
  }
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

/** Port periodLabel — nhãn badge cho từng kỳ. */
export function periodLabel(period: TuviPeriod, key: string): string {
  if (period === "today") {
    const p = key.split("-");
    return `${p[2]}/${p[1]}/${p[0]}`;
  }
  if (period === "week") return `Tuần ${key.split("-W")[1]}`;
  const p = key.split("-");
  return `Tháng ${p[1]}/${p[0]}`;
}

/* ------------------------------------------------------------------ */
/* TUVI_TOPICS — port 1:1 id + label + prompt từ app cũ                */
/* ------------------------------------------------------------------ */

export interface TuviTopicSub {
  id: string;
  label: string;
  prompt: string;
}

export interface TuviTopic {
  id: string;
  icon: string;
  title: string;
  desc: string;
  subs: TuviTopicSub[];
}

export const TUVI_TOPICS: TuviTopic[] = [
  {
    id: "tim-hieu-ban-than",
    icon: "☾",
    title: "Tìm hiểu bản thân",
    desc: "Các vì sao mô tả những khía cạnh chân thật nhất về bạn.",
    subs: [
      {
        id: "tinh-cach",
        label: "Tính cách & khuynh hướng",
        prompt:
          "Phân tích tính cách và khuynh hướng chính dựa trên cung Mệnh và các sao chính. Chia đoạn có tiêu đề in đậm: **Điểm mạnh**, **Điểm cần lưu ý**, **Lời khuyên rèn luyện**. ~260-440 từ.",
      },
      {
        id: "thu-thach",
        label: "Thử thách cá tính, hành trình",
        prompt:
          "Phân tích những thử thách cá tính và hành trình trưởng thành dựa trên lá số (cung Tật Ách, các sao xung khắc nếu có). ~220-370 từ.",
      },
      {
        id: "yeu-to-tac-dong",
        label: "Yếu tố tác động cuộc đời",
        prompt:
          "Phân tích các yếu tố (Tuần/Triệt, sao đặc biệt nếu đọc được) tác động đến cuộc đời mệnh chủ. ~220-370 từ.",
      },
      {
        id: "no-nghiep",
        label: "Nợ nghiệp",
        prompt:
          "Phân tích khía cạnh 'nợ nghiệp' — bài học tinh thần xuyên suốt cuộc đời mà lá số gợi ý. Giữ giọng điệu nhẹ nhàng, không bi quan hoá. ~190-340 từ.",
      },
    ],
  },
  {
    id: "su-nghiep-tai-loc",
    icon: "⌂",
    title: "Sự nghiệp & tiền tài",
    desc: "Tổng quan tài phú, sự nghiệp cùng nhận định và lời khuyên.",
    subs: [
      { id: "tong-quan", label: "Tổng quan tài phú, sự nghiệp", prompt: "Tổng quan tài phú và sự nghiệp dựa trên cung Quan Lộc, Tài Bạch. ~240-420 từ." },
      {
        id: "con-nguoi-cong-viec",
        label: "Con người trong công việc",
        prompt: "Mô tả phong cách làm việc, cách mệnh chủ thể hiện trong môi trường công sở dựa trên lá số. ~220-370 từ.",
      },
      {
        id: "nganh-nghe",
        label: "Ngành nghề phù hợp",
        prompt:
          "Liệt kê 5-6 ngành nghề/vị trí cụ thể phù hợp, mỗi ngành kèm 1 câu lý do gắn với sao/cung cụ thể, dạng gạch đầu dòng.",
      },
      {
        id: "loi-khuyen-tc",
        label: "Lời khuyên tài chính & sự nghiệp",
        prompt: "Đưa ra 4-5 lời khuyên cụ thể, thực tế về tài chính và sự nghiệp dựa trên lá số, dạng gạch đầu dòng.",
      },
    ],
  },
  {
    id: "van-trinh-su-nghiep",
    icon: "↗",
    title: "Vận trình sự nghiệp",
    desc: "Phân tích hành trình và hướng đi phát triển sự nghiệp phù hợp.",
    subs: [
      {
        id: "van-trinh-cong-danh",
        label: "Vận trình công danh",
        prompt:
          "Phân tích hành trình công danh qua các giai đoạn tuổi tác (dựa trên đại vận nếu đọc được từ lá số, hoặc theo giai đoạn tuổi tổng quát). ~290-510 từ, có mốc thời gian rõ ràng.",
      },
    ],
  },
  {
    id: "hieu-ban-doi",
    icon: "♡",
    title: "Hiểu bạn đời, mối quan hệ",
    desc: "Bức tranh chi tiết về bạn đời, gia đình, tham vọng họ, mối quan hệ.",
    subs: [
      {
        id: "hieu-ban-doi-sub",
        label: "Hiểu bạn đời",
        prompt: "Phân tích cung Phu Thê để mô tả chân dung bạn đời tiềm năng — tính cách, điều họ coi trọng. ~240-410 từ.",
      },
      {
        id: "tac-dong-nguoi-ngoai",
        label: "Tác động người ngoài",
        prompt:
          "Phân tích cách các mối quan hệ bên ngoài (gia đình, bạn bè) ảnh hưởng đến đường tình duyên dựa trên lá số. ~200-340 từ.",
      },
      {
        id: "hai-nguoi",
        label: "Hai người — động lực mối quan hệ",
        prompt: "Phân tích động lực chung khi ở trong một mối quan hệ — điểm mạnh và điểm cần dung hoà. ~220-370 từ.",
      },
    ],
  },
  {
    id: "tinh-duyen-hon-nhan",
    icon: "❤",
    title: "Tình duyên & hôn nhân",
    desc: "Xu hướng tình cảm, mối quan hệ, hôn nhân và con cái.",
    subs: [
      { id: "ban-trong-tinh-yeu", label: "Bạn trong tình yêu", prompt: "Mô tả cách mệnh chủ thể hiện và trải nghiệm tình yêu dựa trên cung Phu Thê. ~220-370 từ." },
      { id: "ai-thu-hut", label: "Ai bị thu hút bởi bạn?", prompt: "Mô tả kiểu người thường bị thu hút bởi mệnh chủ, dựa trên cung Mệnh. ~190-310 từ." },
      {
        id: "kieu-nguoi-gap",
        label: "Những kiểu người thường gặp trong tình yêu",
        prompt: "Mô tả các kiểu đối tượng mệnh chủ thường gặp trong đường tình duyên. ~190-310 từ.",
      },
      {
        id: "ca-tinh-phu-hop",
        label: "Cá tính, chính tinh phù hợp",
        prompt: "Gợi ý kiểu cá tính bạn đời phù hợp để bổ trợ cho mệnh chủ. ~190-310 từ.",
      },
      {
        id: "tong-quan-ban-doi",
        label: "Tổng quan bạn đời",
        prompt: "Tổng hợp tổng quan về bạn đời tiềm năng — 3-4 điểm chính, dạng gạch đầu dòng.",
      },
      {
        id: "nhan-dinh-hon-nhan",
        label: "Nhận định hôn nhân",
        prompt: "Nhận định tổng thể về hôn nhân — thời điểm thuận lợi, điều cần chuẩn bị. ~220-370 từ.",
      },
      { id: "tinh-cach-con-cai", label: "Tính cách con cái", prompt: "Phân tích cung Tử Tức để mô tả tính cách con cái tiềm năng. ~190-310 từ." },
    ],
  },
  {
    id: "vi-sao-toi-la-toi",
    icon: "✦",
    title: "Vì sao tôi lại là tôi",
    desc: "Sứ mệnh cuộc đời và hướng đi phù hợp nhất với tiềm năng của bạn.",
    subs: [
      {
        id: "su-menh",
        label: "Vì sao tôi lại là tôi",
        prompt:
          "Viết một đoạn suy ngẫm sâu sắc, mang tính triết lý về 'sứ mệnh' và bản chất cốt lõi của mệnh chủ dựa trên cách cục Mệnh trong lá số. ~290-510 từ, giọng văn giàu cảm xúc nhưng vẫn bám sát dữ liệu.",
      },
    ],
  },
  {
    id: "hoc-hanh-thi-cu",
    icon: "✎",
    title: "Học hành, thi cử 2026",
    desc: "Khả năng học tập, thi cử và định hướng phát triển kiến thức năm 2026.",
    subs: [
      {
        id: "hoc-hanh-2026",
        label: "Học hành, thi cử 2026",
        prompt:
          "Phân tích khả năng học tập, thi cử trong năm 2026 dựa trên tiểu vận năm nay (nếu tính được) và cung Phụ Mẫu/Quan Lộc. ~260-440 từ.",
      },
    ],
  },
  {
    id: "doi-cong-viec-2026",
    icon: "⇄",
    title: "Có nên thay đổi công việc năm 2026?",
    desc: "Tiềm năng chuyển việc năm 2026 — thay đổi hay giữ nguyên?",
    subs: [
      {
        id: "doi-viec-2026",
        label: "Có nên thay đổi công việc năm 2026?",
        prompt:
          "Phân tích tiềm năng chuyển việc trong năm 2026 dựa trên tiểu vận và cung Quan Lộc. Kết luận rõ xu hướng nên cân nhắc thay đổi hay giữ ổn định, kèm lý do. ~260-440 từ.",
      },
    ],
  },
  {
    id: "tieu-van-2026",
    icon: "↻",
    title: "Tiểu vận 2026",
    desc: "Sự nghiệp, tiền tài, tình duyên và vận hạn năm 2026.",
    subs: [
      { id: "tong-quan-2026", label: "Tổng quan 2026", prompt: "Tổng quan vận trình năm 2026 (tiểu vận) — 1 đoạn ngắn khái quát toàn bộ năm. ~190-310 từ." },
      { id: "sunghiep-2026", label: "Sự nghiệp 2026", prompt: "Vận sự nghiệp năm 2026 dựa trên tiểu vận. ~190-310 từ." },
      { id: "tienbac-2026", label: "Tiền bạc 2026", prompt: "Vận tài chính năm 2026 dựa trên tiểu vận. ~190-310 từ." },
      { id: "tinhcam-2026", label: "Tình cảm 2026", prompt: "Vận tình cảm năm 2026 dựa trên tiểu vận. ~190-310 từ." },
      {
        id: "vanhan-2026",
        label: "Vận hạn 2026",
        prompt: "Những điều cần lưu ý, phòng tránh trong năm 2026 dựa trên tiểu vận, dạng gạch đầu dòng 3-4 ý.",
      },
    ],
  },
  {
    id: "cau-hoi-xuat-ngoai",
    icon: "✈",
    title: "Câu hỏi xuất ngoại",
    desc: "Thời điểm, cơ hội ra nước ngoài. Nên đi hay ở lại?",
    subs: [
      { id: "danh-gia-co-hoi", label: "Đánh giá cơ hội xa xứ", prompt: "Đánh giá tiềm năng và cơ hội đi xa/xuất ngoại dựa trên cung Thiên Di. ~220-370 từ." },
      {
        id: "co-nen-di-xa",
        label: "Bạn có nên đi xa phát triển",
        prompt: "Kết luận rõ xu hướng nên đi xa phát triển hay ở lại, kèm lý do gắn với cung Thiên Di. ~190-310 từ.",
      },
      {
        id: "nam-co-loi",
        label: "Năm có lợi cho di chuyển",
        prompt: "Gợi ý giai đoạn/năm thuận lợi cho việc di chuyển, đi xa dựa trên tiểu vận. ~160-270 từ.",
      },
    ],
  },
  {
    id: "cau-hoi-tien-tai",
    icon: "◆",
    title: "Câu hỏi tiền tài",
    desc: "Tiềm năng giàu có. Cơ hội làm chủ, thừa kế. Xu hướng bất động sản.",
    subs: [
      { id: "tiem-nang-giau", label: "Tiềm năng giàu có", prompt: "Đánh giá tiềm năng tài phú dựa trên cung Tài Bạch. ~220-370 từ." },
      { id: "hop-lam-chu", label: "Bạn có hợp làm chủ?", prompt: "Đánh giá mức độ phù hợp với việc tự kinh doanh/làm chủ dựa trên lá số. ~190-310 từ." },
      {
        id: "co-thua-huong",
        label: "Bạn có được thừa hưởng",
        prompt: "Đánh giá khả năng thừa hưởng tài sản/hỗ trợ từ gia đình dựa trên cung Phụ Mẫu, Điền Trạch. ~170-270 từ.",
      },
      { id: "hop-bds", label: "Bạn có hợp làm về bất động sản?", prompt: "Đánh giá mức độ phù hợp với lĩnh vực bất động sản dựa trên cung Điền Trạch. ~170-270 từ." },
      {
        id: "xu-huong-nha",
        label: "Xu hướng nhà cửa",
        prompt: "Phân tích xu hướng sở hữu nhà cửa, tài sản cố định dựa trên cung Điền Trạch. ~170-270 từ.",
      },
    ],
  },
  {
    id: "cau-hoi-su-nghiep",
    icon: "⚒",
    title: "Câu hỏi sự nghiệp",
    desc: "Môi trường, tổ chức phù hợp. Yếu tố bứt phá sự nghiệp.",
    subs: [
      {
        id: "moi-truong-phu-hop",
        label: "Môi trường phù hợp",
        prompt: "Mô tả kiểu môi trường làm việc phù hợp nhất (quy mô công ty, văn hoá, nhịp độ) dựa trên lá số. ~190-310 từ.",
      },
      {
        id: "hop-to-chuc",
        label: "Bạn có hợp tổ chức truyền thống",
        prompt: "Đánh giá mức độ phù hợp với tổ chức truyền thống, quy củ so với môi trường tự do, khởi nghiệp. ~190-310 từ.",
      },
      {
        id: "don-bay",
        label: "Yếu tố đòn bẩy sự nghiệp",
        prompt: "Xác định 2-3 yếu tố có thể là đòn bẩy giúp bứt phá sự nghiệp dựa trên lá số, dạng gạch đầu dòng.",
      },
      {
        id: "nen-hoc-cao",
        label: "Bạn có nên học cao",
        prompt:
          "Đánh giá mức độ phù hợp/lợi ích của việc học lên cao (sau đại học, chứng chỉ chuyên sâu) dựa trên cung Phụ Mẫu, Quan Lộc. ~170-270 từ.",
      },
    ],
  },
  {
    id: "xu-huong-dai-van",
    icon: "⟳",
    title: "Xu hướng đại vận",
    desc: "Những bước ngoặt có thể xảy ra trong 10 năm tới.",
    subs: [
      {
        id: "dien-bien-40nam",
        label: "Diễn biến 40 năm",
        prompt:
          "Phác thảo diễn biến tổng quan cuộc đời qua các mốc tuổi lớn (dựa trên các đại vận đọc được từ lá số nếu có, hoặc theo giai đoạn tuổi tổng quát: 20s, 30s, 40s, 50s). ~290-510 từ.",
      },
      {
        id: "thien-thoi-dia-loi",
        label: "Thiên thời địa lợi",
        prompt: "Xác định giai đoạn/lĩnh vực mà mệnh chủ có lợi thế thiên thời địa lợi nhất trong 10 năm tới. ~190-310 từ.",
      },
      {
        id: "bieu-do-10nam",
        label: "Biểu đồ 10 năm tới",
        prompt:
          "Tóm tắt trọng tâm từng năm trong 10 năm tới ở dạng gạch đầu dòng ngắn gọn (mỗi năm 1 dòng, có thể nhóm theo giai đoạn nếu không đủ dữ liệu chi tiết từng năm).",
      },
    ],
  },
];
