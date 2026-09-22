import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById("modules")?.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(400);
const t0 = Date.now();
const cls = () => page.evaluate(() => {
  const el = document.querySelector(".ax-stack2-card");
  return `${el.querySelector("h3")?.textContent}|${el.className.replace("ax-stack2-card ", "").trim() || "base"}`;
});
const stage = await page.locator(".ax-stack2-stage").boundingBox();
const cx = stage.x + stage.width / 2, cy = stage.y + stage.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
console.log(`t=${Date.now() - t0} down:`, await cls());
for (let i = 1; i <= 8; i++) {
  await page.mouse.move(cx - i * 10, cy - i * 3);
  console.log(`t=${Date.now() - t0} move -${i * 10}px:`, await cls());
}
await page.mouse.up();
console.log(`t=${Date.now() - t0} up:`, await cls());
await page.waitForTimeout(400);
console.log(`t=${Date.now() - t0} up+400:`, await cls());
await browser.close();
