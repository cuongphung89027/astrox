/**
 * Locale/market contract for the English/US edition (plan §C):
 * `vi|en` locales, `VN|US` markets, closed allowlists only — never free-form
 * strings — and a fixed vi→en route map. Locale picks the reading language;
 * market (never locale, never IP) picks catalog, wallet unit and providers.
 * The Vietnamese module registry, service IDs and legacy aliases stay untouched.
 */
import { MODULES, type ModuleDef, type ModuleId } from './modules.ts';

export type Locale = 'vi' | 'en';
export type Market = 'VN' | 'US';
export type WalletUnit = 'POINT' | 'CREDIT';

export const LOCALES: readonly Locale[] = ['vi', 'en'];
export const MARKETS: readonly Market[] = ['VN', 'US'];

/** Route ids cover feature modules plus app pages that are not modules. */
export type RouteId = ModuleId | 'home' | 'profile' | 'pricing' | 'terms';

const VI_APP_ROUTES: Record<Exclude<RouteId, ModuleId>, string> = {
  home: '/',
  profile: '/hoso',
  pricing: '/banggia',
  terms: '/dieukhoan',
};

/** Older Vietnamese aliases that still resolve (kept from the VN product). */
const VI_LEGACY_ROUTES: Readonly<Record<string, RouteId>> = {
  '/trangchu': 'home',
  '/hoangdao': 'zodiac',
  '/thanso': 'numerology',
};

const EN_ROUTES: Partial<Readonly<Record<RouteId, string>>> = {
  home: '/en',
  tuvi: '/en/zi-wei',
  zodiac: '/en/astrology',
  tarot: '/en/tarot',
  kinhdich: '/en/i-ching',
  batu: '/en/ba-zi',
  numerology: '/en/numerology',
  compat: '/en/compatibility',
  'lunar-calendar': '/en/lunar-calendar',
  palm: '/en/palm-reading',
  profile: '/en/profile',
  pricing: '/en/pricing',
  terms: '/en/terms',
  // experts: deliberately absent — /en/experts is 404 by design.
};

export function isLocale(value: unknown): value is Locale {
  return value === 'vi' || value === 'en';
}

export function isMarket(value: unknown): value is Market {
  return value === 'VN' || value === 'US';
}

/** Server-side allowlist guard: arbitrary strings must never select market config. */
export function resolveMarket(value: unknown): Market | null {
  return isMarket(value) ? value : null;
}

function assertLocale(locale: Locale): void {
  if (!isLocale(locale)) throw new TypeError(`unsupported locale: ${String(locale)}`);
}

/** Canonical route for a route id in a locale; '' when the locale has no such route. */
export function moduleRoute(id: RouteId, locale: Locale): string {
  assertLocale(locale);
  if (locale === 'en') return EN_ROUTES[id] ?? '';
  const module = MODULES.find(m => m.id === id);
  return module ? module.route : (VI_APP_ROUTES[id as Exclude<RouteId, ModuleId>] ?? '');
}

/** Modules visible in a locale: Vietnamese keeps all ten, English drops experts. */
export function visibleModules(locale: Locale): ModuleDef[] {
  assertLocale(locale);
  return locale === 'en' ? MODULES.filter(m => EN_ROUTES[m.id] !== undefined) : [...MODULES];
}

export type ResolvedRoute = { locale: Locale; id: RouteId };

/** Maps a pathname (either locale, canonical or legacy, query stripped) to its route id, or null. */
export function resolveRoute(pathname: string): ResolvedRoute | null {
  const clean = pathname.split('?')[0].split('#')[0];
  const path = clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
  if (path === '/' || path === '') return { locale: 'vi', id: 'home' };
  if (path === '/en') return { locale: 'en', id: 'home' };
  if (path.startsWith('/en/')) {
    const id = (Object.keys(EN_ROUTES) as RouteId[]).find(k => EN_ROUTES[k] === path);
    return id ? { locale: 'en', id } : null;
  }
  const legacy = VI_LEGACY_ROUTES[path];
  if (legacy) return { locale: 'vi', id: legacy };
  const module = MODULES.find(m => m.route === path || (m.legacyRoutes as readonly string[]).includes(path));
  if (module) return { locale: 'vi', id: module.id };
  const app = (Object.keys(VI_APP_ROUTES) as Exclude<RouteId, ModuleId>[]).find(k => VI_APP_ROUTES[k] === path);
  return app ? { locale: 'vi', id: app } : null;
}

/** Locale carried by a pathname, when the path belongs to the locale route space. */
export function localeOfPath(pathname: string): Locale | null {
  return resolveRoute(pathname)?.locale ?? null;
}

/**
 * Equivalent page in another locale, query string preserved; '' when the path
 * has no counterpart (unilingual pages like /admin, or unmatched paths).
 * Legacy Vietnamese aliases resolve to their canonical English route.
 */
export function crossLocalePath(pathname: string, target: Locale): string {
  const resolved = resolveRoute(pathname);
  if (!resolved) return '';
  const target_ = target === resolved.locale ? pathname : moduleRoute(resolved.id, target);
  if (!target_) return '';
  if (target_ === pathname) return pathname;
  const query = pathname.includes('?') ? pathname.slice(pathname.indexOf('?')) : '';
  return target_ + query;
}
