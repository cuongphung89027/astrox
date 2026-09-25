import test from "node:test";
import assert from "node:assert/strict";
import { normalizeZoomUnit, pickLens, needsRescan, luminanceMean, lightVerdict, lensOpenPlan } from "../src/lib/palm-camera.ts";

const lens = (deviceId, zoomMin) => ({ deviceId, label: deviceId, zoomMin });

test("pickLens chooses the wide lens among 1x-based back cameras", () => {
  assert.equal(pickLens([lens("tele", 3), lens("wide", 1), lens("ultra", 0.5)])?.deviceId, "wide");
});

test("pickLens understands 100-based zoom units", () => {
  assert.equal(pickLens([lens("tele", 300), lens("wide", 100)])?.deviceId, "wide");
});

test("pickLens falls back to the first candidate when no zoom info exists", () => {
  assert.equal(pickLens([lens("a", null), lens("b", null)])?.deviceId, "a");
});

test("pickLens returns the only suspicious lens if it is still closest to 1x", () => {
  assert.equal(pickLens([lens("only", 2)])?.deviceId, "only");
});

test("needsRescan flags min zoom far from 1x in either unit base", () => {
  assert.equal(needsRescan(1), false);
  assert.equal(needsRescan(100), false);
  assert.equal(needsRescan(3), true);
  assert.equal(needsRescan(300), true);
  assert.equal(needsRescan(0.5), true);
  assert.equal(needsRescan(null), false);
});

test("luminanceMean is 0 for black and ~255 for white frames", () => {
  const px = (r, g, b) => new Uint8ClampedArray(Array.from({ length: 64 }, () => [r, g, b, 255]).flat());
  assert.equal(luminanceMean(px(0, 0, 0)), 0);
  assert.ok(Math.abs(luminanceMean(px(255, 255, 255)) - 255) < 0.01);
});

test("lightVerdict separates dark, ok and bright", () => {
  assert.equal(lightVerdict(10), "dark");
  assert.equal(lightVerdict(120), "ok");
  assert.equal(lightVerdict(240), "bright");
});

test("pickLens returns the sole candidate of a 1-item backList without zoom info", () => {
  assert.equal(pickLens([lens("solo", null)])?.deviceId, "solo");
});

test("lensOpenPlan targets the wide lens with the default as fallback", () => {
  assert.deepEqual(lensOpenPlan([lens("tele", 3), lens("wide", 1)], "tele"), {
    primary: "wide",
    fallback: "tele",
  });
});

test("lensOpenPlan has no distinct fallback when the default is already the best", () => {
  assert.deepEqual(lensOpenPlan([lens("only", 1)], "only"), { primary: "only", fallback: "only" });
});

test("lensOpenPlan keeps the default when no zoom info separates candidates", () => {
  assert.deepEqual(lensOpenPlan([lens("a", null), lens("b", null)], "a"), {
    primary: "a",
    fallback: "a",
  });
});
