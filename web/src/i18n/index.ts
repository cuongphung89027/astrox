/**
 * Locale helper factory shared by the LocaleProvider and tests. Pure: no React,
 * no browser APIs, safe in Workers and node:test. The locale enum itself comes
 * from the shared contract in services/admin/markets.ts.
 */
import { vi } from './vi.ts';
import { en } from './en.ts';
import { isLocale, type Locale } from '../../../services/admin/markets.ts';

export type I18n = {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Plural form: English picks `_one` only for count 1; Vietnamese always uses `_other` (CLDR). */
  tn: (key: string, count: number, params?: Record<string, string | number>) => string;
  formatDate: (d: Date) => string;
  formatNumber: (n: number) => string;
};

const DICTS: Record<Locale, Record<string, string>> = { vi, en };

function interpolate(tpl: string, params?: Record<string, string | number>): string {
  if (!params) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export function createT(locale: Locale): I18n {
  if (!isLocale(locale)) throw new TypeError(`unsupported locale: ${String(locale)}`);
  const dict = DICTS[locale];
  return {
    locale,
    t: (key, params) => interpolate(dict[key] ?? key, params),
    tn: (key, count, params) => {
      const form = locale === 'en' && count === 1 ? '_one' : '_other';
      const full = dict[`${key}${form}`] ?? dict[key] ?? key;
      return interpolate(full, { count, ...params });
    },
    formatDate: d =>
      locale === 'vi'
        ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    formatNumber: n => n.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'),
  };
}
