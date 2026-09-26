import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePalmPhoto, palmPhotoGate,
  PALM_PHOTO_MAX_BYTES, PALM_PHOTO_MAX_DATA_LENGTH,
  PALM_PHOTO_READ_ERROR, PALM_PHOTO_SIZE_ERROR, PALM_PHOTO_TYPE_ERROR,
} from '../src/lib/palm-photo.ts';

/** File giả: helper chỉ đọc type/size rồi chuyển tiếp cho decoder. */
const file = (type = 'image/jpeg', size = 1024) => ({ type, size, name: 'fixture' });
const deferred = () => { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };

function stub(t, key, value) {
  const had = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => { if (had) Object.defineProperty(globalThis, key, had); else delete globalThis[key]; });
}

function fakeCanvas(t, { dataUrl } = {}) {
  const calls = { qualities: [], draws: [], canvases: [] };
  const canvas = () => {
    const node = {
      width: 0,
      height: 0,
      getContext: (kind) => (kind === '2d' ? { drawImage: (...args) => calls.draws.push(args) } : null),
      toDataURL: (type, quality) => {
        assert.equal(type, 'image/jpeg');
        calls.qualities.push(quality);
        return dataUrl ? dataUrl(quality, calls.qualities.length) : `data:image/jpeg;base64,${'A'.repeat(400)}`;
      },
    };
    calls.canvases.push(node);
    return node;
  };
  stub(t, 'document', { createElement: (tag) => { assert.equal(tag, 'canvas'); return canvas(); } });
  return calls;
}

function fakeBitmap(t, { width = 2400, height = 1600, pending } = {}) {
  const calls = { args: [], closed: 0 };
  stub(t, 'createImageBitmap', (...args) => {
    calls.args.push(args);
    if (pending) return pending.promise;
    return Promise.resolve({ width, height, close: () => { calls.closed++; } });
  });
  return calls;
}

function fakeImage(t, { width = 2400, height = 1600, fail = false, hold = false } = {}) {
  const calls = { srcs: [], created: 0, images: [] };
  class FakeImage {
    constructor() { calls.created++; calls.images.push(this); }
    set src(value) {
      calls.srcs.push(value);
      this._src = value;
      if (hold) return;
      queueMicrotask(() => {
        if (fail) { this.onerror?.(new Event('error')); return; }
        this.naturalWidth = width; this.naturalHeight = height;
        this.onload?.(new Event('load'));
      });
    }
    get src() { return this._src; }
  }
  stub(t, 'Image', FakeImage);
  return calls;
}

function fakeObjectUrl(t) {
  const calls = { created: [], revoked: [] };
  const create = () => { const url = `blob:fixture/${calls.created.length + 1}`; calls.created.push(url); return url; };
  stub(t, 'URL', Object.assign(Object.create(globalThis.URL), {
    createObjectURL: create,
    revokeObjectURL: (url) => calls.revoked.push(url),
  }));
  return calls;
}

test('the type and size gates reject before any decoding work', () => {
  assert.equal(palmPhotoGate(file('image/heic', 1024)), PALM_PHOTO_TYPE_ERROR);
  assert.equal(palmPhotoGate(file('text/plain', 10)), PALM_PHOTO_TYPE_ERROR);
  assert.equal(palmPhotoGate(file('image/jpeg', PALM_PHOTO_MAX_BYTES + 1)), PALM_PHOTO_TYPE_ERROR);
  assert.equal(palmPhotoGate(file('image/webp', PALM_PHOTO_MAX_BYTES)), null);
});

test('normalizePalmPhoto gates and never touches a decoder for a bad file', async (t) => {
  let decoded = 0;
  stub(t, 'createImageBitmap', () => { decoded++; return Promise.resolve({ width: 10, height: 10, close: () => {} }); });
  await assert.rejects(normalizePalmPhoto(file('image/heic', 10)), { message: PALM_PHOTO_TYPE_ERROR });
  await assert.rejects(normalizePalmPhoto(file('image/jpeg', PALM_PHOTO_MAX_BYTES + 1)), { message: PALM_PHOTO_TYPE_ERROR });
  assert.equal(decoded, 0);
});

