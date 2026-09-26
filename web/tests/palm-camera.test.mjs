import test from "node:test";
import assert from "node:assert/strict";
import { pickLens, scoreLenses, needsRescan, luminanceMean, lightVerdict, lensOpenPlan } from "../src/lib/palm-camera.ts";

/** `label` mặc định lấy theo deviceId để test ngắn gọn; truyền nhãn thật khi cần. */
const lens = (deviceId, zoomMin, label = deviceId) => ({ deviceId, label, zoomMin });

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

test("scoreLenses is the same pick used by the alias", () => {
  assert.equal(scoreLenses, pickLens);
});

test("scoreLenses drops a tele lens by label even without zoom info", () => {
  assert.equal(
    scoreLenses([
      lens("0", null, "camera2 0, facing back"),
      lens("1", null, "camera2 1, facing back tele"),
    ])?.deviceId,
    "0",
  );
});

test("scoreLenses drops an ultra-wide lens by label without zoom info", () => {
  assert.equal(
    scoreLenses([
      lens("0", null, "camera2 0, facing back"),
      lens("1", null, "camera2 1, facing back ultra wide"),
    ])?.deviceId,
    "0",
  );
});

test("scoreLenses drops labelled side lenses even when they look closer to 1x", () => {
  const picked = scoreLenses([
    lens("tele", 1, "Back Telephoto Camera"),
    lens("main", 2, "Back Camera"),
  ]);
  assert.equal(picked?.deviceId, "main");
});

test("scoreLenses adds a bonus for a wide/main label", () => {
  // Cùng đáy 3x: nhãn wide vẫn thắng nhãn trung tính nhờ điểm cộng.
  assert.equal(scoreLenses([lens("a", 3, "Camera 0"), lens("b", 3, "Back Wide Camera")])?.deviceId, "b");
});

test("scoreLenses ignores the label filter when every candidate looks like a side lens", () => {
  // Không còn lựa chọn nào khác → vẫn phải trả lens gần 1x nhất.
  assert.equal(scoreLenses([lens("tele", 3, "Tele"), lens("macro", 1, "Macro")])?.deviceId, "macro");
});

test("scoreLenses keeps candidates[0] when labels match and no zoom info exists", () => {
  assert.equal(
    scoreLenses([
      lens("0", null, "camera2 0, facing back"),
      lens("1", null, "camera2 0, facing back"),
    ])?.deviceId,
    "0",
  );
});

test("scoreLenses treats zoom min 100 as a 100-based unit base", () => {
  assert.equal(scoreLenses([lens("a", 300, "Camera 0"), lens("b", 100, "Camera 1")])?.deviceId, "b");
});

