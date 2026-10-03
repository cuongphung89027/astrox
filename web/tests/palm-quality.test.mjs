import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';
const { assessPalmPixels } = await load('lib/palm-quality.ts');
const pixels = (fn, w = 64, h = 64) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = fn(x, y);
      data[i + 3] = 255;
    }
  return data;
};
const sharp = pixels((x, y) => (((x >> 2) + (y >> 2)) % 2 ? 170 : 95));
const inspect = data => assessPalmPixels(data, 64, 64, { sourceWidth: 1200, sourceHeight: 1600 });
test('sharp well exposed image stays usable without inventing detection', () => {
  const q = inspect(sharp);
  assert.notEqual(q.state, 'retake');
  assert.equal(q.checks.find(c => c.id === 'sharpness').status, 'pass');
  assert.equal(q.checks.find(c => c.id === 'hand').status, 'unknown');
});
test('dark image gives specific lighting retake rather than a generic score', () => {
  const q = inspect(pixels(() => 8));
  assert.equal(q.state, 'retake');
  assert.equal(q.checks.find(c => c.id === 'lighting').status, 'fail');
});
test('overexposure and flat blur are independently identified', () => {
  assert.equal(inspect(pixels(() => 252)).checks.find(c => c.id === 'lighting').status, 'fail');
  assert.equal(inspect(pixels(() => 130)).checks.find(c => c.id === 'sharpness').status, 'warn');
});
test('missing hand and clipped hand require another image when detector ran', () => {
  assert.equal(assessPalmPixels(sharp, 64, 64, { sourceWidth: 1200, sourceHeight: 1600, hand: null }).state, 'retake');
  const hand = Array.from({ length: 21 }, (_, i) => ({ x: i ? 0.4 : 0.005, y: 0.4 + i / 100 }));
  assert.equal(
    assessPalmPixels(sharp, 64, 64, { sourceWidth: 1200, sourceHeight: 1600, hand }).checks.find(
      c => c.id === 'framing',
    ).status,
    'fail',
  );
});
test('small source and invalid pixel buffer cannot pass', () => {
  assert.equal(assessPalmPixels(sharp, 64, 64, { sourceWidth: 200, sourceHeight: 250 }).state, 'retake');
  assert.throws(() => assessPalmPixels(new Uint8ClampedArray(1), 64, 64), /PIXELS/);
});

test('a tiny detected hand does not pass the final upload framing check', () => {
  const hand = Array.from({ length: 21 }, (_, i) => ({ x: 0.4 + (i % 5) / 100, y: 0.4 + Math.floor(i / 5) / 100 }));
  const q = assessPalmPixels(sharp, 64, 64, { sourceWidth: 1200, sourceHeight: 1600, hand });
  assert.equal(q.checks.find(c => c.id === 'framing').status, 'fail');
});

test('aborting photo decode releases handlers without starting the detector', async () => {
  const images = [];
  let loads = 0;
  const { inspectPalmPhoto } = await load('lib/palm-quality.ts', {
    mocks: {
      './hand-tracker': {
        loadHandTracker: async () => {
          loads++;
        },
        assessHand: () => 'ready',
        frameFromLandmarks: () => ({}),
      },
    },
    globals: {
      Image: class {
        constructor() {
          images.push(this);
        }
      },
    },
  });
  const controller = new AbortController();
  const pending = inspectPalmPhoto('data:image/jpeg;base64,QUJD', controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  const image = images[0];
  assert.equal(image.src, '');
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  assert.equal(loads, 0);
});

test('final photo inspection uses IMAGE mode, closes the detector and rejects an absent hand', async () => {
  let closed = 0,
    options;
  const { inspectPalmPhoto } = await load('lib/palm-quality.ts', {
    mocks: {
      './hand-tracker': {
        loadHandTracker: async o => {
          options = o;
          return {
            detect: () => ({ landmarks: [] }),
            close() {
              closed++;
            },
          };
        },
        assessHand: () => 'none',
        frameFromLandmarks: () => ({}),
      },
    },
    globals: {
      Image: class {
        naturalWidth = 1200;
        naturalHeight = 1200;
        set src(v) {
          if (v) queueMicrotask(() => this.onload?.());
        }
      },
      document: {
        createElement: () => ({
          getContext: () => ({
            drawImage() {},
            getImageData: () => ({ data: pixels((x, y) => ((x + y) % 2 ? 170 : 95), 160, 160) }),
          }),
        }),
      },
    },
  });
  const quality = await inspectPalmPhoto('data:image/jpeg;base64,QUJD', new AbortController().signal);
  assert.equal(options.runningMode, 'IMAGE');
  assert.equal(closed, 1);
  assert.equal(quality.state, 'retake');
  assert.equal(quality.checks.find(c => c.id === 'hand').status, 'fail');
});
