import { managedPrompt } from "./managed-prompts";
/** Tropical geocentric positions from Astronomy Engine; Placidus houses. */
import { placidusCusps } from "./natal-houses";
import * as Astronomy from "astronomy-engine";
import { formatDob, HOUR_CHI_OPTIONS } from "./utils";
import type { Profile } from "./types";

/* ------------------------------------------------------------------ */
/* Dữ liệu 12 cung — port 1:1 ZODIAC_SIGNS                            */
/* ------------------------------------------------------------------ */

export interface ZodiacSign {
  id: string;
  name: string;
  en: string;
  symbol: string;
  /** [tháng, ngày] bắt đầu / kết thúc. */
  from: [number, number];
  to: [number, number];
  element: string;
  quality: string;
  ruler: string;
  traits: string;
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { id: "bach-duong", name: "Bạch Dương", en: "Aries", symbol: "♈", from: [3, 21], to: [4, 19], element: "Hoả", quality: "Khai triển", ruler: "Hoả Tinh (Mars)", traits: "quyết đoán, nhiệt huyết, tiên phong" },
  { id: "kim-nguu", name: "Kim Ngưu", en: "Taurus", symbol: "♉", from: [4, 20], to: [5, 20], element: "Thổ", quality: "Cố định", ruler: "Kim Tinh (Venus)", traits: "kiên định, thực tế, yêu cái đẹp" },
  { id: "song-tu", name: "Song Tử", en: "Gemini", symbol: "♊", from: [5, 21], to: [6, 20], element: "Khí", quality: "Biến đổi", ruler: "Thuỷ Tinh (Mercury)", traits: "linh hoạt, giao tiếp tốt, tò mò" },
  { id: "cu-giai", name: "Cự Giải", en: "Cancer", symbol: "♋", from: [6, 21], to: [7, 22], element: "Thuỷ", quality: "Khai triển", ruler: "Mặt Trăng (Moon)", traits: "nhạy cảm, giàu tình cảm, bảo vệ người thân" },
  { id: "su-tu", name: "Sư Tử", en: "Leo", symbol: "♌", from: [7, 23], to: [8, 22], element: "Hoả", quality: "Cố định", ruler: "Mặt Trời (Sun)", traits: "tự tin, hào phóng, thích toả sáng" },
  { id: "xu-nu", name: "Xử Nữ", en: "Virgo", symbol: "♍", from: [8, 23], to: [9, 22], element: "Thổ", quality: "Biến đổi", ruler: "Thuỷ Tinh (Mercury)", traits: "tỉ mỉ, cầu toàn, phân tích sắc bén" },
  { id: "thien-binh", name: "Thiên Bình", en: "Libra", symbol: "♎", from: [9, 23], to: [10, 22], element: "Khí", quality: "Khai triển", ruler: "Kim Tinh (Venus)", traits: "hài hoà, công bằng, yêu cái đẹp" },
  { id: "bo-cap", name: "Bọ Cạp", en: "Scorpio", symbol: "♏", from: [10, 23], to: [11, 21], element: "Thuỷ", quality: "Cố định", ruler: "Diêm Vương Tinh / Hoả Tinh", traits: "mãnh liệt, sâu sắc, kiên trì" },
  { id: "nhan-ma", name: "Nhân Mã", en: "Sagittarius", symbol: "♐", from: [11, 22], to: [12, 21], element: "Hoả", quality: "Biến đổi", ruler: "Mộc Tinh (Jupiter)", traits: "phóng khoáng, ham khám phá, lạc quan" },
  { id: "ma-ket", name: "Ma Kết", en: "Capricorn", symbol: "♑", from: [12, 22], to: [1, 19], element: "Thổ", quality: "Khai triển", ruler: "Thổ Tinh (Saturn)", traits: "kỷ luật, tham vọng, kiên nhẫn" },
  { id: "bao-binh", name: "Bảo Bình", en: "Aquarius", symbol: "♒", from: [1, 20], to: [2, 18], element: "Khí", quality: "Cố định", ruler: "Thiên Vương Tinh / Thổ Tinh", traits: "độc lập, sáng tạo, hướng đến cộng đồng" },
  { id: "song-ngu", name: "Song Ngư", en: "Pisces", symbol: "♓", from: [2, 19], to: [3, 20], element: "Thuỷ", quality: "Biến đổi", ruler: "Hải Vương Tinh / Mộc Tinh", traits: "giàu trí tưởng tượng, đồng cảm, mơ mộng" },
];

