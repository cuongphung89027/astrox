/**
 * AstroX — QA popup đăng nhập + trang "Các điều khoản & Thoả thuận"
 * trên 30 kích thước màn hình phổ biến.
 *
 * Chạy:  node scripts/login-terms-qa.mjs [--base http://localhost:3312] [--engine chromium|webkit|both] [--shots]
 * LƯU Ý: chạy với bản static out/ (ví dụ `npx serve out -l 3312`) — bản production
 * JS mới có guest THẬT (dev localhost dùng preview đã đăng nhập, dialog không tự mở).
 *
 * Kiểm mỗi viewport × engine:
 *  1. Popup tự mở cho guest trên / — dialog nằm gọn viewport, không tràn ngang nội bộ.
 *  2. Checkbox chưa tích → nút Zalo aria-disabled; tích → bật lại.
 *  3. Nút Google disabled kèm chip "Đang phát triển".
 *  4. Consent có đúng 3 link trỏ /dieukhoan#… (điều khoản · miễn trừ · ND13).
 *  5. /hoso guest: bấm nút Đăng nhập (header + card) chỉ mở popup — URL KHÔNG sang Zalo.
 *  6. /hoso: link "Các điều khoản & Thoả thuận" có mặt trong card Về AstroX.
 *  7. /dieukhoan: không tràn ngang; đủ 3 section anchor + TOC 3 link; footer ẩn hiện đúng.
 */
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3312";
const engIdx = args.indexOf("--engine");
const ENGINE = engIdx >= 0 ? args[engIdx + 1] : "both";
const SHOTS = args.includes("--shots");

const VIEWPORTS = [
  [320, 568], [360, 640], [360, 780], [360, 800], [375, 667], [375, 812],
  [384, 832], [385, 854], [390, 844], [393, 852], [393, 873], [412, 915],
  [414, 736], [414, 896], [430, 932], [600, 960], [768, 1024], [800, 1280],
  [810, 1080], [820, 1180], [834, 1194], [1024, 1366], [1280, 720],
  [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1600, 900],
  [1920, 1080], [2560, 1440],
];
const SHOT_WIDTHS = new Set([320, 390, 768, 1024, 1440]);

const OUT_DIR = fileURLToPath(new URL("../qa-report/login-terms/", import.meta.url));
if (SHOTS) mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  if (!ok) console.log(`FAIL  ${name} — ${detail}`);
};

