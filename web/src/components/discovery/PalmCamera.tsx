"use client";
import { useEffect, useRef, useState } from "react";
import {
  isWellLit,
  openBackCamera,
  switchToLens,
  type LensCandidate,
} from "@/lib/palm-camera";
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
import { PALM_HAND_PATH } from "@/components/discovery/PalmGuide";
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
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbs = useRef({ onCapture, onClose, onFatal });
  useEffect(() => {
    cbs.current = { onCapture, onClose, onFatal };
  }, [onCapture, onClose, onFatal]);
  const [aspect, setAspect] = useState("3/4");
  const [verdict, setVerdict] = useState<HandVerdict>("none");
  const [count, setCount] = useState(0);
  const [backList, setBackList] = useState<LensCandidate[]>([]);
  const [lensIdx, setLensIdx] = useState(0);
  const [note, setNote] = useState("Đang mở camera…");
  const [warn, setWarn] = useState("");
  const [trackerOff, setTrackerOff] = useState(false);
  const [trackerReady, setTrackerReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);

  function cleanup() {
    stopLoopRef.current();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    warnTimerRef.current = null;
    countingRef.current = false;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  /** Cảnh báo ngắn ưu tiên hơn hướng dẫn khung — lý do chụp hụt phải nhìn thấy được. */
  function flash(msg: string) {
    setWarn(msg);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    warnTimerRef.current = setTimeout(() => setWarn(""), 2200);
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
      flash("Không thấy bàn tay trong khung");
      return;
    }
    if (!isWellLit(v, v.videoWidth, v.videoHeight))
      flash("Ảnh hơi tối hoặc hơi chói — kết quả có thể kém chính xác");
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    let data = canvas.toDataURL("image/jpeg", 0.85);
    if (data.length > 1150000) data = canvas.toDataURL("image/jpeg", 0.6);
    if (data.length > 1150000) {
      flash("Ảnh còn quá lớn. Hãy chụp lại gần hơn một chút.");
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
      // Box + overlay phải theo tỉ lệ buffer thật của video, không theo getSettings().
      setAspect(`${v.videoWidth}/${v.videoHeight}`);
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

  // Khung hình thật đổi kích thước (mở camera, đổi ống kính, xoay máy) → cập nhật
  // tỉ lệ box theo buffer video, kể cả khi tracker không chạy nên không có overlay.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      if (v.videoWidth && v.videoHeight) setAspect(`${v.videoWidth}/${v.videoHeight}`);
    };
    sync();
    v.addEventListener("loadedmetadata", sync);
    v.addEventListener("resize", sync);
    return () => {
      v.removeEventListener("loadedmetadata", sync);
      v.removeEventListener("resize", sync);
    };
  }, []);

  // Model sẵn sàng thì giữ màn loading thêm 550ms cho hiệu ứng vẽ tay kịp khép
  // vòng rồi mới mờ đi — trước đây hết 4s là tự tắt, chờ model thật thì lâu hơn.
  useEffect(() => {
    if (!trackerReady) return;
    const timer = setTimeout(() => setLoaderGone(true), 550);
    return () => clearTimeout(timer);
  }, [trackerReady]);

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
          if (!cancelled) setStreamReady(true);
        }
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
      // switchToLens ghi luôn lựa chọn vào localStorage: máy không có tín hiệu
      // zoom vẫn mở đúng lens này ở lần sau.
      const stream = await switchToLens(next.deviceId);
      const prev = streamRef.current;
      if (!prev) {
        // camera đã bị dọn trong lúc chờ (chụp/tắt/unmount) — đóng stream vừa mở
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      prev.getTracks().forEach((t) => t.stop());
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
          {warn ||
            (trackerOff
              ? "Chụp thủ công: đặt lòng bàn tay vào khung rồi bấm chụp"
              : trackerReady
                ? verdictMessage(verdict)
                : note)}
        </span>
        {backList.length > 1 && (
          <button type="button" className={s.lensBtn} onClick={() => void switchLens()}>
            Đổi ống kính
          </button>
        )}
        {!loaderGone && !trackerOff && (
          <div className={`${s.loadOverlay} ${trackerReady ? s.loadDone : ""}`} role="status">
            <svg viewBox="0 0 240 320" className={s.loadHand} aria-hidden="true">
              <path d={PALM_HAND_PATH} pathLength={100} />
            </svg>
            <p className={s.loadTitle}>
              {streamReady ? "Đang tải bộ nhận diện tay…" : "Đang mở camera…"}
            </p>
            <small className={s.loadHint}>
              Lần đầu tải khoảng 8 MB — những lần sau mở lại là tức thì
            </small>
          </div>
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