export function signDateRange(s: ZodiacSign): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(s.from[1])}/${pad(s.from[0])} – ${pad(s.to[1])}/${pad(s.to[0])}`;
}

/** Port 1:1 getZodiacSign — tính cung Mặt Trời từ ngày sinh YYYY-MM-DD. */
export function getZodiacSign(dobIso: string | undefined | null): ZodiacSign | null {
  if (!dobIso) return null;
  const p = dobIso.split("-");
  const m = parseInt(p[1], 10);
  const d = parseInt(p[2], 10);
  for (const s of ZODIAC_SIGNS) {
    const [fm, fd] = s.from;
    const [tm, td] = s.to;
    if (fm <= tm) {
      if ((m === fm && d >= fd) || (m === tm && d <= td) || (m > fm && m < tm)) return s;
    } else {
      if ((m === fm && d >= fd) || (m === tm && d <= td) || m > fm || m < tm) return s;
    }
  }
  return ZODIAC_SIGNS[0];
}

/** Chip tone theo nguyên tố: Hoả=son, Thổ=ngọc, Khí=chàm, Thuỷ=sen. */
export const ELEMENT_TONE: Record<string, "son" | "ngoc" | "cham" | "sen"> = {
  "Hoả": "son",
  "Thổ": "ngoc",
  "Khí": "cham",
  "Thuỷ": "sen",
};

/** Nguyên tố hợp / khắc — cùng quy tắc với bảng tương hợp (lửa hút khí, đất hút nước). */
export const ELEMENT_FRIEND: Record<string, string> = {
  "Hoả": "Khí",
  "Thổ": "Thuỷ",
  "Khí": "Hoả",
  "Thuỷ": "Thổ",
};

export const ELEMENT_CLASH: Record<string, string> = {
  "Hoả": "Thuỷ",
  "Thổ": "Khí",
  "Khí": "Thổ",
  "Thuỷ": "Hoả",
};

/* ------------------------------------------------------------------ */
/* Bản đồ sao — port 1:1 buildNatalChart (astronomy-engine)            */
/* ------------------------------------------------------------------ */

export interface ZodiacAt {
  index: number;
  name: string;
  symbol: string;
  degree: number;
}

export interface NatalPlanet {
  body: string;
  name: string;
  symbol: string;
  longitude: number;
  sign: ZodiacAt;
  /** Nhà chứa hành tinh (1–12) — tính từ các đỉnh nhà. */
  house: number;
}

export interface NatalHouse {
  number: number;
  longitude: number;
  sign: ZodiacAt;
}

export interface NatalAspect {
  a: string;
  b: string;
  aspect: string;
  angle: number;
}

export interface NatalChart {
  date: string;
  place: string;
  latitude: number;
  longitude: number;
  planets: NatalPlanet[];
  points: { ascendant: { name: string; longitude: number; sign: ZodiacAt }; midheaven: { name: string; longitude: number; sign: ZodiacAt } };
  houses: NatalHouse[];
  aspects: NatalAspect[];
  big3: { sun: NatalPlanet; moon: NatalPlanet; ascendant: { name: string; longitude: number; sign: ZodiacAt } };
}

const NATAL_BODIES: Array<[string, string, string]> = [
  ["Sun", "Mặt Trời", "☉"],
  ["Moon", "Mặt Trăng", "☽"],
  ["Mercury", "Thuỷ Tinh", "☿"],
  ["Venus", "Kim Tinh", "♀"],
  ["Mars", "Hoả Tinh", "♂"],
  ["Jupiter", "Mộc Tinh", "♃"],
  ["Saturn", "Thổ Tinh", "♄"],
  ["Uranus", "Thiên Vương", "♅"],
  ["Neptune", "Hải Vương", "♆"],
  ["Pluto", "Diêm Vương", "♇"],
];

const VN_COORDS: Record<string, [number, number]> = {
  "Hà Nội": [21.0285, 105.8542],
  "Sơn La": [21.328, 103.91],
  "TP. Hồ Chí Minh": [10.8231, 106.6297],
  "Đà Nẵng": [16.0544, 108.2022],
  "Hải Phòng": [20.8449, 106.6881],
  "Cần Thơ": [10.0452, 105.7469],
};

export function normDeg(v: number): number {
  return ((v % 360) + 360) % 360;
}

export function zodiacAt(deg: number): ZodiacAt {
  const i = Math.floor(normDeg(deg) / 30) % 12;
  const s = ZODIAC_SIGNS[i];
  return { index: i, name: s.name, symbol: s.symbol, degree: normDeg(deg) % 30 };
}

/** Giờ sinh v5 dạng "Tí (23:00–00:59)" → mid-hour của can giờ như app cũ. */
const CHI_MID_HOUR: Record<string, number> = {
  "Tí": 0, "Tý": 0,
  "Sửu": 2, "Dần": 4, "Mão": 6, "Thìn": 8, "Tỵ": 10,
  "Ngọ": 12, "Mùi": 14, "Thân": 16, "Dậu": 18, "Tuất": 20, "Hợi": 22,
};

function hourChiLabel(hourChi: string | undefined): string {
  if (!hourChi) return "";
  return hourChi.split(" (")[0].trim();
}

export function natalTime(profile: Pick<Profile, "dob" | "hourChi" | "birthTime">): Date {
  if (profile.birthTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(profile.birthTime)) return new Date(`${profile.dob}T${profile.birthTime}:00+07:00`);
  const label = hourChiLabel(profile.hourChi);
  const mid = CHI_MID_HOUR[label];
  const known = label.length > 0 && mid !== undefined && HOUR_CHI_OPTIONS.some((o) => o.startsWith(label));
  const hour = known ? mid : 12;
  return new Date(`${profile.dob}T${String(hour).padStart(2, "0")}:00:00+07:00`);
}

function localSidereal(date: Date, lon: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  return normDeg(280.46061837 + 360.98564736629 * (jd - 2451545) + lon + 0.000387933 * t * t - (t * t * t) / 38710000);
}

/** Kinh độ hoàng đạo (tropical) của một hành tinh — đúng công thức app cũ. */
function eclipticLongitude(body: string, date: Date, lat: number, lon: number): number {
  const bodyEnum = Astronomy.Body[body as keyof typeof Astronomy.Body];
  return Astronomy.Ecliptic(Astronomy.GeoVector(bodyEnum, date, true)).elon;
}

/** Nhà chứa một kinh độ cho trước — đếm số đỉnh nhà đã vượt (vòng tròn). */
export function houseOf(longitude: number, houses: NatalHouse[]): number {
  let house = 12;
  for (const h of houses) {
    const diff = normDeg(longitude - h.longitude);
    const next = houses[h.number % houses.length];
    if (diff < normDeg(next.longitude - h.longitude)) {
      house = h.number;
      break;
    }
  }
  return house;
}

export function buildNatalChart(profile: Pick<Profile, "dob" | "hourChi" | "place" | "birthTime"> | null): NatalChart | null {
  if (!profile?.dob) return null;
  const normalizedPlace = profile.place.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const coordinates = Object.entries(VN_COORDS).find(([name]) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalizedPlace)?.[1];
  if (!coordinates) return null;
  const [lat, lon] = coordinates;
  const date = natalTime(profile);

  const planets: NatalPlanet[] = NATAL_BODIES.map(([body, name, symbol]) => {
    const longitude = normDeg(eclipticLongitude(body, date, lat, lon));
    return { body, name, symbol, longitude, sign: zodiacAt(longitude), house: 0 };
  });

  const lst = normDeg(Astronomy.SiderealTime(date) * 15 + lon);
  const eps = Astronomy.e_tilt(Astronomy.MakeTime(date)).tobl;
  const cusps = placidusCusps(lst, lat, eps);
  const asc = cusps[0], mc = cusps[9];
  const houses: NatalHouse[] = cusps.map((longitude,i)=>({number:i+1,longitude,sign:zodiacAt(longitude)}));

  for (const p of planets) p.house = houseOf(p.longitude, houses);

  const points = {
    ascendant: { name: "Cung Mọc", longitude: asc, sign: zodiacAt(asc) },
    midheaven: { name: "Thiên Đỉnh (MC)", longitude: mc, sign: zodiacAt(mc) },
  };

  const aspects: NatalAspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = Math.abs(normDeg(planets[i].longitude - planets[j].longitude));
      const angle = Math.min(diff, 360 - diff);
      const candidates: Array<[number, string, number]> = [
        [0, "Trùng tụ", 8],
        [60, "Lục hợp", 5],
        [90, "Vuông", 6],
        [120, "Tam hợp", 6],
        [180, "Đối đỉnh", 8],
      ];
      const hit = candidates.find(([deg, , orb]) => Math.abs(angle - deg) <= orb);
      if (hit) aspects.push({ a: planets[i].name, b: planets[j].name, aspect: hit[1], angle: Math.round(angle * 10) / 10 });
    }
  }

  return {
    date: date.toISOString(),
    place: profile.place,
    latitude: lat,
    longitude: lon,
    planets,
    points,
    houses,
    aspects,
    big3: { sun: planets[0], moon: planets[1], ascendant: points.ascendant },
  };
}

/* ------------------------------------------------------------------ */
/* Horoscope theo kỳ — port periodCacheKey/periodSkyText/zodiacPrompt  */
/* ------------------------------------------------------------------ */

export type ZodiacPeriod = "today" | "week" | "month";

export const PERIOD_LABELS: Record<ZodiacPeriod, string> = { today: "hôm nay", week: "tuần này", month: "tháng này" };

export function periodCacheKey(period: ZodiacPeriod): string {
  const now = new Date();
  if (period === "today") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  if (period === "week") {
    const j = new Date(now.getFullYear(), 0, 1);
    const w = Math.ceil(((now.getTime() - j.getTime()) / 86400000 + j.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${w}`;
  }
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

