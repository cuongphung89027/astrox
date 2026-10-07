/**
 * Locale-aware navigation builders (plan Task 05). Pure: consumed by AppShell,
 * BottomDock, Dashboard and AccountPage so hrefs and labels always follow the
 * route contract in services/admin/markets.ts — never hand-written per locale.
 */
import { visibleModules, moduleRoute, type Locale, type RouteId } from '../../../services/admin/markets.ts';
import { createT } from '../i18n/index.ts';

export type NavEntry = { id: RouteId; href: string; label: string; accent: string };

export type NavSubLink = {
  id: RouteId;
  href: string;
  label: string;
  hint: string;
  accent: string;
};

export type NavGroup =
  | {
      type: 'link';
      id: RouteId;
      href: string;
      label: string;
      accent: string;
    }
  | {
      type: 'group';
      id: 'self' | 'qa';
      label: string;
      accent: string;
      items: NavSubLink[];
    };

const ACCENT = '#187650';

/**
 * 4 Structured groups for Desktop top navigation:
 * 1. Home (direct)
 * 2. Tìm hiểu bản thân (dropdown: Tử Vi, Bát Tự, Thần Số Học, Cung Hoàng Đạo)
 * 3. Hỏi đáp (dropdown: Tarot, Kinh Dịch, Chỉ tay)
 * 4. Lịch âm (direct)
 * 5. Chuyên gia (direct; Vietnamese only)
 */
export function navGroups(locale: Locale): NavGroup[] {
  const t = createT(locale);
  const selfIds: RouteId[] = ['tuvi', 'batu', 'numerology', 'zodiac'];
  const qaIds: RouteId[] = ['tarot', 'kinhdich', 'palm'];

  const selfItems: NavSubLink[] = selfIds
    .filter(id => moduleRoute(id, locale) !== '')
    .map(id => ({
      id,
      href: moduleRoute(id, locale),
      label: t.t(`nav.${id}`),
      hint: t.t(`desc.${id}`),
      accent: ACCENT,
    }));

  const qaItems: NavSubLink[] = qaIds
    .filter(id => moduleRoute(id, locale) !== '')
    .map(id => ({
      id,
      href: moduleRoute(id, locale),
      label: t.t(`nav.${id}`),
      hint: t.t(`desc.${id}`),
      accent: ACCENT,
    }));

  const groups: NavGroup[] = [
    { type: 'link', id: 'home', href: moduleRoute('home', locale), label: t.t('nav.home'), accent: ACCENT },
    { type: 'group', id: 'self', label: t.t('nav.group.self'), accent: ACCENT, items: selfItems },
    { type: 'group', id: 'qa', label: t.t('nav.group.qa'), accent: ACCENT, items: qaItems },
    {
      type: 'link',
      id: 'lunar-calendar',
      href: moduleRoute('lunar-calendar', locale),
      label: t.t('nav.lunar-calendar'),
      accent: ACCENT,
    },
  ];

  if (moduleRoute('experts', locale) !== '') {
    groups.push({
      type: 'link',
      id: 'experts',
      href: moduleRoute('experts', locale),
      label: t.t('nav.experts'),
      accent: ACCENT,
    });
  }

  return groups;
}

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
