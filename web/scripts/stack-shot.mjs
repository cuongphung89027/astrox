import { chromium } from "playwright";
const browser = await chromium.launch();

async function shot(name, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  // scroll tới section modules
  await page.evaluate(() => {
    document.querySelector("#modules")?.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ type: "png", path: `qa-report/stack-v2-${name}.png` });
  console.log("saved", name);
  await page.close();
}

await shot("desktop", { width: 1440, height: 900 });
await shot("mobile", { width: 390, height: 844 });
await browser.close();