export function periodLabel(period: ZodiacPeriod, key: string): string {
  if (period === "today") {
    const p = key.split("-");
    return `${p[2]}/${p[1]}/${p[0]}`;
  }
  if (period === "week") return `Tuần ${key.split("-W")[1]}`;
  const p = key.split("-");
  return `Tháng ${p[1]}/${p[0]}`;
}

const TRANSIT_FOCUS: Record<ZodiacPeriod, string[]> = {
  today: ["Mặt Trăng", "Thuỷ Tinh", "Kim Tinh", "Hoả Tinh", "Mặt Trời"],
  week: ["Mặt Trăng", "Thuỷ Tinh", "Kim Tinh", "Hoả Tinh", "Mặt Trời"],
  month: ["Mặt Trời", "Kim Tinh", "Hoả Tinh", "Mộc Tinh", "Thổ Tinh"],
};

function observerCoords(place: string | undefined): [number, number] {
  return (place && VN_COORDS[place]) || VN_COORDS["Hà Nội"];
}

interface TransitBody {
  name: string;
  symbol: string;
  longitude: number;
  sign: ZodiacAt;
}

export function transitChartFor(date: Date, place: string | undefined): TransitBody[] | null {
  try {
    const A = Astronomy;
    const at = new Date(date.getTime());
    const [lat, lon] = observerCoords(place);
    const moonLon = A.EclipticGeoMoon(at).lon;
    const out: TransitBody[] = [{ name: "Mặt Trăng", symbol: "☽", longitude: normDeg(moonLon), sign: zodiacAt(moonLon) }];
    const bodies: Array<[string, string, string]> = [
      ["Sun", "Mặt Trời", "☉"],
      ["Mercury", "Thuỷ Tinh", "☿"],
      ["Venus", "Kim Tinh", "♀"],
      ["Mars", "Hoả Tinh", "♂"],
      ["Jupiter", "Mộc Tinh", "♃"],
      ["Saturn", "Thổ Tinh", "♄"],
    ];
    for (const [body, name, symbol] of bodies) {
      const longitude = normDeg(eclipticLongitude(body, at, lat, lon));
      out.push({ name, symbol, longitude, sign: zodiacAt(longitude) });
    }
    return out;
  } catch {
    return null;
  }
}

