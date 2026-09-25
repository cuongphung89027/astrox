/**
 * AstroX — QA /chitay trên 2 engine (Chromium + WebKit), deviceScaleFactor 2.
 *
 * Chạy (dev server đang nền):
 *   mkdir -p ../qa-report/palm && node scripts/palm-engine-qa.mjs
 * Đổi server đích khi cổng 3311 đã bị checkout khác chiếm:
 *   PALM_QA_BASE=http://localhost:3314 node scripts/palm-engine-qa.mjs
 *
 * Mỗi combo (engine × 360/768/1440): chụp PNG fullPage vào ../qa-report/palm/
 * và báo OVERFLOW nếu trang cuộn ngang. Kỳ vọng: cả 6 combo in `ok`.
 */
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.PALM_QA_BASE || "http://localhost:3311";
const OUT_DIR = "../qa-report/palm/";
const sizes = [[360, 780], [768, 1024], [1440, 900]];
mkdirSync(OUT_DIR, { recursive: true });

for (const engine of [chromium, webkit])
  for (const [width, height] of sizes) {
    const b = await engine.launch();
    const p = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    await p.goto(`${BASE}/chitay`, { waitUntil: "networkidle" });
    await p.screenshot({ path: `${OUT_DIR}engine-${engine.name()}-${width}.png`, fullPage: true });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(engine.name(), width, overflow ? "OVERFLOW" : "ok");
    await b.close();
  }
