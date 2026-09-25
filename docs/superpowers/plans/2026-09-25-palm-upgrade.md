# Nâng cấp tính năng Chỉ tay — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng luồng `/chitay` lên chuẩn đối thủ: chụp có hướng dẫn, camera mở đúng ống kính wide, nhận diện tay live + tự chụp, màn kết quả "kể chuyện" bằng overlay vẽ dần — không đổi AI/prompt/schema/giá/Worker.

**Architecture:** Tách phần camera + nhận diện thành 2 lib thuần có thể test bằng `node:test` (`palm-camera.ts`, `hand-tracker.ts`), 2 component mới (`PalmGuide`, `PalmCamera`), còn `PalmReader.tsx` chỉ giữ vai trò điều phối. MediaPipe HandLandmarker chạy on-device, model + wasm self-host trong `web/public/`, lazy-load khi mở camera.

**Tech Stack:** Next.js 16 static export (React 19), CSS Modules, `@mediapipe/tasks-vision` (WASM/WebGL), `node:test` cho unit test, Playwright cho QA viewport.

**Spec:** `docs/superpowers/specs/2026-09-25-palm-upgrade-design.md` (cùng worktree).

## Global Constraints

- Làm trong worktree `../astrox-palm`, nhánh `codex/palm-upgrade`, base `a009880`. Không đụng Worker, DB, prompt AI, schema JSON, giá, admin.
- Node >= 22.15; unit test chạy bằng `node --test`, file test đặt `web/tests/*.test.mjs` (glob của `npm run test:unit` sẽ nhặt tự động).
- Single accent: đường đang đọc/chấm mốc màu vàng đồng `#f3cf79`, đường thường `#e0e8d4`. Overlay trong camera màu vàng `rgba(194,161,93,.9)`. **Cấm** đa màu kiểu đối thủ.
- Copy tiếng Việt; media assets self-host cùng origin (`/models/`, `/mediapipe/wasm/`); chỉ tải khi mở camera (dynamic import).
- `prefers-reduced-motion: reduce` phải tắt mọi animation mới.
- QA gate bắt buộc trước khi kết thúc: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run qa:viewport` (kết quả 0 lỗi = pass — script in SỐ LỖI, đừng đọc ngược), `node scripts/ui-30viewports.mjs`, `git diff --check`.
- Bẫy đã biết: `npm run build` ghi đè `.next` của dev server → trước khi chạy dev server QA phải `rm -rf .next` rồi `npx next dev -p 3311`. QA guest prod bị LoginPrompt chặn; QA badge phải intercept site-config.
- Commit sau mỗi task, message tiếng Anh ngắn theo chuẩn repo (`feat:`, `test:`, `chore:`…).

---

### Task 1: Nền tảng chọn ống kính (`palm-camera.ts` — phần pure + unit test)

**Files:**
- Create: `web/src/lib/palm-camera.ts`
- Test: `web/tests/palm-camera.test.mjs`

**Interfaces:**
- Consumes: không (task đầu).
- Produces cho Task 6/7: `type LensCandidate`, `pickLens(candidates): LensCandidate | null`, `needsRescan(zoomMin: number | null): boolean`, `listBackCameras(): Promise<LensCandidate[]>`, `openBackCamera(): Promise<OpenedCamera>` với `OpenedCamera = { stream: MediaStream; deviceId: string; backList: LensCandidate[] }`, `resetLensCache(): void`, `isWellLit(source: CanvasImageSource, w: number, h: number): boolean`, `lightVerdict(mean: number): "dark" | "bright" | "ok"`.

- [ ] **Step 1: Write the failing test** — tạo `web/tests/palm-camera.test.mjs`:

```mjs
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeZoomUnit, pickLens, needsRescan, luminanceMean, lightVerdict } from "../src/lib/palm-camera.ts";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && node --test tests/palm-camera.test.mjs`
Expected: FAIL — `Cannot find module '../src/lib/palm-camera.ts'`.

- [ ] **Step 3: Write the implementation** — tạo `web/src/lib/palm-camera.ts`:

```ts
/**
 * Camera engine cho Chỉ tay: mở camera sau và chọn đúng ống kính wide
 * trên máy nhiều lens (OPPO Find X9 Ultra mở nhầm tele), kèm đánh giá
 * sáng tối khung hình. Hàm pure tách riêng để test node:test; các hàm
 * gọi getUserMedia chỉ chạy trong trình duyệt.
 */

export type LensCandidate = {
  deviceId: string;
  label: string;
  /** Đáy dải zoom theo đúng đơn vị thiết bị báo (thang 1x hoặc 100%). */
  zoomMin: number | null;
};

/** Các lens cùng một máy dùng chung thang đơn vị; >=30 coi như thang phần trăm. */
const UNIT_THRESHOLD = 30;

export function normalizeZoomUnit(mins: number[]): number[] {
  return mins.every((v) => v >= UNIT_THRESHOLD) ? mins.map((v) => v / 100) : mins;
}

/** Lens có đáy dải zoom gần 1x nhất là wide: tele có đáy >=2x, ultra-wide <1x. */
export function pickLens(candidates: LensCandidate[]): LensCandidate | null {
  if (candidates.length === 0) return null;
  const withZoom = candidates.filter((c) => c.zoomMin !== null) as (LensCandidate & { zoomMin: number })[];
  if (withZoom.length === 0) return candidates[0];
  const normalized = normalizeZoomUnit(withZoom.map((c) => c.zoomMin));
  let best = 0;
  for (let i = 1; i < normalized.length; i++)
    if (Math.abs(normalized[i] - 1) < Math.abs(normalized[best] - 1)) best = i;
  return withZoom[best];
}

