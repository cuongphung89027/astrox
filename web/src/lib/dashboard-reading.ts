import { readVisualReading } from '../../../services/admin/visual-reading';
import type { dayFacts } from './almanac';
import { getDayGuideByName, formatDaySummary } from './day-guide';
import { readingPlainText } from './reading-text';

export function dashboardReadingPreview(text: string): string {
  return readVisualReading(text)?.report.summary ?? readingPlainText(text).replace(/\s+/g, ' ').trim();
}
/** Qualitative guidance states exactly which calendar facts it uses; no personal scores. */
export function almanacInsights(facts: ReturnType<typeof dayFacts>, locale: 'vi' | 'en') {
  const en = locale === 'en',
    guide = getDayGuideByName(facts.god);
  const summary = formatDaySummary(guide, locale);
  const taboo = facts.taboos.length > 0;
  return [
    {
      id: 'pace',
      title: taboo
        ? en
          ? 'Keep major plans flexible'
          : 'Giữ kế hoạch lớn linh hoạt'
        : facts.good
          ? en
            ? 'Make room for progress'
            : 'Tạo khoảng trống để tiến bước'
          : en
            ? 'Focus on steady routines'
            : 'Ưu tiên nhịp làm việc ổn định',
      body: taboo
        ? en
          ? 'Prioritize ongoing tasks; this lunar date is traditionally avoided for major new commitments.'
          : 'Ngày kiêng khởi sự lớn theo lịch dân gian; ưu tiên hoàn tất việc đang làm.'
        : summary.suitable || (en ? 'Plan one manageable task.' : 'Chọn một việc vừa sức để hoàn thành.'),
      basis: `${facts.god} · ${taboo ? facts.taboos.join(' · ') : facts.good ? (en ? 'Auspicious day' : 'Ngày hoàng đạo') : en ? 'Inauspicious day' : 'Ngày hắc đạo'}`,
    },
    {
      id: 'care',
      title: en ? 'A point to keep in mind' : 'Một điều nên lưu ý',
      body:
        (summary.avoid
          ? `${en ? 'Traditional caution: ' : 'Theo lịch dân gian, nên thận trọng với: '}${summary.avoid}`
          : '') || (en ? 'Leave room to check the details.' : 'Dành thời gian kiểm tra các chi tiết.'),
      basis: `${en ? 'Lunar date' : 'Ngày âm'} ${facts.lunar.day}/${facts.lunar.month} · ${facts.god}`,
    },
  ];
}

/** Only current or later windows on the actual Vietnamese reference date. */
export function nextReferenceHour(hours: ReturnType<typeof dayFacts>['hours'], now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const number = (key: string) => Number(parts.find(p => p.type === key)!.value);
  const minute = number('hour') * 60 + number('minute');
  const windows = hours
    .flatMap((hour, i) =>
      hour.good
        ? (i === 0
            ? [
                [0, 60],
                [23 * 60, 24 * 60],
              ]
            : [[(i * 2 - 1) * 60, (i * 2 + 1) * 60]]
          ).map(([start, end]) => ({ hour, start, end }))
        : [],
    )
    .sort((a, b) => a.start - b.start);
  const next = windows.find(w => w.end > minute);
  const format = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:00`;
  return next ? { ...next.hour, range: `${format(next.start)}–${format(next.end)}` } : null;
}
