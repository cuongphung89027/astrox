import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.evaluate(() => document.getElementById("modules")?.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(500);
const cls = () => page.evaluate(() => {
  const el = document.querySelector(".ax-stack2-card");
  const st = getComputedStyle(el).transform;
  return `${el.className.replace("ax-stack2-card", "").trim() || "base"} tf=${st === "none" ? "none" : st.slice(0, 40)}`;
});
const stage = await page.locator(".ax-stack2-stage").boundingBox();
const cx = stage.x + stage.width / 2, cy = stage.y + stage.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 6; i++) {
  await page.mouse.move(cx - i * 15, cy - i * 4);
  await page.waitForTimeout(60);
  console.log(`sau move -${i * 15}px:`, await cls());
}
await page.mouse.up();
await page.waitForTimeout(50);
console.log("sau up  :", await cls(), "cyc:", JSON.stringify(await page.evaluate(() => (window).__cyc ?? [])));
await page.waitForTimeout(800);
console.log("settled :", await cls());
await browser.close();
