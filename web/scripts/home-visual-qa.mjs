/**
 * AstroX — chụp + đo layout thị giác trang chủ trên 30 viewport.
 *
 * Chạy:  node scripts/home-visual-qa.mjs [--base http://localhost:3311]
 * Ghi:   qa-report/home-visual/<WxH>/{top,modules,bottom}.png + report.json
 *
 * Mỗi viewport chụp 3 khung: hero, section 6 card, footer/marquee —
 * để soi bố cục riêng theo breakpoint, không chỉ đo overflow.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const VIEWPORTS = [
  [320, 568], [360, 640], [360, 780], [360, 800], [375, 667], [375, 812],
  [384, 832], [385, 854], [390, 844], [393, 852], [393, 873], [412, 915],
  [414, 736], [414, 896], [430, 932], [600, 960], [768, 1024], [800, 1280],
  [810, 1080], [820, 1180], [834, 1194], [1024, 1366], [1280, 720],
  [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1600, 900],
  [1920, 1080], [2560, 1440],
];

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3311";
const OUT = fileURLToPath(new URL("../qa-report/home-visual/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const AUDIT = `(() => {
  const issues = [];
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const push = (kind, detail) => issues.push({ kind, detail: String(detail).slice(0, 240) });

  const doc = document.documentElement;
  if (doc.scrollWidth > vw + 1) {
    push("h-overflow", "scrollWidth " + doc.scrollWidth + " > vw " + vw);
    let n = 0;
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") continue;
      if (r.right > vw + 1 || r.left < -1) {
        push("h-overflow-el", el.tagName + "." + String(el.className || "").split(" ").slice(0, 3).join(".") + " L" + Math.round(r.left) + " R" + Math.round(r.right));
        if (++n >= 8) break;
      }
    }
  }

  const inScrollable = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll("body *:not(script):not(style)")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
    if (inScrollable(el)) continue;
    if (r.right > vw + 2 && r.left < vw) {
      push("clipped-right", el.tagName + "." + String(el.className).split(" ")[0] + " +" + Math.round(r.right - vw) + "px");
    }
    if (r.left < -2 && r.right > 0) {
      push("clipped-left", el.tagName + "." + String(el.className).split(" ")[0] + " " + Math.round(r.left) + "px");
    }
    if (issues.filter(i => i.kind.startsWith("clipped")).length > 8) break;
  }

  // Section landmarks for scroll shots
  const modules = document.querySelector("#modules");
  const hero = document.querySelector("header, [class*='hero'], section");
  const mr = modules ? modules.getBoundingClientRect() : null;
  const metrics = {
    vw, vh,
    scrollWidth: doc.scrollWidth,
    bodyScrollHeight: document.body.scrollHeight,
    modulesTop: mr ? Math.round(mr.top + window.scrollY) : null,
    modulesHeight: mr ? Math.round(mr.height) : null,
    heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
    // typography sample
    h2: (() => {
      const el = document.querySelector("#modules-heading, h2");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { fs: cs.fontSize, lh: cs.lineHeight, text: (el.textContent || "").trim().slice(0, 40) };
    })(),
    // deck/card geometry
    deck: (() => {
      const d = document.querySelector(".ax-deck, .ax-deck-stage");
      if (!d) return null;
      const r = d.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + window.scrollY) };
    })(),
  };
  return { issues, metrics };
})()`;

const browser = await chromium.launch();
const report = [];

for (const [w, h] of VIEWPORTS) {
  const dir = join(OUT, `${w}x${h}`);
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const entry = { viewport: `${w}x${h}`, issues: [], metrics: null, error: null };
  try {
    const resp = await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 25000 });
    if (!resp || !resp.ok()) throw new Error("HTTP " + (resp ? resp.status() : "no"));
    // settle fonts + hero video first paint
    await page.waitForTimeout(2200);
    const res = await page.evaluate(AUDIT);
    entry.issues = res.issues;
    entry.metrics = res.metrics;

    // 1) Hero / top viewport
    await page.screenshot({ path: join(dir, "top.png") });

    // 2) Scroll to modules section
    await page.evaluate(() => {
      const el = document.querySelector("#modules");
      if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(dir, "modules.png") });

    // 3) Bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(dir, "bottom.png") });

    // 4) Full page (only for compact heights to keep size reasonable; always for width<=430 or width>=1280 sample)
    const fullPage = w <= 430 || w === 768 || w === 1024 || w === 1440 || w === 1920 || w === 2560;
    if (fullPage) {
      await page.screenshot({ path: join(dir, "full.png"), fullPage: true });
    }
  } catch (err) {
    entry.error = String(err).slice(0, 200);
    entry.issues.push({ kind: "error", detail: entry.error });
  }
  await ctx.close();
  report.push(entry);
  const mark = entry.issues.length ? "✗" : "✓";
  console.log(`${mark} ${entry.viewport}${entry.issues.length ? " — " + entry.issues.length + " issues" : ""}`);
  for (const i of entry.issues.slice(0, 4)) console.log(`   [${i.kind}] ${i.detail}`);
}

await browser.close();
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

const byKind = {};
let bad = 0;
for (const e of report) {
  if (e.issues.length) bad++;
  for (const i of e.issues) {
    byKind[i.kind] = byKind[i.kind] || { count: 0, samples: [] };
    byKind[i.kind].count++;
    if (byKind[i.kind].samples.length < 10)
      byKind[i.kind].samples.push(`${e.viewport}: ${i.detail}`);
  }
}
console.log("\n===== HOME VISUAL QA =====");
console.log(`Viewport có vấn đề: ${bad}/${report.length}`);
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`\n## ${k} (${v.count})`);
  v.samples.forEach(s => console.log("   " + s));
}
console.log("\nOutput: " + OUT);
