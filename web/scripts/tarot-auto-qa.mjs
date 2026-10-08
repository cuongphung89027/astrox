import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.QA_BASE || 'http://localhost:3322';
const out = new URL('../../qa-report/tarot-auto/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [],
  errors = [];
async function pageFor(width = 390, height = 844, en = false, motion = 'reduce', beforeLoad) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: motion });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      'astrox_v2_state',
      JSON.stringify({
        profile: { name: 'QA Tarot', gender: 'Nữ', dob: '1995-05-15', hourChi: 'Tí (23:00–01:00)', place: 'Hà Nội' },
        onboarded: true,
      }),
    ),
  );
  if (beforeLoad) await beforeLoad(page);
  await page.goto(`${base}/${en ? 'en/' : ''}tarot`);
  await page.getByRole('button', { name: /QA Tarot/ }).waitFor();
  await page.waitForTimeout(300); // Existing route entrance animation must settle before measuring.
  await page.waitForFunction(() => document.querySelectorAll('#tarot-question').length === 1);
  await page.locator('[class*="__start"]').waitFor();
  return page;
}
const start = (p, en = false) =>
  p.getByRole('button', { name: en ? 'Start your reading' : 'Bắt đầu trải bài', exact: true });
async function fits(p, label) {
  const sizes = await p.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(sizes.document <= sizes.viewport + 1, `${label}: ${JSON.stringify(sizes)}`);
  const controls = await p
    .locator('[class*="spreadChoices"] button')
    .evaluateAll(nodes => nodes.map(n => ({ width: n.clientWidth, scroll: n.scrollWidth })));
  assert.ok(
    controls.every(n => n.scroll <= n.width + 1),
    `${label}: spread tile content clipped ${JSON.stringify(controls)}`,
  );
}
try {
  for (const en of process.env.QA_INTERACTIONS_ONLY ? [] : [false, true])
    for (const width of [320, 390, 600, 768, 834, 1024, 1440]) {
      const p = await pageFor(width, width < 700 ? 844 : 1024, en);
      await fits(p, `setup ${width} ${en}`);
      if ([390, 834, 1440].includes(width))
        await p.screenshot({ path: new URL(`setup-${width}-${en ? 'en' : 'vi'}.png`, out).pathname, fullPage: true });
      for (const [name, count] of [
        [en ? 'One card' : 'Một lá', 1],
        [en ? 'Three cards' : 'Ba lá', 3],
        [en ? 'Simple cross' : 'Thánh giá', 5],
        [en ? 'Relationships' : 'Tình yêu', 5],
        ['Celtic Cross', 10],
      ]) {
        await p.locator('[class*="spreadChoices"] button').filter({ hasText: name }).click();
        await start(p, en).click();
        await p.locator('[data-tarot-table]').waitFor();
        await p.waitForFunction(
          n => document.querySelectorAll('[class*="cardDetails"]').length === (n === 10 ? 9 : n),
          count,
        );
        await fits(p, `board ${name} ${width} ${en}`);
        const details = p.locator('[class*="cardDetails"]').first();
        await details.locator('summary').focus();
        await p.keyboard.press('Enter');
        assert.equal(await details.getAttribute('open'), '');
        if (count === 10 && [390, 834, 1440].includes(width))
          await p.screenshot({ path: new URL(`board-${width}-${en ? 'en' : 'vi'}.png`, out).pathname, fullPage: true });
        await p.getByRole('button', { name: en ? 'Start another reading' : 'Trải bài khác', exact: true }).click();
      }
      console.log('passed viewport', width, en ? 'en' : 'vi');
      results.push({
        case: 'responsive manual layouts + keyboard card details',
        width,
        locale: en ? 'en' : 'vi',
        spreads: 5,
      });
      await p.close();
    }
  for (const en of [false, true]) {
    const p = await pageFor(390, 844, en);
    let requests = 0,
      mode = 'selected',
      hold;
    await p.route('**/api/tarot/select', async route => {
      requests++;
      if (mode === 'hold') await new Promise(r => (hold = r));
      await route
        .fulfill({
          status: mode === 'rate' ? 429 : 200,
          json:
            mode === 'selected' || mode === 'hold'
              ? { status: 'selected', spreadId: 'relationship5', reasonCode: 'relationship', source: 'jev' }
              : mode === 'rate'
                ? { code: 'rate_limited' }
                : { status: mode, source: 'jev' },
        })
        .catch(() => {});
    });
    await p
      .locator('textarea')
      .fill(en ? 'How can we communicate better as partners?' : 'Hai người chúng tôi nên giao tiếp như thế nào?');
    await start(p, en).focus();
    await p.keyboard.press('Enter');
    await p.locator('[data-tarot-table]').waitFor();
    assert.equal(requests, 1);
    await p.waitForFunction(() => document.querySelectorAll('[class*="cardDetails"]').length === 5);
    await p.getByRole('button', { name: en ? 'Start another reading' : 'Trải bài khác', exact: true }).click();
    for (const state of ['needs_context', 'unsupported_comparison', 'rate']) {
      mode = state;
      await start(p, en).click();
      const alert = p.locator('[class*="autoError"]');
      await alert.waitFor();
      assert.equal(await alert.evaluate(n => n === document.activeElement), true);
      await fits(p, state);
    }
    mode = 'hold';
    await start(p, en).click();
    await p.getByRole('button', { name: en ? 'Cancel' : 'Hủy', exact: true }).click();
    await start(p, en).waitFor();
    await p.waitForFunction(() => document.activeElement?.className.includes('__start'), {}, { timeout: 1500 });
    assert.equal(await start(p, en).evaluate(n => n === document.activeElement), true);
    hold?.();
    await p.waitForTimeout(200);
    assert.equal(await p.locator('[data-tarot-table]').count(), 0);
    await p.locator('textarea').fill('');
    const before = requests;
    await start(p, en).click();
    await p.locator('[data-tarot-table]').waitFor();
    assert.equal(requests, before);
    results.push({
      case: 'auto result, keyboard start, clarification, quota error focus, cancel late result, blank local selection',
      locale: en ? 'en' : 'vi',
    });
    await p.close();
  }
  const p = await pageFor(390, 844, false, 'no-preference');
  await p.route('**/api/tarot/select', async route => {
    await p.waitForTimeout(750);
    await route.fulfill({
      json: { status: 'selected', spreadId: 'three', frameId: 'sao', reasonCode: 'action', source: 'jev' },
    });
  });
  await p.locator('textarea').fill('Tôi nên làm gì tiếp theo?');
  await start(p).click();
  await p.locator('[data-scanning=true]').waitFor();
  await p.getByRole('button', { name: 'Bỏ qua hiệu ứng', exact: true }).click();
  await p.locator('[data-tarot-table]').waitFor();
  await p.waitForFunction(() => document.querySelectorAll('[class*="cardDetails"]').length === 3);
  results.push({ case: 'travelling highlight and skip' });
  await p.close();
  for (const en of [false, true]) {
    const nav = await pageFor(390, 844, en);
    const trigger = nav.locator('nav [aria-controls="discovery-menu"]');
    await trigger.focus();
    await nav.keyboard.press('Enter');
    await nav.locator('[role=dialog][id=discovery-menu]').waitFor();
    await nav.keyboard.press('Escape');
    await nav.waitForTimeout(100);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await trigger.evaluate(n => n === document.activeElement), true);
    await nav.close();
  }
  results.push({ case: 'VI/EN discovery dock keyboard open, Escape and focus restoration' });
  const reveal = await pageFor(834, 1112, false, 'no-preference');
  await reveal.locator('[class*="spreadChoices"] button').filter({ hasText: 'Celtic Cross' }).click();
  await start(reveal).click();
  await reveal.locator('[data-tarot-card="0"] img').first().waitFor();
  const first = await reveal.locator('[data-tarot-card="0"] img').first().getAttribute('src');
  await reveal.getByRole('button', { name: 'Hiện tất cả', exact: true }).click();
  await reveal.waitForFunction(() => document.querySelectorAll('[data-tarot-card]').length === 10);
  assert.equal(await reveal.locator('[data-tarot-card="0"] img').first().getAttribute('src'), first);
  assert.equal(await reveal.locator('[class*="cardDetails"]').count(), 9);
  await reveal.close();
  results.push({ case: 'reveal all stops animation without changing already drawn card' });
  const unavailable = await pageFor();
  await unavailable.locator('textarea').fill('Nên bắt đầu từ đâu?');
  const unavailableResponse = unavailable.waitForResponse(response => response.url().endsWith('/api/tarot/select'));
  await start(unavailable).click();
  assert.equal((await unavailableResponse).status(), 503);
  await unavailable.locator('[class*="autoError"]').waitFor();
  assert.equal(await unavailable.locator('textarea').inputValue(), 'Nên bắt đầu từ đâu?');
  await unavailable.getByRole('button', { name: 'Dùng 3 lá', exact: true }).click();
  await unavailable.locator('[data-tarot-table]').waitFor();
  await unavailable.close();
  results.push({ case: 'actual local endpoint unavailable response keeps question and explicit fallback works' });
  for (const en of [false, true]) {
    const tooltip = await pageFor(390, 844, en);
    const sound = tooltip.getByRole('button', {
      name: en ? 'Unmute deck preview' : 'Bật tiếng video giới thiệu bộ bài',
      exact: true,
    });
    await sound.hover();
    assert.equal(await sound.getAttribute('title'), en ? 'Unmute' : 'Bật tiếng');
    await sound.focus();
    await tooltip.keyboard.press('Enter');
    assert.equal(await tooltip.locator('[class*="deckSound"]').getAttribute('aria-pressed'), 'true');
    await tooltip.close();
  }
  results.push({
    case: 'VI/EN native tooltip title and equivalent accessible label; sound toggle by keyboard (native tooltip pixels not captured)',
  });
  const missingCards = await pageFor(390, 844, false, 'reduce', async page => {
    await page.route('**/assets/tarot/cards.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  });
  await missingCards.getByText('Không tải được bộ bài.', { exact: false }).waitFor();
  assert.equal(await missingCards.locator('[class*="__start"]').isEnabled(), false);
  await missingCards.unroute('**/assets/tarot/cards.json');
  await missingCards.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await missingCards.waitForFunction(() => !document.querySelector('[class*="__start"]').disabled);
  await missingCards.close();
  results.push({ case: 'card data error disables start and retry restores it' });
  const zoom = await pageFor(1280, 900);
  for (const scale of [2, 4]) {
    await zoom.evaluate(n => (document.documentElement.style.zoom = String(n)), scale);
    await fits(zoom, `CSS zoom ${scale}`);
  }
  await zoom.close();
  results.push({ case: 'CSS zoom 200/400%, plus true 320px reflow above (not browser chrome zoom)' });
  const dock = await pageFor();
  await dock.locator('textarea').focus();
  await dock.setViewportSize({ width: 390, height: 500 });
  await dock.locator('nav[data-keyboard-open=true]').waitFor();
  await dock.locator('textarea').blur();
  await dock.setViewportSize({ width: 390, height: 844 });
  await dock.locator('nav[data-keyboard-open=false]').waitFor();
  results.push({ case: 'simulated keyboard viewport shrink hides/restores dock' });
  await dock.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, errors }, null, 2));
} finally {
  await writeFile(new URL('results.json', out), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
