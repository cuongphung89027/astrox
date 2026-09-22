import { chromium } from "playwright";
const browser = await chromium.launch();

const NAMES = ["1-tuvi", "2-cunghoangdao", "3-kinhdich", "4-battu", "5-thansohoc", "6-tarot"];

async function shotAll(viewport, tag) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    document.querySelector("#modules")?.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(900);
  for (let i = 0; i < NAMES.length; i++) {
    await page.screenshot({ type: "png", path: `qa-report/demo-${tag}-${NAMES[i]}.png` });
    console.log("saved", tag, NAMES[i]);
    if (i < NAMES.length - 1) {
      await page.click(".ax-stack2-arrow:last-child");
      await page.waitForTimeout(750);
    }
  }
  await page.close();
}

await shotAll({ width: 1440, height: 900 }, "desktop");
await shotAll({ width: 390, height: 844 }, "mobile");
await browser.close();