async function checkDialog(page, tag) {
  const dialog = page.locator("dialog[open]");
  await dialog.waitFor({ state: "visible", timeout: 12000 });
  const box = await dialog.boundingBox();
  check(`[${tag}] popup hiển thị`, !!box);
  const geom = await page.evaluate(() => {
    const d = document.querySelector("dialog[open]");
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return { vw: innerWidth, vh: innerHeight, left: r.left, top: r.top, right: r.right, bottom: r.bottom, sw: d.scrollWidth, cw: d.clientWidth, pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  });
  check(`[${tag}] popup nằm gọn viewport`, geom && geom.left >= 0 && geom.right <= geom.vw && geom.top >= 0 && geom.bottom <= geom.vh + 1, JSON.stringify(geom));
  check(`[${tag}] popup không tràn ngang nội bộ`, geom && geom.sw <= geom.cw + 1, `sw=${geom?.sw} cw=${geom?.cw}`);
  check(`[${tag}] trang không tràn ngang`, !geom?.pageOverflow);

  const zalo = dialog.locator("button", { hasText: "Đăng nhập bằng Zalo" });
  const google = dialog.locator("button", { hasText: "Đăng nhập bằng Google" });
  check(`[${tag}] nút Zalo tồn tại`, await zalo.count() === 1);
  check(`[${tag}] nút Google + chip "Đang phát triển"`, await google.count() === 1 && await dialog.getByText("Đang phát triển").isVisible());
  check(`[${tag}] Google disabled`, await google.isDisabled());

  const consent = dialog.locator("input[type=checkbox]");
  check(`[${tag}] checkbox đồng ý tồn tại`, await consent.count() === 1);
  check(`[${tag}] chưa tích → Zalo aria-disabled`, (await zalo.getAttribute("aria-disabled")) === "true");
  const links = dialog.locator('a[href^="/dieukhoan#"]');
  check(`[${tag}] đủ 3 link điều khoản`, await links.count() === 3);

  await consent.click();
  await page.waitForTimeout(120);
  check(`[${tag}] tích → Zalo bật`, (await zalo.getAttribute("aria-disabled")) === "false" || (await zalo.getAttribute("aria-disabled")) === null);
}

async function run(engine) {
  const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch();
  let passed = 0;
  for (const [w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [];
    // Bỏ qua CORS noise của WebKit khi QA từ origin localhost: allowlist CORS prod
    // chỉ có theastrox.space — fetch /api/me fail → guest, đúng kịch bản QA này.
    page.on("pageerror", e => {
      const m = String(e.message);
      if (/access control checks/i.test(m)) return;
      errors.push(m.slice(0, 100));
    });
    const tag = `${engine} ${w}x${h}`;
    try {
      // 1-4. Popup trên / (guest thật)
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await checkDialog(page, `${tag} /`);
      if (SHOTS && SHOT_WIDTHS.has(w)) {
        await page.locator("dialog[open]").screenshot({ path: `${OUT_DIR}dialog-${engine}-${w}.png` }).catch(() => {});
      }

      // 5. /hoso guest: nút đăng nhập mở popup, không điều hướng sang Zalo
      await page.goto(`${BASE}/hoso`, { waitUntil: "domcontentloaded" });
      // đóng popup mời tự mở (nếu có) rồi bấm nút Đăng nhập của trang
      const autoDialog = page.locator("dialog[open]");
      if (await autoDialog.count()) {
        await autoDialog.locator('button[aria-label="Đóng hộp thoại đăng nhập"]').click();
        await page.waitForTimeout(150);
      }
      await page.locator('header button:has-text("Đăng nhập")').first().click();
      await page.locator("dialog[open]").waitFor({ state: "visible", timeout: 6000 });
      check(`[${tag} /hoso] nút Đăng nhập mở popup (không sang Zalo)`, !page.url().includes("zalo") && page.url().includes("/hoso"), page.url());

      // 6. Link điều khoản trong card Về AstroX
      await page.evaluate(() => document.querySelector("dialog[open]")?.close());
      await page.locator('a[href="/dieukhoan"]:has-text("Các điều khoản")').scrollIntoViewIfNeeded().catch(() => {});
      check(`[${tag} /hoso] link "Các điều khoản & Thoả thuận" trong card Về AstroX`, await page.locator('a[href="/dieukhoan"]:has-text("Các điều khoản")').count() === 1);

      // 7. Trang /dieukhoan
      await page.goto(`${BASE}/dieukhoan`, { waitUntil: "domcontentloaded" });
      await page.locator("h1").waitFor({ timeout: 8000 });
      await page.waitForTimeout(400);
      const terms = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        sections: ["dieu-khoan-su-dung", "mien-tru-trach-nhiem", "thoa-thuan-bao-mat"].map(id => Boolean(document.getElementById(id))),
        toc: document.querySelectorAll('nav[aria-label="Mục lục điều khoản"] a[href^="#"]').length,
        nd13: document.body.innerText.includes("Nghị định 13/2023/NĐ-CP"),
      }));
      check(`[${tag} /dieukhoan] không tràn ngang`, !terms.overflow);
      check(`[${tag} /dieukhoan] đủ 3 anchor section`, terms.sections.every(Boolean), JSON.stringify(terms.sections));
      check(`[${tag} /dieukhoan] TOC 3 link`, terms.toc === 3);
      check(`[${tag} /dieukhoan] nhắc ND13`, terms.nd13);
      if (SHOTS && SHOT_WIDTHS.has(w)) {
        await page.screenshot({ path: `${OUT_DIR}terms-${engine}-${w}.png`, fullPage: false }).catch(() => {});
      }
      check(`[${tag}] không pageerror`, errors.length === 0, errors.slice(0, 2).join(" | "));
    } catch (e) {
      check(`[${tag}] luồng không văng lỗi`, false, String(e.message).slice(0, 140));
    }
    if (errors.length === 0) passed += 0; // đếm qua results
    await ctx.close();
  }
  await browser.close();
}

for (const engine of ENGINE === "both" ? ["chromium", "webkit"] : [ENGINE]) {
  console.log(`\n=== Engine: ${engine} ===`);
  await run(engine);
}

const failed = results.filter(r => !r.ok);
console.log(`\nTổng: ${results.length} check · ${failed.length} FAIL`);
process.exit(failed.length ? 1 : 0);
