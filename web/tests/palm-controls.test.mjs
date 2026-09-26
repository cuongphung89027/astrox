import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraControls, focusCamera, setCameraTorch, settleWithin, CONTROL_SETTLE_MS } from '../src/lib/palm-camera.ts';

test('unsupported controls do not apply constraints or report success', async () => {
 const t = { getCapabilities: () => ({}), applyConstraints: () => { throw Error('must not call'); } };
 assert.deepEqual(cameraControls(t), { torch: false, focus: false });
 assert.equal(await focusCamera(t, .2, .8), false);
 assert.equal(await setCameraTorch(t, true), false);
});
test('torch only reports the state confirmed by the track', async () => {
 let on = false;
 const t = { getCapabilities: () => ({ torch: true }), getSettings: () => ({ torch: on }), applyConstraints: async c => { on = c.advanced[0].torch; } };
 assert.equal(await setCameraTorch(t, true), true);
 assert.equal(await setCameraTorch(t, false), true);
});
test('focus coordinates are clamped to the sensor area', async () => {
  let applied;
  const t = { getCapabilities: () => ({ focusMode: ['single-shot'], pointsOfInterest: true }), applyConstraints: async c => { applied = c.advanced[0]; } };
  assert.equal(await focusCamera(t, -1, 2), true);
  assert.deepEqual(applied.pointsOfInterest, [{ x: 0, y: 1 }]);
});

test('the control deadline stays a bounded few seconds', () => {
  assert.ok(CONTROL_SETTLE_MS >= 2000 && CONTROL_SETTLE_MS <= 8000, CONTROL_SETTLE_MS);
});

test('settleWithin reports value, error and timeout without throwing late', async () => {
  assert.deepEqual(await settleWithin(Promise.resolve('ok'), 20), { settled: true, value: 'ok' });
  assert.deepEqual(await settleWithin(Promise.reject(new Error('broken')), 20), { settled: false, reason: 'error' });
  assert.deepEqual(await settleWithin(new Promise(() => {}), 20), { settled: false, reason: 'timeout' });
});

test('a track whose applyConstraints never settles cannot hang torch or focus', async () => {
  const hanging = {
    getCapabilities: () => ({ focusMode: ['single-shot'], pointsOfInterest: true, torch: true }),
    getSettings: () => ({ torch: false }),
    applyConstraints: () => new Promise(() => {}),
  };
  const started = Date.now();
  assert.equal(await focusCamera(hanging, 0.5, 0.5, { timeoutMs: 25 }), false);
  assert.equal(await setCameraTorch(hanging, true, { timeoutMs: 25 }), false);
  assert.ok(Date.now() - started < 1000, Date.now() - started);
});

test('a settlement arriving after the deadline is ignored, not reported as success', async () => {
  let resolveLate;
  const late = new Promise((resolve) => { resolveLate = resolve; });
  const track = {
    getCapabilities: () => ({ focusMode: ['single-shot'], pointsOfInterest: true }),
    applyConstraints: () => late,
  };
  assert.equal(await focusCamera(track, 0.5, 0.5, { timeoutMs: 20 }), false);
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    resolveLate();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
  assert.deepEqual(unhandled, []);
});

test('a rejected settlement after the deadline is swallowed without an unhandled rejection', async () => {
  let rejectLate;
  const late = new Promise((_, reject) => { rejectLate = reject; });
  const track = {
    getCapabilities: () => ({ focusMode: ['single-shot'], pointsOfInterest: true }),
    applyConstraints: () => late,
  };
  assert.equal(await focusCamera(track, 0.5, 0.5, { timeoutMs: 20 }), false);
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    rejectLate(new Error('driver failed after deadline'));
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
  assert.deepEqual(unhandled, []);
});
