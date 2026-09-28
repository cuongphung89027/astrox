import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, validateConfig, publicConfig, hydrateConfig } from './config.ts';
import { defaultEnglishPromptSettings, ENGLISH_TEMPLATES, ENGLISH_TASKS } from './english-prompts.ts';
import templates from './prompt-templates.ts';
import { originalTasks } from './prompt-engine.ts';

test('legacy VN config stays valid and unchanged: US defaults are disabled', () => {
  const c = defaultConfig();
  assert.equal(validateConfig(c).length, 0);
  assert.equal(c.integrations.lemon.enabled, false);
  assert.equal(c.integrations.google.enabled, false);
  assert.deepEqual(publicConfig(c).billing.usPackages, []); // disabled → nothing public
});

test('US packages project publicly without secrets; VN packages untouched', () => {
  const c = defaultConfig();
  c.integrations.lemon.enabled = true;
  c.integrations.lemon.packages = [
    { id: 'us-5', name: '5 Credits', credits: 5, amountUsdCents: 499, variantId: 'v', enabled: true },
    { id: 'us-off', name: 'off', credits: 1, amountUsdCents: 99, variantId: 'v', enabled: false },
  ];
  const p = publicConfig(c);
  assert.deepEqual(p.billing.usPackages, [{ id: 'us-5', name: '5 Credits', credits: 5, amountUsdCents: 499 }]);
  assert.equal(JSON.stringify(p).includes('variantId'), false);
  assert.equal(JSON.stringify(p).includes('storeIds'), false);
  assert.equal(JSON.stringify(p).includes('LEMON'), false);
});

test('publish validation: duplicate ids, bad cents/credits and missing variant are rejected; live needs store', () => {
  const c = defaultConfig();
  c.integrations.lemon.enabled = true;
  c.integrations.lemon.packages = [
    { id: 'a', name: 'A', credits: 5, amountUsdCents: 499, variantId: '', enabled: true },
    { id: 'a', name: 'A2', credits: 0, amountUsdCents: 0, variantId: 'v', enabled: false },
  ];
  const errors = validateConfig(c).map(e => e.path);
  assert.ok(errors.includes('integrations.lemon.packages'));
  assert.ok(errors.includes('integrations.lemon.storeIds'));
  assert.equal(errors.includes('integrations.lemon.environment'), false); // test env, not live
});

test('live environment with enabled packages requires operator confirmation flag', () => {
  const c = defaultConfig();
  c.integrations.lemon.enabled = true;
  c.integrations.lemon.environment = 'live';
  c.integrations.lemon.storeIds = { test: 't', live: 'l' };
  c.integrations.lemon.packages = [
    { id: 'a', name: 'A', credits: 5, amountUsdCents: 499, variantId: 'v', enabled: true },
  ];
  const errors = validateConfig(c).map(e => e.path);
  assert.ok(errors.includes('integrations.lemon.environment'), 'live gating error expected');
});

test('promptsEn hydrates from code defaults and covers every template and task', () => {
  const c = defaultConfig();
  assert.equal(c.promptsEn.templates['palm.read.v1'], ENGLISH_TEMPLATES['palm.read.v1']);
  for (const t of templates) assert.ok(c.promptsEn.templates[t.id], `en template ${t.id}`);
  for (const id of Object.keys(originalTasks())) assert.ok(c.promptsEn.tasks[id], `en task ${id}`);
  assert.equal(validateConfig(c).length, 0);
});

test('public projection never contains English prompt bodies (admin-only surface)', () => {
  const p = publicConfig(defaultConfig());
  assert.equal(JSON.stringify(p).includes('CHART ANALYSIS RULES'), false);
  assert.equal(JSON.stringify(p).includes('promptsEn'), false);
});

test('US price overrides validate and never alter the VN public projection', () => {
  const c = defaultConfig();
  const row = c.billing.services.find(s => s.id === 'tuvi');
  row.status = 'paid';
  row.points = 90;
  c.billing.usServices.tuvi = { status: 'paid', points: 7 };
  assert.deepEqual(validateConfig(c), []);
  assert.equal(publicConfig(c).billing.services.find(s => s.id === 'tuvi').points, 90);
  assert.equal(publicConfig(c, 'US').billing.services.find(s => s.id === 'tuvi').points, 7);
});

test('actual persisted legacy config hydrates new market settings without changing VN data', () => {
  const c = defaultConfig(),
    vn = structuredClone(c.billing.services);
  delete c.rewardsUs;
  delete c.billing.usPromos;
  delete c.billing.usUnlocks;
  c.billing.unlocks.enabled = true;
  const next = hydrateConfig(c);
  assert.deepEqual(validateConfig(next), []);
  assert.deepEqual(next.billing.services, vn);
  assert.equal(next.billing.usUnlocks.enabled, true);
  next.billing.usUnlocks.credit.numerator = 1;
  assert.equal(c.billing.unlocks.credit.numerator, 2);
  assert.deepEqual(next.billing.usPromos, []);
});

test('US announcements and notices use the US public projection with VN content intact', () => {
  const c = defaultConfig();
  c.content.announcement = 'Vietnamese notice';
  c.contentUs.announcement = 'English notice';
  assert.equal(publicConfig(c, 'US').content.announcement, 'English notice');
  assert.equal(publicConfig(c, 'VN').content.announcement, 'Vietnamese notice');
});