/** Đáy dải không nằm quanh 1x (phòng cả hai thang) → đáng nghi tele/ultra-wide. */
export function needsRescan(zoomMin: number | null): boolean {
  if (zoomMin === null) return false;
  const nearOne = (zoomMin >= 0.9 && zoomMin <= 1.3) || (zoomMin >= 90 && zoomMin <= 130);
  return !nearOne;
}

type ZoomCaps = { zoom?: { min: number } };
function zoomMinOf(track: MediaStreamTrack): number | null {
  const caps = (track.getCapabilities?.() ?? {}) as ZoomCaps;
  return caps.zoom ? caps.zoom.min : null;
}

/** Liệt kê camera sau kèm đáy dải zoom — mở ngắn từng thiết bị để nhận diện. */
export async function listBackCameras(): Promise<LensCandidate[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const out: LensCandidate[] = [];
  for (const d of devices.filter((v) => v.kind === "videoinput")) {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: d.deviceId } },
      });
      const track = stream.getVideoTracks()[0];
      if (track.getSettings().facingMode === "environment")
        out.push({ deviceId: d.deviceId, label: d.label, zoomMin: zoomMinOf(track) });
    } catch {
      /* thiết bị không mở được — bỏ qua */
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }
  return out;
}

let cachedLensId: string | null = null;
const BASE_VIDEO: MediaTrackConstraints = { facingMode: "environment", width: { ideal: 1280 } };

export type OpenedCamera = { stream: MediaStream; deviceId: string; backList: LensCandidate[] };

export async function openBackCamera(): Promise<OpenedCamera> {
  if (cachedLensId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cachedLensId }, width: { ideal: 1280 } },
        audio: false,
      });
      return { stream, deviceId: cachedLensId, backList: [] };
    } catch {
      cachedLensId = null; // thiết bị đã biến mất — rơi về luồng mặc định
    }
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: BASE_VIDEO, audio: false });
  const track = stream.getVideoTracks()[0];
  const defaultId = track.getSettings().deviceId ?? "";
  const backList: LensCandidate[] = [
    { deviceId: defaultId, label: track.label, zoomMin: zoomMinOf(track) },
  ];
  if (!needsRescan(backList[0].zoomMin)) {
    cachedLensId = defaultId;
    return { stream, deviceId: defaultId, backList };
  }
  const others = await listBackCameras();
  for (const c of others) if (c.deviceId !== defaultId) backList.push(c);
  const best = pickLens(backList);
  const bestId = best?.deviceId ?? defaultId;
  if (bestId === defaultId) {
    cachedLensId = defaultId;
    return { stream, deviceId: defaultId, backList };
  }
  stream.getTracks().forEach((t) => t.stop());
  const switched = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: bestId }, width: { ideal: 1280 } },
    audio: false,
  });
  cachedLensId = bestId;
  return { stream: switched, deviceId: bestId, backList };
}

export function resetLensCache(): void {
  cachedLensId = null;
}

/** Độ sáng trung bình 0..255 theo luminance Rec.709. */
export function luminanceMean(data: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4)
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  return sum / (data.length / 4);
}

export const LIGHT_RANGE = { min: 40, max: 225 } as const;

export function lightVerdict(mean: number): "dark" | "bright" | "ok" {
  if (mean < LIGHT_RANGE.min) return "dark";
  if (mean > LIGHT_RANGE.max) return "bright";
  return "ok";
}

/** Vẽ nguồn vào canvas 64x64 rồi đo độ sáng — dùng cho cả camera và ảnh upload. */
export function isWellLit(source: CanvasImageSource, w: number, h: number): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  ctx.drawImage(source, 0, 0, w, h, 0, 0, 64, 64);
  return lightVerdict(luminanceMean(ctx.getImageData(0, 0, 64, 64).data)) === "ok";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && node --test tests/palm-camera.test.mjs`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/palm-camera.ts web/tests/palm-camera.test.mjs
git commit -m "feat: lens picking logic for multi-camera phones in palm capture"
```

---

### Task 2: Máy trạng thái nhận diện tay (`hand-tracker.ts` — phần pure + unit test)

**Files:**
- Create: `web/src/lib/hand-tracker.ts` (chỉ phần pure; runtime thêm ở Task 4)
- Test: `web/tests/hand-tracker.test.mjs`

**Interfaces:**
- Consumes: không.
- Produces cho Task 6/8: `type HandPoint = { x: number; y: number }`, `type HandVerdict = "none" | "far" | "tilt" | "ready"`, `HAND_THRESHOLDS`, `frameFromLandmarks(pts: HandPoint[] | null, prev: HandPoint[] | null): HandFrame`, `assessHand(f: HandFrame): HandVerdict`, `verdictMessage(v: HandVerdict): string`, `bumpStable(stable: number, f: HandFrame): number`, `readyToCountdown(stable: number): boolean`, `fingertipsOf(pts: HandPoint[]): HandPoint[]`, `type HandFrame = { present: boolean; bboxRatio: number; aspect: number; motion: number }`.

- [ ] **Step 1: Write the failing test** — tạo `web/tests/hand-tracker.test.mjs`:

```mjs
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && node --test tests/hand-tracker.test.mjs`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Write the implementation** — tạo `web/src/lib/hand-tracker.ts` (phần pure, chưa có import MediaPipe):

