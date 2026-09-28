import test from 'node:test';
import assert from 'node:assert/strict';
import { load, hookRuntime, nodes, memoryStorage } from './support/load.mjs';

test('chooseMarket POSTs the explicit choice and resets the tab cache', async () => {
  const calls = [];
  const api = await load('lib/api.ts', { globals: { window: {}, localStorage: memoryStorage() } });
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ market: 'US' }, { status: 200 });
  };
  api.resetMarketCache();
  await api.currentMarket(); // GET primes the cache
  assert.equal(calls[0].init?.method, undefined);
  assert.equal(await api.chooseMarket('US'), true);
  assert.equal(calls[1].init.method, 'POST');
  assert.equal(JSON.parse(calls[1].init.body).market, 'US');
  // Cache was reset: the next read re-fetches instead of replaying the old answer.
  await api.currentMarket();
  assert.equal(calls.length, 3);
});

test('P1-7: no stored market → onboarding gate (never PayOS); choosing US switches to Credits', async () => {
  const runtime = hookRuntime();
  let market = null;
  const { TopupPanel } = await load('components/topup/TopupPanel.tsx', {
    mocks: {
      react: runtime.react,
      '@/lib/auth': { useAuth: () => ({ astroxUser: { id: 'u1' } }) },
      '@/lib/points': { usePointsBalance: () => ({ points: 0, refresh: () => {} }) },
      '@/lib/api': {
        createLemonTopup: async () => ({ ok: false }),
        currentMarket: async () => market,
        chooseMarket: async m => {
          market = m;
          return true;
        },
        loadTopupPackages: async () => [],
        loadTopupHistory: async () => [],
        promoCheck: async () => ({ ok: false }),
        redeemPromo: async () => ({ ok: false }),
        createTopup: async () => ({ error: 'payos' }),
      },
      '@/components/points/PointCoin': { PointCoin: () => null },
      '@/i18n/LocaleProvider': { useLocale: () => ({ locale: 'en', t: k => k }) },
    },
    globals: {
      document: { activeElement: null, body: { style: { overflow: '' } } },
      window: { location: { assign: () => {} } },
      HTMLElement: class {},
    },
  });
  const root = TopupPanel({ open: true, onClose() {} });

  // First render: the gate, NOT the PayOS dialog.
  runtime.reset();
  const session = root.type(root.props);
  const first = session.type(session.props);
  assert.ok(
    nodes(first).find(n => n.props?.id === 'ax-market-title'),
    'onboarding dialog renders',
  );
  assert.ok(!nodes(first).find(n => n.props?.id === 'ax-tp-title'), 'PayOS dialog must NOT render');
  const usButton = nodes(first).find(
    n => n.type === 'button' && String(n.props.children?.[0]?.props?.children).includes('Credits'),
  );
  assert.ok(usButton, 'US choice present');

  // Choose US: the mocked POST succeeds; the panel re-renders into the Credits branch.
  await usButton.props.onClick();
  assert.equal(market, 'US');
  runtime.reset();
  const branch = root.type(root.props); // TopupSession render result
  assert.equal(branch.type?.name, 'TopupUsCredits', `expected Credits branch, got ${branch.type?.name}`);
});

test('a guest clicking the gate gets a sign-in message, never a market write', async () => {
  const runtime = hookRuntime();
  const posted = [];
  const { TopupPanel } = await load('components/topup/TopupPanel.tsx', {
    mocks: {
      react: runtime.react,
      '@/lib/auth': { useAuth: () => ({ astroxUser: null }) },
      '@/lib/points': { usePointsBalance: () => ({ points: 0, refresh: () => {} }) },
      '@/lib/api': {
        createLemonTopup: async () => ({ ok: false }),
        currentMarket: async () => null,
        chooseMarket: async m => {
          posted.push(m);
          return true;
        },
        loadTopupPackages: async () => [],
        loadTopupHistory: async () => [],
        promoCheck: async () => ({ ok: false }),
        redeemPromo: async () => ({ ok: false }),
        createTopup: async () => ({ error: 'payos' }),
      },
      '@/components/points/PointCoin': { PointCoin: () => null },
      '@/i18n/LocaleProvider': { useLocale: () => ({ locale: 'en', t: k => k }) },
    },
    globals: {
      document: { activeElement: null, body: { style: { overflow: '' } } },
      window: { location: { assign: () => {} } },
      HTMLElement: class {},
    },
  });
  const root = TopupPanel({ open: true, onClose() {} });
  runtime.reset();
  const session = root.type(root.props);
  const first = session.type(session.props);
  const anyButton = nodes(first).find(n => n.type === 'button' && n.props.onClick && n.props.children);
  await anyButton.props.onClick();
  assert.deepEqual(posted, [], 'no market POST for guests');
});
