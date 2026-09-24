import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let initial;
try {
  await page.goto('http://localhost:3322/admin?view=services', { waitUntil: 'networkidle' });
  if (await page.getByLabel('Mật khẩu quản trị').count()) {
    const password = JSON.parse(
      readFileSync(new URL('../../.dev-admin/credentials.json', import.meta.url), 'utf8'),
    ).password;
    await page.getByLabel('Mật khẩu quản trị').fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.getByText('Danh mục trải nghiệm', { exact: true }).waitFor();
  }
  const base = 'http://localhost:3322';
  initial = await (await context.request.get(base + '/api/admin/config')).json();
  assert.equal(await page.getByPlaceholder('Tên bộ môn, nhóm hoặc dịch vụ…').count(), 1);
  await page.getByPlaceholder('Tên bộ môn, nhóm hoặc dịch vụ…').fill('Tính cách & khuynh hướng');
  assert.ok(await page.getByText('Tìm hiểu bản thân', { exact: true }).count());
  await page.getByPlaceholder('Tên bộ môn, nhóm hoặc dịch vụ…').fill('');
  await page.getByLabel('Bật mở khóa theo hồ sơ và kỳ').check();
  const bundle = page.getByLabel('Giá gói Toàn bộ luận giải Tử Vi');
  await bundle.getByLabel('Giá mở cả gói (Point)').fill('300');
  await bundle.getByLabel('Bán gói này').check();
  await page.getByText('Thử tính giá nâng cấp').click();
  assert.ok(await page.getByText('300 − 60 = 240 Point').count());
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await page.getByText('Đã lưu bản nháp.', { exact: false }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Danh mục trải nghiệm', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Bật mở khóa theo hồ sơ và kỳ').isChecked(), true);
  assert.equal(
    await page.getByLabel('Giá gói Toàn bộ luận giải Tử Vi').getByLabel('Giá mở cả gói (Point)').inputValue(),
    '300',
  );
  await page.screenshot({ path: '/tmp/astrox-services-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Danh mục trải nghiệm', { exact: true }).waitFor();
  await page.screenshot({ path: '/tmp/astrox-services-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      catalogue: 'visible',
      search: 'visible',
      preview: '240 Point',
      draft: 'persisted',
      desktop: 1440,
      mobile: 390,
      pageErrors: errors.length,
    }),
  );
} finally {
  if (initial?.draft) {
    const base = 'http://localhost:3322';
    const session = await (await context.request.get(base + '/api/admin/session')).json();
    const state = await (await context.request.get(base + '/api/admin/config')).json();
    await context.request.put(base + '/api/admin/config', {
      headers: { origin: base, 'x-admin-csrf': session.csrf },
      data: { config: initial.draft, expectedRevision: state.revision },
    });
  }
  await browser.close();
}
