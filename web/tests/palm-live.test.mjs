import test from 'node:test';
import assert from 'node:assert/strict';
import { canCaptureHand } from '../src/lib/hand-tracker.ts';
test('capture requires a recent real hand observation, not just a playing camera', () => {
  assert.equal(canCaptureHand('none', 100, 110), false);
  assert.equal(canCaptureHand('ready', 0, 110), false);
  assert.equal(canCaptureHand('ready', 100, 800), false);
  assert.equal(canCaptureHand('far', 100, 110), false);
  assert.equal(canCaptureHand('tilt', 100, 110), false);
  assert.equal(canCaptureHand('ready', 100, 110), true);
});