export function moonPhaseInfo(date: Date, place: string | undefined): { age: number; illumination: number; phase: string } | null {
  try {
    const A = Astronomy;
    const at = new Date(date.getTime());
    const [lat, lon] = observerCoords(place);
    const moonLon = A.EclipticGeoMoon(at).lon;
    const sunLon = normDeg(eclipticLongitude("Sun", at, lat, lon));
    const elong = normDeg(moonLon - sunLon);
    const age = (elong / 360) * 29.53;
    const names: Array<[number, string]> = [
      [1.8, "Trăng non — khởi đầu, gieo ý tưởng"],
      [6.5, "Trăng lưỡi liềm — củng cố, bước đầu hành động"],
      [9.2, "Bán nguyệt đầu tháng — quyết định, vượt thử thách"],
      [12.9, "Trăng khuyết dần lên — điều chỉnh, mài giũa"],
      [16.6, "Trăng tròn — đỉnh điểm, kết quả và cảm xúc dâng cao"],
      [20.3, "Trăng khuyết sau rằm — biết ơn, chia sẻ thành quả"],
      [24.0, "Bán nguyệt cuối tháng — buông bỏ, nhìn lại"],
      [27.7, "Trăng tàn — nghỉ ngơi, chuẩn bị chu kỳ mới"],
      [29.6, "Trăng non — khởi đầu, gieo ý tưởng"],
    ];
    const phase = names.find(([limit]) => age < limit) || names[0];
    return {
      age: Math.round(age * 10) / 10,
      illumination: Math.round((1 - Math.cos((elong * Math.PI) / 180)) / 2 * 100),
      phase: phase[1],
    };
  } catch {
    return null;
  }
}

