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
