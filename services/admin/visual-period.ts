import type { PromptNode } from './prompt-engine';

export type PeriodSnapshot = {
  kind: 'today' | 'week' | 'month' | 'year';
  asOf: string;
  start: string;
  end: string;
  label: string;
  samples: { date: string; offsetDays: number; factId: string }[];
};
export const periodDate = (now = Date.now()) => new Date(now + 7 * 3600000).toISOString().slice(0, 10);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const plus = (date: string, days: number) => iso(new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000));
function find(node: PromptNode, id: string, depth = 0): PromptNode | undefined {
  if (!node || depth > 12 || !Array.isArray(node.values)) return;
  if (node.id === id) return node;
  for (const value of node.values)
    if (value && typeof value === 'object') {
      const result = find(value as PromptNode, id, depth + 1);
      if (result) return result;
    }
}
export function calculationDate(original: PromptNode, module: string, serviceId: string, now = Date.now()) {
  const kind = serviceId.split('--').at(-1);
  const id =
    module === 'tuvi'
      ? `tuvi.tuviPeriodPromptText.${{ today: 1, week: 2, month: 3 }[kind as 'today' | 'week' | 'month']}`
      : module === 'zodiac'
        ? `zodiac.periodGuide.${kind}`
        : '';
  return find(original, id)?.calculatedAt ?? periodDate(now);
}
export function currentPeriodDate(asOf: unknown, serviceId: string, now = Date.now()) {
  if (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(asOf))) return false;
  const today = periodDate(now),
    kind = serviceId.split('--').at(-1);
  if (Math.abs(Date.parse(asOf) - Date.parse(today)) <= 86400000) return true;
  if (asOf > today) return false;
  if (kind === 'month') return asOf.slice(0, 7) === today.slice(0, 7);
  if (kind === 'personal-year') return asOf.slice(0, 4) === today.slice(0, 4);
  if (kind === 'week') return asOf >= plus(today, -((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7));
  return false;
}
export function periodEvidence(original: PromptNode, module: string, serviceId: string, asOf: string, en: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || iso(new Date(asOf + 'T00:00:00Z')) !== asOf) throw Error('invalid_period');
  const kind = (
    serviceId.endsWith('--personal-year') ? 'year' : serviceId.split('--').at(-1)
  ) as PeriodSnapshot['kind'];
  if (!['today', 'week', 'month', 'year'].includes(kind)) throw Error('invalid_period');
  const copy = (vi: string, us: string) => (en ? us : vi);
  const anchor = new Date(asOf + 'T00:00:00Z');
  const start =
    kind === 'week'
      ? plus(asOf, -((anchor.getUTCDay() + 6) % 7))
      : kind === 'month'
        ? asOf.slice(0, 8) + '01'
        : kind === 'year'
          ? asOf.slice(0, 4) + '-01-01'
          : asOf;
  const end =
    kind === 'week'
      ? plus(start, 6)
      : kind === 'month'
        ? iso(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)))
        : kind === 'year'
          ? asOf.slice(0, 4) + '-12-31'
          : asOf;
  const fmt = (date: string) => (en ? date : date.split('-').reverse().join('/'));
  const period: PeriodSnapshot = {
    kind,
    asOf,
    start,
    end,
    label: kind === 'today' ? fmt(asOf) : fmt(start) + ' – ' + fmt(end),
    samples: [],
  };
  const evidence: { label: string; value: string; sourcePath: string; offsetDays?: number }[] = [];
  if (module === 'numerology') {
    const source = find(original, 'numerology.numerologyContextText.0');
    const chart = JSON.parse(String(source?.values[0] || 'null'));
    if (!chart || !Number.isFinite(chart.personalYear) || chart.now?.year !== anchor.getUTCFullYear())
      throw Error('invalid_period');
    evidence.push({
      label: copy('Năm cá nhân đang xem', 'Current Personal Year'),
      value: copy('Năm', 'Year') + ' ' + anchor.getUTCFullYear() + ': ' + chart.personalYear,
      sourcePath: 'personalYear',
      offsetDays: 0,
    });
    return { period, evidence };
  }
  const id =
    module === 'tuvi'
      ? `tuvi.tuviPeriodPromptText.${{ today: 1, week: 2, month: 3 }[kind as 'today' | 'week' | 'month']}`
      : module === 'zodiac'
        ? `zodiac.periodGuide.${kind}`
        : '';
  const source = find(original, id);
  const raw = source?.values[module === 'tuvi' ? 1 : 0];
  if (typeof raw !== 'string' || !raw.trim()) throw Error('missing_period_evidence');
  const lines = raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  if (kind === 'today') {
    evidence.push({
      label: copy('Dữ kiện kỳ đang xem', 'Evidence for this date'),
      value: raw.slice(0, 1800),
      sourcePath: id + '.values',
      offsetDays: 0,
    });
  } else {
    lines.forEach((line, index) => {
      const offset = /^(?:\+|(?:ngày|day)\s+\+)(\d+)/i.exec(line);
      const zero = /^(?:hôm nay|today|đầu tháng|start of month)/i.test(line);
      const offsetDays = offset ? Number(offset[1]) : zero ? 0 : undefined;
      if (offsetDays !== undefined && offsetDays <= 40) {
        evidence.push({
          label: copy('Mốc tính', 'Calculated sample') + ' ' + fmt(plus(asOf, offsetDays)),
          value: line.slice(0, 1800),
          sourcePath: id + '.values.' + index,
          offsetDays,
        });
      } else if (line.length > 45 && !/^(?:Một vài mốc|Sample daily)/i.test(line)) {
        evidence.push({
          label: copy('Bối cảnh lưu chuyển', 'Period context'),
          value: line.slice(0, 1800),
          sourcePath: id + '.values.' + index,
        });
      }
    });
  }
  if (!evidence.length) throw Error('missing_period_evidence');
  return { period, evidence: evidence.slice(0, 14) };
}
export function validPeriodSnapshot(value: unknown): value is PeriodSnapshot {
  if (!value || typeof value !== 'object') return false;
  const p = value as PeriodSnapshot;
  if (
    Object.keys(p).some(k => !['kind', 'asOf', 'start', 'end', 'label', 'samples'].includes(k)) ||
    !['today', 'week', 'month', 'year'].includes(p.kind) ||
    typeof p.label !== 'string' ||
    p.label.length > 100 ||
    !Array.isArray(p.samples) ||
    p.samples.length < 1 ||
    p.samples.length > 14
  )
    return false;
  for (const date of [p.asOf, p.start, p.end])
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))
      return false;
  if (p.start > p.asOf || p.end < p.asOf) return false;
  return p.samples.every(
    s =>
      s &&
      Object.keys(s).length === 3 &&
      typeof s.date === 'string' &&
      s.date === plus(p.asOf, s.offsetDays) &&
      Number.isSafeInteger(s.offsetDays) &&
      s.offsetDays >= 0 &&
      s.offsetDays <= 40 &&
      typeof s.factId === 'string',
  );
}
