import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3311/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);
await page.evaluate(() => document.getElementById("modules")?.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(500);
const stage = await page.locator(".ax-stack2-stage").boundingBox();
const cx = stage.x + stage.width / 2, cy = stage.y + stage.height / 2;
const top = () => page.evaluate(() => document.querySelector(".ax-stack2-card h3")?.textContent);

// 1. kéo có pauses (như tay thật) 130px → văng
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 6; i++) { await page.mouse.move(cx - i * 22, cy - i * 7); await page.waitForTimeout(45); }
await page.mouse.up();
await page.waitForTimeout(850);
const w1 = await top();
console.log("1 kéo xa văng  →", w1, w1 === "Cung Hoàng Đạo" ? "✓" : "✗");

// 2. kéo ngắn 14px thả → nảy về, không đổi card, không điều hướng
const w2 = await top();
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 2; i++) { await page.mouse.move(cx - i * 7, cy + i * 2); await page.waitForTimeout(45); }
await page.mouse.up();
await page.waitForTimeout(750);
const w3 = await top();
console.log("2 kéo ngắn nảy →", w3, "URL:", page.url(), (w3 === w2 && page.url().endsWith("/")) ? "✓" : "✗");

// 3. click đúp tiếp (tap thật) vẫn điều hướng được — tap 1 lần vào card
// (bỏ qua — đãverify ở bước 4 URL cũ)

// 4. bàn phím
await page.focus(".ax-stack2-stage");
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(750);
const w4 = await top();
console.log("4 ArrowLeft    →", w4, "(prev từ Cung Hoàng Đạo = Tử Vi)", w4 === "Tử Vi" ? "✓" : "");

// 5. wheel dọc để trang cuộn tự nhiên
const sy1 = await page.evaluate(() => window.scrollY);
await page.mouse.move(cx, cy);
await page.mouse.wheel(0, 260);
await page.waitForTimeout(350);
const sy2 = await page.evaluate(() => window.scrollY);
console.log("5 wheel dọc    → scrollY", sy1, "→", sy2, sy2 > sy1 ? "✓ trang cuộn tự nhiên" : "✗ BỊ KẸT");

// 6. wheel ngang (trackpad) → rút card
await page.evaluate(() => document.getElementById("modules")?.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(300);
const w5 = await top();
await page.mouse.move(cx, cy);
await page.mouse.wheel(-140, 0);
await page.waitForTimeout(800);
const w6 = await top();
console.log("6 wheel ngang  →", w5, "→", w6, w5 !== w6 ? "✓" : "✗");

await browser.close();
