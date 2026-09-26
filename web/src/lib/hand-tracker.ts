/**
 * Nhận diện bàn tay on-device (MediaPipe HandLandmarker) cho Chỉ tay.
 * Phần pure (đánh giá khung hình, bộ đếm ổn định) tách riêng để test
 * node:test; phần nạp model và vòng dò thêm ở phần dưới file, chỉ chạy
 * trong trình duyệt.
 */

import type { HandLandmarker } from "@mediapipe/tasks-vision";

export type { HandLandmarker };

export type HandPoint = { x: number; y: number };
export type HandVerdict = "none" | "far" | "tilt" | "ready";
export type HandFrame = { present: boolean; bboxRatio: number; aspect: number; motion: number };

export const HAND_THRESHOLDS = {
  minBboxRatio: 0.12, // diện tích bbox tay / khung
  minAspect: 0.55, // w/h tối thiểu của bbox tay
  maxAspect: 1.9, // w/h tối đa
  maxMotion: 0.012, // biên độ dịch chuyển landmark tối đa giữa 2 frame
  readyFrames: 12, // frame "ready" liên tiếp (~0.8s ở 15fps) trước khi đếm ngược
} as const;

export function frameFromLandmarks(
  pts: HandPoint[] | null,
  prev: HandPoint[] | null,
  sourceWidth = 1,
  sourceHeight = 1,
): HandFrame {
  if (!pts || pts.length === 0) return { present: false, bboxRatio: 0, aspect: 0, motion: 1 };
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const motion =
    prev && prev.length === pts.length
      ? Math.max(...pts.map((p, i) => Math.hypot(p.x - prev[i].x, p.y - prev[i].y)))
      : 1;
  return {
    present: true,
    bboxRatio: w * h,
    aspect: (w / Math.max(h, 1e-6)) * (sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : 1),
    motion,
  };
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
  return FINGERTIP_INDEXES.map(i => pts[i]).filter(Boolean);
}

export type HandTrackerLoadOptions = { signal?: AbortSignal; timeoutMs?: number };

/** Nạp có giới hạn thời gian; giải phóng model đến muộn sau khi hủy. */
export async function loadHandTracker(options: HandTrackerLoadOptions = {}): Promise<HandLandmarker> {
  const { signal, timeoutMs = 20_000 } = options;
  let cancelled: Error | null = null;
  const abortError = () => new DOMException("Đã dừng tải nhận diện bàn tay", "AbortError");
  if (signal?.aborted) throw abortError();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: () => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    onAbort = () => {
      cancelled = abortError();
      reject(cancelled);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(
      () => {
        cancelled = new DOMException("Tải nhận diện bàn tay quá lâu. Hãy kiểm tra kết nối và thử lại.", "TimeoutError");
        reject(cancelled);
      },
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20_000,
    );
  });
  const checkCancelled = () => {
    if (cancelled) throw cancelled;
  };
  const loading = async () => {
    const vision = await import("@mediapipe/tasks-vision");
    checkCancelled();
    const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
    checkCancelled();
    const make = async (delegate: "GPU" | "CPU") => {
      const tracker = await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/models/hand_landmarker.task", delegate },
        runningMode: "VIDEO",
        numHands: 1,
      });
      if (cancelled) {
        tracker.close();
        throw cancelled;
      }
      return tracker;
    };
    try {
      return await make("GPU");
    } catch {
      checkCancelled();
      return await make("CPU");
    }
  };
  try {
    return await Promise.race([loading(), deadline]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Vòng dò ~15fps; chỉ dò frame mới và báo lỗi khi bộ dò không thể tiếp tục. */
export function startDetectLoop(
  video: HTMLVideoElement,
  landmarker: HandLandmarker,
  onFrame: (pts: HandPoint[] | null) => void,
  onError?: (error: Error) => void,
): () => void {
  let raf = 0;
  let last = 0;
  let ts = 0;
  let lastVideoTime = -1;
  let failures = 0;
  let stopped = false;
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
  const tick = () => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    if (now - last < 66 || video.readyState < 2 || video.currentTime === lastVideoTime) return;
    last = now;
    lastVideoTime = video.currentTime;
    ts = Math.max(ts + 1, Math.round(now));
    let pts: HandPoint[] | null;
    try {
      const res = landmarker.detectForVideo(video, ts);
      pts = (res?.landmarks?.[0] as HandPoint[] | undefined) ?? null;
      failures = 0;
    } catch (error) {
      failures++;
      if (failures >= 3) {
        stop();
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
      return;
    }
    onFrame(pts);
  };
  raf = requestAnimationFrame(tick);
  return stop;
}

/** A running camera is not proof of a detected hand. Expire frozen observations. */
export function canCaptureHand(verdict: HandVerdict, observedAt: number, now: number): boolean {
  return verdict === "ready" && observedAt > 0 && now >= observedAt && now - observedAt <= 500;
}
