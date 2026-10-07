/** UI regression checks use synthetic local profiles, saved report fixtures and mocked APIs/browser capabilities. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { graph, memoryStorage } from '../tests/support/load.mjs';
import { original, serviceId, fixture } from '../tests/support/visual-fixtures.mjs';
import { visualInput, wrapVisualPrompt, saveVisualReading } from '../../services/admin/visual-reading.ts';
import { defaultConfig, publicConfig } from '../../services/admin/config.ts';
const base = process.env.BASE_URL || 'http://127.0.0.1:3188',
  out = process.env.QA_OUT || '/tmp/astrox-reading-ux-fixes-qa';
mkdirSync(out, { recursive: true });
const profile = { name: 'Minh An', gender: 'Nam', dob: '2001-03-08', hourChi: 'Tý', place: 'Hà Nội' };
async function seed(locale, legacy = false) {
  const storage = memoryStorage();
  const load = graph({
    globals: {
      localStorage: storage,
      window: {
        location: { pathname: locale === 'en' ? '/en/numerology' : '/thansohoc' },
        dispatchEvent() {},
        addEventListener() {},
        removeEventListener() {},
      },
      document: { documentElement: { lang: locale } },
    },
  });
  const s = await load('lib/state.ts');
  s.setState({ onboarded: true, profile });
  const input = visualInput(wrapVisualPrompt(original, serviceId, locale), serviceId, locale);
  const raw = legacy
    ? '# Góc nhìn\n\n**Điểm mạnh** và *linh hoạt*. C#; 2 * 3 = 6; snake_case.'
    : saveVisualReading(JSON.stringify(fixture(input)), input);
  s.writeAiCache('numerologyTopics', 'life-path', raw, { module: 'numerology', topic: 'life-path' });
  return storage.getItem('astrox_v2_state');
}
const defaults = defaultConfig();
defaults.ai.enabled = true;
defaults.billing.enabled = true;
defaults.billing.unlocks.enabled = false;
defaults.billing.services.forEach(s => {
  s.status = 'free';
  s.points = 0;
});
const config = publicConfig(defaults);
const browser = await chromium.launch({ headless: true });
const results = [],
  errors = [];
async function contextFor(
  width,
  locale,
  legacy = false,
  zone = locale === 'en' ? 'America/Los_Angeles' : 'Asia/Ho_Chi_Minh',
) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: zone });
  const value = await seed(locale, legacy);
  await context.addInitScript(value => {
    localStorage.setItem('astrox_v2_state', value);
    window.__speech = [];
    window.__cancel = 0;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async text => {
          window.__copied = text;
        },
      },
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async data => {
        window.__shared = data.text;
      },
    });
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [],
        cancel: () => window.__cancel++,
        speak: u => {
          window.__speech.push(u.text);
          window.__utterance = u;
        },
      },
    });
  }, value);
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const body =
      path === '/api/site-config'
        ? { revision: 1, config }
        : path === '/api/me'
          ? { user: null }
          : path === '/api/market'
            ? { market: locale === 'en' ? 'US' : 'VN' }
            : path === '/api/module-access'
              ? { access: {} }
              : path === '/api/ai/upgrade'
                ? { available: false }
                : {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-06T19:00:00Z') });
  page.on('pageerror', e => errors.push(`${width}/${locale}: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error' && /cannot contain|hydration|nested|does not match/i.test(m.text())) errors.push(m.text());
  });
  return { context, page };
}
try {
  for (const locale of ['vi', 'en'])
    for (const width of [320, 375, 1024, 1280]) {
      const { context, page } = await contextFor(width, locale);
      await page.goto(base + (locale === 'en' ? '/en' : ''));
      await page.waitForLoadState('networkidle');
      const personal = page
        .locator('section')
        .filter({
          has: page.getByRole('link', { name: locale === 'en' ? 'Personal reading with AI' : 'Tạo vận trình cá nhân' }),
        })
        .last();
      await personal.waitFor();
      const copy = await personal.innerText();
      assert.ok(!/\d+%/.test(copy));
      assert.ok(copy.includes(locale === 'en' ? 'Basis:' : 'Căn cứ:'));
      assert.ok(copy.includes(locale === 'en' ? '2026-10-07' : 'Tam nương'));
      assert.ok(copy.includes(locale === 'en' ? '10/6/2026' : '7/10/2026'));
      const calendar = page.locator('article').filter({ has: page.locator('#home-calendar-title') });
      const deity = calendar.locator('button').filter({ hasText: locale === 'en' ? 'Azure Dragon' : 'Thanh Long' });
      await deity.click();
      const tip = page.getByRole('tooltip');
      await tip.waitFor({ state: 'visible' });
      await page.waitForTimeout(350);
      const box = await tip.boundingBox();
      assert.ok(box.x >= 15 && box.x + box.width <= width - 15, JSON.stringify(box));
      assert.equal(
        await page.evaluate(() => document.querySelector('[role=tooltip]').parentElement === document.body),
        true,
      );
      await page.keyboard.press('Escape');
      await tip.waitFor({ state: 'detached' });
      if (width >= 1024) {
        const group = page.getByRole('button', { name: locale === 'en' ? 'Know Yourself' : 'Tìm hiểu bản thân' });
        await group.hover();
        await page.waitForTimeout(350);
        const region = page.getByRole('region', { name: locale === 'en' ? 'Know Yourself' : 'Tìm hiểu bản thân' });
        await region.waitFor({ state: 'visible' });
        const rule = await page.locator('.ax-nav-link[aria-current=page] .ax-nav-underline').evaluate(n => ({
          height: getComputedStyle(n).height,
          width: n.getBoundingClientRect().width,
          background: getComputedStyle(n).backgroundImage,
        }));
        assert.equal(rule.height, '1.5px');
        assert.ok(rule.width <= 64);
        assert.ok(rule.background.includes('gradient'));
        await page.screenshot({ path: `${out}/nav-${locale}-${width}.png` });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `${out}/home-${locale}-${width}.png`, fullPage: true });
      await page.goto(base + (locale === 'en' ? '/en/numerology' : '/thansohoc'));
      await page.waitForLoadState('networkidle');
      await page
        .getByRole('button', { name: locale === 'en' ? /Life Path .*open reading/ : /Số chủ đạo .*xem luận giải/ })
        .first()
        .click();
      const toolbar = page.getByRole('toolbar');
      await toolbar.waitFor();
      await toolbar.getByRole('button', { name: locale === 'en' ? 'Copy' : 'Sao chép', exact: true }).click();
      const exported = await page.evaluate(() => window.__copied);
      assert.ok(exported.includes(locale === 'en' ? 'Why this interpretation?' : 'Vì sao có nhận định này?'));
      assert.ok(!exported.includes('sourceFactIds') && !exported.includes('astrox.saved-visual-reading'));
      await toolbar.getByRole('button', { name: locale === 'en' ? 'Share' : 'Chia sẻ', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__shared), exported);
      await toolbar.getByRole('button', { name: locale === 'en' ? 'Listen' : 'Nghe bài', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__speech.length), 1);
      await toolbar.getByRole('button', { name: locale === 'en' ? 'Stop' : 'Dừng đọc', exact: true }).click();
      await page.evaluate(() => window.__utterance.onend());
      assert.equal(await page.evaluate(() => window.__speech.length), 1, 'cancelled speech must not restart');
      await page.screenshot({ path: `${out}/reading-${locale}-${width}.png` });
      results.push({
        width,
        locale,
        tooltip: 'tap/portal/clamped/Escape',
        toolbar: 'copy/share/listen/stop',
        dates: 'personal/reference distinct',
        overflow: false,
      });
      await context.close();
    }
  const { context, page } = await contextFor(375, 'vi', true);
  await page.goto(base + '/thansohoc');
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('button', { name: /Số chủ đạo .*xem luận giải/ })
    .first()
    .click();
  await page.getByRole('toolbar').getByRole('button', { name: 'Sao chép', exact: true }).click();
  const plain = await page.evaluate(() => window.__copied);
  assert.ok(plain.includes('C#; 2 * 3 = 6; snake_case.'));
  assert.ok(!plain.includes('**') && !plain.startsWith('# '));
  const legacyToolbar = page.getByRole('toolbar');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw Error('denied');
    };
  });
  await legacyToolbar.getByRole('button', { name: /Sao chép/ }).click();
  await page.getByRole('status').filter({ hasText: 'Chưa sao chép được' }).waitFor();
  await legacyToolbar.getByRole('button', { name: 'Nghe bài', exact: true }).click();
  const cancels = await page.evaluate(() => window.__cancel);
  await page.getByRole('button', { name: '← Các chủ đề', exact: true }).click();
  assert.ok((await page.evaluate(() => window.__cancel)) > cancels, 'leaving a reading cancels speech');
  const spoken = await page.evaluate(() => window.__speech.length);
  await page.evaluate(() => window.__utterance.onend());
  assert.equal(await page.evaluate(() => window.__speech.length), spoken, 'unmounted speech must not restart');
  await context.close();
  const reduced = await contextFor(1280, 'vi');
  await reduced.page.emulateMedia({ reducedMotion: 'reduce' });
  await reduced.page.goto(base);
  await reduced.page.waitForLoadState('networkidle');
  const group = reduced.page.getByRole('button', { name: 'Tìm hiểu bản thân' });
  await group.focus();
  await reduced.page.keyboard.press('Enter');
  await reduced.page.getByRole('region', { name: 'Tìm hiểu bản thân' }).waitFor({ state: 'visible' });
  await reduced.page.keyboard.press('Escape');
  assert.equal(await group.getAttribute('aria-expanded'), 'false');
  const transition = await group.locator('.ax-nav-underline').evaluate(n => getComputedStyle(n).transitionDuration);
  assert.ok(transition.split(',').every(value => parseFloat(value) <= 0.00001), 'reduced motion has effectively zero transition time');
  const term = reduced.page.locator('#home-lunar-date button');
  await term.focus();
  await reduced.page.getByRole('tooltip').waitFor({ state: 'visible' });
  await reduced.page.keyboard.press('Escape');
  await reduced.page.getByRole('tooltip').waitFor({ state: 'detached' });
  await term.hover();
  await reduced.page.getByRole('tooltip').waitFor({ state: 'visible' });
  await reduced.page.keyboard.press('Escape');
  await reduced.page.getByRole('tooltip').waitFor({ state: 'detached' });
  await reduced.context.close();
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/results.json`, JSON.stringify({ results, legacyPlainText: plain, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, legacyPlainText: true, errors, out }, null, 2));
} finally {
  await browser.close();
}
