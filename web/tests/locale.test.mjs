import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

async function i18n() {
  const { createT } = await load('i18n/index.ts');
  const { vi } = await load('i18n/vi.ts');
  const { en } = await load('i18n/en.ts');
  return { createT, vi, en };
}

test('dictionaries keep exact key parity in both locales', async () => {
  const { vi, en } = await i18n();
  const viKeys = Object.keys(vi).sort();
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(viKeys, enKeys);
  assert.ok(viKeys.length >= 20, 'seed dictionary should carry the shared UI surface');
});

test('interpolation replaces named params without leftovers', async () => {
  const { createT } = await i18n();
  const vi = createT('vi');
  const en = createT('en');
  assert.equal(vi.t('common.greeting', { name: 'Sơn' }).includes('Sơn'), true);
  assert.equal(en.t('common.greeting', { name: 'Son' }).includes('Son'), true);
  assert.equal(/\{name\}/.test(vi.t('common.greeting', { name: 'An' })), false);
});

test('plural follows CLDR rules: en one/other, vi other only', async () => {
  const { createT } = await i18n();
  const en = createT('en');
  const vi = createT('vi');
  assert.equal(en.tn('common.credits', 1), en.t('common.credits_one', { count: 1 }));
  assert.equal(en.tn('common.credits', 5), en.t('common.credits_other', { count: 5 }));
  // Vietnamese has no singular/plural split: count never picks a different string.
  assert.equal(vi.tn('common.credits', 1), vi.t('common.credits_other', { count: 1 }));
  assert.equal(vi.tn('common.credits', 5), vi.t('common.credits_other', { count: 5 }));
});

test('dates format dd/mm/yyyy for vi and US long form for en', async () => {
  const { createT } = await i18n();
  const d = new Date(2026, 8, 25); // Sep 25 2026, local time on purpose (display layer)
  assert.equal(createT('vi').formatDate(d), '25/09/2026');
  assert.equal(createT('en').formatDate(d), 'Sep 25, 2026');
});

test('numbers use locale separators', async () => {
  const { createT } = await i18n();
  assert.equal(createT('vi').formatNumber(1234.5), '1.234,5');
  assert.equal(createT('en').formatNumber(1234.5), '1,234.5');
});

test('unsupported locale is rejected, missing key surfaces the key itself', async () => {
  const { createT } = await i18n();
  assert.throws(() => createT('fr'));
  const t = createT('en');
  assert.equal(t.t('no.such.key'), 'no.such.key');
});
