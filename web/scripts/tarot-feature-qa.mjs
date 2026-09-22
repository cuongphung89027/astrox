/**
 * AstroX — QA riêng cho 3 thay đổi 22/09/2026:
 *  1. Nút âm thanh video raccoon (mặc định tắt tiếng, toggle bật lại được).
 *  2. Nhật ký trải bài (/tarot?history=1): danh sách, chi tiết, xoá, empty state.
 *  3. (Gián tiếp) ưu tiên tên gọi — chỉ check không crash ở Dashboard.
 *
 * Chạy:  node scripts/tarot-feature-qa.mjs [--base http://localhost:3311] [--engine chromium|webkit|both]
 * Kết quả: in PASS/FAIL từng mục + ảnh chụp qa-report/tarot-feature/<engine>-<w>x<h>-<state>.png
 */
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3311";
const engIdx = args.indexOf("--engine");
const ENGINE = engIdx >= 0 ? args[engIdx + 1] : "both";

const OUT_DIR = fileURLToPath(new URL("../qa-report/tarot-feature/", import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

const now = Date.now();
const cards = [
  "major_00_fool", "major_01_magician", "major_02_high_priestess", "major_03_empress",
  "major_04_emperor", "major_05_hierophant", "major_06_lovers", "major_07_chariot",
  "major_08_strength", "major_09_hermit", "major_10_wheel_of_fortune", "major_11_justice",
];
const HISTORY = [
  { id: "seed1", savedAt: now - 3 * 3600e3, question: "Mình có nên đổi sang hướng nghiệp mới không?", deckId: "raccoon", spreadId: "three", spreadName: "Trải 3 lá", frameLabel: "Quá khứ – Hiện tại – Tương lai",
    cards: [
      { id: cards[0], reversed: false, position: "Quá khứ", nameEn: "The Fool" },
      { id: cards[1], reversed: true, position: "Hiện tại", nameEn: "The Magician" },
      { id: cards[2], reversed: false, position: "Tương lai", nameEn: "The High Priestess" },
    ],
    text: "**Quá khứ — The Fool**\nBạn từng khởi đầu với tâm thế tự do, dám bước khỏi vùng an toàn.\n\n**Hiện tại — The Magician (ngược)**\nNăng lượng sáng tạo đang bị phân tán; bạn có nhiều ý tưởng nhưng chưa biến thành hành động.\n\n**Tổng hợp**\nBài khuyến nghị lấy lại trọng tâm trước khi quyết định lớn." },
  { id: "seed2", savedAt: now - 26 * 3600e3, question: "", deckId: "raccoon", spreadId: "celtic10", spreadName: "Celtic Cross", frameLabel: "",
    cards: cards.slice(0, 10).map((id, i) => ({ id, reversed: i % 3 === 0, position: `Vị trí ${i + 1}`, nameEn: `Card ${i + 1}` })),
    text: "**Hiện tại**\nMột giai đoạn chuyển mình.\n\n**Kết quả cuối cùng**\nKết quả phụ thuộc vào kỷ luật của bạn trong ba tháng tới." },
  { id: "seed3", savedAt: now - 8 * 24 * 3600e3, question: "Tuần này nên tập trung vào điều gì?", deckId: "raccoon", spreadId: "one", spreadName: "Rút 1 lá", frameLabel: "",
    cards: [{ id: cards[5], reversed: false, position: "Thông điệp", nameEn: "The Lovers" }],
    text: "**Thông điệp — The Lovers**\nSự lựa chọn đến từ trái tim chứ không phải nỗi sợ." },
  { id: "seed4", savedAt: now - 20 * 24 * 3600e3, question: "Hai đứa đang đi về đâu?", deckId: "raccoon", spreadId: "relationship5", spreadName: "Tình Yêu & Mối Quan Hệ", frameLabel: "",
    cards: cards.slice(6, 11).map((id, i) => ({ id, reversed: i % 2 === 0, position: ["Bạn", "Đối phương", "Nền tảng mối quan hệ", "Thách thức chung", "Tiềm năng / hướng đi"][i], nameEn: `Card ${i + 7}` })),
    text: "**Bạn**\nĐang cần được lắng nghe.\n\n**Đối phương**\nCó sự quan tâm nhưng cách thể hiện khác." },
];

const PROFILE_STATE = { profile: { name: "Mực Demo", gender: "Nam", dob: "1998-04-12", hourChi: "Tí (23:00–01:00)", place: "Hà Nội" }, onboarded: true, aiCache: { version: 2, profiles: {}, legacy: {} } };

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };

const overflowOk = async (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

/** Trên prod (guest) modal mời đăng nhập mở sau mỗi lần load — tự đóng để test. */
async function dismissInvites(page) {
  const later = page.getByRole("button", { name: /Để sau, mình muốn khám phá trước/ });
  try { await later.waitFor({ state: "visible", timeout: 2500 }); await later.click(); }
  catch { /* localhost preview không có modal này */ }
}

const isLocal = /localhost|127\.0\.0\.1/.test(BASE);

async function run(engine) {
  const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch();
  const errors = [];
  await (async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 160)}`); });
    await page.addInitScript(({ state }) => {
      localStorage.setItem("astrox_v2_state", JSON.stringify(state));
    }, { state: PROFILE_STATE });

    /* ---------- 1. Setup: nút âm thanh ---------- */
    await page.goto(`${BASE}/tarot`, { waitUntil: "networkidle" });
    await dismissInvites(page);
    const soundBtn = page.locator("button[aria-pressed]").filter({ hasText: "" }).locator("visible=true").first();
    const muteBtn = page.getByRole("button", { name: /Bật tiếng video giới thiệu bộ bài/ });
    await muteBtn.waitFor({ state: "visible", timeout: 8000 });
    check(`[${engine}] nút bật tiếng hiển thị`, true);
    const mutedBefore = await page.locator("video").evaluate((v) => v.muted);
    check(`[${engine}] video mặc định tắt tiếng`, mutedBefore === true, `muted=${mutedBefore}`);
    await muteBtn.click();
    const mutedAfter = await page.locator("video").evaluate((v) => v.muted);
    const pressed = await page.getByRole("button", { name: /Tắt tiếng video giới thiệu bộ bài/ }).getAttribute("aria-pressed");
    check(`[${engine}] click → bật tiếng + aria-pressed`, mutedAfter === false && pressed === "true", `muted=${mutedAfter}, pressed=${pressed}`);
    const playing = await page.locator("video").evaluate((v) => !v.paused && !v.ended);
    check(`[${engine}] video vẫn đang phát sau khi bật tiếng`, playing, `paused check=${playing}`);
    await page.getByRole("button", { name: /Tắt tiếng video giới thiệu bộ bài/ }).click();
    check(`[${engine}] tắt tiếng lại được`, await page.locator("video").evaluate((v) => v.muted) === true);

    /* ---------- 2. Lối vào nhật ký ở setup ---------- */
    // Lần đầu chưa có lượt nào: link vẫn phải hiện (không còn ẩn).
    const firstLink = await page.getByRole("link", { name: /Nhật ký trải bài/ }).textContent();
    check(`[${engine}] link nhật ký hiện ngay khi chưa có lượt`, (firstLink || "").includes("Chưa có lượt nào"), `text="${(firstLink || "").trim()}"`);
    // Seed history qua evaluate (không dùng addInitScript để còn kiểm được empty state).
    await page.evaluate((h) => localStorage.setItem("astrox_tarot_history_v1", JSON.stringify(h)), HISTORY);
    await page.reload({ waitUntil: "networkidle" });
    await dismissInvites(page);
    const link = page.getByRole("link", { name: /Nhật ký trải bài/ });
    await link.waitFor({ state: "visible", timeout: 6000 });
    check(`[${engine}] link nhật ký hiện ở setup (4 lượt)`, (await link.textContent()).includes("4"));

    /* ---------- 3. Danh sách lượt trải ---------- */
    await page.goto(`${BASE}/tarot?history=1`, { waitUntil: "networkidle" });
    await dismissInvites(page);
    await page.waitForTimeout(300);
    const rows = page.locator("li[class*=historyRow]");
    await rows.first().waitFor({ state: "visible", timeout: 6000 });
    check(`[${engine}] danh sách 4 lượt`, (await rows.count()) === 4, `count=${await rows.count()}`);
    check(`[${engine}] ngày dạng dd/mm/yyyy`, (await rows.first().locator("time").textContent()).match(/\d{2}\/\d{2}\/\d{4}/) !== null);
    check(`[${engine}] không tràn ngang 1280`, await overflowOk(page));
    for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1280, 800]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(250);
      check(`[${engine}] list ${w} không tràn ngang`, await overflowOk(page));
      await page.screenshot({ path: `${OUT_DIR}${engine}-${w}x${h}-list.png`, fullPage: w <= 400 });
    }
    await page.setViewportSize({ width: 1280, height: 900 });

    /* ---------- 4. Chi tiết một lượt ---------- */
    await rows.first().locator("button[class*=historyOpen]").click();
    const strip = page.locator("figure[class*=historyCard]");
    await strip.first().waitFor({ state: "visible", timeout: 6000 });
    check(`[${engine}] chi tiết hiện 3 lá (lượt trải 3 lá)`, (await strip.count()) === 3, `count=${await strip.count()}`);
    check(`[${engine}] chip Ngược ở lá ngược`, (await page.locator("figure[class*=historyCard] figcaption i").count()) >= 1);
    check(`[${engine}] luận giải render (StructuredReading)`, (await page.locator("section[class*=readingSection]").count()) >= 2);
    for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1280, 800]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(250);
      check(`[${engine}] detail ${w} không tràn ngang`, await overflowOk(page));
      await page.screenshot({ path: `${OUT_DIR}${engine}-${w}x${h}-detail.png`, fullPage: w <= 400 });
    }
    await page.setViewportSize({ width: 1280, height: 900 });

    /* Lượt Celtic 10 lá cũng phải ổn ở hẹp nhất */
    await page.getByRole("button", { name: /Quay lại danh sách lượt trải/ }).click();
    await rows.nth(1).locator("button[class*=historyOpen]").click();
    await strip.first().waitFor({ state: "visible", timeout: 6000 });
    check(`[${engine}] chi tiết Celtic hiện 10 lá`, (await strip.count()) === 10);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(300);
    check(`[${engine}] celtic 10 lá 320 không tràn ngang`, await overflowOk(page));
    await page.screenshot({ path: `${OUT_DIR}${engine}-320x568-celtic.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });

    /* ---------- 5. Xoá một lượt ---------- */
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /Quay lại danh sách lượt trải/ }).click();
    await page.locator("button[class*=historyRemove]").first().click();
    await page.waitForTimeout(400);
    check(`[${engine}] xoá còn 3 lượt`, (await page.locator("li[class*=historyRow]").count()) === 3);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("astrox_tarot_history_v1") || "[]").length);
    check(`[${engine}] localStorage còn 3 entry`, stored === 3, `stored=${stored}`);

    /* ---------- 6. Empty state ---------- */
    await page.evaluate(() => localStorage.removeItem("astrox_tarot_history_v1"));
    await page.goto(`${BASE}/tarot?history=1`, { waitUntil: "networkidle" });
    await dismissInvites(page);
    await page.waitForTimeout(300);
    check(`[${engine}] empty state hiện`, await page.getByText("Chưa có lượt trải nào được lưu").isVisible());
    await page.screenshot({ path: `${OUT_DIR}${engine}-empty.png` });
    /* Nút "Trải bài ngay" quay về setup */
    await page.getByRole("button", { name: /Trải bài ngay/ }).click();
    await page.waitForURL("**/tarot", { timeout: 6000 });
    check(`[${engine}] empty → nút trải bài quay về /tarot`, page.url().endsWith("/tarot"));
    /* Sau khi xoá hết, link nhật ký vẫn hiện với nhãn rỗng */
    await page.waitForTimeout(300);
    const emptyLink = await page.getByRole("link", { name: /Nhật ký trải bài/ }).textContent();
    check(`[${engine}] link nhật ký vẫn hiện khi rỗng`, (emptyLink || "").includes("Chưa có lượt nào"), `text="${(emptyLink || "").trim()}"`);

    /* ---------- 7. Trang chủ không lỗi & hiện tên gọi ---------- */
    await page.goto(`${BASE}/trangchu`, { waitUntil: "networkidle" });
    await dismissInvites(page);
    await page.waitForTimeout(400);
    const h1 = await page.locator("h1").first().textContent();
    if (isLocal) check(`[${engine}] trang chủ chào bằng tên gọi`, h1.includes("Mực Demo"), `h1="${h1.slice(0, 60)}"`);
    else check(`[${engine}] trang chủ (guest) render không lỗi`, /Chào|Xin chào/.test(h1), `h1="${h1.slice(0, 60)}"`);
    await ctx.close();
  })().catch((e) => check(`[${engine}] luồng không ném exception`, false, String(e).slice(0, 300)));
  const realErrors = errors.filter((e) => !/favicon|Download the React DevTools|negative time stamp|Type error @TypeError: Type error\s*$/i.test(e));
  check(`[${engine}] không có console/page error`, realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
  await browser.close();
}

const engines = ENGINE === "both" ? ["chromium", "webkit"] : [ENGINE];
for (const e of engines) await run(e);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== ${results.length - failed}/${results.length} PASS, ${failed} FAIL === Ảnh: ${OUT_DIR}`);
process.exit(failed ? 1 : 0);
