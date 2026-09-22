/**
 * AstroX — QA UI trên 30 kích thước màn hình phổ biến, trạng thái ĐĂNG NHẬP
 * (preview localhost → chip Point + avatar luôn hiện — thứ mà qa:viewport chạy
 * guest không bao phủ). Mọi thay đổi UI/UX đều phải chạy script này.
 *
 * Chạy:  node scripts/ui-30viewports.mjs [--base http://localhost:3311] [--engine chromium|webkit|both] [--shots]
 * Kiểm mỗi viewport × route:
 *  1. Horizontal overflow (scrollWidth > clientWidth).
 *  2. Topbar collision: chip Point / avatar / mobile-title KHÔNG được đè bất kỳ
 *     nav link nào (giao hình chữ nhật > 4px²).
 *  3. Phần tử then chốt tồn tại: chip, avatar, thẻ Điểm danh (points), link
 *     nhật ký (tarot), nút loa (tarot).
 * Ảnh: --shots chụp 7 width đại diện (320/390/768/1024/1280/1440/1920).
 */
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3311";
const engIdx = args.indexOf("--engine");
const ENGINE = engIdx >= 0 ? args[engIdx + 1] : "both";
const SHOTS = args.includes("--shots");
const isLocal = /localhost|127\.0\.0\.1/.test(BASE);

const VIEWPORTS = [
  [320, 568], [360, 640], [360, 780], [360, 800], [375, 667], [375, 812],
  [384, 832], [385, 854], [390, 844], [393, 852], [393, 873], [412, 915],
  [414, 736], [414, 896], [430, 932], [600, 960], [768, 1024], [800, 1280],
  [810, 1080], [820, 1180], [834, 1194], [1024, 1366], [1280, 720],
  [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1600, 900],
  [1920, 1080], [2560, 1440],
];
const SHOT_WIDTHS = new Set([320, 390, 768, 1024, 1280, 1440, 1920]);

const OUT_DIR = fileURLToPath(new URL("../qa-report/ui-30/", import.meta.url));
if (SHOTS) mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); if (!ok) console.log(`FAIL  ${name} — ${detail}`); };

const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth;
  const overflow = document.documentElement.scrollWidth > vw + 1;
  const chip = document.querySelector('[aria-label*="Ví AstroX Point"]');
  const avatar = document.querySelector('button[aria-haspopup="menu"]');
  const title = document.querySelector('header p');
  const targets = [chip, avatar].filter(Boolean);
  const clash = [];
  const hit = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  for (const t of targets.concat(title ? [title] : [])) {
    const tr = t.getBoundingClientRect();
    if (tr.width < 2 || tr.height < 2) continue;
    for (const a of document.querySelectorAll('.ax-top-inner nav a, header a[href="/"]')) {
      const ar = a.getBoundingClientRect();
      if (hit(tr, ar) > 4) clash.push(((t.getAttribute('aria-label') || t.textContent || '').trim().slice(0, 18)) + ' x ' + a.textContent.trim());
    }
  }
  return { overflow, clash: [...new Set(clash)].slice(0, 3), chip: Boolean(chip), avatar: Boolean(avatar) };
})()`;

async function run(engine) {
  const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => { const m = String(e.message); if (!/negative time stamp|^Type error/.test(m)) errors.push(m.slice(0, 120)); });

  const STATE = { profile: { name: "Thái Sơn", gender: "Nam", dob: "1998-04-12", hourChi: "Tí (23:00–01:00)", place: "Hà Nội" }, onboarded: true, aiCache: { version: 2, profiles: {}, legacy: {} } };
  if (isLocal) {
    await page.addInitScript((state) => localStorage.setItem("astrox_v2_state", JSON.stringify(state)), STATE);
    const HISTORY = [{ id: "s1", savedAt: Date.now() - 3600e3, question: "Hỏi vía?", deckId: "raccoon", spreadId: "three", spreadName: "Trải 3 lá", frameLabel: "Quá khứ – Hiện tại – Tương lai", cards: [{ id: "major_00_fool", reversed: false, position: "Quá khứ", nameEn: "The Fool" }], text: "**A**\\nNội dung." }];
    await page.goto(`${BASE}/trangchu`, { waitUntil: "networkidle" }).catch(() => {});
    await page.evaluate((h) => localStorage.setItem("astrox_tarot_history_v1", JSON.stringify(h)), HISTORY).catch(() => {});
  }

  const ROUTES = [
    { path: "/trangchu", label: "trangchu" },
    { path: "/hoso?section=points", label: "points", extra: async () => check(`[${engine}][points] thẻ Điểm danh`, await page.getByText("Điểm danh hàng ngày").isVisible().catch(() => false)) },
  ];
  if (isLocal) ROUTES.push({ path: "/tarot", label: "tarot", extra: async () => {
    check(`[${engine}][tarot] link nhật ký`, await page.getByRole("link", { name: /Nhật ký trải bài/ }).isVisible().catch(() => false));
    check(`[${engine}][tarot] nút loa`, await page.getByRole("button", { name: /tiếng video giới thiệu/ }).isVisible().catch(() => false));
  } });

  for (const route of ROUTES) {
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      const tag = `${engine} ${route.label} ${w}`;
      try {
        if (w === VIEWPORTS[0][0] || page.url() !== `${BASE}${route.path}`) await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(w === 320 ? 700 : 350);
        const audit = await page.evaluate(AUDIT);
        check(`${tag} không tràn ngang`, !audit.overflow);
        check(`${tag} topbar không đè nhau`, audit.clash.length === 0, audit.clash.join(" | "));
        if (w >= 1024 && route.label === "trangchu") check(`${tag} chip + avatar hiện (đăng nhập)`, audit.chip && audit.avatar);
        if (route.extra && (w === 1280 || w === 320)) await route.extra();
        if (SHOTS && SHOT_WIDTHS.has(w)) await page.screenshot({ path: `${OUT_DIR}${engine}-${w}x${h}-${route.label}.png` });
      } catch (e) {
        check(`${tag} chạy được`, false, String(e).slice(0, 120));
      }
    }
  }
  check(`[${engine}] không có pageerror lạ`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
}

const engines = ENGINE === "both" ? ["chromium", "webkit"] : [ENGINE];
for (const e of engines) await run(e);
const failed = results.filter((r) => !r.ok);
console.log(`\n=== UI 30 VIEWPORTS: ${results.length - failed.length}/${results.length} PASS, ${failed.length} FAIL ===`);
if (failed.length) { console.log("Các lỗi:"); for (const f of failed.slice(0, 20)) console.log(` - ${f.name} ${f.detail}`); }
process.exit(failed ? 1 : 0);
