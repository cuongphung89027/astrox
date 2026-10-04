import test from 'node:test';
import assert from 'node:assert/strict';
import { graph, hookRuntime, nodes, memoryStorage } from './support/load.mjs';
import { crossLocalePath, moduleRoute } from '../../services/admin/markets.ts';

async function fixture(locale, pathname, storage = memoryStorage()) {
  const runtime = hookRuntime();
  const calls = { navigations: [], google: 0, zalo: 0, consent: 0, opened: 0 };
  const document = { cookie: '', body: { style: { overflow: '' } } };
  const load = graph({
    mocks: {
      react: runtime.react,
      'next/link': { default: props => props.children },
      'next/navigation': { usePathname: () => pathname },
      '@/i18n/LocaleProvider': { useLocale: () => ({ locale, t: key => `${locale}:${key}` }) },
      '@/lib/auth': {
        useAuth: () => ({
          ready: false,
          loggedIn: false,
          googleLogin: () => calls.google++,
          zaloLogin: () => calls.zalo++,
        }),
      },
      '@/lib/login-dialog': {
        useLoginDialogOpen: () => false,
        openLoginDialog: () => calls.opened++,
        closeLoginDialog() {},
      },
      '@/lib/market-guard': { consumeLoginAfterLogout: () => false },
      '@/lib/terms': {
        hasTermsConsent: () => false,
        saveTermsConsent: () => calls.consent++,
        termsHref: (key, lang = 'vi') => `${moduleRoute('terms', lang)}#${key}`,
      },
      '@/lib/locale': { crossLocalePath, moduleRoute },
      '@/components/kit/BrandLogos': { GoogleG: () => null, ZaloWordmark: () => null },
    },
    globals: {
      document,
      sessionStorage: storage,
      setTimeout: () => 1,
      clearTimeout() {},
      window: { location: { search: '?history=1', hash: '#reading', assign: href => calls.navigations.push(href) } },
    },
  });
  const { LoginPrompt } = await load('components/shell/LoginPrompt.tsx');
  const render = () => {
    runtime.reset();
    return LoginPrompt();
  };
  return { render, runtime, calls, document, storage };
}
const regionButton = (view, name) =>
  nodes(view).find(
    node => node.type === 'button' && node.props.children.some?.(child => child?.props?.children === name),
  );
const provider = (view, name) =>
  nodes(view).find(node => node.type === 'button' && String(node.props.className).includes(name));

for (const [source, path, name, target, destination, button] of [
  ['en', '/en/numerology', 'Việt Nam', 'vi', '/thansohoc', 'zalo'],
  ['vi', '/licham', 'United States', 'en', '/en/lunar-calendar', 'googleActive'],
]) {
  test(`${source} region choice navigates the whole site to ${target} and resumes its provider`, async () => {
    const f = await fixture(source, path);
    regionButton(f.render(), name).props.onClick();
    assert.deepEqual(f.calls.navigations, [`${destination}?history=1#reading`]);
    assert.match(f.document.cookie, new RegExp(`axlang=${target};`));
    assert.equal(
      f.calls.google + f.calls.zalo + f.calls.consent,
      0,
      'country selection neither signs in nor accepts terms',
    );
    const next = await fixture(target, destination, f.storage);
    next.render();
    next.runtime.flushEffects();
    assert.ok(
      provider(next.render(), button),
      'destination starts at the chosen provider, without reselecting country',
    );
    assert.equal(next.calls.opened, 1);
    provider(next.render(), button).props.onClick();
    assert.equal(next.calls.google + next.calls.zalo + next.calls.consent, 0, 'unchecked consent blocks OAuth');
    assert.ok(nodes(next.render()).find(node => node.props?.role === 'alert'));
    nodes(next.render())
      .find(node => node.type === 'input')
      .props.onChange({ target: { checked: true } });
    provider(next.render(), button).props.onClick();
    assert.equal(next.calls[target === 'en' ? 'google' : 'zalo'], 1);
    assert.equal(next.calls.consent, 1);
    const again = await fixture(target, destination, f.storage);
    again.render();
    again.runtime.flushEffects();
    assert.ok(regionButton(again.render(), name), 'continuation is consumed once');
  });
}

test('choosing current country stays on the page and change-region returns to both choices', async () => {
  const f = await fixture('en', '/en/tarot');
  regionButton(f.render(), 'United States').props.onClick();
  assert.deepEqual(f.calls.navigations, []);
  assert.ok(provider(f.render(), 'googleActive'));
  provider(f.render(), 'changeRegion').props.onClick();
  assert.ok(regionButton(f.render(), 'Việt Nam'));
});

test('English popup legal links stay in English', async () => {
  const f = await fixture('en', '/en');
  const links = nodes(f.render()).filter(node => node.props?.href);
  assert.equal(links.length, 3);
  for (const link of links) assert.match(link.props.href, /^\/en\/terms#/);
});

test('VN-only route switches to English home even when session storage is blocked', async () => {
  const storage = {
    getItem() {
      throw Error('blocked');
    },
    setItem() {
      throw Error('blocked');
    },
    removeItem() {
      throw Error('blocked');
    },
  };
  const f = await fixture('vi', '/chuyengia', storage);
  regionButton(f.render(), 'United States').props.onClick();
  assert.deepEqual(f.calls.navigations, ['/en?history=1#reading']);
});

test('pending locale is validated, matched and consumed once', async () => {
  const storage = memoryStorage();
  const load = graph({ globals: { sessionStorage: storage } });
  const { markLoginRegion, consumeLoginRegion } = await load('lib/login-region.ts');
  markLoginRegion('vi');
  assert.equal(consumeLoginRegion('en'), false, 'mismatched destination does not resume a provider');
  assert.equal(consumeLoginRegion('vi'), false, 'mismatched stale marker is cleared');
  markLoginRegion('en');
  assert.equal(consumeLoginRegion('en'), true);
  assert.equal(consumeLoginRegion('en'), false);
  markLoginRegion('unexpected');
  assert.equal(consumeLoginRegion('en'), false, 'invalid marker is ignored');
});
