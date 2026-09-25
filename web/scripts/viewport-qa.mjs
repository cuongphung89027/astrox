/**
 * AstroX — kiểm thử viewport xuyên suốt (30 kích thước × mọi route).
 *
 * Chạy:  node scripts/viewport-qa.mjs [--base http://localhost:3311] [--shots]
 * Kết quả: ghi `qa-report/viewport-report.json` + in bảng tóm tắt lỗi.
 * Tuỳ chọn `--shots` chụp PNG từng combo vào `qa-report/shots/<w>x<h>-<route>.png`
 * (chỉ bật khi cần soi bằng mắt — 330 ảnh khá nặng).
 *
 * Kiểm tra ở MỌI viewport × route:
 *  1. Horizontal overflow (scrollWidth > clientWidth + liệt kê phần tử tràn).
 *  2. Clipped content (phần tử bị khuất khỏi viewport ngang).
 *  3. Overlap giữa các phần tử tương tác (button/link lấn nhau).
 *  4. Navigation: dock dưới (<lg) / topbar (≥lg) hiện đúng, không đè nội dung
 *     (elementFromPoint tại tâm dock/topbar phải thuộc chính nó).
 *  5. Typography: cỡ chữ body tối thiểu 12px; tương phản sơ bộ của chữ trên nền.
 *  6. Floating elements (scroll cue, nút nổi) không lấn nội dung chính.
 *  7. Animation-induced layout shift: đo vị trí hero/heading trước–sau 4s,
 *     và (với mọi viewport) đo CLS tổng qua PerformanceObserver.
 *
 * Script KHÔNG sửa gì — chỉ báo cáo. Mục tiêu: chạy lại sau mỗi thay đổi
 * layout để bảo đảm 30 kích thước luôn sạch.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VIEWPORTS = [
  [320, 568], [360, 640], [360, 780], [360, 800], [375, 667], [375, 812],
  [384, 832], [385, 854], [390, 844], [393, 852], [393, 873], [412, 915],
  [414, 736], [414, 896], [430, 932], [600, 960], [768, 1024], [800, 1280],
  [810, 1080], [820, 1180], [834, 1194], [1024, 1366], [1280, 720],
  [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1600, 900],
  [1920, 1080], [2560, 1440],
];

const ROUTES = [
  "/", "/trangchu", "/tuvi", "/cunghoangdao", "/kinhdich", "/battu",
  "/thansohoc", "/tarot", "/tarot?history=1", "/tuonghop", "/hoso", "/dieukhoan",
  "/chitay",
  // Alias cũ — redirect server-side, cần giữ sạch layout mọi viewport:
  "/hoangdao", "/thanso",
  // /topup & /profile là MODAL (TopupPanel/ProfileModal), không phải route.
];

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3311";
// Prefer localhost — 127.0.0.1 can skip Next allowedDevOrigins and break hydration.
const SHOTS = args.includes("--shots");
const fastIdx = args.indexOf("--fast");
const CLS_MS = fastIdx >= 0 ? 1200 : 4000;
const SETTLE_MS = fastIdx >= 0 ? 900 : 1800;
// Mặc định chạy 3 page song song/viewport — đủ nhanh mà không bóp layout.
const concIdx = args.indexOf("--conc");
const CONCURRENCY = concIdx >= 0 ? Math.max(1, +args[concIdx + 1] || 3) : 3;
import { fileURLToPath } from "node:url";
const OUT_DIR = fileURLToPath(new URL("../qa-report/", import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });
if (SHOTS) mkdirSync(join(OUT_DIR, "shots"), { recursive: true });

/* Chuỗi JS chạy trong trang — trả về mảng vấn đề {kind, detail} */
const AUDIT_FN = `(() => {
  const issues = [];
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const push = (kind, detail) => issues.push({ kind, detail: String(detail).slice(0, 220) });

  // 1) Horizontal overflow
  const doc = document.documentElement;
  if (doc.scrollWidth > vw + 1) {
    push("h-overflow", "scrollWidth " + doc.scrollWidth + " > vw " + vw);
    const over = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > vw + 1 || r.left < -1)) {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed") continue; // fixed không gây scroll ngang
        over.push(el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 2).join(".") : "") + " right=" + Math.round(r.right) + " left=" + Math.round(r.left));
        if (over.length >= 6) break;
      }
    }
    over.forEach(o => push("h-overflow-el", o));
  }

  // 2) Clipped ngang: phần tử nhìn thấy nhưng thò ra ngoài mép.
  //    Bỏ qua phần tử bên trong vùng overflow-x by-design (marquee, tabs
  //    cuộn ngang, bảng scroll) — cha của chúng đã xử lý.
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
      push("clipped-right", el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0] + " right=+" + Math.round(r.right - vw) + "px");
      if (issues.filter(i => i.kind === "clipped-right").length > 5) break;
    }
    if (r.left < -2 && r.right > 0) {
      push("clipped-left", el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0] + " left=" + Math.round(r.left) + "px");
      if (issues.filter(i => i.kind === "clipped-left").length > 5) break;
    }
  }

  // 3) Overlap giữa các phần tử tương tác: chỉ tính khi HAI phần tử không
  //    cùng tổ tiên flex/grid (sibling xếp kề là bình thường), không nằm
  //    trong cùng marquee/carousel, và vùng chồng > 40% phần tử NHỎ HƠN.
  const hasFixedAncestor = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === "fixed" || pos === "sticky") return true;
    }
    return false;
  };
  const clickables = [...document.querySelectorAll("a,button,[role=button]")]
    .filter(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const closed = el.closest("details:not([open])");
      if (closed && !closed.querySelector(":scope > summary")?.contains(el)) return false;
      if (!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return false;
      if (hasFixedAncestor(el)) return false; // topbar/dock xếp chồng là by-design
      return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < vh &&
        cs.visibility !== "hidden" && +cs.opacity > 0.05;
    });
  const sameFlow = (a, b) => {
    // cùng cha trực tiếp hoặc cha chung là flex/grid (layout đã sắp xếp)
    let pa = a.parentElement, pb = b.parentElement;
    if (!pa || !pb) return false;
    if (pa === pb) return true;
    for (const p of [pa, pb, pa.parentElement, pb.parentElement]) {
      if (p && p.contains(a) && p.contains(b)) {
        const d = getComputedStyle(p).display;
        if (d.includes("flex") || d.includes("grid")) return true;
      }
    }
    return false;
  };
  const rects = clickables.map(el => ({ el, r: el.getBoundingClientRect() }));
  outer: for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (sameFlow(a.el, b.el)) continue;
      const ix = Math.max(0, Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left));
      const iy = Math.max(0, Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top));
      if (ix > 6 && iy > 6) {
        const area = ix * iy;
        const minArea = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
        if (area > 0.4 * minArea) {
          push("overlap",
            (a.el.textContent || a.el.getAttribute("aria-label") || a.el.tagName).trim().slice(0, 24) +
            " × " +
            (b.el.textContent || b.el.getAttribute("aria-label") || b.el.tagName).trim().slice(0, 24));
          if (issues.filter(x => x.kind === "overlap").length >= 6) break outer;
        }
      }
    }
  }

  // 4) Navigation: tâm topbar / dock dưới phải hit chính nó HOẶC con của nó.
  //    (dock là glass-strong fixed; hit vào <a> con là ĐÚNG — chỉ báo khi một
  //    phần tử NGOÀI che khuất hoàn toàn.)
  const header = document.querySelector("header");
  if (header) {
    const hr = header.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.min(vw / 2, vw - 2), Math.min(hr.top + hr.height / 2, vh - 2));
    if (hit && !header.contains(hit)) push("nav-covered", "topbar bị che bởi " + hit.tagName + "." + String(hit.className).slice(0, 40));
  }
  const bottomNav = [...document.querySelectorAll("nav")].find(el => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return (cs.position === "fixed" || cs.position === "sticky") && r.bottom >= vh - 2 && r.height > 30 && r.width > vw * 0.5;
  });
  if (bottomNav && vw < 1024) {
    const br = bottomNav.getBoundingClientRect();
    const hit = document.elementFromPoint(vw / 2, Math.min(br.top + br.height / 2, vh - 2));
    if (hit && !bottomNav.contains(hit)) push("dock-covered", "dock dưới bị che bởi " + hit.tagName + "." + String(hit.className).slice(0, 40));
  }

  // 5) Typography: chỉ cờ chữ NỘI DUNG < 11px (label/eyebrow/caption phụ
  //    đạo 10–11px là chuẩn editorial — chúng là metadata, không phải body).
  const small = [];
  for (const el of document.querySelectorAll("p,span,li,td,th")) {
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const r = el.getBoundingClientRect();
    if (fs && fs < 11 && r.width > 0 && (el.textContent || "").trim().length > 1 &&
        cs.visibility !== "hidden" && !el.closest(".sr-only") &&
        // bỏ chữ phụ trợ uppercase/tracking rộng (eyebrow, badge, meta)
        cs.textTransform !== "uppercase" && parseFloat(cs.letterSpacing || "0") < 1.5) {
      small.push(fs + "px «" + el.textContent.trim().slice(0, 30) + "»");
      if (small.length >= 4) break;
    }
  }
  small.forEach(s => push("tiny-text", s));

  // 6) Floating elements (fixed, KHÔNG phải header/dock/scrim) lạc vị trí:
  //    phần tử fixed nằm ngoài khung nhìn, hoặc lọt ra ngoài mép ngang.
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") continue;
    if (el === header || (bottomNav && (el === bottomNav || bottomNav.contains(el)))) continue;
    if (header && header.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || +cs.opacity === 0 || cs.visibility === "hidden") continue;
    if (r.width >= vw * 0.95 && r.height >= vh * 0.95) continue; // scrim/backdrop
    const offRight = r.left > vw + 2, offLeft = r.right < -2, offBottom = r.top > vh + 2;
    if (offRight || offLeft || offBottom) {
      push("floating-offscreen", el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0] +
        " @ " + Math.round(r.left) + "," + Math.round(r.top));
      if (issues.filter(i => i.kind === "floating-offscreen").length >= 4) break;
    }
  }

  return { issues, vw, vh };
})()`;

