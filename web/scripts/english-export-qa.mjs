#!/usr/bin/env node
/**
 * English/US export certification (plan Task 21).
 * Serves the REAL static export (web/out) and certifies the English surface:
 * HTTP shape (lang/canonical/hreflang/robots), navigation invariants (no
 * experts route in EN), rendered behavior in Chromium+WebKit at mobile and
 * desktop widths, console/hydration cleanliness, and the language switcher.
 * Live-auth and live-payment flows are intentionally NOT certified here —
 * those need staging credentials (G5 scope) and stay BLOCKED in the report.
 *
 * Usage: node web/scripts/english-export-qa.mjs   (run after `npm run build`)
 */
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium, webkit } from 'playwright';

const OUT = fileURLToPath(new URL('../out/', import.meta.url));
const PORT = 3998;
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

const results = [];
const record = (id, name, status, evidence = '') => {
  results.push({ id, name, status, evidence });
  console.log(
    `${status === 'PASS' ? '✔' : status === 'FAIL' ? '✖' : '⛔'} ${id} ${name}${evidence ? ' — ' + evidence : ''}`,
  );
};

async function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = url.pathname;
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

const EN_ROUTES = [
  'en',
  'en/zi-wei',
  'en/astrology',
  'en/tarot',
  'en/i-ching',
  'en/ba-zi',
  'en/numerology',
  'en/compatibility',
  'en/lunar-calendar',
  'en/palm-reading',
  'en/profile',
  'en/pricing',
  'en/terms',
];

async function httpChecks() {
  for (const route of EN_ROUTES) {
    const res = await fetch(`http://localhost:${PORT}/${route}`);
    const html = await res.text();
    const okStatus = res.status === 200;
    record(`EXP-${route}`, `HTTP 200 /${route}`, okStatus ? 'PASS' : 'FAIL', `status ${res.status}`);
    if (route === 'en') {
      record('EXP-lang', 'html lang=en on /en', /<html[^>]+lang="en"/.test(html) ? 'PASS' : 'FAIL');
      record(
        'EXP-hreflang',
        'hreflang pair vi/en/x-default',
        (html.match(/hrefLang=/g) || []).length >= 3 ? 'PASS' : 'FAIL',
        `${(html.match(/hrefLang=/g) || []).length} alternates`,
      );
    }
    if (route === 'en/terms') {
      record(
        'EXP-terms-en',
        'English terms content present',
        html.includes('Terms of Use') && html.includes('AI Disclosure') ? 'PASS' : 'FAIL',
      );
    }
    if (route === 'en/pricing') {
      record('EXP-pricing', 'US pricing page renders', res.status === 200 ? 'PASS' : 'FAIL');
    }
    // Experts must never appear in the English tree navigation.
    if (/\/chuyengia/.test(html))
      record(`EXP-noexperts-${route}`, `no VN experts link on /${route}`, 'FAIL', 'found /chuyengia');
  }
  record(
    'EXP-noexperts',
    'experts absent across all EN routes',
    results.every(r => !r.id.startsWith('EXP-noexperts-') || r.status === 'PASS') ? 'PASS' : 'FAIL',
  );
  const robots = await (await fetch(`http://localhost:${PORT}/robots.txt`)).text();
  record('EXP-robots', 'robots disallows /en/profile', robots.includes('/en/profile') ? 'PASS' : 'FAIL');
  const sitemap = await (await fetch(`http://localhost:${PORT}/sitemap.xml`)).text();
  record(
    'EXP-sitemap',
    'sitemap includes EN routes',
    sitemap.includes('/en/zi-wei') && sitemap.includes('/en/pricing') ? 'PASS' : 'FAIL',
  );
  const nf = await fetch(`http://localhost:${PORT}/en/experts`);
  record('EXP-en-experts-404', '/en/experts is not a page', nf.status === 404 ? 'PASS' : 'FAIL', `status ${nf.status}`);
}

// Vietnamese markers that must NOT appear in visible English UI chrome.
const VI_MARKERS = [
  'Đăng nhập',
  'Hồ sơ',
  'Luận giải',
  'Vận trình',
  'Trải bài',
  'Gieo quẻ',
  'Điều khoản',
  'Bảng giá',
  'Khám phá',
  'Đọc tiếp',
  'Đăng xuất',
  'Thử lại',
  'Thần Số Học',
  'Cung Hoàng Đạo',
  'Kinh Dịch',
  'Chỉ tay',
  'Lịch âm',
  'Tương Hợp',
  'Chủ đề',
  'Chỉnh sửa',
  'Bổ sung',
  'nạp',
  'Nạp',
  'vận hạn',
  'điểm danh',
];
async function languageChecks() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const route of EN_ROUTES) {
    try {
      await page.goto(`http://localhost:${PORT}/${route}`, { waitUntil: 'networkidle', timeout: 20000 });
      // Visible-chrome scan only: RSC/JS payloads legitimately keep the Vietnamese
      // source for the VI tree in inline scripts — innerText must not see them, but
      // we scope to real text elements to avoid false positives from any payload.
      const text = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1,h2,h3,h4,p,button,a,span,li,label,summary,small,strong,dt,dd,option'))
          .map(el => el.textContent || '')
          .join('\n'),
      );
      const hits = VI_MARKERS.filter(m => text.includes(m));
      const contexts = hits.map(m => {
        const i = text.indexOf(m);
        return `${m}: ${JSON.stringify(text.slice(Math.max(0, i - 40), i + 40))}`;
      });
      record(
        `LANG-${route}`,
        `English UI free of Vietnamese chrome`,
        hits.length === 0 ? 'PASS' : 'FAIL',
        contexts.slice(0, 2).join(' | '),
      );
    } catch (e) {
      record(`LANG-${route}`, `English UI free of Vietnamese chrome`, 'FAIL', String(e).slice(0, 60));
    }
  }
  await browser.close();
}

