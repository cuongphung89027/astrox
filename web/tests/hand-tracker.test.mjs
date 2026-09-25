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