test("scoreLenses returns null for an empty list", () => {
  assert.equal(scoreLenses([]), null);
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

test("lensOpenPlan moves off a tele default when only labels separate the lenses", () => {
  assert.deepEqual(
    lensOpenPlan(
      [
        lens("0", null, "camera2 0, facing back tele"),
        lens("1", null, "camera2 1, facing back"),
      ],
      "0",
    ),
    { primary: "1", fallback: "0" },
  );
});

/**
 * Luồng mở camera thật (lỗi máy thật: Find X9 Ultra không expose zoom nên
 * không bao giờ dò, giữ nguyên lens tele mặc định). Mỗi case nạp lại module
 * bằng query riêng để cache lens trong module không lẫn giữa các case.
 */
function fakeCameras(t, { cameras, defaultIndex = 0, stored = null, fail = {} }) {
  // node:test chạy cả file trong 1 process: trả global về nguyên trạng sau test.
  const mediaDevices = navigator.mediaDevices;
  const storageDesc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  t.after(() => {
    if (mediaDevices === undefined) delete navigator.mediaDevices;
    else navigator.mediaDevices = mediaDevices;
    if (storageDesc) Object.defineProperty(globalThis, "localStorage", storageDesc);
    else delete globalThis.localStorage;
  });
  const store = new Map();
  if (stored) store.set("astrox.palm.lensId", stored);
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const named = (name) => Object.assign(new Error(name), { name });
  const calls = [];
  const streamOf = (cam) => {
    const track = {
      label: cam.label,
      getSettings: () => ({ facingMode: "environment", deviceId: cam.deviceId }),
      getCapabilities: () => (cam.zoomMin == null ? {} : { zoom: { min: cam.zoomMin } }),
      stop: () => {},
    };
    return { getVideoTracks: () => [track], getTracks: () => [track] };
  };
  navigator.mediaDevices = {
    enumerateDevices: async () =>
      cameras.map((c) => ({ kind: "videoinput", deviceId: c.deviceId, label: c.label })),
    getUserMedia: async (constraints) => {
      const requested = constraints?.video?.deviceId?.exact ?? null;
      calls.push(requested ?? "default");
      if (requested && fail[requested]) throw named(fail[requested]);
      const cam = requested === null ? cameras[defaultIndex] : cameras.find((c) => c.deviceId === requested);
      if (!cam) throw named("NotFoundError");
      return streamOf(cam);
    },
  };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  return { calls, store };
}

const TELE = { deviceId: "0", label: "camera2 0, facing back tele", zoomMin: null };
const BACK = { deviceId: "1", label: "camera2 1, facing back", zoomMin: null };
/** Lens mặc định đã là lens tốt nhất → auto-pick không ghi gì vào localStorage. */
const FRONT = { deviceId: "front", label: "camera2 2, facing front", zoomMin: null };
const MAIN_FIRST = { deviceId: "0", label: "camera2 0, facing back", zoomMin: null };
const TELE_SECOND = { deviceId: "1", label: "camera2 1, facing back tele", zoomMin: null };

test("openBackCamera skips the lens scan on a single-camera device", async (t) => {
  const env = fakeCameras(t, { cameras: [{ deviceId: "solo", label: "camera2 0, facing back", zoomMin: null }] });
  const { openBackCamera } = await import("../src/lib/palm-camera.ts?flow-single");
  const opened = await openBackCamera();
  assert.equal(opened.deviceId, "solo");
  assert.deepEqual(env.calls, ["default"]);
  assert.equal(opened.backList.length, 1);
});

test("openBackCamera neither counts nor opens the front camera (1 back + 1 front)", async (t) => {
  const env = fakeCameras(t, {
    cameras: [{ deviceId: "back", label: "camera2 0, facing back", zoomMin: null }, FRONT],
  });
  const { openBackCamera } = await import("../src/lib/palm-camera.ts?flow-one-back");
  const opened = await openBackCamera();
  assert.equal(opened.deviceId, "back");
  assert.deepEqual(env.calls, ["default"]); // không mở cam trước, không dò
  assert.equal(opened.backList.length, 1);
});

test("openBackCamera scans back cameras only when a front label separates them", async (t) => {
  const env = fakeCameras(t, { cameras: [TELE, BACK, FRONT] });
  const { openBackCamera } = await import("../src/lib/palm-camera.ts?flow-skip-front");
  const opened = await openBackCamera();
  assert.equal(opened.deviceId, "1");
  assert.deepEqual(env.calls, ["default", "0", "1", "1"]);
  assert.ok(!env.calls.includes("front"));
  assert.ok(!opened.backList.some((c) => c.deviceId === "front"));
});

test("openBackCamera rescans and moves off a tele default even with no zoom signals", async (t) => {
  const env = fakeCameras(t, { cameras: [TELE, BACK] });
  const logs = [];
  const info = console.info;
  console.info = (...a) => logs.push(a.map(String).join(" "));
  try {
    const { openBackCamera } = await import("../src/lib/palm-camera.ts?flow-no-signals");
    const opened = await openBackCamera();
    assert.equal(opened.deviceId, "1");
    // mặc định → quét từng lens → mở lại lens đã chọn
    assert.deepEqual(env.calls, ["default", "0", "1", "1"]);
    assert.equal(env.store.get("astrox.palm.lensId"), undefined); // only explicit choices persist
    assert.equal(logs.length, 0);
  } finally {
    console.info = info;
  }
});

test("openBackCamera opens the remembered lens before the session cache", async (t) => {
  const env = fakeCameras(t, { cameras: [TELE, BACK], stored: "1" });
  const { openBackCamera } = await import("../src/lib/palm-camera.ts?flow-stored");
  const opened = await openBackCamera();
  assert.equal(opened.deviceId, "1");
  assert.deepEqual(env.calls, ["1"]); // mở thẳng, không mở mặc định, không dò
  // Vẫn còn danh sách để đổi ống kính, lens đang dùng đứng đầu.
  assert.deepEqual(opened.backList.map((c) => c.deviceId), ["1", "0"]);
});

test("openBackCamera keeps the remembered lens when opening it fails transiently", async (t) => {
  const env = fakeCameras(t, { cameras: [TELE, BACK], stored: "1", fail: { 1: "NotAllowedError" } });
  const { openBackCamera } = await import("../src/lib/palm-camera.ts?flow-transient");
  const opened = await openBackCamera();
  assert.equal(opened.deviceId, "0"); // rơi về luồng mặc định
  assert.equal(env.store.get("astrox.palm.lensId"), "1"); // nhưng KHÔNG quên lựa chọn
});

test("openBackCamera forgets the remembered lens only when the device is gone", async (t) => {
  const env = fakeCameras(t, { cameras: [MAIN_FIRST, TELE_SECOND], stored: "unplugged" });
  const { openBackCamera } = await import("../src/lib/palm-camera.ts?flow-stale");
  const opened = await openBackCamera();
  assert.equal(opened.deviceId, "0");
  assert.equal(env.calls[0], "unplugged"); // đã thử lens đã nhớ trước
  // Mặc định đã là lens tốt nhất nên không ghi lại gì: giá trị rỗng chứng minh
  // lựa chọn cũ đã bị xoá (NotFoundError = lens thật sự biến mất).
  assert.equal(env.store.has("astrox.palm.lensId"), false);
});

test("switchToLens opens the requested lens and remembers it", async (t) => {
  const env = fakeCameras(t, { cameras: [TELE, BACK] });
  const { switchToLens } = await import("../src/lib/palm-camera.ts?flow-switch");
  const stream = await switchToLens("0");
  assert.equal(stream.getVideoTracks().length, 1);
  assert.deepEqual(env.calls, ["0"]);
  assert.equal(env.store.get("astrox.palm.lensId"), "0");
});

test("openBackCamera and persistLensChoice survive storage throwing", async (t) => {
  const env = fakeCameras(t, { cameras: [TELE, BACK] });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    },
  });
  const { openBackCamera, persistLensChoice } = await import("../src/lib/palm-camera.ts?flow-storage-error");
  assert.doesNotThrow(() => persistLensChoice("1"));
  const opened = await openBackCamera();
  assert.equal(opened.deviceId, "1");
  assert.equal(env.calls[0], "default");
});

