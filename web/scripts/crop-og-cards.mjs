import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

/* Crop vùng minh hoạ (trái) của 6 ảnh OG 1200×630 thành card dọc 3:4 472×630 */
const SLUGS = ["tuvi", "cunghoangdao", "kinhdich", "battu", "thansohoc", "tarot"];
const SRC = "/Users/Thsonjpg/Documents/PROJECT VUI VUI/astrox/web/public/assets/og";
const DST = "/Users/Thsonjpg/Documents/PROJECT VUI VUI/astrox/web/public/assets/modules/cards";

mkdirSync(DST, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 472, height: 630 } });
for (const slug of SLUGS) {
  await page.goto(`file://${SRC}/${slug}.png`);
  // minh hoạ OG nằm ~x 88..560 — crop x=88 giữ trọn mép phải art, bỏ đệm trái
  await page.screenshot({
    type: "png",
    path: `${DST}/${slug}.png`,
    clip: { x: 88, y: 0, width: 472, height: 630 },
  });
  console.log("cropped", slug);
}
await browser.close();
