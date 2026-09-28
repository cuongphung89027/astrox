import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, publicConfig } from '../../services/admin/config.ts';
import { load, hookRuntime, nodes } from './support/load.mjs';
test('US pricing shows every published reading and actual bundle ratio even with checkout disabled', async () => {
  const runtime = hookRuntime(),
    requests = [],
    config = defaultConfig();
  for (const s of config.billing.services) s.status = 'paid';
  config.billing.enabled = true;
  config.billing.usUnlocks.enabled = true;
  config.billing.usUnlocks.credit.numerator = 1;
  config.billing.usUnlocks.credit.denominator = 2;
  const published = publicConfig(config, 'US');
  const { PricingContent } = await load('components/points/PricingContent.tsx', {
    mocks: { react: runtime.react, '@/i18n/LocaleProvider': { useLocale: () => ({ locale: 'en', t: k => k }) } },
    globals: {
      fetch: async url => {
        requests.push(url);
        return Response.json({ config: published });
      },
    },
  });
  PricingContent();
  runtime.flushEffects();
  await new Promise(r => setImmediate(r));
  runtime.reset();
  const tree = PricingContent(),
    text = nodes(tree)
      .flatMap(n => n.props?.children ?? [])
      .filter(t => typeof t === 'string')
      .join(' ');
  assert.equal(requests[0], '/api/site-config?market=US');
  assert.match(text, /1\/2/);
  assert.match(text, /Credit purchases are currently unavailable/);
  assert.match(text, /Understanding yourself/);
  assert.doesNotMatch(text, /Gói nạp Point|Đăng nhập bằng Zalo/);
  const links = nodes(tree)
    .filter(n => n.props?.href)
    .map(n => n.props.href);
  assert.ok(links.includes('/en/profile?section=points'));
  assert.ok(links.includes('/en/terms'));
  runtime.unmount();
});