function transitAspects(transits: TransitBody[] | null, natalPlanets: NatalPlanet[], orb: number): Array<{ transit: string; natal: string; aspect: string; angle: number }> {
  const out: Array<{ transit: string; natal: string; aspect: string; angle: number }> = [];
  (transits || []).forEach((t) => {
    (natalPlanets || []).forEach((n) => {
      const diff = Math.abs(normDeg(t.longitude - n.longitude));
      const angle = Math.min(diff, 360 - diff);
      const hit: Array<[number, string]> = [[0, "Trùng tụ"], [60, "Lục hợp"], [90, "Vuông"], [120, "Tam hợp"], [180, "Đối đỉnh"]];
      const found = hit.find(([deg]) => Math.abs(angle - deg) <= orb);
      if (found) out.push({ transit: t.name, natal: n.name, aspect: found[1], angle: Math.round(angle * 10) / 10 });
    });
  });
  return out;
}

const periodSkyCache: Record<string, string> = {};

/** Dữ liệu quá cảnh nạp vào prompt — port periodSkyText. */
export function periodSkyText(period: ZodiacPeriod, natalChart: NatalChart | null, place: string | undefined): string {
  const cacheKey = `${period}_${new Date().toISOString().slice(0, 10)}`;
  if (periodSkyCache[cacheKey]) return periodSkyCache[cacheKey];
  const now = new Date();
  const days = period === "today" ? [0] : period === "week" ? [0, 2, 4, 6] : [0, 7, 14, 21, 28];
  const lines: string[] = [];
  const ephemeris: Record<string, TransitBody[] | null> = {};
  const getTransits = (date: Date): TransitBody[] | null => {
    const k = date.toISOString().slice(0, 10);
    if (!(k in ephemeris)) ephemeris[k] = transitChartFor(date, place);
    return ephemeris[k];
  };
  days.forEach((d) => {
    const date = new Date(now.getTime() + d * 86400000);
    const label = d === 0 ? "hôm nay" : `+${d} ngày (${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")})`;
    const transits = getTransits(date);
    if (!transits) {
      lines.push(`${label}: chưa tính được vị trí hành tinh.`);
      return;
    }
    const focus = TRANSIT_FOCUS[period] || TRANSIT_FOCUS.today;
    const pos = transits
      .filter((t) => focus.includes(t.name))
      .map((t) => `${t.symbol} ${t.name} ở ${t.sign.name} ${t.sign.degree.toFixed(0)}°`)
      .join("; ");
    const moon = transits.find((t) => t.name === "Mặt Trăng");
    const phase = moonPhaseInfo(date, place);
    lines.push(
      `${label}: ${pos}. Mặt Trăng ở ${moon ? moon.sign.name : "—"}.${phase ? ` Pha Mặt Trăng: ${phase.phase} (tuổi ${phase.age} ngày, sáng ${phase.illumination}%).` : ""}`,
    );
  });
  const natalPlanets = natalChart?.planets || [];
  const allAspects: string[] = [];
  days.forEach((d) => {
    const date = new Date(now.getTime() + d * 86400000);
    const transits = (getTransits(date) || []).filter((t) => (TRANSIT_FOCUS[period] || []).includes(t.name));
    transitAspects(transits, natalPlanets, period === "today" ? 3 : 5).forEach((a) => {
      allAspects.push(`${d === 0 ? "hôm nay" : `+${d} ngày`}: ${a.transit} ${a.aspect} ${a.natal} natal (${a.angle}°)`);
    });
  });
  const uniq = [...new Set(allAspects)].slice(0, period === "today" ? 8 : 14);
  if (uniq.length) lines.push(`Các góc chiếu quá cảnh – natal đáng chú ý: ${uniq.join("; ")}.`);
  else if (natalPlanets.length) lines.push("Không có góc chiếu quá cảnh – natal chặt nào trong kỳ; diễn giải theo vị trí cung và pha Mặt Trăng.");
  return (periodSkyCache[cacheKey] = lines.join("\n"));
}

/* ------------------------------------------------------------------ */
/* Prompt body — port profileContextText/zodiacPromptBody              */
/* ------------------------------------------------------------------ */

export function profileContextText(profile: Profile | null): string {
  if (!profile) return "";
  const p = profile;
  return managedPrompt("zodiac.profileContextText.0", [p.name, p.gender, formatDob(p.dob), p.hourChi, p.place]);
}

export function natalContextText(natalChart: NatalChart | null): string {
  return natalChart
    ? managedPrompt("zodiac.natalContextText.0", [JSON.stringify(natalChart)])
    : "";
}

export function zodiacPromptBody(profile: Profile | null, natalChart: NatalChart | null, taskText: string): string {
  const natalLine = natalContextText(natalChart);
  return managedPrompt("zodiac.zodiacPromptBody.0", [profileContextText(profile), natalLine, taskText]);
}

