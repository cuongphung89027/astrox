import { webkit, chromium } from "playwright";

/* Reproduce đúng môi trường Sơn: WebKit engine, cửa sổ 1368×1238, Retina 2x */
async function run(engine, name) {
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 1368, height: 1238 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3311/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector("#modules")?.scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(1200);

  const stage = await page.evaluate(() => {
    const st = document.querySelector(".ax-stack2-stage");
    const card = document.querySelector(".ax-stack2-card");
    const face = document.querySelector(".ax-stack2-face");
    const r = st?.getBoundingClientRect();
    const rc = card?.getBoundingClientRect();
    return {
      stageRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      cardRect: rc ? { w: Math.round(rc.width), h: Math.round(rc.height) } : null,
      stageDisplay: st ? getComputedStyle(st).display : null,
      stageHeight: st ? getComputedStyle(st).height : null,
      cardTransform: card ? getComputedStyle(card).transform : null,
      cardAspect: card ? getComputedStyle(card).aspectRatio : null,
      faceH: face ? getComputedStyle(face).height : null,
      cardsInDom: document.querySelectorAll(".ax-stack2-card").length,
    };
  });
  console.log(name, JSON.stringify(stage, null, 1));
  console.log(name, "pageerrors:", errors.length ? errors : "none");
  await page.screenshot({ type: "png", path: `qa-report/repro-webkit-${name}.png` });
  await browser.close();
}

await run(webkit, "webkit");
await run(chromium, "chromium");
