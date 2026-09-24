import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { SERVICE_CATALOG } from './catalog.ts';
import { serviceTree, bundleDefinitions } from './service-tree.ts';
import { upgradeQuote } from './service-pricing.ts';
import { defaultConfig, hydrateConfig, validateConfig } from './config.ts';
const array = (file, symbol) => {
  const text = readFileSync(new URL('../../web/src/lib/' + file, import.meta.url), 'utf8');
  const literal = text.match(new RegExp('export const ' + symbol + '[^=]*= (\\[[\\s\\S]*?\\n\\]);'))?.[1];
  assert.ok(literal, symbol);
  return vm.runInNewContext(literal);
};
test('every actual feature variant is in the catalog, with no stale catalog services', () => {
  const expected = [];
  for (const t of array('tuvi.ts', 'TUVI_TOPICS')) for (const s of t.subs) expected.push(`tuvi--${t.id}--${s.id}`);
  for (const t of array('zodiac.ts', 'ZODIAC_DEEP_TOPICS')) expected.push(`zodiac--${t.id}--${t.subId}`);
  for (const [file, symbol, module] of [
    ['batu.ts', 'BATU_TOPICS', 'batu'],
    ['numerology.ts', 'NUMEROLOGY_TOPICS', 'numerology'],
  ])
    for (const t of array(file, symbol)) expected.push(`${module}--${t.id}`);
  for (const t of array('tarot.ts', 'TAROT_SPREADS'))
    for (const f of t.frames ?? [{ id: null }]) expected.push(`tarot--${t.id}${f.id ? '--' + f.id : ''}`);
  for (const m of ['tuvi', 'zodiac']) for (const p of ['today', 'week', 'month']) expected.push(`${m}--period--${p}`);
  expected.push('kinhdich--interpretation', 'compat--pair', 'compat--tuvi-pair', 'compat--batu-pair');
  assert.deepEqual(SERVICE_CATALOG.map(s => s.id).sort(), expected.sort());
});
test('functional tree covers every configured row exactly once and has no fourth level', () => {
  const c = defaultConfig();
  const tree = serviceTree(c.billing.services);
  const ids = [];
  const visit = (n, depth) => {
    assert.ok(depth <= 3);
    ids.push(...n.serviceIds);
    n.children.forEach(x => visit(x, depth + 1));
  };
  tree.forEach(n => visit(n, 1));
  assert.deepEqual(ids.sort(), c.billing.services.map(s => s.id).sort());
  const tarot = tree.find(n => n.id === 'tarot');
  assert.equal(tarot.children[0].name, 'Trải bài');
  assert.equal(tarot.children[0].children.length, 0);
});
test('bundles exclude session and period readings and use real functional groups', () => {
  const defs = bundleDefinitions();
  assert.ok(defs.find(b => b.id === 'tuvi--tim-hieu-ban-than').members.includes('tuvi--tim-hieu-ban-than--tinh-cach'));
  assert.ok(!defs.some(b => b.module === 'tarot' || b.module === 'compat'));
  for (const b of defs) assert.ok(b.members.every(id => SERVICE_CATALOG.find(s => s.id === id).policy === 'profile'));
  const z = serviceTree(defaultConfig().billing.services).find(n => n.id === 'zodiac');
  assert.ok(
    z.children
      .find(n => n.name === 'Tổng quan lá số')
      .children.some(n => n.serviceIds.includes('zodiac--tong-quan-la-so--bo-ba-loi')),
  );
});
const grant = (id, points, members, extra = {}) => ({
  id,
  points,
  members,
  status: 'succeeded',
  consumedBy: null,
  expiresAt: null,
  ...extra,
});
test('upgrade uses exact 2/3 of actual paid amounts; excludes spent, expired and unrelated credits', () => {
  const members = ['a', 'b', 'c'];
  const q = upgradeQuote(
    300,
    members,
    [
      grant('1', 90, ['a']),
      grant('2', 200, ['x']),
      grant('3', 120, ['b'], { consumedBy: 'old' }),
      grant('4', 30, ['c'], { expiresAt: 10 }),
    ],
    { numerator: 2, denominator: 3 },
    20,
  );
  assert.equal(q.points, 240);
  assert.equal(q.credit, 60);
  assert.deepEqual(q.creditIds, ['1']);
});
test('owned bundle opens children at zero, but separate children do not imply ownership of a priced bundle', () => {
  assert.equal(upgradeQuote(50, ['a'], [grant('1', 300, ['a', 'b'])], { numerator: 2, denominator: 3 }).owned, true);
  assert.equal(
    upgradeQuote(300, ['a', 'b'], [grant('1', 30, ['a']), grant('2', 30, ['b'])], { numerator: 2, denominator: 3 })
      .points,
    260,
  );
  assert.equal(upgradeQuote(10, ['a', 'b'], [grant('1', 100, ['a'])], { numerator: 2, denominator: 3 }).points, 0);
});
test('old configuration is safe and invalid bundle IDs, fractions and prices are rejected', () => {
  const old = defaultConfig();
  delete old.billing.unlocks;
  const c = hydrateConfig(old);
  assert.equal(c.billing.unlocks.enabled, false);
  assert.deepEqual(validateConfig(c), []);
  c.billing.unlocks.credit.denominator = 0;
  assert.ok(validateConfig(c).length);
  c.billing.unlocks.credit = { numerator: 2, denominator: 3 };
  c.billing.unlocks.bundles = [{ id: 'tarot', enabled: true, points: 100 }];
  assert.ok(validateConfig(c).length);
  c.billing.unlocks.bundles = [{ id: 'tuvi', enabled: true, points: -1 }];
  assert.ok(validateConfig(c).length);
});
