import { chromium } from "playwright";
const browser = await chromium.launch();

async function shot(name, viewport, clicks = 0) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    document.querySelector("#modules")?.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(800);
  // click next để xem card khác
  for (let i = 0; i < clicks; i++) {
    await page.click(".ax-stack2-arrow:last-child");
    await page.waitForTimeout(700);
  }
  await page.screenshot({ type: "png", path: `qa-report/stack-v2-${name}.png` });
  console.log("saved", name);
  await page.close();
}

await shot("desktop", { width: 1440, height: 900 });
await shot("mobile", { width: 390, height: 844 });
await shot("kinhdich", { width: 1440, height: 900 }, 2);
await shot("tarot", { width: 1440, height: 900 }, 5);
await browser.close();
