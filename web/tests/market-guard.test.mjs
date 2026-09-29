import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

// Sơn 29/09: bước chọn khu vực + popup cảnh báo market phải có đủ chữ hai ngôn ngữ.
const GUARD_KEYS = [
  'guard.badgeMismatch',
  'guard.badgeSwitch',
  'guard.mismatchTitle',
  'guard.switchTitle',
  'guard.zaloOnlyVN',
  'guard.googleOnlyUS',
  'guard.switchToVN',
  'guard.switchToUS',
  'guard.autoLogoutPrefix',
  'guard.logoutNow',
  'guard.logoutAndSwitch',
  'guard.stay',
];
const REGION_KEYS = [
  'login.regionTitle',
  'login.regionHint',
  'login.regionCurrent',
  'login.changeRegion',
];

test('region picker and market guard dictionaries are complete in both locales', async () => {
  const { vi } = await load('i18n/vi.ts');
  const { en } = await load('i18n/en.ts');
  for (const key of [...GUARD_KEYS, ...REGION_KEYS]) {
    assert.equal(typeof vi[key], 'string', `vi thiếu ${key}`);
    assert.equal(typeof en[key], 'string', `en thiếu ${key}`);
    assert.ok(vi[key].length > 3 && en[key].length > 3, `${key} quá ngắn`);
    assert.notEqual(vi[key], en[key], `${key} trùng nhau giữa hai ngôn ngữ`);
  }
});

test('market guard store is import-safe outside React and exposes imperative open/close', async () => {
  const store = await load('lib/market-guard.ts', { globals: { window: {} } });
  store.openMarketGuard('mismatch');
  store.closeMarketGuard();
  store.openMarketGuard('switch', { locale: 'en', href: '/en' });
  store.closeMarketGuard();
});