test("the opened lens is not always backList[0] — the UI index must sync to it", async (t) => {
  const env = fakeCameras(t, { cameras: [TELE, BACK] });
  const { openBackCamera } = await import("../src/lib/palm-camera.ts?flow-index");
  const opened = await openBackCamera();
  assert.equal(opened.deviceId, "1");
  assert.equal(env.calls.at(-1), "1");
  // PalmCamera lấy lensIdx = findIndex(deviceId đang mở): bấm "Đổi ống kính" lần
  // đầu phải nhảy sang lens kế tiếp, không mở lại chính lens đang dùng.
  assert.equal(opened.backList.findIndex((c) => c.deviceId === opened.deviceId), 1);
});

test("the camera flow stubs restore navigator/localStorage for later tests", () => {
  assert.equal(typeof localStorage, "undefined");
  assert.equal(navigator.mediaDevices, undefined);
});

test('explicit main lens wins over anonymous camera digital zoom range', () => {
  assert.equal(scoreLenses([lens('unknown', 1, 'Camera 0'), lens('wide', null, 'Back Main Camera')]).deviceId, 'wide');
});

function observeStreams() {
  const streams = [];
  const open = navigator.mediaDevices.getUserMedia;
  navigator.mediaDevices.getUserMedia = async constraints => {
    const stream = await open(constraints);
    const entry = { stream, stopped: false };
    stream.getTracks()[0].stop = () => { entry.stopped = true; };
    streams.push(entry);
    return stream;
  };
  return streams;
}

