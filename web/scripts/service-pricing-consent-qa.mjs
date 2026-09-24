import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(() =>
  localStorage.setItem(
    'astrox_v2_state',
    JSON.stringify({
      onboarded: true,
      profile: { name: 'An QA', gender: 'Nam', dob: '1990-01-01', hourChi: 'Tý', place: 'Hà Nội' },
      aiCache: { version: 2, profiles: {}, legacy: {} },
    }),
  ),
);
const page = await context.newPage();
const pageErrors = [],
  requests = [];
page.on('pageerror', e => pageErrors.push(e.message));
const target = 'tuvi--tim-hieu-ban-than--tinh-cach';
const quote = {
  serviceId: target,
  revision: 5,
  version: '0:0',
  scopeKey: 'qa-scope',
  scopeLabel: 'Cho hồ sơ đang xem',
  offers: [
    {
      id: target,
      name: 'Tính cách & khuynh hướng',
      members: [target],
      points: 90,
      basePoints: 90,
      credit: 0,
      owned: false,
      expiresAt: null,
    },
    {
      id: 'tuvi--tim-hieu-ban-than',
      name: 'Tìm hiểu bản thân',
      members: [target, 'other'],
      points: 240,
      basePoints: 300,
      credit: 60,
      owned: false,
      expiresAt: null,
    },
    {
      id: 'tuvi',
      name: 'Toàn bộ luận giải Tử Vi',
      members: [target, 'other', 'third'],
      points: 600,
      basePoints: 600,
      credit: 0,
      owned: false,
      expiresAt: null,
    },
  ],
};
try {
  await page.route('**/api/site-config', route =>
    route.fulfill({
      json: {
        config: {
          billing: {
            enabled: true,
            unlocks: { enabled: true },
            services: [
              {
                id: target,
                module: 'tuvi',
                name: 'Tính cách & khuynh hướng',
                status: 'paid',
                points: 90,
                policy: 'profile',
              },
            ],
          },
        },
      },
    }),
  );
  await page.route('**/api/ai/session', route => route.fulfill({ json: { token: 'qa-session', userId: 'qa-user' } }));
  await page.route('**/api/ai/quote', async route => {
    const body = route.request().postDataJSON();
    assert.equal(body.serviceId, target);
    assert.ok(body.promptDescriptor);
    await route.fulfill({ json: quote });
  });
  await page.route('**/api/ai', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { choices: [{ message: { content: 'Luận giải QA' }, finish_reason: 'stop' }] } });
  });
  await page.goto('http://localhost:3322/tuvi?view=topics&topic=tim-hieu-ban-than&sub=tinh-cach', {
    waitUntil: 'networkidle',
  });
  await page.getByRole('button', { name: 'Khám phá luận giải' }).click();
  const dialog = page.getByRole('dialog', { name: 'Chọn phần muốn mở' });
  await dialog.waitFor();
  await dialog.getByText('Tìm hiểu bản thân', { exact: true }).click();
  assert.ok(await dialog.getByText('300 Point').count());
  assert.ok(await dialog.getByText('−60 Point').count());
  await dialog.getByRole('button', { name: 'Đồng ý · 240 Point' }).click();
  await page.getByText('Luận giải QA').waitFor();
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].selection, {
    offerId: 'tuvi--tim-hieu-ban-than',
    points: 240,
    revision: 5,
    version: '0:0',
    scopeKey: 'qa-scope',
    expiresAt: null,
  });
  assert.equal(requests[0].expectedPoints, 240);
  assert.deepEqual(pageErrors, []);
  console.log(
    JSON.stringify({
      consent: 'selected group',
      chargedPoints: requests[0].expectedPoints,
      viewport: 390,
      pageErrors: pageErrors.length,
    }),
  );
} finally {
  await browser.close();
}
