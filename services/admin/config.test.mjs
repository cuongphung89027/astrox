import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, validateConfig, quotePackage, publicConfig } from './config.ts';
test('safe defaults have unlimited referrals, no active billing and no assumed package prices', () => {
  const c = defaultConfig();
  assert.equal(c.rewards.referralMode, 'unlimited');
  assert.equal(c.billing.enabled, false);
  assert.equal(c.billing.packages.length, 0);
  assert.equal(validateConfig(c).length, 0);
});
test('promo config validates kind, positive Point and nonnegative minimum while accepting old codes', () => {
  const c = defaultConfig();
  c.billing.promos = [{ id:'old', code:'OLD', bonus:10, limit:2, perUser:1, enabled:true, expiresAt:'' }];
  assert.equal(validateConfig(c).length, 0);
  c.billing.promos[0] = { ...c.billing.promos[0], kind:'direct_points', bonus:0, minAmountVnd:1000 };
  const errors = validateConfig(c);
  assert.ok(errors.some(e => e.path === 'billing.promos.bonus'));
  assert.ok(errors.some(e => e.path === 'billing.promos.minAmountVnd'));
});
test('reject duplicate milestones, fractional money and disabled fallback targets', () => {
  const c = defaultConfig();
  c.rewards.milestones.push({ ...c.rewards.milestones[0], id: 'duplicate-day' });
  c.billing.vndPerPoint = -1;
  c.ai.chain = ['missing'];
  const errors = validateConfig(c);
  assert.ok(errors.some(e => e.path.includes('milestones')));
  assert.ok(errors.some(e => e.path.includes('vndPerPoint')));
  assert.ok(errors.some(e => e.path.includes('chain')));
});
test('package calculation uses explicit modes and integer points', () => {
  const c = defaultConfig();
  c.billing.vndPerPoint = 1000;
  const pkg = {
    id: 'a',
    name: 'Gói A',
    amountVnd: 10500,
    mode: 'rate',
    fixedPoints: 0,
    bonus: 3,
    enabled: true,
    featured: false,
  };
  assert.deepEqual(quotePackage(pkg, c.billing.vndPerPoint), { base: 10, bonus: 3, total: 13 });
  pkg.mode = 'fixed';
  pkg.fixedPoints = 20;
  assert.equal(quotePackage(pkg, 900).total, 23);
});
test('public config excludes provider endpoints, operational thresholds and integration IDs', () => {
  const c = defaultConfig();
  c.integrations.payos.clientId = 'private-id';
  const p = publicConfig(c);
  assert.equal(p.integrations, undefined);
  assert.equal(p.ai, undefined);
  assert.equal(p.operations, undefined);
  assert.equal(p.rewards.daily, 2);
});
test('blank rates cannot enable billing and invalid provider addresses cannot publish', () => {
  const c = defaultConfig();
  c.billing.enabled = true;
  c.ai.providers = [
    {
      id: 'bad',
      name: 'Bad',
      baseUrl: 'http://127.0.0.1',
      protocol: 'responses',
      model: 'x',
      enabled: true,
      timeoutMs: 10000,
      retries: 0,
      maxTokens: 1000,
      temperature: 0.7,
      secretRef: 'provider:bad',
    },
  ];
  assert.ok(validateConfig(c).length >= 2);
});
test('enabled rewarded ad unit must belong to configured Google network', () => {
  const c = defaultConfig();
  c.rewards.ads.enabled = true;
  c.rewards.ads.networkCode = '1234';
  c.rewards.ads.adUnit = '/9999/test';
  assert.ok(validateConfig(c).some(e => e.path === 'rewards.ads.adUnit'));
  c.rewards.ads.adUnit = '/1234/test';
  assert.equal(validateConfig(c).length, 0);
});