/** Port zodiacPeriodPrompt — dự báo theo kỳ gắn quá cảnh thật. */
export function zodiacPeriodPrompt(
  sign: ZodiacSign,
  period: ZodiacPeriod,
  profile: Profile | null,
  natalChart: NatalChart | null,
): string {
  const sky = periodSkyText(period, natalChart, profile?.place);
  const base = zodiacPromptBody(
    profile,
    natalChart,
    managedPrompt("zodiac.zodiacPeriodPrompt.0", [sign.name, sign.en, sign.element, sign.ruler]),
  );
  const guide: Record<ZodiacPeriod, string> = {
    today: managedPrompt("zodiac.periodGuide.today", [sky]),
    week: managedPrompt("zodiac.periodGuide.week", [sky]),
    month: managedPrompt("zodiac.periodGuide.month", [sky]),
  };
  return managedPrompt("zodiac.zodiacPeriodPrompt.1", [base, guide[period] || guide.today]);
}

/* ------------------------------------------------------------------ */
/* Chủ đề luận giải sâu (dùng nhóm cache "zodiacTopics") — port các    */
/* prompt con tiêu biểu từ ZODIAC_TOPICS                               */
/* ------------------------------------------------------------------ */

export interface ZodiacDeepTopic {
  id: string;
  subId: string;
  label: string;
  prompt: string;
}

export const ZODIAC_DEEP_TOPICS: ZodiacDeepTopic[] = [
  {
    "id": "tong-quan-la-so",
    "subId": "bo-ba-loi",
    "label": "Tổng quan lá số · Bộ ba cốt lõi",
    "prompt": "Dựa trên dữ liệu đã tính, giải thích tổng quan Bộ ba cốt lõi (Mặt Trời, Mặt Trăng, Cung Mọc), điểm nổi bật và cách cân bằng năng lượng. ~260-440 từ."
  },
  {
    "id": "tong-quan-la-so",
    "subId": "diem-noi-bat",
    "label": "Tổng quan lá số · Điểm nổi bật",
    "prompt": "Chỉ ra 3-4 điểm nổi bật nhất trong lá số (hành tinh nổi bật, cung đặc biệt, góc chiếu mạnh) và ý nghĩa của chúng. Dạng gạch đầu dòng. ~220-370 từ."
  },
  {
    "id": "big-3",
    "subId": "mat-troi",
    "label": "Bộ ba cốt lõi · Mặt Trời",
    "prompt": "Phân tích Mặt Trời: cung, nhà, ý nghĩa với bản chất cốt lõi. ~220-370 từ."
  },
  {
    "id": "big-3",
    "subId": "mat-trang",
    "label": "Bộ ba cốt lõi · Mặt Trăng",
    "prompt": "Phân tích Mặt Trăng: cung, nhà, nhu cầu cảm xúc và cách phản ứng tự nhiên. ~220-370 từ."
  },
  {
    "id": "big-3",
    "subId": "cung-moc",
    "label": "Bộ ba cốt lõi · Cung Mọc",
    "prompt": "Phân tích Cung Mọc: ấn tượng đầu tiên, phong cách bề ngoài và cách tiếp cận cuộc sống. ~220-370 từ."
  },
  {
    "id": "big-3",
    "subId": "ket-hop",
    "label": "Bộ ba cốt lõi · Sắc thái chung",
    "prompt": "Tổng hợp cách ba lớp Mặt Trời - Mặt Trăng - Cung Mọc phối hợp và bổ trợ lẫn nhau. ~200-340 từ."
  },
  {
    "id": "hanh-tinh",
    "subId": "hanh-tinh-ca-nhan",
    "label": "Hành tinh · Hành tinh cá nhân",
    "prompt": "Phân tích Thuỷ, Kim, Hoả, Mộc, Thổ Tinh: cung, nhà và ý nghĩa. Mỗi hành tinh 1 đoạn ngắn. ~290-510 từ."
  },
  {
    "id": "hanh-tinh",
    "subId": "hanh-tinh-xa-xi",
    "label": "Hành tinh · Hành tinh xa xỉ",
    "prompt": "Phân tích Thiên Vương, Hải Vương, Diêm Vương: thế hệ và điểm cá biệt trong lá số. ~220-370 từ."
  },
  {
    "id": "12-nha",
    "subId": "nhac-trung-tam",
    "label": "12 nhà · Nhà trọng tâm",
    "prompt": "Phân tích nhà 1, 4, 7, 10: bản thân, gia đình, quan hệ, sự nghiệp. Mỗi nhà 1 đoạn. ~290-510 từ."
  },
  {
    "id": "12-nha",
    "subId": "nha-khac",
    "label": "12 nhà · Các nhà khác",
    "prompt": "Phân tích các nhà còn lại có hành tinh hoặc điểm đáng chú ý. ~240-420 từ."
  },
  {
    "id": "goc-chieu",
    "subId": "goc-thuan-loi",
    "label": "Góc chiếu · Góc thuận lợi",
    "prompt": "Phân tích các góc chiếu thuận (trùng tụ, lục hợp, tam hợp): nguồn sức mạnh và may mắn. ~240-420 từ."
  },
  {
    "id": "goc-chieu",
    "subId": "goc-thach-thuc",
    "label": "Góc chiếu · Góc thử thách",
    "prompt": "Phân tích các góc căng (vuông, đối đỉnh): điểm cần dung hoà và bài học. ~240-420 từ."
  },
  {
    "id": "tinh-cach-cung",
    "subId": "dac-diem-cot-loi",
    "label": "Tính cách theo cung · Đặc điểm cốt lõi",
    "prompt": "Phân tích tính cách chi tiết của cung {SIGN}, gắn với dữ liệu tính trực tiếp. ~260-440 từ."
  },
  {
    "id": "tinh-cach-cung",
    "subId": "diem-manh-yeu",
    "label": "Tính cách theo cung · Điểm mạnh & cần lưu ý",
    "prompt": "Về cung {SIGN}: 3 điểm mạnh và 3 điểm cần lưu ý, mỗi điểm 1-2 câu, dạng gạch đầu dòng."
  },
  {
    "id": "tinh-yeu-cung",
    "subId": "phong-cach-yeu",
    "label": "Tình yêu & quan hệ · Phong cách yêu",
    "prompt": "Phân tích phong cách yêu từ Kim Tinh, Hoả Tinh và nhà 5/7. ~240-420 từ."
  },
  {
    "id": "tinh-yeu-cung",
    "subId": "nhu-cau-cam-xuc",
    "label": "Tình yêu & quan hệ · Nhu cầu cảm xúc",
    "prompt": "Phân tích nhu cầu cảm xúc từ Mặt Trăng và nhà 7: điều bạn cần trong mối quan hệ bền lâu. ~220-370 từ."
  },
  {
    "id": "su-nghiep-cung",
    "subId": "huong-su-nghiep",
    "label": "Công việc & tài chính · Hướng sự nghiệp",
    "prompt": "Phân tích hướng nghề từ MC, nhà 6/10 và các hành tinh liên quan. ~260-440 từ."
  },
  {
    "id": "su-nghiep-cung",
    "subId": "tai-chinh",
    "label": "Công việc & tài chính · Tài chính",
    "prompt": "Phân tích thái độ và tiềm năng tài chính từ nhà 2, Kim Tinh, Mộc Tinh. ~220-370 từ."
  }
];

