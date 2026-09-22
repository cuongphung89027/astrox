import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const measure = async () => {
  const w1 = await page.evaluate(() => document.querySelector(".ax-hero-word em")?.textContent ?? null);
  const buf = await page.screenshot({ type: "png" });
  const w2 = await page.evaluate(() => document.querySelector(".ax-hero-word em")?.textContent ?? null);
  if (w1 !== w2) return { again: true };
  return await page.evaluate(async ({ b64, word }) => {
    const em = document.querySelector(".ax-hero-word em");
    if (!em || em.textContent !== word) return { again: true };
    const r = em.getBoundingClientRect();
    const img = new Image();
    await new Promise((res2, rej2) => { img.onload = res2; img.onerror = rej2; img.src = "data:image/png;base64," + b64; });
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const x0 = Math.round(r.x), y0 = Math.round(r.y), w = Math.round(r.width), h = Math.round(r.height);
    const d = ctx.getImageData(x0, y0, w, h).data;
    let bright = 0, total = 0, maxL = 0, sumL = 0;
    const hues = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      total++; sumL += L;
      if (L > maxL) maxL = L;
      if (L > 150) { bright++; hues.add(`${Math.round(d[i]/28)}-${Math.round(d[i+1]/28)}-${Math.round(d[i+2]/28)}`); }
    }
    // độ bão hoà trung bình của pixel sáng (gốc nét chữ)
    let satSum = 0, satN = 0;
    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i], d[i+1], d[i+2]), mn = Math.min(d[i], d[i+1], d[i+2]);
      const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (L > 140) { satSum += mx - mn; satN++; }
    }
    return { word, bright, total, maxL: Math.round(maxL), hues: hues.size, avgSat: satN ? Math.round(satSum / satN) : 0 };
  }, { b64: buf.toString("base64"), word: w2 });
};

const shots = [];
for (let i = 0; i < 30; i++) {
  const res = await measure();
  if (res && !res.again) { shots.push(res); await page.waitForTimeout(1100); }
  if (shots.length >= 3) break;
}
shots.forEach((s, i) => console.log(`MẪU ${i + 1}:`, JSON.stringify(s)));
await page.screenshot({ type: "png", path: "qa-report/hero-gradient-v2.png" });
console.log("saved qa-report/hero-gradient-v2.png");
await browser.close();
