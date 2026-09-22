import { chromium } from "playwright";

/* QA đầy đủ luồng #modules như người dùng thật */
const browser = await chromium.launch();
const errors = [];

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("PAGEERROR: " + err.message));

await page.goto("http://localhost:3311/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// 1. Top trang
await page.screenshot({ type: "png", path: "qa-report/qa-flow-1-top.png" });

// 2. Cuộn xuống #modules
await page.evaluate(() => document.querySelector("#modules")?.scrollIntoView({ behavior: "instant" }));
await page.waitForTimeout(1200);
await page.screenshot({ type: "png", path: "qa-report/qa-flow-2-modules.png" });

// 3. Kiểm tra ảnh art có load không
const artImgs = await page.evaluate(() =>
  [...document.querySelectorAll(".ax-stack2-face > img")].map((im) => ({
    src: im.getAttribute("src"),
    ok: im.complete && im.naturalWidth > 0,
    nw: im.naturalWidth,
  }))
);
console.log("ART IMGS:", JSON.stringify(artImgs, null, 1));

// 4. Lật 6 card, mỗi card chụp + đo text
for (let i = 0; i < 6; i++) {
  await page.screenshot({ type: "png", path: `qa-report/qa-flow-card-${i + 1}.png` });
  const info = await page.evaluate(() => {
    const face = document.querySelector(".ax-stack2-card:first-child .ax-stack2-face");
    const h3 = face?.querySelector("h3");
    const num = face?.querySelector('[class*="tracking"]');
    const r = h3?.getBoundingClientRect();
    return {
      title: h3?.textContent,
      numeral: num?.textContent?.trim(),
      titleVisible: !!r && r.height > 10,
      bg: face ? getComputedStyle(face).background.slice(0, 60) : null,
    };
  });
  console.log(`CARD ${i + 1}:`, JSON.stringify(info));
  if (i < 5) {
    await page.click(".ax-stack2-arrow:last-child");
    await page.waitForTimeout(800);
  }
}

// 5. Full page cuối
await page.screenshot({ type: "png", path: "qa-report/qa-flow-3-full.png", fullPage: true });

// 6. Viewport hẹp kiểu cửa sổ Safari thường (1280×800 và 1180×820)
for (const vp of [{ width: 1280, height: 800 }, { width: 1180, height: 820 }]) {
  const p2 = await browser.newPage({ viewport: vp });
  await p2.goto("http://localhost:3311/", { waitUntil: "networkidle" });
  await p2.evaluate(() => document.querySelector("#modules")?.scrollIntoView({ behavior: "instant" }));
  await p2.waitForTimeout(1200);
  await p2.screenshot({ type: "png", path: `qa-report/qa-flow-vp-${vp.width}.png` });
  await p2.close();
}

console.log("CONSOLE ERRORS:", errors.length ? errors : "none");
await browser.close();
