import { SunPosition, SearchSunLongitude, MoonPhase } from "astronomy-engine";
import {
  civilDay,
  solarToLunar,
  lunarToSolar,
  yearName,
  festival,
  MIN_YEAR,
  MAX_YEAR,
} from "./calendar-vn.ts";
const DAY = 86400000;
const stems = [
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
];
const branches = [
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
const terms = [
  "Xuân phân",
  "Thanh minh",
  "Cốc vũ",
  "Lập hạ",
  "Tiểu mãn",
  "Mang chủng",
  "Hạ chí",
  "Tiểu thử",
  "Đại thử",
  "Lập thu",
  "Xử thử",
  "Bạch lộ",
  "Thu phân",
  "Hàn lộ",
  "Sương giáng",
  "Lập đông",
  "Tiểu tuyết",
  "Đại tuyết",
  "Đông chí",
  "Tiểu hàn",
  "Đại hàn",
  "Lập xuân",
  "Vũ thủy",
  "Kinh trập",
];
// Ho Ngoc Duc's public calendar: https://www.xemamlich.uhm.vn/JavaScript/amlich-hnd.js
const hourPatterns = [
  "110100101100",
  "001101001011",
  "110011010010",
  "101100110100",
  "001011001101",
  "010010110011",
];
const gods = [
  "Thanh Long",
  "Minh Đường",
  "Thiên Hình",
  "Chu Tước",
  "Kim Quỹ",
  "Thiên Đức",
  "Bạch Hổ",
  "Ngọc Đường",
  "Thiên Lao",
  "Huyền Vũ",
  "Tư Mệnh",
  "Câu Trần",
];
const goodGods = new Set([0, 1, 4, 5, 7, 10]);
const mod = (n: number, b: number) => ((n % b) + b) % b;
export const dateIso = (n: number) =>
  new Date(n * DAY).toISOString().slice(0, 10);
export function dateLabel(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
export function shiftMonth(date: string, delta: number) {
  civilDay(date);
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + delta, 1));
  if (target.getUTCFullYear() < MIN_YEAR || target.getUTCFullYear() > MAX_YEAR)
    return date;
  target.setUTCDate(
    Math.min(
      d,
      new Date(
        Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
      ).getUTCDate(),
    ),
  );
  return target.toISOString().slice(0, 10);
}
export function shiftDay(date: string, delta: number) {
  const out = dateIso(civilDay(date) + delta);
  try {
    civilDay(out);
    return out;
  } catch {
    return date;
  }
}
export function holidays(date: string) {
  const l = solarToLunar(date);
  const solar: Record<string, string> = {
    "01-01": "Tết Dương lịch",
    "03-08": "Quốc tế Phụ nữ",
    "04-30": "Ngày Thống nhất",
    "05-01": "Quốc tế Lao động",
    "06-01": "Quốc tế Thiếu nhi",
    "09-02": "Quốc khánh",
    "10-20": "Phụ nữ Việt Nam",
    "11-20": "Nhà giáo Việt Nam",
    "12-25": "Giáng sinh",
  };
  const out = [solar[date.slice(5)], festival(l)].filter(Boolean);
  if (!l.leap && l.month === 1 && [2, 3].includes(l.day))
    out.push(`Mùng ${l.day} Tết`);
  return out;
}
export function tradition(date: string) {
  const l = solarToLunar(date),
    jd = civilDay(date) + 2440588,
    branch = mod(jd + 1, 12),
    stem = mod(jd + 9, 10);
  // Twelve day deities, lunar month convention; leap month repeats its month.
  // Offsets independently agree with lunar-typescript's ZHI_TIAN_SHEN_OFFSET.
  const god = mod(branch - 2 * (l.month - 1), 12);
  const taboos = [
    ...([3, 7, 13, 18, 22, 27].includes(l.day) ? ["Tam nương"] : []),
    ...([5, 14, 23].includes(l.day) ? ["Nguyệt kỵ"] : []),
  ];
  return {
    lunar: l,
    dayName: `${stems[stem]} ${branches[branch]}`,
    monthName: `${stems[mod(l.year * 12 + l.month + 3, 10)]} ${branches[(l.month + 1) % 12]}`,
    yearName: yearName(l.year),
    branch,
    stem,
    god: gods[god],
    good: goodGods.has(god),
    taboos,
  };
}
export function dayFacts(date: string) {
  const t = tradition(date),
    start = new Date(date + "T00:00:00+07:00"),
    noon = new Date(date + "T12:00:00+07:00");
  const initial = Math.floor(SunPosition(start).elon / 15),
    atNoon = Math.floor(SunPosition(noon).elon / 15);
  const crossing = SearchSunLongitude(((initial + 1) % 24) * 15, start, 1);
  const termChange =
    crossing && crossing.date.getTime() < start.getTime() + DAY
      ? {
          name: terms[(initial + 1) % 24],
          time: crossing.date.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          }),
        }
      : null;
  const angle = MoonPhase(noon);
  const phase =
    angle < 22.5 || angle >= 337.5
      ? "Trăng non"
      : angle < 67.5
        ? "Trăng lưỡi liềm"
        : angle < 112.5
          ? "Thượng huyền"
          : angle < 157.5
            ? "Trăng khuyết đầu tháng"
            : angle < 202.5
              ? "Trăng tròn"
              : angle < 247.5
                ? "Trăng khuyết cuối tháng"
                : angle < 292.5
                  ? "Hạ huyền"
                  : "Trăng tàn";
  return {
    ...t,
    date,
    holidays: holidays(date),
    term: terms[atNoon],
    termChange,
    phase,
    illumination: Math.round((1 - Math.cos((angle * Math.PI) / 180)) * 50),
    hours: branches.map((branch, i) => ({
      branch,
      name: `${stems[(t.stem * 2 + i) % 10]} ${branch}`,
      good: hourPatterns[t.branch % 6][i] === "1",
      range:
        i === 0
          ? "00:00–01:00 · 23:00–24:00"
          : `${String(i * 2 - 1).padStart(2, "0")}:00–${String(i * 2 + 1).padStart(2, "0")}:00`,
    })),
  };
}
export type DayFilters = {
  good: boolean;
  avoidTaboo: boolean;
  weekend: boolean;
};
export function matchesFilters(date: string, f: DayFilters) {
  const t = tradition(date),
    w = new Date(date + "T12:00:00Z").getUTCDay();
  return (
    (!f.good || t.good) &&
    (!f.avoidTaboo || !t.taboos.length) &&
    (!f.weekend || w === 0 || w === 6)
  );
}
export type CalendarEvent = {
  id: string;
  title: string;
  day: number;
  month: number;
  calendar: "lunar" | "solar";
  leapPolicy: "regular" | "leap" | "both";
  reminderDays: number;
};
export function parseEvents(value: unknown): CalendarEvent[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .flatMap((e) => {
      if (
        !e ||
        typeof e.id !== "string" ||
        !e.id ||
        seen.has(e.id) ||
        typeof e.title !== "string" ||
        !e.title.trim() ||
        e.title.length > 80 ||
        !Number.isInteger(e.day) ||
        e.day < 1 ||
        e.day > 31 ||
        !Number.isInteger(e.month) ||
        e.month < 1 ||
        e.month > 12
      )
        return [];
      const calendar = e.calendar === "solar" ? "solar" : "lunar";
      if (calendar === "lunar" && e.day > 30) return [];
      if (
        calendar === "solar" &&
        e.day > new Date(Date.UTC(2000, e.month, 0)).getUTCDate()
      )
        return [];
      seen.add(e.id);
      return [
        {
          id: e.id,
          title: e.title.trim(),
          day: e.day,
          month: e.month,
          calendar,
          leapPolicy: ["regular", "leap", "both"].includes(e.leapPolicy)
            ? e.leapPolicy
            : e.leap
              ? "leap"
              : "regular",
          reminderDays: [0, 1, 3, 7].includes(e.reminderDays)
            ? e.reminderDays
            : 0,
        } as CalendarEvent,
      ];
    })
    .slice(0, 100);
}
export function occurrenceDates(
  e: CalendarEvent,
  from: string,
  count = 5,
): string[] {
  const start = civilDay(from),
    dates: string[] = [];
  const y = Number(from.slice(0, 4));
  for (let year = y - 1; year <= MAX_YEAR && dates.length < count; year++) {
    if (e.calendar === "solar") {
      const date = `${year}-${String(e.month).padStart(2, "0")}-${String(e.day).padStart(2, "0")}`;
      try {
        if (civilDay(date) >= start) dates.push(date);
      } catch {}
    } else
      for (const leap of e.leapPolicy === "both"
        ? [false, true]
        : [e.leapPolicy === "leap"]) {
        try {
          const date = lunarToSolar({ year, month: e.month, day: e.day, leap });
          if (civilDay(date) >= start) dates.push(date);
        } catch {}
      }
  }
  return [...new Set(dates)].sort().slice(0, count);
}
export function eventsOn(e: CalendarEvent, date: string) {
  const l = solarToLunar(date);
  return e.calendar === "solar"
    ? Number(date.slice(5, 7)) === e.month && Number(date.slice(8)) === e.day
    : l.day === e.day &&
        l.month === e.month &&
        (e.leapPolicy === "both" || l.leap === (e.leapPolicy === "leap"));
}
export function exportEvents(events: CalendarEvent[], from: string, count = 5) {
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AstroX//Lich am//VI",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events)
    for (const date of occurrenceDates(e, from, count)) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${encodeURIComponent(e.id)}-${date}@theastrox.space`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "")}`,
        `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${dateIso(civilDay(date) + 1).replaceAll("-", "")}`,
        `SUMMARY:${esc(e.title)}`,
      );
      if (e.reminderDays)
        lines.push(
          "BEGIN:VALARM",
          `TRIGGER:-P${e.reminderDays}D`,
          "ACTION:DISPLAY",
          `DESCRIPTION:${esc(e.title)}`,
          "END:VALARM",
        );
      lines.push("END:VEVENT");
    }
  lines.push("END:VCALENDAR", "");
  // RFC 5545 physical lines are at most 75 UTF-8 octets (never split a code point).
  return lines
    .map((line) => {
      const chunks: string[] = [];
      let part = "",
        bytes = 0;
      for (const char of line) {
        const n = new TextEncoder().encode(char).length;
        if (bytes + n > 75) {
          chunks.push(part);
          part = " ";
          bytes = 1;
        }
        part += char;
        bytes += n;
      }
      chunks.push(part);
      return chunks.join("\r\n");
    })
    .join("\r\n");
}
