import { webkit } from "playwright";

/* QA đầy đủ 6 card trên WebKit Retina 2x — môi trường người dùng */
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1368, height: 1238 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("http://localhost:3311/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector("#modules")?.scrollIntoView({ behavior: "instant" }));
await page.waitForTimeout(1200);

const NAMES = ["1-tuvi", "2-cunghoangdao", "3-kinhdich", "4-battu", "5-thansohoc", "6-tarot"];
for (let i = 0; i < 6; i++) {
  await page.screenshot({ type: "png", path: `qa-report/repro-webkit-card-${NAMES[i]}.png` });
  if (i < 5) {
    await page.click(".ax-stack2-arrow:last-child");
    await page.waitForTimeout(800);
  }
}
console.log("pageerrors:", errors.length ? errors : "none");
await browser.close();