```ts
/**
 * Nhận diện bàn tay on-device (MediaPipe HandLandmarker) cho Chỉ tay.
 * Phần pure (đánh giá khung hình, bộ đếm ổn định) tách riêng để test
 * node:test; phần nạp model và vòng dò thêm ở phần dưới file, chỉ chạy
 * trong trình duyệt.
 */

export type HandPoint = { x: number; y: number };
export type HandVerdict = "none" | "far" | "tilt" | "ready";
export type HandFrame = { present: boolean; bboxRatio: number; aspect: number; motion: number };

export const HAND_THRESHOLDS = {
  minBboxRatio: 0.12, // diện tích bbox tay / khung
  minAspect: 0.55,    // w/h tối thiểu của bbox tay
  maxAspect: 1.9,     // w/h tối đa
  maxMotion: 0.012,   // biên độ dịch chuyển landmark tối đa giữa 2 frame
  readyFrames: 12,    // frame "ready" liên tiếp (~0.8s ở 15fps) trước khi đếm ngược
} as const;

export function frameFromLandmarks(pts: HandPoint[] | null, prev: HandPoint[] | null): HandFrame {
  if (!pts || pts.length === 0) return { present: false, bboxRatio: 0, aspect: 0, motion: 1 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const motion =
    prev && prev.length === pts.length
      ? Math.max(...pts.map((p, i) => Math.hypot(p.x - prev[i].x, p.y - prev[i].y)))
      : 1;
  return { present: true, bboxRatio: w * h, aspect: w / Math.max(h, 1e-6), motion };
}

export function assessHand(f: HandFrame): HandVerdict {
  if (!f.present) return "none";
  if (f.bboxRatio < HAND_THRESHOLDS.minBboxRatio) return "far";
  if (f.aspect < HAND_THRESHOLDS.minAspect || f.aspect > HAND_THRESHOLDS.maxAspect) return "tilt";
  return "ready";
}

export function verdictMessage(v: HandVerdict): string {
  if (v === "none") return "Đưa lòng bàn tay vào khung";
  if (v === "far") return "Đưa tay sát hơn";
  if (v === "tilt") return "Xoay lòng bàn tay về phía máy";
  return "Giữ yên…";
}

/** Bộ đếm frame ổn định: reset khi tay mất, rời chuẩn hoặc giật. */
export function bumpStable(stable: number, f: HandFrame): number {
  if (assessHand(f) !== "ready" || f.motion > HAND_THRESHOLDS.maxMotion) return 0;
  return stable + 1;
}

export function readyToCountdown(stable: number): boolean {
  return stable >= HAND_THRESHOLDS.readyFrames;
}

/** 5 đầu ngón tay theo chỉ số landmark MediaPipe: cai, trỏ, giữa, áp, út. */
export const FINGERTIP_INDEXES = [4, 8, 12, 16, 20] as const;

export function fingertipsOf(pts: HandPoint[]): HandPoint[] {
  return FINGERTIP_INDEXES.map((i) => pts[i]).filter(Boolean);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && node --test tests/hand-tracker.test.mjs`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/hand-tracker.ts web/tests/hand-tracker.test.mjs
git commit -m "feat: pure hand framing verdict state machine for palm capture"
```

---

### Task 3: Phụ thuộc + tài sản MediaPipe (model + wasm self-host)

**Files:**
- Modify: `web/package.json` (thêm `@mediapipe/tasks-vision`, pin chính xác)
- Create: `web/public/models/hand_landmarker.task` (~7.8 MB, commit binary)
- Create: `web/public/mediapipe/wasm/{vision_wasm_internal.js,vision_wasm_internal.wasm,vision_wasm_nosimd_internal.js,vision_wasm_nosimd_internal.wasm}`

**Interfaces:**
- Produces cho Task 4: model tại URL `/models/hand_landmarker.task`, wasm tại `/mediapipe/wasm/`, package `@mediapipe/tasks-vision` khả dụng cho `import type { HandLandmarker }` và dynamic import.

- [ ] **Step 1: Cài package, pin chính xác**

```bash
cd web
npm view @mediapipe/tasks-vision dist-tags.latest   # nếu không phải 0.10.x thì dừng, báo lại
npm install --save-exact @mediapipe/tasks-vision@0.10.22
```

Expected: `package.json` có `"@mediapipe/tasks-vision": "0.10.22"` trong dependencies. Nếu 0.10.22 không tồn tại, dùng bản 0.10.x mới nhất thay thế và ghi rõ phiên bản đã dùng vào commit message.

- [ ] **Step 2: Tải model + copy wasm**

```bash
mkdir -p web/public/models web/public/mediapipe/wasm
curl -L -o web/public/models/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
cp web/node_modules/@mediapipe/tasks-vision/wasm/* web/public/mediapipe/wasm/
ls -lh web/public/models/hand_landmarker.task web/public/mediapipe/wasm/
```

Expected: model ~7–8 MB; thư mục wasm có đúng 4 file (`vision_wasm_internal.js/.wasm`, `vision_wasm_nosimd_internal.js/.wasm`).

- [ ] **Step 3: Kiểm tra không phá build**

Run: `cd web && npm run typecheck && npm run build`
Expected: cả hai lệnh sạch (package ESM tương thích static export).

- [ ] **Step 4: Commit**

```bash
git add web/package.json web/package-lock.json web/public/models web/public/mediapipe
git commit -m "chore: self-host mediapipe hand landmarker model and wasm for palm capture"
```

---

### Task 4: Runtime tracker — nạp model + vòng dò 15 fps

**Files:**
- Modify: `web/src/lib/hand-tracker.ts` (nối thêm phần runtime dưới phần pure)

**Interfaces:**
- Consumes: package `@mediapipe/tasks-vision` (Task 3), assets từ Task 3.
- Produces cho Task 6: `loadHandTracker(): Promise<HandLandmarker>`, `startDetectLoop(video: HTMLVideoElement, landmarker: HandLandmarker, onFrame: (pts: HandPoint[] | null) => void): () => void` (hàm trả về là stop-loop), re-export `type HandLandmarker`.

- [ ] **Step 1: Nối code runtime vào cuối `hand-tracker.ts`** (thêm ngay sau `fingertipsOf`; phần import type đặt **đầu file**):

```ts
import type { HandLandmarker } from "@mediapipe/tasks-vision";

export type { HandLandmarker };
```

Và ở cuối file:

```ts
/** Nạp HandLandmarker on-device; GPU trước, rơi về CPU nếu GPU fail. */
export async function loadHandTracker(): Promise<HandLandmarker> {
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const make = (delegate: "GPU" | "CPU") =>
    vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/models/hand_landmarker.task", delegate },
      runningMode: "VIDEO",
      numHands: 1,
    });
  try {
    return await make("GPU");
  } catch {
    return await make("CPU");
  }
}