async function browserChecks() {
  for (const engine of [chromium, webkit]) {
    const name = engine === chromium ? 'chromium' : 'webkit';
    const browser = await engine.launch({ headless: true });
    for (const size of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      const page = await browser.newPage({ viewport: size });
      const errors = [];
      page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text().slice(0, 120));
      });
      page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
      for (const route of ['en', 'en/tarot', 'en/palm-reading']) {
        try {
          await page.goto(`http://localhost:${PORT}/${route}`, { waitUntil: 'networkidle', timeout: 20000 });
          const lang = await page.evaluate(() => document.documentElement.lang);
          record(
            `UI-${name}-${size.width}-${route}`,
            `${name} ${size.width} /${route} renders`,
            lang === 'en' ? 'PASS' : 'FAIL',
            `lang=${lang}`,
          );
        } catch (e) {
          record(
            `UI-${name}-${size.width}-${route}`,
            `${name} ${size.width} /${route} renders`,
            'FAIL',
            String(e).slice(0, 80),
          );
        }
      }
      const hydration = errors.filter(e => /hydrat|Minified React error/i.test(e));
      record(
        `UI-${name}-${size.width}-console`,
        `${name} ${size.width} no hydration errors`,
        hydration.length === 0 ? 'PASS' : 'FAIL',
        hydration[0] || '',
      );
      await page.close();
    }
    await browser.close();
  }
  // Interactive surfaces: the strings only appear after JS runs, not in static HTML.
  const interactBrowser = await chromium.launch({ headless: true });
  for (const [route, marker] of [
    ['en/palm-reading', 'Mở camera'],
    ['en/palm-reading', 'Chọn ảnh'],
    ['en/i-ching', 'Cách lập quẻ'],
    ['en/i-ching', 'Xóc quẻ'],
  ]) {
    const p2 = await interactBrowser.newPage({ viewport: { width: 390, height: 844 } });
    await p2.goto(`http://localhost:${PORT}/${route}`, { waitUntil: 'networkidle', timeout: 20000 });
    const text = await p2.evaluate(() => document.body.innerText);
    record(
      `INTERACT-${route}-${marker}`,
      `${route} interactive "${marker}" is EN`,
      !text.includes(marker) ? 'PASS' : 'FAIL',
    );
    await p2.close();
  }
  await interactBrowser.close();
  // Language switcher visible on the Vietnamese home.
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  const switcher = await page.$('button:has-text("EN")');
  record('UI-switcher', 'language switcher on VI home', switcher ? 'PASS' : 'FAIL');
  await browser.close();
}

async function main() {
  const server = await serve();
  try {
    await httpChecks();
    await languageChecks();
    await browserChecks();
    // Honest G5-gated scope: interactive paid/login flows need staging creds.
    for (const [id, name] of [
      ['AUTH-live', 'Google login end-to-end (needs production/staging client)'],
      ['PAY-live', 'Lemon checkout + webhook end-to-end (needs provider approval)'],
      ['AI-quality', 'Live AI English quality samples (needs provider key + budget)'],
    ])
      record(id, name, 'BLOCKED', 'G5 dependency — operator credentials required');
  } finally {
    server.close();
  }
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const blocked = results.filter(r => r.status === 'BLOCKED').length;
  const { writeFile, mkdir } = await import('node:fs/promises');
  await mkdir(fileURLToPath(new URL('../../qa-report/english-us/', import.meta.url)), { recursive: true });
  const table = results.map(r => `| ${r.id} | ${r.name} | ${r.status} | ${r.evidence} |`).join('\n');
  await writeFile(
    fileURLToPath(new URL('../../qa-report/english-us/export-qa.md', import.meta.url)),
    `# English export certification\n\n${new Date().toISOString()}\n\n**${pass} PASS · ${fail} FAIL · ${blocked} BLOCKED**\n\n| id | check | status | evidence |\n|---|---|---|---|\n${table}\n`,
  );
  console.log(`\n${pass} PASS · ${fail} FAIL · ${blocked} BLOCKED`);
  process.exit(fail > 0 ? 1 : 0);
}
main();
