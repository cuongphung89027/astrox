import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

async function nav() {
  const m = await load('lib/nav.ts');
  const { vi } = await load('i18n/vi.ts');
  const { en } = await load('i18n/en.ts');
  return { ...m, dicts: { vi, en } };
}

test('desktop nav follows the locale route map and keeps profile last', async () => {
  const { navItems } = await nav();
  const vi = navItems('vi');
  const en = navItems('en');
  assert.equal(vi[0].href, '/');
  assert.equal(en[0].href, '/en');
  assert.equal(vi.at(-1).href, '/hoso');
  assert.equal(en.at(-1).href, '/en/profile');
  assert.ok(vi.some(i => i.href === '/tuvi' && i.label === 'Tử Vi'));
  assert.ok(en.some(i => i.href === '/en/zi-wei' && i.label === 'Zi Wei'));
});

test('experts stays in Vietnamese navigation only', async () => {
  const { navItems } = await nav();
  assert.ok(navItems('vi').some(i => i.id === 'experts'));
  assert.ok(!navItems('en').some(i => i.id === 'experts'));
});

test('mobile dock and discovery sheet follow locale; sheet never repeats docked Zi Wei', async () => {
  const { dockItems, sheetLinks } = await nav();
  assert.deepEqual(dockItems('en').map(i => i.href), ['/en', '/en/zi-wei', '/en/tarot']);
  assert.deepEqual(dockItems('vi').map(i => i.href), ['/', '/tuvi', '/tarot']);
  assert.ok(!sheetLinks('vi').some(i => i.id === 'tuvi'));
  assert.ok(!sheetLinks('en').some(i => i.id === 'experts'));
  assert.ok(sheetLinks('en').some(i => i.href === '/en/astrology'));
});

test('dashboard quick tools drop experts for English automatically', async () => {
  const { quickTools } = await nav();
  const vi = quickTools('vi');
  const en = quickTools('en');
  assert.ok(vi.some(i => i.id === 'experts'));
  assert.ok(!en.some(i => i.id === 'experts'));
  assert.equal(vi.length, 9);
  assert.equal(en.length, 8);
});

test('every visible module has nav and desc labels in both dictionaries', async () => {
  const { navItems, dicts } = await nav();
  for (const locale of ['vi', 'en']) {
    for (const item of navItems(locale)) {
      assert.ok(dicts[locale][`nav.${item.id}`], `nav.${item.id} missing in ${locale}`);
    }
  }
  for (const id of ['tuvi', 'zodiac', 'kinhdich', 'batu', 'numerology', 'tarot', 'compat', 'lunar-calendar', 'palm', 'experts']) {
    assert.ok(dicts.vi[`desc.${id}`] && dicts.en[`desc.${id}`], `desc.${id} parity`);
  }
});

test('mobile title resolves per locale including terms fallback', async () => {
  const { mobileTitleFor } = await nav();
  assert.equal(mobileTitleFor('/tuvi', 'vi'), 'Tử Vi');
  assert.equal(mobileTitleFor('/en/zi-wei', 'en'), 'Zi Wei');
  assert.equal(mobileTitleFor('/dieukhoan', 'vi'), 'Điều khoản');
  assert.equal(mobileTitleFor('/en/terms', 'en'), 'Terms');
  assert.equal(mobileTitleFor('/en', 'en'), '');
});