/** Vòng dò ~15fps; timestamp phải tăng đơn điệu hoặc MediaPipe ném lỗi. */
export function startDetectLoop(
  video: HTMLVideoElement,
  landmarker: HandLandmarker,
  onFrame: (pts: HandPoint[] | null) => void,
): () => void {
  let raf = 0;
  let last = 0;
  let ts = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    if (now - last < 66 || video.readyState < 2) return;
    last = now;
    ts = Math.max(ts + 1, Math.round(now));
    try {
      const res = landmarker.detectForVideo(video, ts);
      const pts = (res?.landmarks?.[0] as HandPoint[] | undefined) ?? null;
      onFrame(pts);
    } catch {
      /* frame chưa sẵn sàng — bỏ qua */
    }
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
```

- [ ] **Step 2: Chạy lại unit test (phải vẫn pass) + typecheck**

Run: `cd web && node --test tests/hand-tracker.test.mjs && npm run typecheck`
Expected: PASS; `tsc` sạch (import type bị xoá lúc build, không kéo package vào node).

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/hand-tracker.ts
git commit -m "feat: mediapipe hand tracker runtime with 15fps detect loop"
```

---

### Task 5: `PalmGuide.tsx` — minh hoạ đúng/sai + dòng riêng tư

**Files:**
- Create: `web/src/components/discovery/PalmGuide.tsx`
- Modify: `web/src/components/discovery/Discovery.module.css` (thêm class `guide*`)

**Interfaces:**
- Consumes: không.
- Produces cho Task 7: `PalmGuide` (component không props), CSS classes `guide`, `guideCard`, `guideGood`, `guideBad`, `guideNote` trong `Discovery.module.css` (`s`).

- [ ] **Step 1: Tạo component** `web/src/components/discovery/PalmGuide.tsx`:

```tsx
import { useId } from "react";
import s from "./Discovery.module.css";

const HAND_PATH =
  "M79 290c0-33-5-47-24-71l-27-48c-8-17 10-25 20-13l25 31-9-101c-2-22 19-24 22-3l10 69-1-117c0-22 23-22 24 0l3 110 7-128c1-20 23-19 23 2l-2 130 15-108c3-19 25-16 22 6l-11 114 18-71c5-20 26-15 21 7l-13 80c-3 50-15 84-30 113l-1 21Z";

function MiniHand({ transform, opacity = 1 }: { transform?: string; opacity?: number }) {
  return (
    <path d={HAND_PATH} transform={transform} opacity={opacity} fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
  );
}

const WRONG = [
  { label: "Tay nghiêng", t: "rotate(28 120 160)" },
  { label: "Tay xoay ngang", t: "rotate(90 120 160)" },
  { label: "Tay chật khung", t: "translate(-58 30)" },
];

export function PalmGuide() {
  const clip = useId();
  return (
    <div className={s.guide}>
      <div className={`${s.guideCard} ${s.guideGood}`}>
        <svg viewBox="0 0 240 320" aria-hidden="true">
          <rect x="18" y="18" width="204" height="284" rx="20" fill="none" stroke="currentColor" strokeWidth="4" opacity=".4" />
          <g clipPath={`url(#${clip})`}>
            <MiniHand />
          </g>
          <defs>
            <clipPath id={clip}>
              <rect x="18" y="18" width="204" height="284" rx="20" />
            </clipPath>
          </defs>
          <circle cx="196" cy="262" r="26" fill="#698360" />
          <path d="M185 262l8 8 14-16" fill="none" stroke="#f8f3e7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>Đúng: lòng bàn tay hướng máy, ngón dang, tay nằm gọn trong khung</p>
      </div>
      <div className={`${s.guideCard} ${s.guideBad}`}>
        {WRONG.map((bad) => (
          <figure key={bad.label}>
            <svg viewBox="0 0 240 320" aria-hidden="true">
              <rect x="18" y="18" width="204" height="284" rx="20" fill="none" stroke="currentColor" strokeWidth="4" opacity=".4" />
              <g clipPath={`url(#${clip})`}>
                <MiniHand transform={bad.t} opacity={0.8} />
              </g>
              <circle cx="196" cy="262" r="26" fill="#b3492f" />
              <path d="M186 252l20 20M206 252l-20 20" stroke="#f8f3e7" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <figcaption>{bad.label}</figcaption>
          </figure>
        ))}
      </div>
      <p className={s.guideNote}>
        Nhận diện bàn tay chạy ngay trên thiết bị. Ảnh chỉ được gửi đi khi bạn bấm phân tích.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Thêm CSS vào `Discovery.module.css`** (đặt sau khối `.pill`):

```css
.guide {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}
.guideCard {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid #d9dfcc;
  background: #fdfaf1;
}
.guideGood {
  border-color: #c9d6c2;
  background: #eef3e6;
}
.guideBad {
  grid-template-columns: repeat(3, 1fr);
}
.guideCard svg {
  width: 100%;
  height: auto;
  color: #698360;
}
.guideBad svg {
  color: #a96a4d;
}
.guideCard p,
.guideCard figcaption {
  font-size: 13px;
  line-height: 1.55;
  color: #55645c;
  margin: 0;
  text-align: center;
}
.guideBad figure {
  margin: 0;
  display: grid;
  gap: 8px;
  align-content: start;
}
.guideNote {
  font-size: 13px;
  color: #74836e;
  line-height: 1.6;
  margin: 0;
}
```

- [ ] **Step 3: Kiểm tra biên dịch + render được mount (smoke)**

Run: `cd web && npm run typecheck`
Expected: sạch. (Render thật được QA ở Task 9 qua viewport.)

- [ ] **Step 4: Commit**

```bash
git add web/src/components/discovery/PalmGuide.tsx web/src/components/discovery/Discovery.module.css
git commit -m "feat: guided capture illustration for palm reading"
```

---

### Task 6: `PalmCamera.tsx` — camera live, dẫn khung, tự chụp, đổi ống kính

**Files:**
- Create: `web/src/components/discovery/PalmCamera.tsx`
- Modify: `web/src/components/discovery/Discovery.module.css` (thêm class `camera*`, `countdown`, `guideLine`, `lensBtn`, `shutterRow`)

**Interfaces:**
- Consumes: `openBackCamera`, `isWellLit` (Task 1); `loadHandTracker`, `startDetectLoop`, `frameFromLandmarks`, `bumpStable`, `readyToCountdown`, `verdictMessage`, `assessHand`, `fingertipsOf`, `HandPoint`, `HandVerdict`, `HandLandmarker` (Task 2/4).
- Produces cho Task 7: `PalmCamera` với props `{ onCapture: (shot: PalmCapture) => void; onClose: () => void; onFatal: (message: string) => void }`, `type PalmCapture = { dataUrl: string; w: number; h: number; fingertips: HandPoint[] | null }`.

- [ ] **Step 1: Tạo component** `web/src/components/discovery/PalmCamera.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { isWellLit, openBackCamera, type LensCandidate } from "@/lib/palm-camera";
import {
  assessHand,
  bumpStable,
  fingertipsOf,
  frameFromLandmarks,
  loadHandTracker,
  readyToCountdown,
  startDetectLoop,
  verdictMessage,
  type HandLandmarker,
  type HandPoint,
  type HandVerdict,
} from "@/lib/hand-tracker";
import s from "./Discovery.module.css";

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9],
  [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
const TIPS = [4, 8, 12, 16, 20];

export type PalmCapture = {
  dataUrl: string;
  w: number;
  h: number;
  fingertips: HandPoint[] | null;
};

export function PalmCamera({
  onCapture,
  onClose,
  onFatal,
}: {
  onCapture: (shot: PalmCapture) => void;
  onClose: () => void;
  onFatal: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const stopLoopRef = useRef<() => void>(() => {});
  const stableRef = useRef(0);
  const prevPtsRef = useRef<HandPoint[] | null>(null);
  const tipsRef = useRef<HandPoint[] | null>(null);
  const verdictRef = useRef<HandVerdict>("none");
  const countingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cbs = useRef({ onCapture, onClose });
  cbs.current = { onCapture, onClose };
  const [aspect, setAspect] = useState("3/4");
  const [verdict, setVerdict] = useState<HandVerdict>("none");
  const [count, setCount] = useState(0);
  const [backList, setBackList] = useState<LensCandidate[]>([]);
  const [lensIdx, setLensIdx] = useState(0);
  const [note, setNote] = useState("Đang mở camera…");
  const [trackerOff, setTrackerOff] = useState(false);
  const [trackerReady, setTrackerReady] = useState(false);

  function cleanup() {
    stopLoopRef.current();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    countingRef.current = false;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function cancelCountdown() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    countingRef.current = false;
    setCount(0);
    stableRef.current = 0;
  }

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    if (landmarkerRef.current && verdictRef.current === "none") {
      setNote("Không thấy bàn tay trong khung");
      return;
    }
    if (!isWellLit(v, v.videoWidth, v.videoHeight))
      setNote("Ảnh hơi tối hoặc hơi chói — kết quả có thể kém chính xác");
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    let data = canvas.toDataURL("image/jpeg", 0.85);
    if (data.length > 1150000) data = canvas.toDataURL("image/jpeg", 0.6);
    if (data.length > 1150000) {
      setNote("Ảnh còn quá lớn. Hãy chụp lại gần hơn một chút.");
      return;
    }
    const tips = tipsRef.current ? [...tipsRef.current] : null;
    cleanup();
    cbs.current.onCapture({ dataUrl: data, w: canvas.width, h: canvas.height, fingertips: tips });
  }

  function beginCountdown() {
    if (countingRef.current) return;
    countingRef.current = true;
    let n = 3;
    setCount(3);
    timerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        cancelCountdown();
        capture();
      } else setCount(n);
    }, 700);
  }

  function drawOverlay(pts: HandPoint[] | null) {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;
    if (c.width !== v.videoWidth) {
      c.width = v.videoWidth;
      c.height = v.videoHeight;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!pts) return;
    const W = c.width;
    const H = c.height;
    ctx.strokeStyle = "rgba(194,161,93,.9)";
    ctx.lineWidth = Math.max(2, W / 400);
    ctx.beginPath();
    for (const [a, b] of CONNECTIONS) {
      ctx.moveTo(pts[a].x * W, pts[a].y * H);
      ctx.lineTo(pts[b].x * W, pts[b].y * H);
    }
    ctx.stroke();
    ctx.fillStyle = "#f3cf79";
    for (const i of TIPS) {
      ctx.beginPath();
      ctx.arc(pts[i].x * W, pts[i].y * H, Math.max(4, W / 160), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opened = await openBackCamera();
        if (cancelled) {
          opened.stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = opened.stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = opened.stream;
          await v.play().catch(() => {});
        }
        const track = opened.stream.getVideoTracks()[0];
        const st = track?.getSettings();
        if (st?.width && st?.height) setAspect(`${st.width}/${st.height}`);
        setBackList(opened.backList);
        setLensIdx(0);
        setNote("Đưa lòng bàn tay vào khung");
        try {
          const lm = await loadHandTracker();
          if (cancelled) {
            lm.close();
            return;
          }
          landmarkerRef.current = lm;
          setTrackerReady(true);
          if (videoRef.current)
            stopLoopRef.current = startDetectLoop(videoRef.current, lm, (pts) => {
              const frame = frameFromLandmarks(pts, prevPtsRef.current);
              prevPtsRef.current = pts;
              stableRef.current = bumpStable(stableRef.current, frame);
              const v = assessHand(frame);
              verdictRef.current = v;
              setVerdict(v);
              if (pts) tipsRef.current = fingertipsOf(pts);
              drawOverlay(pts);
              if (countingRef.current && v !== "ready") cancelCountdown();
              else if (!countingRef.current && readyToCountdown(stableRef.current)) beginCountdown();
            });
        } catch {
          setTrackerOff(true); // model tải fail → chụp thủ công, tính năng không vỡ
        }
      } catch {
        if (!cancelled)
          cbs.current.onFatal(
            "Không mở được camera. Cho phép truy cập camera hoặc chọn ảnh từ thư viện.",
          );
      }
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchLens() {
    if (backList.length < 2) return;
    const next = backList[(lensIdx + 1) % backList.length];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: next.deviceId }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      setLensIdx(backList.indexOf(next));
      cancelCountdown();
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setNote("Đã đổi ống kính — đặt lòng bàn tay vào khung");
    } catch {
      setNote("Không đổi được ống kính");
    }
  }

  return (
    <div className={s.cameraWrap}>
      <div className={s.cameraBox} style={{ aspectRatio: aspect }}>
        <video ref={videoRef} muted playsInline aria-label="Camera chụp bàn tay" />
        <canvas ref={canvasRef} className={s.cameraOverlay} aria-hidden="true" />
        {count > 0 && (
          <span className={s.countdown} role="status">
            {count}
          </span>
        )}
        <span className={s.guideLine} aria-live="polite">
          {trackerOff
            ? "Chụp thủ công: đặt lòng bàn tay vào khung rồi bấm chụp"
            : trackerReady
              ? verdictMessage(verdict)
              : note}
        </span>
        {backList.length > 1 && (
          <button type="button" className={s.lensBtn} onClick={() => void switchLens()}>
            Đổi ống kính
          </button>
        )}
      </div>
      <div className={s.actions}>
        <button type="button" className={s.button} onClick={capture}>
          Chụp ảnh
        </button>
        <button
          type="button"
          className={s.secondary}
          onClick={() => {
            cleanup();
            cbs.current.onClose();
          }}
        >
          Tắt camera
        </button>
      </div>
    </div>
  );
}
```

Lưu ý logic `guideLine`: trước khi tracker sẵn sàng hiện `note` từ open/đổi lens; tracker live thì message theo verdict; model fail thì copy chụp thủ công. `count > 0` hiển thị số đếm; message "Giữ yên…" của verdict ready đứng dưới số.

- [ ] **Step 2: Thêm CSS vào `Discovery.module.css`** (sau khối `.scan`):

```css
.cameraWrap {
  display: grid;
  gap: 14px;
}
.cameraBox {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: #101512;
  width: 100%;
}
.cameraBox video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.cameraOverlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.countdown {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 44px;
  padding: 6px 10px;
  border-radius: 16px;
  background: #f3cf79;
  color: #24352c;
  font-family: var(--font-display);
  font-size: 24px;
  text-align: center;
}
.guideLine {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  padding: 8px 14px;
  border-radius: 14px;
  background: #101512cc;
  color: #f8f3e7;
  font-size: 13px;
  text-align: center;
}
.lensBtn {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  border-radius: 14px;
  border: 1px solid #f3cf7955;
  background: #101512cc;
  color: #f8f3e7;
  font-size: 12px;
}
```

- [ ] **Step 3: Kiểm tra biên dịch**

Run: `cd web && npm run typecheck`
Expected: sạch.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/discovery/PalmCamera.tsx web/src/components/discovery/Discovery.module.css
git commit -m "feat: live palm camera with hand tracking, auto capture and lens switch"
```

---

### Task 7: Tích hợp `PalmReader.tsx` — luồng chụp mới + kiểm tra trước gửi

**Files:**
- Modify: `web/src/components/discovery/PalmReader.tsx`

**Interfaces:**
- Consumes: `PalmCamera`, `PalmCapture` (Task 6), `PalmGuide` (Task 5), `isWellLit` (Task 1).
- Produces: state `tips: { x: number; y: number }[] | null` dùng bởi overlay ở Task 8; luồng chụp mới hoàn toàn bên trong file này.

- [ ] **Step 1: Sửa imports** — thêm vào đầu:

```tsx
import { isWellLit } from "@/lib/palm-camera";
import type { HandPoint } from "@/lib/hand-tracker";
import { PalmCamera, type PalmCapture } from "./PalmCamera";
import { PalmGuide } from "./PalmGuide";
```

- [ ] **Step 2: Dọn state/ref cũ** — trong `PalmReader`:

- Xoá `const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null)` khỏi danh sách ref (giữ `abort`, `generation`, `upload`).
- Xoá cả hàm `stop()` và `useEffect` đồng bộ `video.srcObject` (khối `if (camera && video.current …)`).
- Thêm state mới: `const [tips, setTips] = useState<HandPoint[] | null>(null);`
- Sửa unmount cleanup: giữ `generation.current++; abort.current?.abort();` — bỏ `stream.current?.getTracks()…` (PalmCamera tự dọn stream của nó).
- Thay toàn bộ hàm `start()` cũ bằng:

```tsx
function start() {
  setError("");
  setCamera(true);
}
```

- Thay toàn bộ hàm `process()` cũ bằng (upload path — thêm kiểm tra sáng):

```tsx
function process(source: CanvasImageSource, width: number, height: number) {
  if (Math.min(width, height) < 350)
    throw new Error("Ảnh quá nhỏ. Chọn ảnh rõ hơn, đủ lòng bàn tay.");
  const tooDarkOrBright = !isWellLit(source, width, height);
  const ratio = Math.min(1, 1200 / Math.max(width, height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không xử lý được ảnh.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  let data = canvas.toDataURL("image/jpeg", 0.85);
  if (data.length > 1150000) data = canvas.toDataURL("image/jpeg", 0.6);
  if (data.length > 1150000) throw new Error("Ảnh còn quá lớn. Hãy chọn ảnh khác.");
  applyPhoto(data, canvas.width, canvas.height, null);
  // Đúng spec §3.4: sáng tối chỉ cảnh báo, không chặn người dùng.
  if (tooDarkOrBright)
    setError("Ảnh hơi tối hoặc hơi chói — kết quả có thể kém chính xác. Nên chụp lại ở nơi sáng.");
}
```

- Thêm `applyPhoto` (nguồn chung cho cả camera lẫn upload):

```tsx
function applyPhoto(data: string, w: number, h: number, tips: HandPoint[] | null) {
  setPhoto(data);
  setSize({ w, h });
  setTips(tips);
  setResult(null);
  setConsent(false);
  setError("");
  setCamera(false);
}
```

- Sửa `reset()`: bỏ `stop();`, thêm `setTips(null);`

- [ ] **Step 3: Thay khối render vùng ảnh/actions** — trong JSX:

- Vùng ảnh: bọc điều kiện camera riêng —

```tsx
{camera ? (
  <PalmCamera
    onCapture={(shot: PalmCapture) => {
      try {
        if (Math.min(shot.w, shot.h) < 350)
          throw new Error("Ảnh quá nhỏ. Đưa tay sát hơn rồi chụp lại.");
        applyPhoto(shot.dataUrl, shot.w, shot.h, shot.fingertips);
      } catch (e) {
        setError((e as Error).message);
      }
    }}
    onClose={() => setCamera(false)}
    onFatal={(message) => {
      setError(message);
      setCamera(false);
    }}
  />
) : (
  <>
    <div className={`${s.art} ${!photo ? s.emptyArt : ""}`} style={photo ? { aspectRatio: `${size.w}/${size.h}`, maxHeight: "none" } : {}}>
      {photo ? <img src={photo} alt="Ảnh lòng bàn tay bạn đã chọn" /> : <HandArt />}
      {busy && <div className={s.scan} />}
      {/* khối SVG overlay hiện tại giữ nguyên ở Task 8 sẽ thay */}
    </div>
    <div className={s.actions}>
      <button className={s.button} disabled={busy} onClick={() => void start()}>
        Chụp bàn tay
      </button>
      <button className={s.secondary} disabled={busy} onClick={() => upload.current?.click()}>
        Chọn ảnh
      </button>
    </div>
  </>
)}
```

(input file ẩn giữ nguyên vị trí bên ngoài điều kiện này.)

- Ngay sau khối actions trong trạng thái trống, thêm minh hoạ:

```tsx
{!photo && !camera && <PalmGuide />}
```

- [ ] **Step 4: Kiểm tra biên dịch + unit cũ vẫn xanh**

Run: `cd web && npm run typecheck && npm run test:unit`
Expected: sạch; bộ unit (gồm 2 file test mới) vẫn pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/discovery/PalmReader.tsx
git commit -m "feat: wire guided live capture into palm reader flow"
```

---

### Task 8: Màn chờ kể trước + kết quả "vẽ dần từng đường"

**Files:**
- Modify: `web/src/components/discovery/PalmReader.tsx` (overlay + wait note)
- Modify: `web/src/components/discovery/Discovery.module.css` (animation `revealLine`, `revealDot`, `waitNote`)

**Interfaces:**
- Consumes: state `tips` (Task 7), `result.lines[].points` hiện có.
- Produces: trải nghiệm hiển thị cuối; không export mới.

- [ ] **Step 1: Thêm lời dẫn màn chờ** — trong form, ngay dưới nút "Dừng phân tích":

```tsx
{busy && (
  <p className={s.waitNote} aria-live="polite">
    Sẽ đọc: đường Tâm · đường Đầu · đường Sống · đường Tài Lộc — đường nào thấy rõ mới hiện.
  </p>
)}
```

- [ ] **Step 2: Thay khối SVG overlay** (toàn bộ `{photo && !camera && overlay && result?.quality === "ok" && (<svg …>)}` hiện tại) bằng:

```tsx
{photo && !camera && overlay && result?.quality === "ok" && (
  <svg
    viewBox="0 0 1000 1000"
    preserveAspectRatio="none"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    aria-label="Đường gợi ý trên ảnh"
  >
    {result.lines.map((line, i) => (
      <polyline
        key={i}
        points={line.points.map(([x, y]) => `${x * 1000},${y * 1000}`).join(" ")}
        fill="none"
        stroke={i === active ? "#f3cf79" : "#e0e8d4"}
        strokeWidth={i === active ? 7 : 4}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        className={s.revealLine}
        style={{ cursor: "pointer", animationDelay: `${i * 0.55}s`, opacity: i === active ? 1 : 0.6 }}
        onClick={() => setActive(i)}
      />
    ))}
    {result.lines.map((line, i) => (
      <g key={`d${i}`}>
        {[line.points[0], line.points[line.points.length - 1]].map(([x, y], j) => (
          <circle
            key={j}
            cx={x * 1000}
            cy={y * 1000}
            r={9}
            fill={i === active ? "#f3cf79" : "#e0e8d4"}
            className={s.revealDot}
            style={{ animationDelay: `${i * 0.55 + 0.7}s` }}
          />
        ))}
      </g>
    ))}
    {tips?.map((p, i) => (
      <circle
        key={`t${i}`}
        cx={p.x * 1000}
        cy={p.y * 1000}
        r={7}
        fill="#f3cf79"
        opacity={0.85}
        className={s.revealDot}
        style={{ animationDelay: `${result.lines.length * 0.55 + 0.3}s` }}
      />
    ))}
  </svg>
)}
```

**Quyết định có chủ đích so với spec §3.6:** giữ nguyên hàng tab tên đường (nút `aria-pressed`) cho bàn phím/screen-reader — bấm trực tiếp lên đường trong ảnh **và** bấm tab đều chọn cùng một đường; không bỏ tab vì mất a11y.

- [ ] **Step 3: Thêm CSS animation** vào cuối `Discovery.module.css`:

```css
.waitNote {
  font-size: 13px;
  color: #74836e;
  line-height: 1.6;
  margin: 10px 0 0;
}
.revealLine {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: drawLine 0.9s ease-out forwards;
}
.revealDot {
  opacity: 0;
  animation: fadeDot 0.35s ease-out forwards;
}
@keyframes drawLine {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes fadeDot {
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .revealLine {
    animation: none;
    stroke-dashoffset: 0;
  }
  .revealDot {
    animation: none;
    opacity: 1;
  }
}
```

- [ ] **Step 4: Kiểm tra biên dịch**

Run: `cd web && npm run typecheck && npm run lint`
Expected: sạch.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/discovery/PalmReader.tsx web/src/components/discovery/Discovery.module.css
git commit -m "feat: staged line reveal and wait narration on palm reading results"
```

---

### Task 9: QA gate toàn bộ

**Files:** không sửa code (chỉ chạy + ghi kết quả).

- [ ] **Step 1: Unit + typecheck + lint + build**

```bash
cd web && npm test && npm run typecheck && npm run lint && npm run build
```

Expected: mọi bộ pass; `out/` được sinh.

- [ ] **Step 2: qa:viewport 30 kích thước**

```bash
cd web
rm -rf .next                      # build vừa rồi ghi đè .next — bẫy cũ
npx next dev -p 3311 &            # giữ nền
sleep 8
npm run qa:viewport -- --base http://localhost:3311
```

Expected: báo cáo in **số lỗi = 0** trên mọi combo (script in số LỖI — 0 là sạch tuyệt đối, đừng đọc ngược). Nếu /chitay văng lỗi mới (overflow/overlap), sửa rồi chạy lại từ đầu Step 2.

- [ ] **Step 3: ui-30viewports regression (đăng nhập, dò va chạm topbar)**

```bash
cd web && node scripts/ui-30viewports.mjs
```

Expected: sạch; nhớ seed profile (QA guest bị LoginPrompt chặn — Escape để đóng nếu script chưa seed).

- [ ] **Step 4: QA 2 engine webkit + chromium, dsf 2 cho /chitay** — script ad-hoc `web/scripts/palm-engine-qa.mjs` (chạy với dev server 3311 đang nền từ Step 2):

```mjs
import { chromium, webkit } from "playwright";
const sizes = [[360, 780], [768, 1024], [1440, 900]];
for (const engine of [chromium, webkit])
  for (const [width, height] of sizes) {
    const b = await engine.launch();
    const p = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    await p.goto("http://localhost:3311/chitay", { waitUntil: "networkidle" });
    await p.screenshot({ path: `../qa-report/palm/engine-${engine.name()}-${width}.png`, fullPage: true });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(engine.name(), width, overflow ? "OVERFLOW" : "ok");
    await b.close();
  }
```

```bash
mkdir -p ../qa-report/palm && node scripts/palm-engine-qa.mjs
```

Expected: cả 6 combo in `ok`. Soi nhanh 6 PNG: PalmGuide không vỡ layout, không chữ bị cắt.

- [ ] **Step 5: `git diff --check` + commit doc QA**

```bash
git diff --check
git add web/scripts/palm-engine-qa.mjs
git commit -m "test: multi-engine palm page qa script"
```

---

### Task 10: Ma trận thiết bị thật + handoff

**Files:**
- Create: `qa-report/palm/device-matrix.md`

- [ ] **Step 1: Chạy thủ công theo bảng, ghi kết quả từng ô** (cần người cầm máy — Sơn hoặc agent có thiết bị):

| Thiết bị | Mở đúng wide? | Nhận diện live? | Tự chụp? | Overlay kết quả? | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| OPPO Find X9 Ultra | phải wide (FOV không zoom) | | | | lens auto-pick + nút đổi ống kính |
| iPhone Safari | cam ảo hệ thống | | | | iOS = mục mới, chưa từng test camera |
| Android phổ thông | | | | | |
| Desktop Chrome (webcam) | n/a | | | | không vỡ luồng |

- [ ] **Step 2: Ghi handoff theo `docs/agent-workflow.md`** — owner, base SHA `a009880`, các SHA đã commit, danh sách path đụng tới (`web/src/lib/palm-camera.ts`, `hand-tracker.ts`, `web/src/components/discovery/Palm{Reader,Guide,Camera}.tsx`, `Discovery.module.css`, `web/tests/palm-{camera,hand-tracker}.test.mjs`, `web/public/models|mediapipe`, `web/scripts/palm-engine-qa.mjs`), kết quả QA gate + kết quả ma trận thiết bị + giới hạn còn lại.

- [ ] **Step 3: Commit**

```bash
git add qa-report/palm/device-matrix.md
git commit -m "docs: palm capture device matrix results and handoff"
```

---

## Phụ thuộc ngoài (cần thiết bị/network)

- Model MediaPipe tải từ `storage.googleapis.com` (Task 3) — nếu mạng chặn, mirror qua npm package `@mediapipe/hand_landmarker`? (không tồn tại chính thức — fallback: tải máy khác rồi copy file vào worktree).
- Task 10 cần máy thật: Find X9 Ultra (Sơn đang dùng), iPhone.