/* ------------------------------------------------------------------ */
/* Tương hợp — điểm tĩnh theo quy tắc nguyên tố của 12 cung            */
/* ------------------------------------------------------------------ */

export interface CompatAnalysis {
  percent: number;
  /** Nhãn quan hệ nguyên tố: "Hài hoà" | "Bổ trợ" | "Căng thẳng" | "Cần điều chỉnh". */
  relation: string;
  /** Mô tả quy tắc nguyên tố áp dụng. */
  elementNote: string;
  /** Khoảng góc giữa hai cung (0/30/60/90/120/150/180). */
  angle: number;
  /** Tên góc chiếu tương ứng (Trùng tụ, Lục hợp…). */
  aspectLabel: string;
}

/** Quan hệ giữa cặp nguyên tố — lửa hút khí, đất hút nước; lửa–nước, đất–khí khắc. */
const ELEMENT_ORDER = ["Hoả", "Thổ", "Khí", "Thuỷ"];
const ELEMENT_PAIR_NOTE: Record<string, { relation: string; note: string }> = {
  "Hoả|Hoả": { relation: "Hài hoà", note: "Hai cung cùng nguyên tố Hoả — cùng tần suất năng lượng, dễ thấu hiểu lửa của nhau." },
  "Thổ|Thổ": { relation: "Hài hoà", note: "Hai cung cùng nguyên tố Thổ — cùng nhịp thực tế, tin tưởng qua hành động." },
  "Khí|Khí": { relation: "Hài hoà", note: "Hai cung cùng nguyên tố Khí — đối thoại và ý tưởng không bao giờ cạn." },
  "Thuỷ|Thuỷ": { relation: "Hài hoà", note: "Hai cung cùng nguyên tố Thuỷ — cảm thông không cần nói thành lời." },
  "Hoả|Khí": { relation: "Bổ trợ", note: "Khí tiếp sức cho Hoả — cặp nguyên tố nuôi dưỡng nhau, hứng khởi và truyền cảm hứng." },
  "Thổ|Thuỷ": { relation: "Bổ trợ", note: "Thuỷ tạo hình cho Thổ — cặp nguyên tố bén rễ, cảm xúc và thực tế ôm lấy nhau." },
  "Hoả|Thổ": { relation: "Cần điều chỉnh", note: "Hoả và Thổ nhịp độ khác nhau — một bên muốn cháy, một bên muốn bền; cần tôn trọng nhịp của nhau." },
  "Khí|Thuỷ": { relation: "Cần điều chỉnh", note: "Thuỷ và Khí khác ngôn ngữ — lý trí và cảm xúc cần học cách phiên dịch cho nhau." },
  "Hoả|Thuỷ": { relation: "Căng thẳng", note: "Nước dập lửa, lửa làm cạn nước — hấp dẫn mãnh liệt nhưng dễ bỏng nếu thiếu kiềm chế." },
  "Thổ|Khí": { relation: "Căng thẳng", note: "Đất chắn gió, gió cuốn bụi — một bên vững, một bên tự do; ranh giới cần được thương lượng." },
};

