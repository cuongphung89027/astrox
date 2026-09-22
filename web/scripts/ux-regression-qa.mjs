/** Local, isolated UX regressions. Start the web server, then run:
 * node scripts/ux-regression-qa.mjs --base http://localhost:3311
 * Browser network is restricted to same-origin GETs; no live AI/auth writes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3311";
const origin = new URL(base).origin;
const cards = JSON.parse(readFileSync(new URL("../public/assets/tarot/cards.json", import.meta.url), "utf8"));
const englishNames = new Set(cards.map(card => card.nameEn));
const browser = await chromium.launch({ headless: true });
let failures = 0;
let tests = 0;

async function test(name, run, reducedMotion = "reduce") {
  tests++;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
  await context.route("**/*", route => {
    const request = route.request();
    if (new URL(request.url()).origin !== origin || !["GET", "HEAD"].includes(request.method())) return route.abort();
    return route.continue();
  });
  await context.addInitScript(() => {
    if (localStorage.getItem("astrox_v2_state")) return;
    localStorage.setItem("astrox_v2_state", JSON.stringify({
      onboarded: true,
      profile: { name: "QA Local", fullName: "QA Local", gender: "Nam", dob: "1991-06-15", hourChi: "Ngọ (11h–13h)", place: "Hà Nội" },
    }));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  try {
    await run(page);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message.split("\n")[0]}`);
  } finally {
    await context.close();
  }
}

async function setupTarot(page, spread) {
  await page.goto(`${base}/tarot`);
  await page.getByRole("group", { name: "Kiểu trải bài" }).getByRole("button", { name: new RegExp(spread) }).click();
  await page.getByRole("button", { name: /Bắt đầu trải bài/ }).waitFor();
  await page.clock.install();
}

async function advance(page, ms) {
  // Run chained timers as well as the first timer, letting React commit between ticks.
  for (let elapsed = 0; elapsed < ms; elapsed += 500) await page.clock.runFor(500);
}

for (const motion of ["reduce", "no-preference"]) {
for (const [spread, count] of [["Một lá", 1], ["Ba lá", 3], ["Thánh giá", 5], ["Tình yêu", 5], ["Celtic Cross", 10]]) {
  await test(`Tarot ${spread} (${motion}): one click draws all ${count} cards, with English names`, async page => {
    await setupTarot(page, spread);
    await page.getByRole("button", { name: /Bắt đầu trải bài/ }).click();
    await advance(page, 30000);
    await page.getByRole("status").filter({ hasText: `Đã rút đủ ${count} lá` }).waitFor({ state: "attached", timeout: 1200 });
    const faces = page.locator('main img[src*="/tarot/"][alt]:not([alt=""])');
    assert.equal(await faces.count(), count, "every drawn card has an accessible face image");
    for (const alt of await faces.evaluateAll(images => images.map(image => image.alt))) {
      assert.ok(englishNames.has(alt.replace(/ — ngược$/, "")), `English card name expected: ${alt}`);
    }
    const names = await page.locator("main details summary strong").allTextContents();
    assert.equal(names.length, count === 10 ? 9 : count, "visible names exist for all non-overlay cards");
    for (const name of names) assert.ok(englishNames.has(name), `English summary expected: ${name}`);
  }, motion);
}
}

await test("Tarot reset cancels a running draw; a new spread stays independent", async page => {
  await setupTarot(page, "Celtic Cross");
  await page.getByRole("button", { name: /Bắt đầu trải bài/ }).click();
  await advance(page, 1500);
  assert.equal(await page.getByRole("status").filter({ hasText: "Đã rút đủ 10 lá" }).count(), 0, "reset happens before the draw completes");
  assert.ok(await page.locator('main img[src*="/tarot/"][alt]:not([alt=""])').count() > 0, "draw has begun");
  await page.getByRole("button", { name: "Trải bài khác" }).click();
  await advance(page, 30000);
  assert.equal(await page.getByRole("group", { name: "Kiểu trải bài" }).count(), 1);
  assert.equal(await page.locator("main details summary strong").count(), 0);
  await page.getByRole("group", { name: "Kiểu trải bài" }).getByRole("button", { name: /Một lá/ }).click();
  await page.getByRole("button", { name: /Bắt đầu trải bài/ }).click();
  await advance(page, 30000);
  await page.getByRole("status").filter({ hasText: "Đã rút đủ 1 lá" }).waitFor({ state: "attached", timeout: 1200 });
  assert.equal(await page.locator("main details summary strong").count(), 1);
}, "no-preference");

await test("Tarot navigation cancels pending draw timers", async page => {
  await setupTarot(page, "Celtic Cross");
  await page.getByRole("button", { name: /Bắt đầu trải bài/ }).click();
  await advance(page, 1500);
  assert.equal(await page.getByRole("status").filter({ hasText: "Đã rút đủ 10 lá" }).count(), 0, "navigation happens while the draw is pending");
  assert.ok(await page.locator('main img[src*="/tarot/"][alt]:not([alt=""])').count() > 0, "draw has begun");
  await page.getByRole("link", { name: /Tử vi/i }).first().click();
  await advance(page, 30000);
  await page.getByRole("link", { name: /Tarot/i }).first().click();
  await page.getByRole("group", { name: "Kiểu trải bài" }).waitFor();
  assert.equal(await page.locator("main details summary strong").count(), 0);
}, "no-preference");

async function openProfile(page) {
  await page.goto(`${base}/hoso?section=personal`);
  await page.getByRole("button", { name: /Chỉnh sửa/ }).click();
  await page.getByRole("dialog").waitFor();
}

await test("Profile has no exact-time field", async page => {
  await openProfile(page);
  assert.equal(await page.getByRole("dialog").locator('input[type="time"]').count(), 0);
  assert.equal(await page.getByRole("dialog").getByText(/Giờ chính xác/).count(), 0);
});

await test("Profile offers the 63 historical provinces and saves a selected province", async page => {
  await openProfile(page);
  const place = page.locator("select#ax-pm-place");
  await place.waitFor({ timeout: 1200 });
  const options = await place.locator("option").evaluateAll(items => items.filter(item => !item.disabled && item.value).map(item => item.textContent.trim()));
  assert.equal(new Set(options).size, 63);
  for (const province of ["Hà Nội", "Hà Giang", "Bắc Kạn", "Thừa Thiên Huế", "Bình Dương", "Bà Rịa - Vũng Tàu"]) {
    assert.ok(options.some(option => option.replaceAll("–", "-") === province), `missing historical province ${province}`);
  }
  await place.selectOption({ label: "Hà Giang" });
  await page.locator("#ax-pm-hour").selectOption({ index: 1 });
  await page.getByRole("button", { name: /Lưu thay đổi/ }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByText("Hà Giang", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("Hà Giang", { exact: true }).waitFor();
});

await browser.close();
console.log(`UX regressions: ${tests - failures}/${tests} passed`);
process.exitCode = failures ? 1 : 0;
