import test from 'node:test';
import assert from 'node:assert/strict';
import { load, hookRuntime, nodes, memoryStorage } from './support/load.mjs';

/**
 * Sơn 29/09: tài khoản gắn một quốc gia theo provider (Zalo→VN, Google→US).
 * Không còn bước "chọn loại ví" — market đến từ auth context.
 */
const topupMocks = runtime => ({
  react: runtime.react,
  '@/lib/auth': {
    useAuth: () => ({ astroxUser: { id: 'u1' }, market: 'US' }),
  },
  '@/lib/points': { usePointsBalance: () => ({ points: 0, refresh: () => {} }) },
  '@/lib/api': {
    createLemonTopup: async () => ({ ok: false }),
    loadTopupPackages: async () => [],
    loadTopupHistory: async () => [],
    promoCheck: async () => ({ ok: false }),
    redeemPromo: async () => ({ ok: false }),
    createTopup: async () => ({ error: 'payos' }),
  },
  '@/components/points/PointCoin': { PointCoin: () => null },
  '@/i18n/LocaleProvider': { useLocale: () => ({ locale: 'en', t: k => k }) },
});
const renderGlobals = {
  document: { activeElement: null, body: { style: { overflow: '' } } },
  window: { location: { assign: () => {} } },
  HTMLElement: class {},
};

test('Google/US account opens the Credits topup directly — no wallet gate', async () => {
  const runtime = hookRuntime();
  const { TopupPanel } = await load('components/topup/TopupPanel.tsx', {
    mocks: topupMocks(runtime),
    globals: renderGlobals,
  });
  const root = TopupPanel({ open: true, onClose() {} });
  runtime.reset();
  const session = root.type(root.props); // TopupSession render
  assert.equal(session.type?.name, 'TopupUsCredits', `expected Credits branch, got ${session.type?.name}`);
});

test('Zalo/VN account opens the PayOS dialog directly — no wallet gate', async () => {
  const runtime = hookRuntime();
  const mocks = topupMocks(runtime);
  mocks['@/lib/auth'] = { useAuth: () => ({ astroxUser: { id: 'u1' }, market: 'VN' }) };
  const { TopupPanel } = await load('components/topup/TopupPanel.tsx', {
    mocks,
    globals: renderGlobals,
  });
  const root = TopupPanel({ open: true, onClose() {} });
  runtime.reset();
  const first = root.type(root.props); // TopupSession render
  assert.ok(nodes(first).find(n => n.props?.id === 'ax-tp-title'), 'PayOS dialog renders');
  assert.ok(!nodes(first).find(n => n.props?.id === 'ax-market-title'), 'no onboarding gate remains');
});

const loginMocks = (runtime, auth) => ({
  react: runtime.react,
  'next/link': { default: (props => props.children) },
  'next/navigation': { usePathname: () => '/' },
  '@/lib/auth': { useAuth: () => auth },
  '@/lib/login-dialog': {
    useLoginDialogOpen: () => true,
    closeLoginDialog: () => {},
    openLoginDialog: () => {},
  },
  '@/lib/terms': { hasTermsConsent: () => true, saveTermsConsent: () => {}, termsHref: () => '/terms' },
  '@/components/kit/BrandLogos': { GoogleG: () => null, ZaloWordmark: () => null },
  '@/lib/locale': { moduleRoute: () => '/' },
  '@/i18n/LocaleProvider': { useLocale: () => ({ locale: 'en', t: k => k }) },
});

