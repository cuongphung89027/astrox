import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCALES,
  MARKETS,
  isLocale,
  resolveMarket,
  moduleRoute,
  visibleModules,
  resolveRoute,
  localeOfPath,
  crossLocalePath,
} from './markets.ts';

/** Route map contract fixed by docs/plans/2026-09-28-english-us-implementation.md §C. */
const ROUTE_MAP = [
  ['home', '/', '/en'],
  ['tuvi', '/tuvi', '/en/zi-wei'],
  ['zodiac', '/cunghoangdao', '/en/astrology'],
  ['tarot', '/tarot', '/en/tarot'],
  ['kinhdich', '/kinhdich', '/en/i-ching'],
  ['batu', '/battu', '/en/ba-zi'],
  ['numerology', '/thansohoc', '/en/numerology'],
  ['compat', '/tuonghop', '/en/compatibility'],
  ['lunar-calendar', '/licham', '/en/lunar-calendar'],
  ['palm', '/chitay', '/en/palm-reading'],
  ['profile', '/hoso', '/en/profile'],
  ['pricing', '/banggia', '/en/pricing'],
  ['terms', '/dieukhoan', '/en/terms'],
];

test('locale and market are closed enums with server allowlists', () => {
  assert.deepEqual([...LOCALES], ['vi', 'en']);
  assert.deepEqual([...MARKETS], ['VN', 'US']);
  assert.equal(isLocale('vi'), true);
  assert.equal(isLocale('en'), true);
  assert.equal(isLocale('fr'), false);
  assert.equal(resolveMarket('VN'), 'VN');
  assert.equal(resolveMarket('US'), 'US');
  assert.equal(resolveMarket('EU'), null);
  assert.equal(resolveMarket('us'), null); // case-sensitive: no arbitrary strings pick config
  assert.equal(resolveMarket(undefined), null);
});

test('moduleRoute serves the fixed route map for both locales', () => {
  for (const [id, vi, en] of ROUTE_MAP) {
    assert.equal(moduleRoute(id, 'vi'), vi, `vi route for ${id}`);
    assert.equal(moduleRoute(id, 'en'), en, `en route for ${id}`);
  }
});

test('unsupported locale is rejected loudly, not defaulted', () => {
  assert.throws(() => moduleRoute('tuvi', 'fr'));
  assert.throws(() => visibleModules('jp'));
});

test('experts module exists in Vietnamese only', () => {
  const viIds = visibleModules('vi').map(m => m.id);
  const enIds = visibleModules('en').map(m => m.id);
  assert.ok(viIds.includes('experts'));
  assert.ok(!enIds.includes('experts'));
  assert.equal(moduleRoute('experts', 'vi'), '/chuyengia');
  assert.equal(moduleRoute('experts', 'en'), ''); // no English route by design
  assert.equal(visibleModules('en').length, 9);
  assert.equal(visibleModules('vi').length, 10);
});

test('legacy Vietnamese aliases keep resolving', () => {
  assert.deepEqual(resolveRoute('/trangchu'), { locale: 'vi', id: 'home' });
  assert.deepEqual(resolveRoute('/hoangdao'), { locale: 'vi', id: 'zodiac' });
  assert.deepEqual(resolveRoute('/thanso'), { locale: 'vi', id: 'numerology' });
});

test('resolveRoute maps every canonical route in both locales', () => {
  for (const [id, vi, en] of ROUTE_MAP) {
    assert.deepEqual(resolveRoute(vi), { locale: 'vi', id }, `resolve ${vi}`);
    assert.deepEqual(resolveRoute(en), { locale: 'en', id }, `resolve ${en}`);
  }
  assert.deepEqual(resolveRoute('/'), { locale: 'vi', id: 'home' });
  assert.deepEqual(resolveRoute('/en'), { locale: 'en', id: 'home' });
});

test('resolveRoute strips query strings and tolerates trailing slashes', () => {
  assert.deepEqual(resolveRoute('/tuvi?topic=hieu-ban-doi&sub=hai-nguoi'), { locale: 'vi', id: 'tuvi' });
  assert.deepEqual(resolveRoute('/en/zi-wei?topic=hieu-ban-doi'), { locale: 'en', id: 'tuvi' });
  assert.deepEqual(resolveRoute('/tuvi/'), { locale: 'vi', id: 'tuvi' });
});

test('unknown paths, /en/experts and /admin resolve to null (no silent fallback)', () => {
  assert.equal(resolveRoute('/khong-ton-tai'), null);
  assert.equal(resolveRoute('/en/experts'), null);
  assert.equal(resolveRoute('/en/unknown'), null);
  assert.equal(resolveRoute('/admin'), null); // admin is unilingual, outside the locale route space
  assert.equal(resolveRoute('/en/admin'), null);
});

test('market never derives from locale', () => {
  for (const market of MARKETS) {
    assert.ok(['VN', 'US'].includes(market));
  }
  // The allowlist is fixed: both markets exist independently of either locale.
  for (const locale of LOCALES) {
    assert.equal(
      resolveMarket('VN') !== null && resolveMarket('US') !== null,
      true,
      `markets exist for locale ${locale}`,
    );
  }
});

test('crossLocalePath maps equivalent pages with query strings preserved', () => {
  assert.equal(crossLocalePath('/tuvi?topic=a&sub=b', 'en'), '/en/zi-wei?topic=a&sub=b');
  assert.equal(crossLocalePath('/en/zi-wei?topic=a', 'vi'), '/tuvi?topic=a');
  assert.equal(crossLocalePath('/', 'en'), '/en');
  assert.equal(crossLocalePath('/en', 'vi'), '/');
  assert.equal(crossLocalePath('/hoangdao', 'en'), '/en/astrology'); // legacy alias canonicalizes
  assert.equal(crossLocalePath('/tuvi', 'vi'), '/tuvi'); // same locale is a no-op
});

test('crossLocalePath returns empty for unilingual or unknown pages', () => {
  assert.equal(crossLocalePath('/chuyengia', 'en'), ''); // experts: VI-only by design
  assert.equal(crossLocalePath('/admin', 'en'), '');
  assert.equal(crossLocalePath('/khong-ton-tai', 'en'), '');
});