test('normalizePalmPhoto decodes with createImageBitmap from-image, caps the long edge and closes the bitmap', async (t) => {
  const bitmap = fakeBitmap(t, { width: 2400, height: 1600 });
  const canvas = fakeCanvas(t, { dataUrl: () => 'data:image/jpeg;base64,normalized' });
  const result = await normalizePalmPhoto(file());
  assert.deepEqual(result, { dataUrl: 'data:image/jpeg;base64,normalized', width: 1200, height: 800 });
  assert.deepEqual(bitmap.args[0][1], { imageOrientation: 'from-image' });
  assert.equal(bitmap.closed, 1);
  assert.deepEqual(canvas.qualities, [0.85]);
  assert.deepEqual(canvas.draws[0].slice(1), [0, 0, 1200, 800]);
});

test('normalizePalmPhoto retries with lower image quality and reports an impossible size', async (t) => {
  fakeBitmap(t);
  const huge = 'A'.repeat(PALM_PHOTO_MAX_DATA_LENGTH + 1);
  const canvas = fakeCanvas(t, { dataUrl: (quality) => (quality === 0.6 ? 'data:image/jpeg;base64,small' : huge) });
  const result = await normalizePalmPhoto(file());
  assert.equal(result.dataUrl, 'data:image/jpeg;base64,small');
  assert.deepEqual(canvas.qualities, [0.85, 0.6]);

  fakeCanvas(t, { dataUrl: () => huge });
  await assert.rejects(normalizePalmPhoto(file()), { message: PALM_PHOTO_SIZE_ERROR });
});

test('normalizePalmPhoto falls back to an <img> decode when createImageBitmap is unavailable', async (t) => {
  stub(t, 'createImageBitmap', undefined);
  const image = fakeImage(t, { width: 2400, height: 1600 });
  const urls = fakeObjectUrl(t);
  fakeCanvas(t, { dataUrl: () => 'data:image/jpeg;base64,fallback' });
  const result = await normalizePalmPhoto(file());
  assert.deepEqual(result, { dataUrl: 'data:image/jpeg;base64,fallback', width: 1200, height: 800 });
  assert.equal(image.created, 1);
  assert.deepEqual(image.srcs, urls.created);
  assert.deepEqual(urls.revoked, urls.created);
});

test('normalizePalmPhoto falls back when createImageBitmap rejects and still revokes the blob URL', async (t) => {
  stub(t, 'createImageBitmap', () => Promise.reject(new TypeError('createImageBitmap not supported')));
  fakeImage(t, { width: 800, height: 400 });
  const urls = fakeObjectUrl(t);
  fakeCanvas(t, { dataUrl: () => 'data:image/jpeg;base64,fallback' });
  const result = await normalizePalmPhoto(file());
  assert.deepEqual(result, { dataUrl: 'data:image/jpeg;base64,fallback', width: 800, height: 400 });
  assert.deepEqual(urls.revoked, urls.created);
});

test('normalizePalmPhoto reports an unreadable image without leaking the object URL', async (t) => {
  stub(t, 'createImageBitmap', undefined);
  fakeImage(t, { fail: true });
  const urls = fakeObjectUrl(t);
  fakeCanvas(t);
  await assert.rejects(normalizePalmPhoto(file()), { message: PALM_PHOTO_READ_ERROR });
  assert.deepEqual(urls.revoked, urls.created);
});

test('normalizePalmPhoto closes a decoded bitmap when the signal aborts before drawing', async (t) => {
  const pending = deferred();
  const calls = fakeBitmap(t, { pending });
  const urls = fakeObjectUrl(t);
  const controller = new AbortController();
  const task = normalizePalmPhoto(file(), { signal: controller.signal });
  controller.abort();
  pending.resolve({ width: 2000, height: 1000, close: () => { calls.closed++; } });
  await assert.rejects(task, { name: 'AbortError' });
  assert.equal(calls.closed, 1);
  assert.equal(urls.created.length, 0);
});

test('normalizePalmPhoto aborts an <img> fallback decode and revokes the blob URL', async (t) => {
  stub(t, 'createImageBitmap', undefined);
  fakeImage(t, { hold: true });
  const urls = fakeObjectUrl(t);
  const controller = new AbortController();
  const task = normalizePalmPhoto(file(), { signal: controller.signal });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await assert.rejects(task, { name: 'AbortError' });
  assert.deepEqual(urls.revoked, urls.created);
});

test('normalizePalmPhoto does not start decoding for an already aborted signal', async (t) => {
  let decoded = 0;
  stub(t, 'createImageBitmap', () => { decoded++; return Promise.resolve({ width: 10, height: 10, close: () => {} }); });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(normalizePalmPhoto(file(), { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(decoded, 0);
});
