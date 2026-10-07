import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, configForMarket, publicConfig } from '../../services/admin/config.ts';
import { publicState } from '../../services/admin/public-state.mjs';
import { navGroups, quickTools, sheetLinks } from '../src/lib/nav.ts';
import { testEnv } from '../../services/admin/test/sqlite.mjs';
import { state, publish } from '../../services/admin/store.mjs';
import { handleConfiguredAi } from '../../services/admin/integration-api.mjs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, hookRuntime } from './support/load.mjs';
import { createT } from '../src/i18n/index.ts';

test('development lock wins over saved free/paid and US overrides without mutating saved settings', () => {
  const c = defaultConfig();
  c.billing.services.forEach(s => {
    s.status = 'free';
  });
  c.billing.services.find(s => s.id === 'palm').status = 'paid';
  c.billing.usServices.palm = { status: 'free', points: 0 };
  const saved = JSON.stringify(c);
  for (const market of ['VN', 'US']) {
    assert.equal(configForMarket(c, market).billing.services.find(s => s.id === 'palm').status, 'draft');
    const p = publicConfig(c, market);
    assert.equal(p.availability.palm, 'draft');
    assert.ok(!p.billing.services.some(s => s.module === 'palm'));
    assert.equal(p.availability.tarot, 'free');
  }
  assert.equal(JSON.stringify(c), saved);
});

test('direct palm routes block before published config arrives; other routes remain usable', () => {
  for (const path of ['/chitay', '/en/palm-reading']) assert.equal(publicState(null, path).blocked, true);
  for (const path of ['/', '/en', '/tarot', '/en/tarot']) assert.equal(publicState(null, path).blocked, false);
});

test('home, desktop dropdown and mobile discovery label palm as disabled in both locales', () => {
  for (const locale of ['vi', 'en']) {
    const label = locale === 'vi' ? 'Đang phát triển' : 'Under development';
    const entries = [quickTools(locale), sheetLinks(locale), navGroups(locale).find(g => g.id === 'qa').items];
    for (const list of entries) {
      const palm = list.find(x => x.id === 'palm');
      assert.equal(palm.disabled, true);
      assert.equal(palm.statusLabel, label);
      assert.ok(!list.find(x => x.id === 'tarot').disabled);
    }
  }
});

test('shell shows localized development notice without mounting camera children before config loads', async () => {
  for (const locale of ['vi', 'en']) {
    let mounts = 0;
    const runtime = hookRuntime();
    const { PublishedNotice } = await load('components/shell/PublishedNotice.tsx', {
      mocks: {
        react: runtime.react,
        'next/navigation': { usePathname: () => (locale === 'vi' ? '/chitay' : '/en/palm-reading') },
        'next/link': { default: props => React.createElement('a', props) },
        '@/i18n/LocaleProvider': { useLocale: () => createT(locale) },
        '@/lib/state': { setPromptRevision() {} },
      },
    });
    function Camera() {
      mounts++;
      return React.createElement('input', { type: 'file' });
    }
    runtime.reset();
    const html = renderToStaticMarkup(React.createElement(PublishedNotice, null, React.createElement(Camera)));
    assert.ok(html.includes(locale === 'vi' ? 'Đang phát triển' : 'Under development'));
    assert.ok(html.includes(locale === 'vi' ? 'Về trang chủ' : 'Back to home'));
    assert.equal(mounts, 0);
    assert.ok(!html.includes('type="file"'));
    runtime.unmount();
  }
});

test('configured palm AI cannot call provider in either market even when old config enables it', async () => {
  const env = testEnv();
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.billing.enabled = true;
  c.billing.services.find(s => s.id === 'palm').status = 'free';
  c.billing.usServices.palm = { status: 'free', points: 0 };
  await publish(env, 'test', c, 0, 'test');
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error('must not call provider');
  };
  try {
    for (const market of ['VN', 'US']) {
      const response = await handleConfiguredAi(
        new Request('https://theastrox.space/api/ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceId: 'palm',
            market,
            messages: [{ role: 'user', content: 'Synthetic palm request' }],
          }),
        }),
        env,
      );
      assert.equal(response.status, 403);
      assert.equal(typeof (await response.json()).error, 'string');
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
