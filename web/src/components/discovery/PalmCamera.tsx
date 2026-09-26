"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Btn } from "@/components/kit";
import { cameraControls, focusCamera, openBackCamera, setCameraTorch, switchToLens, type LensCandidate } from "@/lib/palm-camera";
import { assessHand, bumpStable, frameFromLandmarks, loadHandTracker, readyToCountdown, startDetectLoop, verdictMessage, type HandLandmarker, type HandPoint } from "@/lib/hand-tracker";
import s from "./Palm.module.css";

export type PalmCapture = { dataUrl: string; w: number; h: number };
type Props = { onCapture: (shot: PalmCapture) => void; onClose: () => void; onFatal: (message: string) => void };
const stopStream = (stream: MediaStream | null) => stream?.getTracks().forEach(t => t.stop());

export function PalmCamera(props: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const tracker = useRef<HandLandmarker | null>(null);
  const stopLoop = useRef<() => void>(() => {});
  const loadAbort = useRef<AbortController | null>(null);
  const cameraAbort = useRef<AbortController | null>(null);
  const alive = useRef(false), operation = useRef(0), switching = useRef(false);
  const auto = useRef(false), stable = useRef(0), deadline = useRef(0);
  const previous = useRef<HandPoint[] | null>(null);
  const callbacks = useRef(props);
  useEffect(() => { callbacks.current = props; }, [props]);
  const [ready, setReady] = useState(false), [changing, setChanging] = useState(false);
  const [cameras, setCameras] = useState<LensCandidate[]>([]), [device, setDevice] = useState("");
  const [controls, setControls] = useState({ torch: false, focus: false });
  const [torch, setTorch] = useState(false), [controlBusy, setControlBusy] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false), [count, setCount] = useState(0);
  const [tracking, setTracking] = useState<"loading" | "ready" | "error">("loading");
  const [hint, setHint] = useState("Đang mở camera…"), [warning, setWarning] = useState("");
  const [aspect, setAspect] = useState("3/4");

  const resetTracking = useCallback(() => {
    stable.current = 0; deadline.current = 0; previous.current = null; setCount(0);
  }, []);
  const cleanup = useCallback(() => {
    alive.current = false; operation.current++; cameraAbort.current?.abort(); loadAbort.current?.abort(); stopLoop.current();
    tracker.current?.close(); tracker.current = null; stopStream(stream.current); stream.current = null;
  }, []);
  const capture = useCallback(() => {
    const v = video.current;
    if (!alive.current || switching.current || !v || v.readyState < 2 || !v.videoWidth) return;
    const scale = Math.min(1, 1200 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale); canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) { setWarning("Không xử lý được ảnh. Hãy thử lại."); return; }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL("image/jpeg", .85);
    if (dataUrl.length > 1150000) dataUrl = canvas.toDataURL("image/jpeg", .6);
    if (dataUrl.length > 1150000) { setWarning("Ảnh quá lớn. Hãy chọn ảnh từ thư viện."); return; }
    const shot = { dataUrl, w: canvas.width, h: canvas.height };
    cleanup(); callbacks.current.onCapture(shot);
  }, [cleanup]);

  const runTracker = useCallback(() => {
    stopLoop.current(); resetTracking();
    const v = video.current, lm = tracker.current;
    if (!v || !lm || !alive.current) return;
    stopLoop.current = startDetectLoop(v, lm, pts => {
      if (!alive.current || switching.current) return;
      if (document.hidden) { resetTracking(); return; }
      const frame = frameFromLandmarks(pts, previous.current, v.videoWidth, v.videoHeight);
      previous.current = pts;
      stable.current = bumpStable(stable.current, frame);
      setHint(verdictMessage(assessHand(frame)));
      if (!auto.current || !readyToCountdown(stable.current)) { deadline.current = 0; setCount(0); return; }
      if (!deadline.current) deadline.current = performance.now() + 3000;
      const remaining = Math.ceil((deadline.current - performance.now()) / 1000);
      setCount(Math.max(0, remaining));
      if (remaining <= 0) capture();
    }, () => {
      if (!alive.current) return;
      resetTracking(); setTracking("error"); setHint("Bạn vẫn có thể bấm chụp khi ảnh rõ.");
    });
  }, [capture, resetTracking]);

  const initializeTracker = useCallback(async () => {
    loadAbort.current?.abort(); stopLoop.current(); tracker.current?.close(); tracker.current = null;
    const controller = new AbortController(); loadAbort.current = controller;
    setTracking("loading"); resetTracking();
    try {
      const lm = await loadHandTracker({ signal: controller.signal });
      if (!alive.current || controller.signal.aborted) { lm.close(); return; }
      tracker.current = lm; setTracking("ready"); runTracker();
    } catch {
      if (alive.current && !controller.signal.aborted) setTracking("error");
    }
  }, [resetTracking, runTracker]);

  const attach = useCallback(async (next: MediaStream) => {
    stream.current = next;
    const track = next.getVideoTracks()[0];
    setControls(cameraControls(track)); setTorch(false);
    const v = video.current;
    if (!v) return;
    v.srcObject = next;
    await v.play();
  }, []);

  useEffect(() => {
    alive.current = true;
    const token = ++operation.current;
    cameraAbort.current = new AbortController();
    const cameraSignal = cameraAbort.current.signal;
    void (async () => {
      try {
        const opened = await openBackCamera(cameraSignal);
        if (!alive.current || operation.current !== token) { stopStream(opened.stream); return; }
        await attach(opened.stream);
        if (!alive.current || operation.current !== token) return;
        setCameras(opened.backList); setDevice(opened.deviceId); setHint("Đặt trọn bàn tay vào khung, lòng tay hướng về máy.");
        void initializeTracker();
      } catch {
        if (alive.current && operation.current === token) {
          cleanup(); callbacks.current.onFatal("Không mở được camera. Kiểm tra quyền camera hoặc chọn ảnh từ thư viện.");
        }
      }
    })();
    const hide = () => { if (document.hidden) { stopLoop.current(); resetTracking(); } else if (!switching.current) runTracker(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); cleanup(); };
  }, [attach, cleanup, initializeTracker, resetTracking, runTracker]);

  async function changeLens(id: string) {
    if (switching.current || id === device) return;
    switching.current = true; setChanging(true); setReady(false); setWarning("");
    const token = ++operation.current, oldId = device;
    stopLoop.current(); resetTracking(); stopStream(stream.current); stream.current = null;
    try {
      let next: MediaStream;
      let selected = id;
      try { next = await switchToLens(id); }
      catch { if (!alive.current || operation.current !== token) return; next = await switchToLens(oldId); selected = oldId; if (alive.current) setWarning("Không mở được camera đã chọn. Đã quay về camera trước."); }
      if (!alive.current || operation.current !== token) { stopStream(next); return; }
      await attach(next); setDevice(selected);
    } catch {
      if (alive.current) { cleanup(); callbacks.current.onFatal("Camera đang bận. Đóng ứng dụng dùng camera rồi thử lại."); }
    } finally {
      switching.current = false;
      if (alive.current) { setChanging(false); runTracker(); }
    }
  }
  async function toggleTorch() {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || controlBusy) return;
    setControlBusy(true); const next = !torch;
    const ok = await setCameraTorch(track, next);
    if (alive.current && stream.current?.getVideoTracks()[0] === track) {
      if (ok) { setTorch(next); setWarning(""); }
      else setWarning("Camera không xác nhận thay đổi đèn. Hãy dùng nguồn sáng bên ngoài.");
    }
    if (alive.current) setControlBusy(false);
  }
  async function focusAt(e: React.PointerEvent<HTMLVideoElement>) {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || !controls.focus || changing || controlBusy) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setControlBusy(true); resetTracking();
    const ok = await focusCamera(track, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    if (alive.current) {
      // Cảnh báo gắn với track đã yêu cầu; nhưng cờ bận thuộc phiên nên luôn được trả về.
      if (stream.current?.getVideoTracks()[0] === track) {
        setWarning(ok ? "Đã gửi yêu cầu lấy nét. Kiểm tra ảnh rõ trước khi chụp." : "Camera không nhận yêu cầu lấy nét. Thử thay đổi khoảng cách.");
      }
      setControlBusy(false);
    }
  }
  function syncVideo() {
    const v = video.current;
    if (!v?.videoWidth || !v.videoHeight) return;
    setAspect(`${v.videoWidth}/${v.videoHeight}`); setReady(v.readyState >= 2);
  }
  return <section className={s.camera} aria-label="Chụp bàn tay">
    <div className={s.cameraTop}><span>CAMERA</span><button className={s.textButton} onClick={() => { cleanup(); callbacks.current.onClose(); }}>Đóng</button></div>
    <div className={s.cameraStage}>
      <div className={s.cameraFrame} style={{ aspectRatio: aspect }}>
        <video ref={video} muted playsInline onLoadedData={syncVideo} onResize={syncVideo} onPointerDown={focusAt} aria-label="Camera chụp bàn tay" />
        {(!ready || changing) && <div className={s.cameraPending} role="status">{changing ? "Đang đổi camera…" : "Đang mở camera…"}</div>}
        {count > 0 && <span className={s.countdown} role="status">{count}</span>}
      </div>
    </div>
    <p className={s.cameraHint} role="status">{warning || hint}</p>
    <div className={s.cameraTools}>
      {cameras.length > 1 && <label>Camera<select value={device} disabled={changing || controlBusy} onChange={e => void changeLens(e.target.value)}>{cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}</select></label>}
      {controls.torch && <button className={s.toolButton} disabled={!ready || changing || controlBusy} aria-pressed={torch} onClick={() => void toggleTorch()}>{torch ? "Tắt đèn" : "Bật đèn"}</button>}
      {controls.focus && <button className={s.toolButton} disabled={!ready || changing || controlBusy} onClick={async () => { const t = stream.current?.getVideoTracks()[0]; if (t) { const ok = await focusCamera(t, .5, .5); if (alive.current) setWarning(ok ? "Đã gửi yêu cầu lấy nét giữa ảnh." : "Không lấy nét được. Thử thay đổi khoảng cách."); } }}>Lấy nét giữa ảnh</button>}
    </div>
    <p className={s.muted}>{controls.focus ? "Chạm lên ảnh để yêu cầu lấy nét." : "Camera tự lấy nét theo thiết bị. Giữ tay cách máy khoảng 25–35 cm."} {!controls.torch && "Nếu ảnh tối, hãy thêm nguồn sáng bên ngoài."}</p>
    <div className={s.trackerStatus} role="status">
      <span>{tracking === "loading" ? "Đang chuẩn bị hỗ trợ căn tay… Bạn có thể chụp ngay." : tracking === "error" ? "Hỗ trợ căn tay chưa sẵn sàng. Chụp thủ công vẫn dùng được." : "Hỗ trợ căn tay đã sẵn sàng."}</span>
      {tracking === "error" && <button className={s.textButton} disabled={changing} onClick={() => void initializeTracker()}>Thử lại</button>}
    </div>
    <div className={s.captureActions}>
      <label className={s.check}><input type="checkbox" checked={autoCapture} disabled={tracking !== "ready" || changing} onChange={e => { auto.current = e.target.checked; setAutoCapture(e.target.checked); resetTracking(); }} />Tự chụp khi giữ yên</label>
      <Btn disabled={!ready || changing} onClick={capture}>Chụp ảnh</Btn>
    </div>
  </section>;
}
