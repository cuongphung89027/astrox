#!/usr/bin/env node
/** Real static-export UI and calculations, with explicit local API fixtures.
 * No real Google sign-in, Lemon charge, ad impression or physical-camera claim.
 * Run after build: ENGINE=chromium|webkit WIDTH=390|1280 node web/scripts/parity-audit.mjs
 */
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';
import { defaultConfig, publicConfig } from '../../services/admin/config.ts';
import { chromium, webkit } from 'playwright';

const OUT = fileURLToPath(new URL('../out/', import.meta.url));
const PORT = Number(process.env.PORT || 3999),
  width = Number(process.env.WIDTH || 1280),
  engine = process.env.ENGINE || 'chromium';
const results = [],
  artifactDir = fileURLToPath(new URL(`../../qa-report/english-us/parity/${engine}-${width}/`, import.meta.url));
await mkdir(artifactDir, { recursive: true });
const MIME = {
  '.html': 'text/html',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.svg': 'image/svg',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

async function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';
    try {
      let file = join(OUT, path.slice(1));
      if (
        !(await stat(file).then(
          s => s.isFile(),
          () => false,
        ))
      ) {
        if (!path.endsWith('.html')) {
          const withHtml = file + '.html';
          if (
            await stat(withHtml).then(
              s => s.isFile(),
              () => false,
            )
          )
            file = withHtml;
          else file = join(OUT, path.replace(/\/$/, '') + '/index.html');
        }
      }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise(r => server.listen(PORT, r));
  return server;
}

const server = await serve(),
  browser = await { chromium, webkit }[engine].launch({ headless: true });
const profile = {
  name: 'Alex',
  fullName: 'Alex Morgan',
  gender: 'Nam',
  dob: '1990-01-01',
  hourChi: 'Tý (23:00–00:59)',
  birthTime: '00:30',
  place: 'Hà Nội',
};
try {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(p => {
    if (!localStorage.getItem('astrox_v2_state:account:google:parity-qa'))
      localStorage.setItem('astrox_v2_state:account:google:parity-qa', JSON.stringify({ profile: p, onboarded: true }));
  }, profile);
  const config = defaultConfig();
  config.billing.enabled = true;
  config.integrations.lemon.enabled = true;
  config.integrations.lemon.packages = [
    { id: 'us-small', name: 'Starter', credits: 5, amountUsdCents: 499, variantId: 'fixture', enabled: true },
  ];
  for (const service of config.billing.services) {
    service.status = 'free';
    service.points = 0;
  }
  const page = await context.newPage(),
    errors = [],
    calls = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url()),
      p = url.pathname;
    if (!p.startsWith('/api/') && !p.startsWith('/internal/'))
      return url.hostname === 'localhost' ? route.continue() : route.abort();
    const send = json => route.fulfill({ json });
    if (p === '/api/me')
      return send({ user: { id: 'parity-qa', display_name: 'Alex', provider: 'google' }, points: 100 });
    if (p === '/api/market') return send({ market: 'US' });
    if (p === '/api/module-access') return send({ access: {} });
    if (p === '/api/site-config') return send({ config: publicConfig(config, 'US'), revision: 1 });
    if (p === '/api/ai/session') return send({ token: 'local-ui-fixture', userId: 'parity-qa' });
    if (p === '/api/ai') {
      calls.push(route.request().postDataJSON());
      await new Promise(r => setTimeout(r, 200));
      return send({
        languagePolicyVersion: 'en-reading-1',
        configRevision: 1,
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: '**Overview**\n\nYour thoughtful English reading.\n\n**Advice**\n\nTake time to reflect.',
            },
          },
        ],
      });
    }
    if (p === '/api/user-data')
      return send(route.request().method() === 'GET' ? { profile, _syncRevision: 0 } : { revision: 1 });
    if (p === '/api/rewards/summary')
      return send({
        enabled: true,
        attendance: {
          enabled: true,
          today: false,
          daily: 1,
          streak: 0,
          claimed: [],
          milestones: [{ day: 7, points: 4, inviterPoints: 2 }],
        },
        ads: { enabled: true, points: 2, dailyLimit: 3, used: 0, cooldownSeconds: 30 },
        referral: {
          enabled: true,
          code: 'REFER1',
          invited: 2,
          earned: 4,
          registrationUser: 3,
          registrationInviter: 4,
          firstTopupEnabled: true,
          firstTopupMinVnd: 499,
          firstTopupInviter: 5,
        },
      });
    if (p === '/api/credits/history')
      return send({
        entries: [{ id: 'spend', kind: 'spend', delta: -30, created_at: '2026-09-28' }],
        nextCursor: null,
      });
    if (p === '/api/lemon/history') return send({ orders: [] });
    if (p === '/api/credits/summary')
      return send({ available: 100, balance: 100, reserved: 0, purchased: 100, bonus: 0, status: 'active' });
    return send({});
  });
  const audit = async (route, label) => {
    const text = await page.locator('body').innerText();
    const clean = t => t.replace(/Hà Nội|TP\. Hồ Chí Minh|Đà Nẵng|Hải Phòng|Cần Thơ/g, '');
    const hasVi = t => /[đăâêôơưạảấầậẩẫắằặẳẵẹẻếềệểễịỉọỏốồộổỗớờợởỡụủứừựửữỵỷ]/iu.test(clean(t));
    const vi = text.split('\n').filter(hasVi);
    const aria = (
      await page
        .locator('[aria-label]')
        .evaluateAll(es => es.filter(e => e.getClientRects().length).map(e => e.getAttribute('aria-label')))
    ).filter(hasVi);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    const row = {
      route,
      label,
      vi,
      aria,
      overflow,
      errors: [...errors],
      pass: !vi.length && !aria.length && !overflow && !errors.length,
    };
    results.push(row);
    console.log(JSON.stringify(row));
    if (label === 'interaction' || !row.pass)
      await page.screenshot({
        path: join(artifactDir, `${route.replace(/[^a-z0-9-]/gi, '-')}-${label}.png`),
        fullPage: true,
      });
  };

  const go = async route => {
    await page.goto(`http://localhost:${PORT}/en/${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  };
  for (const route of [
    '',
    'zi-wei',
    'ba-zi',
    'astrology',
    'numerology',
    'compatibility',
    'tarot',
    'i-ching',
    'lunar-calendar',
    'profile?section=points',
    'profile?section=earn',
    'profile?section=personal',
    'profile?section=account',
    'profile?section=preferences',
    'pricing',
    'terms',
    'palm-reading',
  ]) {
    if (process.env.INTERACTIVE_ONLY && !route.startsWith('profile')) continue;
    await go(route);
    await audit(route, 'initial');
    const tabs = await page.getByRole('tab').all();
    for (let i = 0; i < tabs.length; i++) {
      await tabs[i].click();
      await audit(route, 'tab' + i);
    }
  }
  const step = async (name, fn) => {
    try {
      await fn();
      await audit(name, 'interaction');
    } catch (e) {
      results.push({ step: name, pass: false, failure: e.message });
      console.log(JSON.stringify(results.at(-1)));
    }
  };
  for (const method of ['tube', 'coins', 'numbers', 'time', 'serial', 'phone', 'digits'])
    await step('i-ching-' + method, async () => {
      await go('i-ching');
      await page.locator('#kd-method').selectOption(method);
      if (['serial', 'phone', 'digits'].includes(method))
        await page
          .locator('#kd-digits')
          .fill(method === 'serial' ? 'AB00123456' : method === 'phone' ? '+1 415 555 1234' : '001234');
      await audit('i-ching-' + method, 'input');
      await page
        .locator('button')
        .filter({ hasText: /^(Shake|Cast)( hexagram)?\s*↗$/ })
        .click();
      const skip = page.getByRole('button', { name: /Skip|Reveal now/ });
      if (await skip.count()) await skip.first().click();
      await page.getByRole('heading', { name: 'Your hexagram', exact: true }).waitFor();
      const details = page.locator('summary');
      for (const d of await details.all()) if (await d.isVisible()) await d.click();
    });
  await step('i-ching-AI', async () => {
    await page
      .getByRole('button', { name: /Read interpretation/ })
      .first()
      .click();
    await page.getByText('Your thoughtful English reading.', { exact: true }).waitFor();
    assert.equal(calls.at(-1).locale, 'en');
    assert.equal(calls.at(-1).market, 'US');
  });
  for (const mode of ['tuvi', 'batu'])
    await step('compat-' + mode, async () => {
      await go('compatibility?mode=' + mode);
      await page.locator('[name=personBName]').fill('Taylor');
      await page.locator('[name=personBDob]').fill('1992-02-02');
      await page.locator('[name=personBGender]').selectOption('Nam');
      await page.locator('[name=personBHour]').selectOption({ index: 3 });
      if (mode === 'batu') await page.locator('[name=personBPlace]').selectOption('Đà Nẵng');
      await page.getByRole('button', { name: 'Calculate both charts', exact: false }).click();
      await page.getByRole('heading', { name: 'Two charts, two perspectives' }).waitFor();
      await page.getByText('View calculated evidence', { exact: false }).click();
      await page.getByRole('button', { name: 'Read your couple interpretation', exact: false }).click();
      await page.getByText('Your thoughtful English reading.', { exact: true }).waitFor();
    });
  await step('tarot-draw', async () => {
    await go('tarot');
    await page.getByRole('button', { name: /One card/ }).click();

    await page
      .getByRole('button', { name: /Start.*reading|Draw.*card/ })
      .last()
      .click();
    await page.getByRole('button', { name: /Interpret.*spread|Read.*spread/ }).waitFor();
    await page.getByRole('button', { name: /Interpret.*spread|Read.*spread/ }).click();
    await page.getByText('Your thoughtful English reading.', { exact: true }).waitFor();
  });
  await step('tarot-journal', async () => {
    await go('tarot?history=1');
    await page.getByText('Single card', { exact: true }).first().waitFor();
    await page
      .getByRole('button', { name: /Single card/ })
      .first()
      .click();
    await page.getByText('Your thoughtful English reading.', { exact: true }).waitFor();
  });
  await step('calendar-conversion', async () => {
    await go('lunar-calendar');

    await page.getByRole('button', { name: 'Convert dates', exact: true }).first().click();
    await page.locator('input[name=solar]').fill('2026-09-28');
    await page.getByRole('button', { name: 'Convert dates', exact: true }).last().click();
  });
  await step('calendar-events', async () => {
    await go('lunar-calendar');
    await page.getByRole('button', { name: /^Events$/ }).click();
    await page.getByRole('button', { name: '＋ Add', exact: true }).click();
    await page.locator('input[name=title]').fill('Anniversary');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await page.getByRole('heading', { name: 'Anniversary' }).waitFor();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export calendar', exact: true }).click();
    await (await download).saveAs(join(artifactDir, 'event.ics'));
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByText('Event deleted.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('heading', { name: 'Anniversary' }).waitFor();
  });

  await step('header-wallet-navigation', async () => {
    await go('');
    const chip = page.locator('header a[href="/en/profile?section=points"]');
    assert.equal(await chip.count(), 1);
    await chip.click();
    await page.waitForURL(/\/en\/profile\?section=points/);
  });
  await step('palm-upload-consent-zoom', async () => {
    await go('palm-reading');
    // Existing local illustration is only an upload/consent fixture, never hand-detection evidence.
    await page.locator('input[type=file]').first().setInputFiles(join(OUT, 'assets/logo.png'));
    const read = page.getByRole('button', { name: /Explore your palm/ });
    await read.waitFor();
    assert.equal(await read.isDisabled(), true);
    await page.getByRole('button', { name: 'Zoom ↗', exact: true }).click();
    await audit('palm-zoom', 'interaction');
    await page.keyboard.press('Escape');
    await page.locator('main input[type=checkbox]').check();
    assert.equal(await read.isEnabled(), true);
    await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
  });
  for (const label of ['Three cards', 'Simple cross', 'Relationships', 'Celtic Cross'])
    await step('tarot-' + label, async () => {
      await go('tarot');
      await page
        .getByRole('group', { name: 'Spread', exact: true })
        .getByRole('button', { name: new RegExp(label) })
        .click();
      if (label === 'Three cards') await page.getByLabel('Perspective').selectOption('soa');
      await page.getByRole('button', { name: 'Start your reading', exact: true }).click();
      await page.getByRole('button', { name: /Interpret this spread/ }).waitFor({ timeout: 20000 });
      const details = page.locator('main summary');
      if (await details.count()) await details.first().click();
    });

  await step('paid-reading-consent', async () => {
    config.billing.usServices['kinhdich--interpretation'] = { status: 'paid', points: 7 };
    await go('i-ching');
    await page.locator('#kd-method').selectOption('digits');
    await page.locator('#kd-digits').fill('123456');
    await page.getByRole('button', { name: /^Cast\s*↗$/ }).click();
    const before = calls.length;
    await page.getByRole('button', { name: /Read interpretation/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Confirm this reading' });
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /7 Credits/);
    await audit('paid-consent', 'interaction');
    await dialog.getByRole('button', { name: 'Later', exact: true }).click();
    assert.equal(calls.length, before);
    await page.getByRole('button', { name: 'Try again', exact: false }).click();
    await dialog.waitFor();
    await dialog.getByRole('button', { name: /Agree · 7 Credits/ }).click();
    await page.getByText('Your thoughtful English reading.', { exact: true }).waitFor();
    assert.equal(calls.at(-1).expectedPoints, 7);
    assert.equal(calls.at(-1).market, 'US');
    config.billing.usServices = {};
  });
  await step('terms-navigation-print', async () => {
    await go('terms');
    await page.evaluate(() => {
      window.__printed = 0;
      window.print = () => {
        window.__printed++;
      };
    });
    await page.getByRole('button', { name: 'Print / save PDF', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__printed), 1);
    if (width < 768) await page.getByLabel('Choose a terms section').selectOption('privacy');
    else await page.getByRole('link', { name: /Data & privacy/ }).click();
    await page.waitForURL(/#privacy$/);
  });
  await step('account-menu', async () => {
    await go('');
    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).waitFor();
  });
  for (const c of calls) assert.equal(c.locale, 'en');
  const report = {
    engine,
    width,
    api: 'Local fixtures; real UI and chart calculations. No live identity/payment/ad/hardware certification.',
    results,
    errors,
    calls: calls.map(c => ({ locale: c.locale, market: c.market, serviceId: c.serviceId })),
  };
  await writeFile(join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(
    'FINAL',
    JSON.stringify({
      pass: results.filter(r => r.pass).length,
      fail: results.filter(r => !r.pass).length,
      errors,
      calls: report.calls,
    }),
  );
  if (results.some(r => !r.pass)) process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
