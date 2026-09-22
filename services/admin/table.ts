export type DataRow = Record<string, unknown>;
export const cellText = (value: unknown): string => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
export function selectRows(rows: DataRow[], options: {query?: string; status?: string; sortKey?: string; direction?: 'asc' | 'desc'} = {}): DataRow[] {
  const query = searchable(options.query?.trim() || '');
  const selected = rows.filter(row => (!options.status || cellText(row.status) === options.status) && (!query || searchable(Object.values(row).map(cellText).join(' ')).includes(query)));
  if (!options.sortKey) return selected;
  const key = options.sortKey, sign = options.direction === 'desc' ? -1 : 1;
  return selected.sort((a, b) => sign * (typeof a[key] === 'number' && typeof b[key] === 'number' ? (a[key] as number) - (b[key] as number) : cellText(a[key]).localeCompare(cellText(b[key]), 'vi', {numeric: true})));
}
export function pageRows(rows: DataRow[], requestedPage = 1, requestedSize = 20) {
  const size = Math.max(1, Math.min(100, Math.trunc(requestedSize) || 20));
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.max(1, Math.min(pages, Math.trunc(requestedPage) || 1));
  const offset = (page - 1) * size;
  return {rows: rows.slice(offset, offset + size), page, pages, total: rows.length, start: rows.length ? offset + 1 : 0, end: Math.min(rows.length, offset + size)};
}
export function rowsCsv(rows: DataRow[], labels: Record<string, string> = {}) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const escape = (value: unknown) => {
    let text = cellText(value);
    if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [keys.map(k => escape(labels[k] || k)).join(','), ...rows.map(row => keys.map(k => escape(row[k])).join(','))].join('\r\n');
}