test('enumeration failure stops initial and remembered camera streams', async t => {
  fakeCameras(t, { cameras: [BACK], stored: '1' });
  const streams = observeStreams();
  navigator.mediaDevices.enumerateDevices = async () => { throw new Error('enumeration failed'); };
  const { openBackCamera } = await import('../src/lib/palm-camera.ts?enumeration-cleanup');
  await assert.rejects(openBackCamera());
  assert.ok(streams.length > 0);
  assert.ok(streams.every(s => s.stopped));
});

test('already aborted opening never activates the camera', async t => {
  const env = fakeCameras(t, { cameras: [BACK] });
  const controller = new AbortController(); controller.abort();
  const { openBackCamera } = await import('../src/lib/palm-camera.ts?abort-before-open');
  await assert.rejects(openBackCamera(controller.signal), { name: 'AbortError' });
  assert.deepEqual(env.calls, []);
});

test('cancel during camera scan stops current stream and prevents later probes', async t => {
  const env = fakeCameras(t, { cameras: [TELE, BACK] });
  const streams = observeStreams();
  const controller = new AbortController();
  const open = navigator.mediaDevices.getUserMedia;
  navigator.mediaDevices.getUserMedia = async constraints => {
    const stream = await open(constraints);
    if (constraints.video.deviceId) controller.abort();
    return stream;
  };
  const { openBackCamera } = await import('../src/lib/palm-camera.ts?abort-probe');
  await assert.rejects(openBackCamera(controller.signal), { name: 'AbortError' });
  assert.deepEqual(env.calls, ['default', '0']);
  assert.ok(streams.every(s => s.stopped));
});

test('cancel during pending enumeration promptly stops the acquired stream', async t => {
  fakeCameras(t, { cameras: [BACK] });
  const streams = observeStreams();
  const controller = new AbortController();
  let enumerateStarted;
  const started = new Promise(resolve => { enumerateStarted = resolve; });
  let finishEnumeration;
  navigator.mediaDevices.enumerateDevices = () => { enumerateStarted(); return new Promise(resolve => { finishEnumeration = resolve; }); };
  const { openBackCamera } = await import('../src/lib/palm-camera.ts?abort-enumeration');
  const pending = openBackCamera(controller.signal);
  await started; controller.abort();
  const outcome = await Promise.race([pending.then(() => 'opened', e => e.name), new Promise(resolve => setTimeout(() => resolve('hung'), 30))]);
  const stoppedOnAbort = streams.every(s => s.stopped);
  finishEnumeration([{ kind: 'videoinput', deviceId: '1', label: BACK.label }]);
  await pending.catch(() => {});
  assert.equal(outcome, 'AbortError');
  assert.equal(stoppedOnAbort, true);
});

test('a camera granted after cancellation is immediately stopped', async t => {
  const env = fakeCameras(t, { cameras: [BACK] });
  const streams = observeStreams();
  const controller = new AbortController();
  const open = navigator.mediaDevices.getUserMedia;
  let grant;
  navigator.mediaDevices.getUserMedia = constraints => new Promise(resolve => { grant = async () => resolve(await open(constraints)); });
  const { openBackCamera } = await import('../src/lib/palm-camera.ts?late-grant');
  const pending = openBackCamera(controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await grant();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(env.calls, ['default']);
  assert.equal(streams[0].stopped, true);
});
