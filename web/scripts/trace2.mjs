import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById("modules")?.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(400);
const stage = await page.locator(".ax-stack2-stage").boundingBox();
const cx = stage.x + stage.width / 2, cy = stage.y + stage.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 8; i++) await page.mouse.move(cx - i * 10, cy - i * 3);
await page.mouse.up();
await page.waitForTimeout(800);
const log = await page.evaluate(() => ({
  cyc: (window).__cyc ?? [],
  reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
}));
console.log(JSON.stringify(log, null, 1));
await browser.close();
