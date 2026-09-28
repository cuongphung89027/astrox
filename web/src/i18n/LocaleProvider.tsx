'use client';

/**
 * Locale context fed statically by each root layout ((vi)/layout.tsx = "vi",
 * en/layout.tsx = "en"). Locale is a property of the rendered tree, never of
 * the user agent, and never changes after hydration.
 */
import { createContext, useContext, useMemo } from 'react';
import { createT, type I18n } from './index.ts';
import { isLocale, type Locale } from '../../../services/admin/markets.ts';

const LocaleCtx = createContext<I18n | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => createT(isLocale(locale) ? locale : 'vi'), [locale]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

/** Locale helper for the current tree; falls back to Vietnamese outside a localized tree. */
export function useLocale(): I18n {
  const ctx = useContext(LocaleCtx);
  return ctx ?? viFallback;
}

const viFallback = createT('vi');