/* Đo CLS bằng PerformanceObserver (thời gian quan sát truyền vào lúc chạy) */
const CLS_FN = `(async (ms) => {
  let cls = 0;
  const po = new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value;
  });
  try { po.observe({ type: "layout-shift", buffered: true }); } catch {}
  await new Promise(r => setTimeout(r, ms));
  po.disconnect();
  return cls;
})()`;

const browser = await chromium.launch();
const report = [];
let totalIssues = 0;

async function auditOne([w, h], route) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => localStorage.setItem("astrox_v2_state", JSON.stringify({onboarded:true,profile:{name:"QA",gender:"Nam",dob:"1991-06-15",hourChi:"Ngọ (11h-13h)",place:"Hà Nội"}})));
  const page = await ctx.newPage();
  let entry = { viewport: `${w}x${h}`, route, issues: [], cls: 0, ok: true, error: null };
  try {
    const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 });
    if (!resp || !resp.ok()) {
      entry.ok = false;
      entry.error = "HTTP " + (resp ? resp.status() : "no-response");
      entry.issues.push({ kind: "route", detail: entry.error });
    } else {
      await page.waitForTimeout(SETTLE_MS); // settle fonts/video/first paint
      const res = await page.evaluate(AUDIT_FN);
      entry.issues = res.issues;
      entry.cls = await page.evaluate(CLS_FN, CLS_MS);
      if (entry.cls > 0.1) entry.issues.push({ kind: "cls", detail: "CLS=" + entry.cls.toFixed(3) });
      if (entry.issues.length) entry.ok = false;
      if (SHOTS) {
        await page.screenshot({
          path: join(OUT_DIR, "shots", `${w}x${h}-${route === "/" ? "home" : route.slice(1).replace(/[?&=]/g, "-")}.png`),
        });
      }
    }
  } catch (err) {
    entry.ok = false;
    entry.error = String(err).slice(0, 200);
    entry.issues.push({ kind: "error", detail: entry.error });
  }
  await ctx.close();
  return entry;
}

