/**
 * Chụp ảnh trực quan 30 viewport — phục vụ QA bằng mắt (không sửa code).
 * - Trang chủ `/` chụp đủ 30 viewport (viewport screenshot, thấy nav/dock/hero/floating/3D).
 * - 9 routes còn lại chụp 6 viewport biên: 320x568, 390x844, 768x1024, 1024x1366, 1440x900, 2560x1440.
 * - Trang chủ chụp thêm fullpage ở 3 size để kiểm tra xếp chồng section.
 * Chạy: node scripts/visual-30-shots.mjs [--base http://localhost:3311]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const VIEWPORTS_30 = [
  [320, 568], [360, 640], [360, 780], [360, 800], [375, 667], [375, 812],
  [384, 832], [385, 854], [390, 844], [393, 852], [393, 873], [412, 915],
  [414, 736], [414, 896], [430, 932], [600, 960], [768, 1024], [800, 1280],
  [810, 1080], [820, 1180], [834, 1194], [1024, 1366], [1280, 720],
  [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1600, 900],
  [1920, 1080], [2560, 1440],
];
const EDGE_6 = [[320, 568], [390, 844], [768, 1024], [1024, 1366], [1440, 900], [2560, 1440]];
const ROUTES_9 = ["/trangchu", "/tuvi", "/cunghoangdao", "/kinhdich", "/battu", "/thansohoc", "/tarot", "/tuonghop", "/hoso"];

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3311";
const OUT_DIR = fileURLToPath(new URL("../qa-report/visual-30-2026-09-22/", import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

const slug = (r) => (r === "/" ? "home" : r.slice(1));
const browser = await chromium.launch();
let done = 0;

async function shot(w, h, route, full = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const name = `${w}x${h}-${slug(route)}${full ? "-full" : ""}.png`;
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2500); // chờ fonts/hero/3D/first paint ổn định
    await page.screenshot({ path: join(OUT_DIR, name), fullPage: full });
    done++;
    process.stdout.write(`✓ ${name} (${done})\n`);
  } catch (err) {
    process.stdout.write(`✗ ${name}: ${String(err).slice(0, 120)}\n`);
  }
  await ctx.close();
}

const jobs = [];
for (const [w, h] of VIEWPORTS_30) jobs.push([w, h, "/", false]);
for (const r of ROUTES_9) for (const [w, h] of EDGE_6) jobs.push([w, h, r, false]);
for (const [w, h] of [[320, 568], [768, 1024], [1440, 900]]) jobs.push([w, h, "/", true]);

for (let i = 0; i < jobs.length; i += 3) {
  await Promise.all(jobs.slice(i, i + 3).map(([w, h, r, f]) => shot(w, h, r, f)));
}
await browser.close();
console.log(`\nXong: ${done}/${jobs.length} ảnh → ${OUT_DIR}`);
