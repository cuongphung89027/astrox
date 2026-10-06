/** Browser QA with real React/calculators and real SQLite-backed upgrade/AI pipeline. Providers are fixtures. */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { testEnv } from '../../services/admin/test/sqlite.mjs';
import { state, publish, saveSecret } from '../../services/admin/store.mjs';
import { defaultConfig, publicConfig as projectConfig } from '../../services/admin/config.ts';
import { sessionCookie, aiSession } from '../../services/backend/auth.mjs';
import { internalFetch } from '../../services/backend/handler.mjs';
import { handleConfiguredAi, handleAiUpgrade } from '../../services/admin/integration-api.mjs';
import { fixture } from '../tests/support/visual-fixtures.mjs';
import { graph, memoryStorage } from '../tests/support/load.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:3183',
  out = process.env.QA_OUT || '/tmp/astrox-upgrade-qa';
mkdirSync(out, { recursive: true });
const profile = { name: 'Trần Minh An', gender: 'Nam', dob: '2001-03-08', hourChi: 'Tý', place: 'Hà Nội' };
const original =
  '## Bài đã mở\n\nĐây là bản luận giải gốc đã lưu trước khi nâng cấp. **Giữ lại bài này để đối chiếu.**';
async function environment() {
  const env = testEnv();
  for (const file of [
    'services/backend/test/legacy-schema.sql',
    'migrations/backend.sql',
    'migrations/us-credits.sql',
    'migrations/user-sync.sql',
    'migrations/market-ai-operations.sql',
  ])
    for (const q of readFileSync(new URL('../../' + file, import.meta.url), 'utf8')
      .split(';')
      .filter(s => s.trim()))
      await env.DB.prepare(q).run();
  Object.assign(env, {
    SESSION_SECRET: 'qa-session-secret',
    APP_ORIGIN: base,
    PROVIDER_ALLOWED_HOSTS: 'api.openai.com',
  });
  await env.DB.prepare(
    "INSERT INTO app_users(id,status,created_at,updated_at)VALUES('reader','active','2026','2026')",
  ).run();
  await env.DB.prepare("INSERT INTO zalo_point_accounts VALUES('reader',30,'2026')").run();
  await env.DB.prepare(
    "INSERT INTO backend_ai_operations(user_id,operation_id,charge_id,service_id,request_hash,config_revision,points,status,created_at,updated_at,market)VALUES('reader','old-op','old-charge','numerology--life-path','old-hash',1,90,'succeeded',1,1,'VN')",
  ).run();
  for (const q of readFileSync(new URL('../../migrations/reading-format-upgrades.sql', import.meta.url), 'utf8')
    .split(';')
    .filter(s => s.trim()))
    await env.DB.prepare(q).run();
  const config = defaultConfig();
  config.ai.enabled = config.billing.enabled = true;
  config.billing.unlocks.enabled = false;
  config.billing.services.forEach(s => {
    s.status = 'free';
    s.points = 0;
  });
  Object.assign(
    config.billing.services.find(s => s.id === 'numerology--life-path'),
    { status: 'paid', points: 90 },
  );
  config.ai.chain = ['fixture'];
  config.ai.providers = [
    {
      id: 'fixture',
      name: 'Fixture',
      model: 'fixture',
      protocol: 'chat',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
      timeoutMs: 1000,
      retries: 0,
      maxTokens: 8000,
      temperature: 0.5,
      secretRef: 'provider:fixture',
    },
  ];
  await state(env);
  await publish(env, 'qa', config, 0, 'qa');
  await saveSecret(env, 'qa', 'provider:fixture', 'test');
  env.ASTROX_BACKEND = { fetch: r => internalFetch(r, env) };
  const cookie = (await sessionCookie(env, 'reader')).split(';')[0];
  const ticket = async () =>
    await (await aiSession(env, new Request(base + '/api/ai/session', { headers: { origin: base, cookie } }))).json();
  return { env, config, ticket };
}
async function seededState() {
  const storage = memoryStorage();
  const load = graph({
    globals: {
      localStorage: storage,
      document: { documentElement: { lang: 'vi' } },
      window: {
        dispatchEvent() {},
        addEventListener() {},
        removeEventListener() {},
        location: { pathname: '/thansohoc' },
      },
    },
  });
  const s = await load('lib/state.ts');
  s.setState({ onboarded: true, profile });
  s.recordPromptResult(original, 1);
  s.recordLanguageResult(original, 'vi-reading-2');
  s.writeAiCache('numerologyTopics', 'life-path', original, { module: 'numerology', topic: 'life-path' });
  return storage.getItem('astrox_v2_state');
}
const seed = await seededState();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [],
  checks = [];
let active,
  failNext = false,
  providerCalls = 0;
