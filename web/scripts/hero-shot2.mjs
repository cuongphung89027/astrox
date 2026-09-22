import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
// đợi word ổn định 1.2s (qua hết flip-in) rồi chụp ngay
for (let i = 0; i < 30; i++) {
  const a = await page.evaluate(() => document.querySelector(".ax-hero-word em")?.textContent);
  await page.waitForTimeout(400);
  const b = await page.evaluate(() => document.querySelector(".ax-hero-word em")?.textContent);
  if (a === b) {
    const word = b;
    await page.waitForTimeout(750); // qua nốt flip-in stagger
    const c = await page.evaluate(() => document.querySelector(".ax-hero-word em")?.textContent);
    if (c === word) {
      await page.screenshot({ type: "png", path: "qa-report/hero-gradient-v3.png" });
      console.log("settled word:", word);
      break;
    }
  }
}
await browser.close();
