/**
 * Locale-aware navigation builders (plan Task 05). Pure: consumed by AppShell,
 * BottomDock, Dashboard and AccountPage so hrefs and labels always follow the
 * route contract in services/admin/markets.ts — never hand-written per locale.
 */
import { visibleModules, moduleRoute, type Locale, type RouteId } from '../../../services/admin/markets.ts';
import { createT } from '../i18n/index.ts';

export type NavEntry = { id: RouteId; href: string; label: string; accent: string };

const ACCENT = '#187650';

/** Desktop top nav: home + all visible modules except compat + profile. */
export function navItems(locale: Locale): NavEntry[] {
  const t = createT(locale);
  return [
    { id: 'home', href: moduleRoute('home', locale), label: t.t('nav.home'), accent: ACCENT },
    ...visibleModules(locale)
      .filter(m => m.id !== 'compat')
      .map(m => ({ id: m.id as RouteId, href: moduleRoute(m.id, locale), label: t.t(`nav.${m.id}`), accent: ACCENT })),
    { id: 'profile', href: moduleRoute('profile', locale), label: t.t('nav.profile'), accent: ACCENT },
  ];
}

/** Mobile bottom dock: home, Zi Wei, Tarot (+ discovery sheet for the rest). */
export function dockItems(locale: Locale): NavEntry[] {
  const t = createT(locale);
  return (['home', 'tuvi', 'tarot'] as const).map(id => ({
    id,
    href: moduleRoute(id, locale),
    label: t.t(`nav.${id}`),
    accent: ACCENT,
  }));
}

/** Discovery sheet tiles: every visible module except the docked Zi Wei. */
export function sheetLinks(locale: Locale): NavEntry[] {
  const t = createT(locale);
  return visibleModules(locale)
    .filter(m => m.id !== 'tuvi')
    .map(m => ({ id: m.id as RouteId, href: moduleRoute(m.id, locale), label: t.t(`nav.${m.id}`), accent: ACCENT }));
}

/** Dashboard quick-tools grid (experts drops out automatically in English). */
export function quickTools(locale: Locale): NavEntry[] {
  const t = createT(locale);
  const ids: RouteId[] = [
    'tuvi',
    'tarot',
    'zodiac',
    'kinhdich',
    'batu',
    'numerology',
    'lunar-calendar',
    'palm',
    'experts',
  ];
  return ids
    .filter(id => locale === 'vi' || moduleRoute(id, locale) !== '')
    .map(id => ({ id, href: moduleRoute(id, locale), label: t.t(`nav.${id}`), accent: ACCENT }));
}

/** Mobile top-bar title: matching nav label, falling back to compat/terms. */
export function mobileTitleFor(pathname: string, locale: Locale): string {
  const t = createT(locale);
  const items = [...navItems(locale)];
  const match = items.find(
    item =>
      item.href !== moduleRoute('home', locale) && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  if (match) return match.label;
  if (pathname === moduleRoute('compat', locale)) return t.t('nav.compat');
  if (pathname === moduleRoute('terms', locale)) return t.t('shell.terms');
  return '';
}