const savedFetch = globalThis.fetch;
globalThis.fetch = async (_url, o) => {
  providerCalls++;
  if (failNext) {
    failNext = false;
    return Response.json({ choices: [{ message: { content: 'invalid response' }, finish_reason: 'stop' }] });
  }
  const b = JSON.parse(o.body),
    lines = b.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n')
      .split('\n');
  let input;
  for (const line of lines)
    if (line.startsWith('{'))
      try {
        const p = JSON.parse(line);
        if (p.facts?.length && p.chapters?.length === 4 && p.version?.startsWith('astrox.visual-')) input = p;
      } catch {}
  assert.ok(input, 'provider received canonical visual evidence');
  return Response.json({
    choices: [{ message: { content: JSON.stringify(fixture(input)) }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 100, completion_tokens: 1000 },
  });
};
try {
  for (const width of process.env.QA_WIDTHS?.split(',').map(Number) ?? [320, 375, 800]) {
    active = await environment();
    const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
    await context.addInitScript(value => {
      if (!localStorage.getItem('astrox_v2_state')) localStorage.setItem('astrox_v2_state', value);
    }, seed);
    await context.route('**/api/**', async route => {
      const r = route.request(),
        path = new URL(r.url()).pathname;
      let response;
      const headers = await r.allHeaders();
      const request = new Request(r.url(), {
        method: r.method(),
        headers,
        ...(r.method() === 'POST' || r.method() === 'PUT' ? { body: r.postData() } : {}),
      });
      if (r.method() === 'OPTIONS') response = new Response(null, { status: 204 });
      else if (path === '/api/site-config')
        response = Response.json({ revision: 1, config: projectConfig(active.config) });
      else if (path === '/api/me') response = Response.json({ user: null });
      else if (path === '/api/market') response = Response.json({ market: 'VN' });
      else if (path === '/api/module-access') response = Response.json({ access: {} });
      else if (path === '/api/ai/session') response = Response.json(await active.ticket());
      else if (path === '/api/ai/upgrade') response = await handleAiUpgrade(request, active.env);
      else if (path === '/api/ai') response = await handleConfiguredAi(request, active.env);
      else if (path === '/api/points/balance') response = Response.json({ points: 30 });
      else response = Response.json({});
      await route.fulfill({
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          'access-control-allow-origin': base,
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': 'authorization,content-type',
          'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
        },
        body: await response.text(),
      });
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.setDefaultTimeout(20000);
    await page.goto(base + '/thansohoc');
    await page.waitForLoadState('networkidle');
    if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /số chủ đạo/i }).click();
    await page.getByRole('button', { name: 'Nâng cấp miễn phí', exact: true }).waitFor({ state: 'visible' });
    if (width === 320) {
      failNext = true;
      await page.getByRole('button', { name: 'Nâng cấp miễn phí', exact: true }).click();
      await page
        .getByRole('alert')
        .filter({ hasText: /vẫn còn lượt miễn phí/ })
        .waitFor();
      assert.ok(await page.getByText('Đây là bản luận giải gốc', { exact: false }).count());
      assert.equal(
        (await active.env.DB.prepare('SELECT status FROM reading_upgrade_grants').first()).status,
        'available',
      );
    }
    await page.getByRole('button', { name: 'Nâng cấp miễn phí', exact: true }).click();
    const reader = page.locator('[data-visual-reading]');
    await reader.waitFor();
    assert.equal(
      (await active.env.DB.prepare("SELECT balance FROM zalo_point_accounts WHERE user_id='reader'").first()).balance,
      30,
    );
    assert.equal((await active.env.DB.prepare('SELECT COUNT(*) AS n FROM zalo_point_ledger').first()).n, 0);
    await page.getByText(/Các phiên bản đã lưu/).click();
    await page.getByRole('button', { name: /Bài trước/ }).click();
    assert.ok(await page.getByText('Đây là bản luận giải gốc', { exact: false }).count());
    await page.getByRole('button', { name: 'Bản hiện tại', exact: true }).click();
    await reader.waitFor();
    await reader.screenshot({ path: out + '/upgrade-' + width + '.png' });
    const before = providerCalls;
    await page.reload();
    await page.waitForLoadState('networkidle');
    if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /số chủ đạo/i }).click();
    await reader.waitFor();
    assert.equal(providerCalls, before);
    await page.goto(base + '/tuvi?view=period');
    await page.waitForLoadState('networkidle');
    if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Mở vận trình/ }).click();
    await page.locator('[data-period-timeline]').waitFor();
    for (const name of ['Tuần này', 'Tháng này']) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.getByRole('button', { name: /Mở vận trình/ }).click();
      const timeline = page.locator('[data-period-timeline]');
      await timeline.waitFor();
      await timeline.scrollIntoViewIfNeeded();
      const samples = timeline.locator('[data-sample-date]');
      assert.ok((await samples.count()) >= 3);
      await samples.nth(1).click();
      await samples.nth(1).focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await samples.nth(2).getAttribute('aria-pressed'), 'true');
      await page.waitForTimeout(750);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await timeline.screenshot({
        path: out + '/timeline-' + width + '-' + (name === 'Tuần này' ? 'week' : 'month') + '.png',
      });
      await samples.nth(0).click();
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(
        await reader.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length),
        0,
      );
      await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await samples.nth(1).click();
      await page.waitForTimeout(80);
      assert.equal(
        await reader.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length),
        0,
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    checks.push(
      width +
        'px: free conversion, original history/reload, zero wallet debit, real Tu Vi day/week/month timelines, keyboard, motion and overflow',
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    out + '/result.json',
    JSON.stringify(
      {
        checks,
        errors,
        providerCalls,
        boundary:
          'Local browser; real React/calculators and real SQLite backend; provider fixtures; no real customer credentials or wallets',
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ checks, errors, providerCalls }));
} finally {
  globalThis.fetch = savedFetch;
  await browser.close();
}