test('login prompt shows the region step first, then the provider for that region', async () => {
  const runtime = hookRuntime();
  const auth = { ready: true, loggedIn: false, zaloLogin() {}, googleLogin() {} };
  const { LoginPrompt } = await load('components/shell/LoginPrompt.tsx', {
    mocks: loginMocks(runtime, auth),
    globals: { ...renderGlobals, localStorage: memoryStorage() },
  });
  runtime.reset();
  let view = LoginPrompt({});

  const regionNames = nodes(view)
    .filter(n => n.type === 'button' && String(n.props?.className).includes('region'))
    .map(n => {
      const name = n.props.children.find?.(c => String(c?.props?.className).includes('regionName'));
      return name?.props?.children;
    });
  assert.deepEqual(regionNames, ['Việt Nam', 'United States'], 'two flagged region options, VN first');
  assert.ok(
    !nodes(view).find(n => String(n.props?.className).includes('zalo')),
    'no provider button before a region is chosen',
  );

  const usOption = nodes(view).find(
    n => n.type === 'button' && n.props.children.some?.(c => c?.props?.children === 'United States'),
  );
  usOption.props.onClick();
  runtime.reset();
  view = LoginPrompt({});
  assert.ok(nodes(view).find(n => String(n.props?.className).includes('googleActive')), 'US region → Google button');
  assert.ok(!nodes(view).find(n => String(n.props?.className).includes('zalo')), 'US region never offers Zalo');

  const back = nodes(view).find(n => n.type === 'button' && String(n.props?.className).includes('changeRegion'));
  back.props.onClick();
  runtime.reset();
  view = LoginPrompt({});
  const vnOption = nodes(view).find(
    n => n.type === 'button' && n.props.children.some?.(c => c?.props?.children === 'Việt Nam'),
  );
  vnOption.props.onClick();
  runtime.reset();
  view = LoginPrompt({});
  assert.ok(nodes(view).find(n => String(n.props?.className).includes('zalo')), 'VN region → Zalo button');
  assert.ok(
    !nodes(view).find(n => String(n.props?.className).includes('googleActive')),
    'VN region never offers Google',
  );
});

test('after a market logout, the login popup opens directly on the tree provider', async () => {
  const runtime = hookRuntime();
  let opened = 0;
  const auth = { ready: true, loggedIn: false, zaloLogin() {}, googleLogin() {} };
  const mocks = loginMocks(runtime, auth);
  mocks['@/lib/login-dialog'] = {
    useLoginDialogOpen: () => false,
    closeLoginDialog() {},
    openLoginDialog() {
      opened++;
    },
  };
  mocks['@/lib/market-guard'] = {
    consumeLoginAfterLogout: () => true,
    markLoginAfterLogout() {},
    openMarketGuard() {},
    closeMarketGuard() {},
    useMarketGuard: () => ({ open: false, reason: null, target: null }),
  };
  const { LoginPrompt } = await load('components/shell/LoginPrompt.tsx', {
    mocks,
    globals: { ...renderGlobals, localStorage: memoryStorage() },
  });
  runtime.reset();
  let view = LoginPrompt({}); // render lần đầu → xếp effect tiêu thụ cờ
  runtime.flushEffects();
  runtime.reset();
  view = LoginPrompt({});
  assert.equal(opened, 1, 'popup tự mở sau logout vì market');
  assert.ok(nodes(view).find(n => String(n.props?.className).includes('googleActive')), 'EN tree mở thẳng bước Google');
  assert.ok(
    !nodes(view).find(n => String(n.props?.className).includes('region') && n.type === 'button'),
    'không bắt chọn khu vực lại',
  );
});

test('market guard warns and logs out an account opened on the wrong tree', async () => {
  const runtime = hookRuntime();
  let loggedOut = 0;
  const auth = {
    ready: true,
    loggedIn: true,
    astroxUser: { id: 'u1', provider: 'zalo' },
    market: 'VN',
    logout: async () => {
      loggedOut++;
    },
  };
  const guard = await load('lib/market-guard.ts', {
    mocks: { react: runtime.react },
    globals: { ...renderGlobals, localStorage: memoryStorage() },
  });
  const { MarketGuard } = await load('components/shell/MarketGuard.tsx', {
    mocks: { ...loginMocks(runtime, auth), '@/lib/market-guard': guard },
    globals: {
      ...renderGlobals,
      setInterval: () => 1,
      clearInterval: () => {},
    },
  });
  // Harness không chạy subscription của hook — mở sẵn trước render; effect tự
  // mở cũng chạy qua flushEffects để chứng minh không crash.
  guard.openMarketGuard('mismatch');
  runtime.reset();
  runtime.flushEffects();
  runtime.reset();
  const view = MarketGuard({});
  const dialog = nodes(view).find(n => n.type === 'dialog');
  assert.ok(dialog, 'mismatch dialog rendered');
  assert.equal(guard.useMarketGuard().reason, 'mismatch');
  const logoutButton = nodes(view).find(
    n => n.type === 'button' && String(n.props.children).includes('logoutNow'),
  );
  await logoutButton.props.onClick();
  assert.equal(loggedOut, 1, 'explicit logout performed');
});
