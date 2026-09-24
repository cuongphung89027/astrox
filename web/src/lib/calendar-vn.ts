import { SearchMoonPhase, Seasons, SunPosition } from "astronomy-engine";
export type LunarDate = {
  day: number;
  month: number;
  year: number;
  leap: boolean;
};
const DAY = 86400000,
  OFFSET = 7 * 3600000;
export const CALENDAR_VERSION = "vn-utc7-astronomy-v1";
export const MIN_YEAR = 1976,
  MAX_YEAR = 2100;
const ordinal = (d: Date) => Math.floor((d.getTime() + OFFSET) / DAY);
const iso = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
function moonAfter(date: Date) {
  const moon = SearchMoonPhase(0, date, 35);
  if (!moon) throw new Error("Chưa tính được lịch cho ngày này.");
  return moon.date;
}
function month11(year: number) {
  let moon = moonAfter(new Date(Date.UTC(year, 10, 1)));
  const winter = ordinal(Seasons(year).dec_solstice.date);
  for (;;) {
    const next = moonAfter(new Date(moon.getTime() + DAY));
    if (ordinal(next) > winter) return moon;
    moon = next;
  }
}
type Month = {
  start: number;
  end: number;
  month: number;
  year: number;
  leap: boolean;
};
const cache = new Map<number, Month[]>();
function cycle(year: number): Month[] {
  const saved = cache.get(year);
  if (saved) return saved;
  const first = month11(year),
    end = ordinal(month11(year + 1));
  const starts = [ordinal(first)];
  let moon = first;
  while (starts.at(-1)! < end) {
    moon = moonAfter(new Date(moon.getTime() + DAY));
    starts.push(ordinal(moon));
  }
  const count = starts.length - 1;
  const sector = (day: number) =>
    Math.floor(SunPosition(new Date(day * DAY - OFFSET)).elon / 30);
  let leapIndex = -1;
  if (count === 13) {
    for (let i = 1; i < count; i++)
      if (sector(starts[i]) === sector(starts[i + 1])) {
        leapIndex = i;
        break;
      }
    if (leapIndex < 0) throw new Error("Không xác định được tháng nhuận.");
  }
  const months: Month[] = [];
  let m = 11;
  for (let i = 0; i < count; i++) {
    if (i > 0 && i !== leapIndex) m = (m % 12) + 1;
    months.push({
      start: starts[i],
      end: starts[i + 1],
      month: m,
      year: m >= 11 ? year : year + 1,
      leap: i === leapIndex,
    });
  }
  cache.set(year, months);
  return months;
}
export function civilDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Ngày không hợp lệ.");
  const stamp = Date.parse(value + "T00:00:00Z"),
    year = Number(value.slice(0, 4));
  if (
    !Number.isFinite(stamp) ||
    iso(stamp / DAY) !== value ||
    year < MIN_YEAR ||
    year > MAX_YEAR
  )
    throw new Error(`Chọn ngày hợp lệ trong ${MIN_YEAR}–${MAX_YEAR}.`);
  return stamp / DAY;
}
export function solarToLunar(value: string): LunarDate {
  const day = civilDay(value),
    year = Number(value.slice(0, 4));
  const m = [...cycle(year - 1), ...cycle(year)].find(
    (m) => day >= m.start && day < m.end,
  );
  if (!m) throw new Error("Không tìm thấy ngày âm.");
  return { day: day - m.start + 1, month: m.month, year: m.year, leap: m.leap };
}
export function lunarToSolar(input: LunarDate) {
  const { year, month, day, leap } = input;
  if (
    ![year, month, day].every(Number.isInteger) ||
    year < MIN_YEAR - 1 ||
    year > MAX_YEAR ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 30 ||
    typeof leap !== "boolean"
  )
    throw new Error("Ngày âm không hợp lệ.");
  const m = [...cycle(year - 1), ...cycle(year)].find(
    (m) => m.year === year && m.month === month && m.leap === leap,
  );
  if (!m || day > m.end - m.start)
    throw new Error("Ngày hoặc tháng nhuận này không tồn tại.");
  const result = iso(m.start + day - 1);
  civilDay(result);
  return result;
}
export function vietnamToday(now = new Date()) {
  return iso(ordinal(now));
}
export function lunarLabel(l: LunarDate) {
  return `${l.day}/${l.month}${l.leap ? " nhuận" : ""}/${l.year}`;
}
const STEMS = [
    "Giáp",
    "Ất",
    "Bính",
    "Đinh",
    "Mậu",
    "Kỷ",
    "Canh",
    "Tân",
    "Nhâm",
    "Quý",
  ],
  BRANCHES = [
    "Tý",
    "Sửu",
    "Dần",
    "Mão",
    "Thìn",
    "Tỵ",
    "Ngọ",
    "Mùi",
    "Thân",
    "Dậu",
    "Tuất",
    "Hợi",
  ];
export function yearName(year: number) {
  return `${STEMS[(((year - 4) % 10) + 10) % 10]} ${BRANCHES[(((year - 4) % 12) + 12) % 12]}`;
}
export function festival(l: LunarDate) {
  if (l.leap) return "";
  return (
    (
      {
        "1/1": "Tết Nguyên đán",
        "15/1": "Rằm tháng Giêng",
        "10/3": "Giỗ Tổ Hùng Vương",
        "5/5": "Tết Đoan ngọ",
        "15/7": "Lễ Vu Lan",
        "15/8": "Tết Trung thu",
        "23/12": "Ông Công, ông Táo",
      } as Record<string, string>
    )[`${l.day}/${l.month}`] ||
    (l.day === 1 ? "Mùng một" : l.day === 15 ? "Ngày rằm" : "")
  );
}
export type FamilyEvent = {
  id: string;
  title: string;
  day: number;
  month: number;
  leap: boolean;
};
export function nextOccurrence(event: FamilyEvent, from: string) {
  const start = civilDay(from),
    y = Number(from.slice(0, 4));
  for (let year = y - 1; year <= Math.min(y + 20, MAX_YEAR); year++) {
    try {
      const date = lunarToSolar({ ...event, year });
      if (civilDay(date) >= start) return date;
    } catch {}
  }
  return null;
}
export function eventIcs(title: string, date: string) {
  civilDay(date);
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");
  const end = iso(civilDay(date) + 1).replaceAll("-", "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AstroX//Lich am//VI",
    "BEGIN:VEVENT",
    `UID:${date}-${encodeURIComponent(title)}@theastrox.space`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(title)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
