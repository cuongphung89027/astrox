import test from 'node:test';
import assert from 'node:assert/strict';
import { load, hookRuntime, nodes } from './support/load.mjs';
const tick = () => new Promise(r => setImmediate(r));
async function fixture({ create, check, redeem } = {}) {
  const runtime = hookRuntime(),
    calls = [],
    redirects = [],
    redemptions = [];
  let refreshes = 0;
  const { TopupUsCredits } = await load('components/topup/TopupPanel.tsx', {
    mocks: {
      react: runtime.react,
      '@/lib/auth': { useAuth: () => ({ astroxUser: { id: 'us-user' } }) },
      '@/lib/points': {
        usePointsBalance: () => ({
          points: 100,
          refresh: async () => {
            refreshes++;
          },
        }),
      },
      '@/lib/api': {
        currentMarket: async () => 'US',
        chooseMarket: async () => true,
        resetMarketCache() {},
        loadTopupPackages: async () => [],
        loadTopupHistory: async () => [],
        createTopup: async () => {},
        promoCheck: check ?? (async () => ({ ok: true, kind: 'topup_bonus', bonus: 2 })),
        redeemPromo: async (...args) => {
          redemptions.push(args);
          return redeem ? redeem(...args) : { ok: true, points: 3 };
        },
        createLemonTopup: async (...args) => {
          calls.push(args);
          return create ? create(...args) : { ok: true, checkoutUrl: 'https://store.lemonsqueezy.com/checkout/test' };
        },
      },
      '@/components/points/PointCoin': { PointCoin: () => null },
    },
    globals: {
      window: { location: { assign: url => redirects.push(url) } },
      fetch: async () =>
        Response.json({
          config: {
            billing: {
              usPackages: [
                { id: 'small', name: 'Starter', credits: 5, amountUsdCents: 499 },
                { id: 'large', name: 'More', credits: 20, amountUsdCents: 1799 },
              ],
            },
          },
        }),
    },
  });
  let tree;
  const render = () => {
    runtime.reset();
    tree = TopupUsCredits({ onClose() {} });
    return tree;
  };
  const pick = (type, fn = () => true) => {
    const node = nodes(tree).find(n => n.type === type && fn(n.props));
    assert.ok(node, `missing ${type}`);
    return node.props;
  };
  render();
  runtime.flushEffects();
  await tick();
  render();
  return {
    render,
    pick,
    calls,
    redirects,
    redemptions,
    refreshes: () => refreshes,
    close: runtime.unmount,
    select: id => {
      pick('input', p => p.type === 'radio' && p.value === id).onChange();
      render();
    },
    pay: () =>
      pick(
        'button',
        p => typeof p.children === 'string' && /^(Continue|Choose a package|Opening checkout)/.test(p.children),
      ),
    code: value => {
      pick('input', p => p['aria-label'] === 'Promo code').onChange({ target: { value } });
      render();
    },
    apply: () => pick('button', p => p.children === 'Apply').onClick(),
  };
}
test('US has explicit package selection, confirmation and history/promo controls', async () => {
  const f = await fixture();
  assert.equal(f.pay().disabled, true);
  f.select('large');
  assert.equal(f.calls.length, 0);
  f.pay().onClick();
  await tick();
  assert.equal(f.calls[0][0], 'large');
  assert.match(f.calls[0][1], /^topup-/);
  assert.equal(f.redirects.length, 1);
  assert.ok(f.pick('summary', p => p.children === 'Recent purchases'));
  assert.ok(f.pick('summary', p => p.children === 'Have a promo code?'));
});
test('US duplicate clicks and an ambiguous network retry retain one checkout intent', async () => {
  let reject;
  const f = await fixture({
    create: () =>
      new Promise((_, r) => {
        reject = r;
      }),
  });
  f.select('small');
  const pay = f.pay();
  pay.onClick();
  pay.onClick();
  assert.equal(f.calls.length, 1);
  reject(Error('offline'));
  await tick();
  f.render();
  f.pay().onClick();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0][1], f.calls[1][1]);
  reject(Error('offline'));
  await tick();
});
test('US promo edits invalidate previous approval and a stale response', async () => {
  let resolve;
  const f = await fixture({
    check: () =>
      new Promise(r => {
        resolve = r;
      }),
  });
  f.select('small');
  f.code('FIRST');
  f.apply();
  f.code('SECOND');
  resolve({ ok: true, kind: 'topup_bonus', bonus: 100 });
  await tick();
  f.render();
  assert.equal(f.pay().disabled, true);
  f.pay().onClick();
  assert.equal(f.calls.length, 0);
});
test('US direct promo retries retain a redemption key and refresh the Credits balance', async () => {
  let n = 0;
  const f = await fixture({
    check: async () => ({ ok: true, kind: 'direct_points', bonus: 3 }),
    redeem: async () => {
      if (!n++) throw Error('response lost');
      return { ok: true, points: 3 };
    },
  });
  f.code('GIFT');
  f.apply();
  await tick();
  f.render();
  f.apply();
  await tick();
  f.render();
  assert.equal(f.redemptions.length, 2);
  assert.equal(f.redemptions[0][1], f.redemptions[1][1]);
  assert.equal(f.refreshes(), 1);
});
test('US closing a checkout ignores a late redirect', async () => {
  let resolve;
  const f = await fixture({
    create: () =>
      new Promise(r => {
        resolve = r;
      }),
  });
  f.select('small');
  f.pay().onClick();
  f.close();
  resolve({ ok: true, checkoutUrl: 'https://store.lemonsqueezy.com/checkout/test' });
  await tick();
  assert.deepEqual(f.redirects, []);
});
