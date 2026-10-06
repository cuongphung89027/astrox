/** Local browser QA only: API/provider responses are fixtures; calculations and React are real. */
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://localhost:3167',
  root = fileURLToPath(new URL('../../', import.meta.url)),
  out = process.env.QA_OUT || '/tmp/astrox-visual-integration-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [],
  errors = [];
let aiCalls = 0;
try {
  for (const width of [320, 375, 800]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      if (!localStorage.getItem('astrox_v2_state'))
        localStorage.setItem(
          'astrox_v2_state',
          JSON.stringify({
            onboarded: true,
            profile: { name: 'Trần Minh An', gender: 'Nam', dob: '2001-03-08', hourChi: 'Tý', place: 'Hà Nội' },
            aiCache: { version: 2, profiles: {}, legacy: {} },
          }),
        );
    });
    await context.route('**/api/**', async r => {
      const req = r.request(),
        path = new URL(req.url()).pathname;
      let data = {};
      let status = 200;
      if (path === '/api/me') data = { user: null };
      else if (path === '/api/module-access') data = { access: {} };
      else if (path === '/api/site-config')
        data = {
          revision: 1,
          config: {
            content: {},
            billing: {
              enabled: false,
              services: [
                ['numerology--life-path', 'numerology'],
                ['batu--tinh-cach', 'batu'],
                ['tuvi--tim-hieu-ban-than--tinh-cach', 'tuvi'],
                ['zodiac--tinh-cach-cung--dac-diem-cot-loi', 'zodiac'],
                ['compat--pair', 'compat'],
              ].map(([id, module]) => ({ id, module, name: id, status: 'free', points: 0 })),
            },
          },
        };
      else if (path === '/api/ai/session') status = 401;
      else if (path === '/api/ai' && req.method() === 'POST') {
        aiCalls++;
        const body = req.postDataJSON();
        assert.ok(body.promptDescriptor.id.endsWith('.visualReport.v1'));
        const child = spawnSync(
          process.execPath,
          ['--import', './web/tests/support/register.mjs', 'web/scripts/visual-reading-fixture.mjs'],
          { cwd: root, input: JSON.stringify(body), encoding: 'utf8' },
        );
        assert.equal(child.status, 0, child.stderr);
        data = {
          choices: [{ message: { content: child.stdout }, finish_reason: 'stop' }],
          configRevision: 1,
          languagePolicyVersion: 'vi-reading-2',
        };
      }
      await r.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true' },
        body: JSON.stringify(data),
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/thansohoc');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /số chủ đạo/i }).click();
    await page.getByRole('button', { name: /Đọc luận giải/ }).click();
    const reader = page.locator('[data-visual-reading]');
    await reader.waitFor();
    await reader.scrollIntoViewIfNeeded();
    for (let i = 0; i < 4; i++) {
      await reader.getByRole('tab').nth(i).click();
      await reader.locator('summary').click();
      await page.waitForTimeout(750);
      assert.ok(await reader.locator('details').evaluate(e => e.open));
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${width}/${i}: page overflow`,
      );
      const overflow = await reader.evaluate(el => {
        const root = el.getBoundingClientRect();
        return [...el.querySelectorAll('button,h2,h3,p,summary')]
          .filter(e => {
            const r = e.getBoundingClientRect();
            return r.width && (r.left < root.left - 1 || r.right > root.right + 1);
          })
          .map(e => e.textContent.slice(0, 80));
      });
      assert.deepEqual(overflow, [], `${width}/${i}: clipped content`);
      await reader.screenshot({ path: `${out}/${width}-chapter-${i + 1}.png` });
    }
    await reader.getByRole('tab').nth(0).click();
    await reader.getByRole('tab').nth(0).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await reader.getByRole('tab').nth(1).getAttribute('aria-selected'), 'true');
    // Consecutive input must always settle on the most recent chapter and release animations.
    for (const i of [0, 3, 1, 2, 3]) await reader.getByRole('tab').nth(i).click({ force: true });
    await page.waitForTimeout(850);
    assert.equal(await reader.getByRole('tab').nth(3).getAttribute('aria-selected'), 'true');
    assert.equal(
      await reader.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length),
      0,
    );
    await reader.getByRole('tab').nth(1).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(80);
    assert.equal(
      await reader.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length),
      0,
    );
    await reader.getByRole('tab').nth(2).click();
    assert.equal(
      await reader.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length),
      0,
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await reader.getByRole('tab').nth(1).click();
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(
      await reader.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length),
      0,
    );
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await reader.getByRole('tab').nth(3).click();
    await page.evaluate(
      () =>
        (window.__readingAnimations = [
          ...document.querySelector('[data-visual-reading]').getAnimations({ subtree: true }),
        ]),
    );
    await page.getByRole('tab', { name: 'Của bạn', exact: true }).click();
    await page.waitForTimeout(80);
    assert.equal(
      await page.evaluate(() => window.__readingAnimations.filter(a => a.playState === 'running').length),
      0,
      'leaving the view must cancel motion',
    );
    await page.getByRole('tab', { name: 'Luận giải', exact: true }).click();
    await reader.getByRole('tab').nth(2).click();
    await page.evaluate(
      () =>
        (window.__readingAnimations = [
          ...document.querySelector('[data-visual-reading]').getAnimations({ subtree: true }),
        ]),
    );
    await page.getByRole('button', { name: '← Các chủ đề', exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.__readingAnimations.filter(a => a.playState === 'running').length),
      0,
      'React unmount must cancel motion',
    );
    await page.getByRole('button', { name: /số chủ đạo/i }).click();
    await reader.waitFor();
    const before = aiCalls;
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /số chủ đạo/i }).click();
    await reader.waitFor();
    assert.equal(aiCalls, before, 'reopening saved report made another AI request');
    const detail = await reader.locator('summary').getAttribute('aria-expanded');
    assert.equal(detail, 'false');
    checks.push(
      `${width}px four chapters, details, keyboard, rapid choices, reduced motion, hidden/unmount cleanup, cached reopen`,
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      { checks, errors, aiCalls, boundary: 'Local browser, APIs stubbed, real calculators/React reader' },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ checks, errors, aiCalls }));
} finally {
  await browser.close();
}