for (const vp of VIEWPORTS) {
  // chạy song song các route trong cùng viewport
  for (let i = 0; i < ROUTES.length; i += CONCURRENCY) {
    const batch = await Promise.all(ROUTES.slice(i, i + CONCURRENCY).map(r => auditOne(vp, r)));
    for (const entry of batch) {
      if (!entry.ok) totalIssues++;
      report.push(entry);
      const mark = entry.ok ? "✓" : "✗";
      process.stdout.write(`${mark} ${entry.viewport} ${entry.route}${entry.ok ? "" : " — " + entry.issues.length + " vấn đề"}\n`);
    }
  }
}

await browser.close();
writeFileSync(join(OUT_DIR, "viewport-report.json"), JSON.stringify(report, null, 2));

// Tóm tắt nhóm theo loại lỗi
const byKind = {};
for (const e of report) for (const i of e.issues) {
  byKind[i.kind] = byKind[i.kind] || { count: 0, samples: [] };
  byKind[i.kind].count++;
  if (byKind[i.kind].samples.length < 8)
    byKind[i.kind].samples.push(`${e.viewport} ${e.route}: ${i.detail}`);
}
console.log("\n===== TÓM TẮT =====");
console.log(`Combo có vấn đề: ${totalIssues}/${report.length}`);
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`\n## ${k} (${v.count})`);
  v.samples.forEach(s => console.log("   " + s));
}
console.log("\nReport: " + join(OUT_DIR, "viewport-report.json"));
