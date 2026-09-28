/**
 * Client-side locale contract. Thin re-export of the shared admin contract so
 * web components never fork the route map; the single source stays
 * services/admin/markets.ts (see docs/plans/2026-09-28-english-us-implementation.md Task 02).
 */
export {
  LOCALES,
  MARKETS,
  isLocale,
  isMarket,
  resolveMarket,
  moduleRoute,
  visibleModules,
  resolveRoute,
  localeOfPath,
  crossLocalePath,
} from '../../../services/admin/markets.ts';
export type { Locale, Market, WalletUnit, RouteId, ResolvedRoute } from '../../../services/admin/markets.ts';
