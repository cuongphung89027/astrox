import test from "node:test";
import assert from "node:assert/strict";
import {
  frameFromLandmarks, assessHand, bumpStable, readyToCountdown,
  verdictMessage, fingertipsOf, HAND_THRESHOLDS,
} from "../src/lib/hand-tracker.ts";

// Bàn tay trải đều: x 0.3..0.6 (w=0.3), y 0.25..0.75 (h=0.5) → ratio 0.15, aspect 0.6
const palm = [];
for (let i = 0; i < 21; i++)
  palm.push({ x: 0.3 + (i % 5) * 0.075, y: 0.25 + Math.floor(i / 5) * 0.125 });
// To nhưng dẹt ngang: w=0.9, h=0.15 → ratio 0.135, aspect 6
const flat = [];
for (let i = 0; i < 21; i++)
  flat.push({ x: 0.05 + (i % 5) * 0.225, y: 0.45 + Math.floor(i / 5) * 0.0375 });

test("no landmarks means no hand with guidance copy", () => {
  const f = frameFromLandmarks(null, null);
  assert.equal(f.present, false);
  assert.equal(assessHand(f), "none");
  assert.equal(verdictMessage("none"), "Đưa lòng bàn tay vào khung");
});

test("a small hand reads as too far", () => {
  const pts = palm.map((p) => ({ x: 0.5 + (p.x - 0.5) * 0.2, y: 0.5 + (p.y - 0.5) * 0.2 }));
  assert.equal(assessHand(frameFromLandmarks(pts, null)), "far");
  assert.equal(verdictMessage("far"), "Đưa tay sát hơn");
});

test("a big but sideways hand reads as tilt", () => {
  assert.equal(assessHand(frameFromLandmarks(flat, null)), "tilt");
  assert.equal(verdictMessage("tilt"), "Xoay lòng bàn tay về phía máy");
});

test("a well framed palm is ready and accumulates stability into countdown", () => {
  const f = frameFromLandmarks(palm, null);
  assert.equal(assessHand(f), "ready");
  let stable = 0;
  for (let i = 0; i < HAND_THRESHOLDS.readyFrames; i++) stable = bumpStable(stable, { ...f, motion: 0.001 });
  assert.ok(readyToCountdown(stable));
});

test("motion or losing the hand resets stability", () => {
  const f = frameFromLandmarks(palm, null);
  assert.equal(bumpStable(99, { ...f, motion: 0.5 }), 0);
  assert.equal(bumpStable(99, { present: false, bboxRatio: 0, aspect: 0, motion: 0 }), 0);
});

test("first detection frame counts as moving (no stability credit)", () => {
  const f = frameFromLandmarks(palm, null);
  assert.equal(f.motion, 1);
  assert.equal(bumpStable(0, f), 0);
});

test("fingertipsOf returns the 5 MediaPipe fingertip landmarks", () => {
  const tips = fingertipsOf(palm);
  assert.equal(tips.length, 5);
  assert.deepEqual(tips[0], palm[4]);
  assert.deepEqual(tips[4], palm[20]);
});

test("aspect uses source pixels rather than normalized coordinates", () => {
  const points = [{ x: .2, y: .2 }, { x: .8, y: .8 }];
  assert.equal(assessHand(frameFromLandmarks(points, points, 1920, 1080)), "ready");
  assert.equal(assessHand(frameFromLandmarks(points, points, 1080, 2400)), "tilt");
});

import { startDetectLoop } from "../src/lib/hand-tracker.ts";

function animationHarness(t) {
  let next = 0;
  let now = 100;
  const callbacks = new Map();
  t.mock.method(globalThis, "requestAnimationFrame", (cb) => { callbacks.set(++next, cb); return next; });
  t.mock.method(globalThis, "cancelAnimationFrame", (id) => callbacks.delete(id));
  t.mock.method(performance, "now", () => now);
  return { callbacks, step() { now += 100; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(cb => cb()); } };
}
// Node has no animation API. Install only the boundary that these tests control.
globalThis.requestAnimationFrame ??= () => 0;
globalThis.cancelAnimationFrame ??= () => {};

test("repeated detector errors stop the loop and surface one error", (t) => {
  const frames = animationHarness(t);
  const video = { readyState: 4, currentTime: 1 };
  const errors = [];
  const stop = startDetectLoop(video, { detectForVideo() { throw new Error("WASM failed"); } }, () => {}, err => errors.push(err));
  for (let i = 0; i < 5; i++) { video.currentTime++; frames.step(); }
  stop();
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /WASM failed/);
  assert.equal(frames.callbacks.size, 0);
});

test("duplicate video frames do not earn stability", (t) => {
  const frames = animationHarness(t);
  const video = { readyState: 4, currentTime: 1 };
  let results = 0;
  const stop = startDetectLoop(video, { detectForVideo() { return { landmarks: [palm] }; } }, () => results++);
  for (let i = 0; i < 5; i++) frames.step();
  video.currentTime++;
  frames.step();
  stop();
  assert.equal(results, 2);
});

import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
async function loaderWithVision(vision) {
  globalThis.__trackerTestVision = vision;
  const source = await readFile(new URL("../src/lib/hand-tracker.ts", import.meta.url), "utf8");
  const js = stripTypeScriptTypes(source).replace('import("@mediapipe/tasks-vision")', 'Promise.resolve(globalThis.__trackerTestVision)');
  return (await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}#${Math.random()}`)).loadHandTracker;
}

test("tracker load deadline rejects and closes a model arriving late", async () => {
  let resolveModel;
  let closed = 0;
  const load = await loaderWithVision({ FilesetResolver: { forVisionTasks: async () => ({}) }, HandLandmarker: { createFromOptions: () => new Promise(resolve => { resolveModel = resolve; }) } });
  const result = await Promise.race([load({ timeoutMs: 10 }).then(() => "loaded", err => err.name), new Promise(resolve => setTimeout(() => resolve("hung"), 100))]);
  resolveModel({ close() { closed++; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(result, "TimeoutError");
  assert.equal(closed, 1);
});

test("abort before loading prevents model creation", async () => {
  let created = 0;
  const load = await loaderWithVision({ FilesetResolver: { forVisionTasks: async () => ({}) }, HandLandmarker: { createFromOptions: async () => { created++; return { close() {} }; } } });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(load({ signal: controller.signal }), { name: "AbortError" });
  assert.equal(created, 0);
});

test("GPU failure still falls back to CPU", async () => {
  const tracker = { close() {} };
  const load = await loaderWithVision({ FilesetResolver: { forVisionTasks: async () => ({}) }, HandLandmarker: { createFromOptions: async (_, options) => {
    if (options.baseOptions.delegate === "GPU") throw new Error("unsupported GPU");
    return tracker;
  } } });
  assert.equal(await load(), tracker);
});
