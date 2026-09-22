import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../qa-report/deck-bounds/", import.meta.url));

// Measure every rendered card, not scrollWidth: overflow:clip can hide a bug.
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: "reduce" });
const issues = [];
const sizes = [280, 320, 359, 360, 390, 429, 430, 437, 502, 599, 600, 768, 972, 1023, 1024, 1280, 1440, 1713, 1920, 2560, 3440];
const sample = () => {
  const stage = document.querySelector(".ax-deck-stage").getBoundingClientRect();
  const cards = [...document.querySelectorAll(".ax-module-card")].map(el => {
    const r = el.getBoundingClientRect();
    return { title: el.querySelector("h3").textContent, left: r.left, right: r.right };
  });
  return { left: stage.left, right: stage.right, width: stage.width, cards };
};
function check(result, context) {
  for (const card of result.cards) {
    if (card.left < result.left - 1 || card.right > result.right + 1)
      issues.push({ ...context, card: card.title, left: card.left, right: card.right, bounds: [result.left, result.right] });
  }
}
try {
  for (const width of sizes) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("http://localhost:3311");
    await page.evaluate(() => document.fonts.ready);
    for (let selected = 0; selected < 6; selected++) {
      await page.getByRole("button", { name: "Card tiếp theo", exact: true }).click();
      check(await page.evaluate(sample), { width, selected, state: "rest" });
    }
    const geometry = await page.evaluate(sample);
    const coverage = (Math.max(...geometry.cards.map(c => c.right)) - Math.min(...geometry.cards.map(c => c.left))) / geometry.width;
    if (width >= 1024 && coverage < .8) issues.push({ width, state: "desktop too narrow", coverage });
  }

  // Sample real animation frames during selection and while dragging either way.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [320, 437, 600, 1024, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3311");
    for (const selected of [4, 5, 0]) {
      await page.getByRole("button", { name: "Card tiếp theo", exact: true }).click();
      const frames = await page.evaluate(async () => {
        const frames = [], start = performance.now();
        while (performance.now() - start < 600) {
          await new Promise(requestAnimationFrame);
          const r = document.querySelector(".ax-deck-stage").getBoundingClientRect();
          frames.push({ left: r.left, right: r.right, cards: [...document.querySelectorAll(".ax-module-card")].map(e => {
            const c = e.getBoundingClientRect();
            return { title: e.querySelector("h3").textContent, left: c.left, right: c.right };
          }) });
        }
        return frames;
      });
      frames.forEach(frame => check(frame, { width, selected, state: "animation" }));
    }
    await page.locator(".ax-deck-stage").scrollIntoViewIfNeeded();
    for (const direction of [-1, 1]) {
      const box = await page.locator(".ax-deck-slot.is-active .ax-module-art").boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + direction * Math.min(160, width / 2 - 4), y, { steps: 10 });
      assert.equal(await page.locator(".ax-deck-slot.is-dragging").count(), 1, "The swipe must actually start");
      check(await page.evaluate(sample), { width, direction, state: "drag" });
      await page.mouse.up();
      await page.waitForTimeout(650);
    }
  }
  // A resized viewport must fit immediately, not only after a transition ends.
  for (const width of [2560, 320, 1440, 437, 1024, 600]) {
    await page.setViewportSize({ width, height: 900 });
    for (let frame = 0; frame < 30; frame++) {
      await page.evaluate(() => new Promise(requestAnimationFrame));
      check(await page.evaluate(sample), { width, frame, state: "resize" });
    }
  }
} finally {
  await browser.close();
  mkdirSync(output, { recursive: true });
  writeFileSync(`${output}/report.json`, JSON.stringify({ widths: sizes, issues }, null, 2));
}
console.log(JSON.stringify({ widths: sizes.length, issues: issues.length, samples: issues.slice(0, 8) }, null, 2));
assert.equal(issues.length, 0, "Every card must fit inside the stage, including animation and drag");