const ASPECT_BY_ANGLE: Record<number, string> = {
  0: "Trùng tụ",
  30: "Bán lục hợp",
  60: "Lục hợp",
  90: "Vuông",
  120: "Tam hợp",
  150: "Hình 150°",
  180: "Đối đỉnh",
};

const PERCENT_BY_ANGLE: Record<number, number> = {
  0: 92,
  30: 64,
  60: 86,
  90: 58,
  120: 88,
  150: 62,
  180: 68,
};

/** Điểm tương hợp tĩnh — quy tắc nguyên tố + khoảng góc giữa hai cung. */
export function compatAnalysis(a: ZodiacSign, b: ZodiacSign): CompatAnalysis {
  const ai = ZODIAC_SIGNS.findIndex((s) => s.id === a.id);
  const bi = ZODIAC_SIGNS.findIndex((s) => s.id === b.id);
  const step = Math.abs(ai - bi);
  /** Khoảng góc thực giữa hai cung (độ): 0/30/60/90/120/150/180. */
  const angle = Math.min(step, 12 - step) * 30;

  // Khoá cặp nguyên tố sắp theo thứ tự chuẩn (không dùng Array.sort để tránh
  // phụ thuộc Unicode collation của chuỗi tiếng Việt có dấu).
  const pairKey = [a.element, b.element]
    .sort((x, y) => ELEMENT_ORDER.indexOf(x) - ELEMENT_ORDER.indexOf(y))
    .join("|");
  const pair = ELEMENT_PAIR_NOTE[pairKey] || { relation: "Trung tính", note: "Quan hệ nguyên tố trung tính." };

  // Điều chỉnh nhỏ theo tính chất (Khai triển / Cố định / Biến đổi):
  // hai cung cùng tính chất dễ tranh quyền quyết định nên trừ nhẹ.
  const qualityNudge = a.quality === b.quality ? -3 : 0;
  const percent = Math.max(45, Math.min(96, (PERCENT_BY_ANGLE[angle] ?? 70) + qualityNudge));

  return {
    percent,
    relation: pair.relation,
    elementNote: pair.note,
    angle,
    aspectLabel: ASPECT_BY_ANGLE[angle] || "—",
  };
}

/* ------------------------------------------------------------------ */
/* Prompt tương hợp — port cấu trúc JSON từ COMPATIBILITY cũ           */
/* ------------------------------------------------------------------ */

export function compatPrompt(a: ZodiacSign, b: ZodiacSign, analysis: CompatAnalysis, profile: Profile | null): string {
  return managedPrompt("zodiac.compatPrompt.0", [profile ? profile.name : "Người xem", a.name, a.en, a.element, a.quality, a.ruler, a.traits, b.name, b.en, b.element, b.quality, b.ruler, b.traits, analysis.angle, analysis.aspectLabel, analysis.relation, analysis.elementNote, analysis.percent, analysis.percent]);
}

/** Port extractJson — bóc JSON khỏi phản hồi AI. */
export function extractJson<T = Record<string, unknown>>(raw: string): T {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Không đọc được dữ liệu từ AstroX.");
  return JSON.parse(m[0]) as T;
}

export interface CompatAiResult {
  strengths: string[];
  watchouts: string[];
  advice: string;
}
