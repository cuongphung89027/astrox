import test from 'node:test';
import assert from 'node:assert/strict';
import { SERVICE_CATALOG, addMissingServices } from './catalog.ts';
import { defaultConfig, validateConfig } from './config.ts';
test('catalog has unique concrete service IDs covering every public module', () => {
  assert.equal(new Set(SERVICE_CATALOG.map(s => s.id)).size, SERVICE_CATALOG.length);
  assert.equal(new Set(SERVICE_CATALOG.map(s => s.module)).size, 7);
  assert.ok(SERVICE_CATALOG.length > 50);
  assert.ok(SERVICE_CATALOG.some(s => s.id === 'tarot--three--ppf'));
  assert.ok(SERVICE_CATALOG.some(s => s.id === 'tuvi--period--month'));
});
test('catalog seeding is additive and repeatable, preserves custom settings', () => {
  const original = [
    {
      id: SERVICE_CATALOG[0].id,
      module: 'tuvi',
      name: 'Tên riêng',
      points: 25,
      status: 'paid',
      policy: 'profile',
      prompt: 'Giữ nguyên',
      chain: ['custom'],
    },
  ];
  const seeded = addMissingServices(original);
  assert.deepEqual(seeded[0], original[0]);
  assert.deepEqual(addMissingServices(seeded), seeded);
  assert.equal(original.length, 1);
  assert.ok(seeded.slice(1).every(s => s.status === 'draft' && s.points === 0));
});
test('new configurations contain all catalog services and validate', () => {
  const config = defaultConfig();
  assert.ok(SERVICE_CATALOG.every(s => config.billing.services.some(x => x.id === s.id)));
  assert.deepEqual(validateConfig(config), []);
});
test('every catalog service and route belongs to a module in the shared registry', async () => {
  const { MODULES, routeModule } = await import('./modules.ts');
  const ids = new Set(MODULES.map(m => m.id));
  for (const s of SERVICE_CATALOG) {
    assert.ok(ids.has(s.module), s.id);
    assert.equal(routeModule(new URL(s.route, 'https://x').pathname), s.module, s.id);
  }
  for (const m of MODULES) {
    assert.equal(routeModule(m.route), m.id);
    for (const r of m.legacyRoutes) assert.equal(routeModule(r), m.id);
  }
  assert.equal(routeModule('/hoso'), '');
});
test('published old pair configuration gains distinct grounded services without changing its price or switches', async () => {
  const { hydrateConfig } = await import('./config.ts');
  const old = defaultConfig();
  old.billing.services = old.billing.services.filter(s => !['compat--tuvi-pair', 'compat--batu-pair'].includes(s.id));
  Object.assign(
    old.billing.services.find(s => s.id === 'compat--pair'),
    { status: 'paid', points: 35, chain: ['custom'] },
  );
  const next = hydrateConfig(old);
  for (const id of ['compat--tuvi-pair', 'compat--batu-pair']) {
    const service = next.billing.services.find(s => s.id === id);
    assert.equal(service.status, 'paid');
    assert.equal(service.points, 35);
    assert.deepEqual(service.chain, ['custom']);
  }
  assert.ok(!old.billing.services.some(s => s.id === 'compat--batu-pair'));
  next.billing.services.find(s => s.id === 'compat--batu-pair').status = 'hidden';
  assert.equal(hydrateConfig(next).billing.services.find(s => s.id === 'compat--batu-pair').status, 'hidden');
});
