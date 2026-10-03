'use client';
import { useLocale } from '@/i18n/LocaleProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cameraControls,
  focusCamera,
  openBackCamera,
  setCameraTorch,
  switchToLens,
  type LensCandidate,
} from '@/lib/palm-camera';
import {
  assessHand,
  bumpStable,
  canCaptureHand,
  frameFromLandmarks,
  loadHandTracker,
  readyToCountdown,
  startDetectLoop,
  verdictMessage,
  type HandLandmarker,
  type HandPoint,
  type HandVerdict,
} from '@/lib/hand-tracker';
import s from './Palm.module.css';
import { PalmActionLabel } from './PalmActionLabel';
import { samplePalmQuality, type PalmQuality } from '@/lib/palm-quality';
import { palmQualityMessage } from './PalmQualityPanel';

export type PalmCapture = { dataUrl: string; w: number; h: number };
type Props = {
  onCapture: (shot: PalmCapture) => void;
  onClose: () => void;
  onFatal: (message: string) => void;
  onFallback?: (kind: 'native' | 'upload') => void;
};
const stopStream = (stream: MediaStream | null) => stream?.getTracks().forEach(t => t.stop());

const CAMERA_EN: Record<string, string> = {
  'Đang mở camera…': 'Opening camera…',
  'Đưa trọn bàn tay vào khung để nhận diện trước khi chụp.':
    'Place your whole hand in the frame for detection before capturing.',
  'Không xử lý được ảnh. Hãy thử lại.': 'Unable to process the photo. Please try again.',
  'Ảnh quá lớn. Hãy chọn ảnh từ thư viện.': 'Photo too large. Please choose one from your library.',
  'Nhận diện bị gián đoạn. Hãy thử lại để tiếp tục.': 'Detection was interrupted. Try again to continue.',
  'Đặt trọn bàn tay vào khung, lòng tay hướng về máy.': 'Place your whole hand in the frame, palm facing the camera.',
  'Không mở được camera. Kiểm tra quyền camera hoặc chọn ảnh từ thư viện.':
    'Unable to open the camera. Check camera permissions or choose a photo.',
  'Không mở được camera đã chọn. Đã quay về camera trước.':
    'Unable to open the selected camera. Returned to the previous camera.',
  'Camera đang bận. Đóng ứng dụng dùng camera rồi thử lại.': 'Camera busy. Close other apps using it and try again.',
  'Camera không xác nhận thay đổi đèn. Hãy dùng nguồn sáng bên ngoài.':
    'The camera did not confirm the light change. Use an external light source.',
  'Đã gửi yêu cầu lấy nét. Kiểm tra ảnh rõ trước khi chụp.':
    'Focus requested. Check that the image is sharp before capturing.',
  'Camera không nhận yêu cầu lấy nét. Thử thay đổi khoảng cách.':
    'Focus request unavailable. Try changing your distance.',
  'Chụp bàn tay': 'Capture your palm',
  'Đóng camera': 'Close camera',
  'Camera chụp bàn tay': 'Palm camera',
  'Vị trí bàn tay đang được nhận diện': 'Detected hand position',
  'Đang đổi camera…': 'Switching camera…',
  'Đang tải nhận diện': 'Loading detection',
  'Nhận diện gián đoạn': 'Detection interrupted',
  'Đã nhận diện bàn tay': 'Hand detected',
  'Đang tìm bàn tay': 'Looking for your hand',
  'Giữ máy yên trong khi chuẩn bị nhận diện…': 'Hold your device still while detection loads…',
  'Kiểm tra kết nối rồi thử nhận diện lại.': 'Check your connection and retry detection.',
  'Bàn tay': 'Hand',
  'Trong khung': 'In frame',
  'Giữ yên': 'Hold still',
  'Ống kính': 'Lens',
  'Đèn camera': 'Camera light',
  'Trình duyệt không hỗ trợ đèn trên camera này': 'Your browser does not support this camera’s light',
  'Đèn: Bật': 'Light: On',
  'Đèn: Tắt': 'Light: Off',
  'Chạm vào ảnh để lấy nét.': 'Tap the preview to focus.',
  'Camera tự lấy nét. Thay đổi khoảng cách nếu ảnh chưa rõ.':
    'Your camera focuses automatically. Adjust your distance if the image is blurry.',
  'Đèn không khả dụng trên camera này.': 'Light unavailable on this camera.',
  'Chưa thể nhận diện bàn tay. Không chụp khi bộ nhận diện chưa sẵn sàng.':
    'Hand detection is unavailable. Capture is disabled until detection is ready.',
  'Thử lại': 'Try again',
  'Tự chụp': 'Auto capture',
  'Chụp ảnh': 'Take photo',
  'Sẵn sàng': 'Ready',
  'Căn bàn tay': 'Align your hand',
  'Đưa trọn bàn tay vào giữa khung': 'Move your whole hand into the center of the frame',
  'Đưa lòng bàn tay vào khung': 'Place your palm in the frame',
  'Đưa tay sát hơn': 'Move your hand closer',
  'Xoay lòng bàn tay về phía máy': 'Turn your palm towards the camera',
  'Giữ yên…': 'Hold still…',
};

export function PalmCamera(props: Props) {
  const en = useLocale().locale === 'en';
  const copy = useCallback((value: string) => (en ? (CAMERA_EN[value] ?? value) : value), [en]);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const tracker = useRef<HandLandmarker | null>(null);
  const stopLoop = useRef<() => void>(() => {});
  const loadAbort = useRef<AbortController | null>(null);
  const cameraAbort = useRef<AbortController | null>(null);
  const alive = useRef(false),
    operation = useRef(0),
    switching = useRef(false);
  const auto = useRef(true),
    stable = useRef(0),
    deadline = useRef(0);
  const previous = useRef<HandPoint[] | null>(null);
  const callbacks = useRef(props);
  useEffect(() => {
    callbacks.current = props;
  }, [props]);
  const [ready, setReady] = useState(false),
    [changing, setChanging] = useState(false);
  const [cameras, setCameras] = useState<LensCandidate[]>([]),
    [device, setDevice] = useState('');
  const [controls, setControls] = useState({ torch: false, focus: false });
  const [torch, setTorch] = useState(false),
    [controlBusy, setControlBusy] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true),
    [count, setCount] = useState(0);
  const [tracking, setTracking] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hint, setHint] = useState(copy('Đang mở camera…')),
    [warning, setWarning] = useState('');
  const observedAt = useRef(0),
    verdictRef = useRef<HandVerdict>('none');
  const [landmarks, setLandmarks] = useState<HandPoint[] | null>(null);
  const [verdict, setVerdict] = useState<HandVerdict>('none');
  const [stability, setStability] = useState(0);
  const photoQuality = useRef<PalmQuality | null>(null);
  const sampledAt = useRef(0);
  const [quality, setQuality] = useState<PalmQuality | null>(null);
  const [frameSize, setFrameSize] = useState({ width: 3, height: 4 });

  const resetTracking = useCallback(() => {
    photoQuality.current = null;
    sampledAt.current = 0;
    setQuality(null);
    stable.current = 0;
    deadline.current = 0;
    previous.current = null;
    observedAt.current = 0;
    verdictRef.current = 'none';
    setLandmarks(null);
    setVerdict('none');
    setStability(0);
    setCount(0);
  }, []);
  const cleanup = useCallback(() => {
    alive.current = false;
    operation.current++;
    cameraAbort.current?.abort();
    loadAbort.current?.abort();
    stopLoop.current();
    tracker.current?.close();
    tracker.current = null;
    stopStream(stream.current);
    stream.current = null;
  }, []);
  const capture = useCallback(() => {
    const v = video.current;
    if (!alive.current || switching.current || !v || v.readyState < 2 || !v.videoWidth) return;
    if (!canCaptureHand(verdictRef.current, observedAt.current, performance.now())) {
      setWarning(copy('Đưa trọn bàn tay vào khung để nhận diện trước khi chụp.'));
      return;
    }
    try {
      const checked = samplePalmQuality(v, v.videoWidth, v.videoHeight, previous.current);
      if (checked.state === 'retake') {
        setWarning(palmQualityMessage(checked, en));
        return;
      }
    } catch {
      setWarning(
        en
          ? 'Unable to check this frame. Use your phone camera or choose a photo.'
          : 'Chưa kiểm tra được khung hình. Dùng camera điện thoại hoặc chọn ảnh.',
      );
      return;
    }
    const scale = Math.min(1, 1200 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setWarning(copy('Không xử lý được ảnh. Hãy thử lại.'));
      return;
    }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (dataUrl.length > 1150000) dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    if (dataUrl.length > 1150000) {
      setWarning(copy('Ảnh quá lớn. Hãy chọn ảnh từ thư viện.'));
      return;
    }
    const shot = { dataUrl, w: canvas.width, h: canvas.height };
    cleanup();
    callbacks.current.onCapture(shot);
  }, [cleanup, copy, en]);

  const runTracker = useCallback(() => {
    stopLoop.current();
    resetTracking();
    const v = video.current,
      lm = tracker.current;
    if (!v || !lm || !alive.current) return;
    stopLoop.current = startDetectLoop(
      v,
      lm,
      pts => {
        if (!alive.current || switching.current) return;
        if (document.hidden) {
          resetTracking();
          return;
        }
        const frame = frameFromLandmarks(pts, previous.current, v.videoWidth, v.videoHeight);
        previous.current = pts;
        const detected = assessHand(frame);
        if (pts && performance.now() - sampledAt.current > 400) {
          try {
            photoQuality.current = samplePalmQuality(v, v.videoWidth, v.videoHeight, pts);
            setQuality(photoQuality.current);
            sampledAt.current = performance.now();
          } catch {
            photoQuality.current = null;
            setQuality(null);
          }
        }
        observedAt.current = performance.now();
        verdictRef.current = detected;
        setLandmarks(pts);
        setVerdict(detected);
        stable.current = bumpStable(stable.current, frame);
        setStability(Math.min(100, Math.round((stable.current / 12) * 100)));
        setHint(
          detected === 'ready' && photoQuality.current && photoQuality.current.state !== 'ready'
            ? palmQualityMessage(photoQuality.current, en)
            : copy(verdictMessage(detected)),
        );
        if (!auto.current || !readyToCountdown(stable.current) || photoQuality.current?.state !== 'ready') {
          deadline.current = 0;
          setCount(0);
          return;
        }
        if (!deadline.current) deadline.current = performance.now() + 3000;
        const remaining = Math.ceil((deadline.current - performance.now()) / 1000);
        setCount(Math.max(0, remaining));
        if (remaining <= 0) capture();
      },
      () => {
        if (!alive.current) return;
        resetTracking();
        setTracking('error');
        setHint(copy('Nhận diện bị gián đoạn. Hãy thử lại để tiếp tục.'));
      },
    );
  }, [capture, resetTracking, copy, en]);

  const initializeTracker = useCallback(async () => {
    loadAbort.current?.abort();
    stopLoop.current();
    tracker.current?.close();
    tracker.current = null;
    const controller = new AbortController();
    loadAbort.current = controller;
    setTracking('loading');
    resetTracking();
    try {
      const lm = await loadHandTracker({ signal: controller.signal });
      if (!alive.current || controller.signal.aborted) {
        lm.close();
        return;
      }
      tracker.current = lm;
      setTracking('ready');
      runTracker();
    } catch {
      if (alive.current && !controller.signal.aborted) setTracking('error');
    }
  }, [resetTracking, runTracker]);

  const attach = useCallback(async (next: MediaStream) => {
    stream.current = next;
    const track = next.getVideoTracks()[0];
    setControls(cameraControls(track));
    setTorch(false);
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
        if (!alive.current || operation.current !== token) {
          stopStream(opened.stream);
          return;
        }
        await attach(opened.stream);
        if (!alive.current || operation.current !== token) return;
        setCameras(opened.backList);
        setDevice(opened.deviceId);
        setHint(copy('Đặt trọn bàn tay vào khung, lòng tay hướng về máy.'));
        void initializeTracker();
      } catch {
        if (alive.current && operation.current === token) {
          cleanup();
          callbacks.current.onFatal(copy('Không mở được camera. Kiểm tra quyền camera hoặc chọn ảnh từ thư viện.'));
        }
      }
    })();
    const hide = () => {
      if (document.hidden) {
        stopLoop.current();
        resetTracking();
      } else if (!switching.current) runTracker();
    };
    const freshness = setInterval(() => {
      if (observedAt.current && performance.now() - observedAt.current > 500) resetTracking();
    }, 250);
    document.addEventListener('visibilitychange', hide);
    return () => {
      clearInterval(freshness);
      document.removeEventListener('visibilitychange', hide);
      cleanup();
    };
  }, [attach, cleanup, initializeTracker, resetTracking, runTracker, copy]);

  async function changeLens(id: string) {
    if (switching.current || id === device) return;
    switching.current = true;
    setChanging(true);
    setReady(false);
    setWarning('');
    const token = ++operation.current,
      oldId = device;
    stopLoop.current();
    resetTracking();
    stopStream(stream.current);
    stream.current = null;
    try {
      let next: MediaStream;
      let selected = id;
      try {
        next = await switchToLens(id);
      } catch {
        if (!alive.current || operation.current !== token) return;
        next = await switchToLens(oldId);
        selected = oldId;
        if (alive.current) setWarning(copy('Không mở được camera đã chọn. Đã quay về camera trước.'));
      }
      if (!alive.current || operation.current !== token) {
        stopStream(next);
        return;
      }
      await attach(next);
      setDevice(selected);
    } catch {
      if (alive.current) {
        cleanup();
        callbacks.current.onFatal(copy('Camera đang bận. Đóng ứng dụng dùng camera rồi thử lại.'));
      }
    } finally {
      switching.current = false;
      if (alive.current) {
        setChanging(false);
        runTracker();
      }
    }
  }
  async function toggleTorch() {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || controlBusy) return;
    setControlBusy(true);
    const next = !torch;
    const ok = await setCameraTorch(track, next);
    if (alive.current && stream.current?.getVideoTracks()[0] === track) {
      if (ok) {
        setTorch(next);
        setWarning('');
      } else setWarning(copy('Camera không xác nhận thay đổi đèn. Hãy dùng nguồn sáng bên ngoài.'));
    }
    if (alive.current) setControlBusy(false);
  }
  async function focusAt(e: React.PointerEvent<HTMLVideoElement>) {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || !controls.focus || changing || controlBusy) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setControlBusy(true);
    resetTracking();
    const ok = await focusCamera(track, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    if (alive.current) {
      // Cảnh báo gắn với track đã yêu cầu; nhưng cờ bận thuộc phiên nên luôn được trả về.
      if (stream.current?.getVideoTracks()[0] === track) {
        setWarning(
          ok
            ? copy('Đã gửi yêu cầu lấy nét. Kiểm tra ảnh rõ trước khi chụp.')
            : copy('Camera không nhận yêu cầu lấy nét. Thử thay đổi khoảng cách.'),
        );
      }
      setControlBusy(false);
    }
  }
  function syncVideo() {
    const v = video.current;
    if (!v?.videoWidth || !v.videoHeight) return;
    setFrameSize({ width: v.videoWidth, height: v.videoHeight });
    setReady(v.readyState >= 2);
  }
  return (
    <section className={s.camera} aria-label={copy('Chụp bàn tay')}>
      <div className={s.cameraTop}>
        <span className={s.liveLabel}>
          <i /> {en ? 'LIVE CAMERA' : 'CAMERA TRỰC TIẾP'}
        </span>
        <button
          className={s.closeCamera}
          aria-label={copy('Đóng camera')}
          onClick={() => {
            cleanup();
            callbacks.current.onClose();
          }}
        >
          <PalmActionLabel icon="close">{null}</PalmActionLabel>
        </button>
      </div>
      <div className={s.cameraStage}>
        <div
          className={s.cameraFrame}
          style={{
            aspectRatio: `${frameSize.width}/${frameSize.height}`,
            width: `min(100%, ${(55 * frameSize.width) / frameSize.height}svh)`,
          }}
        >
          <video
            ref={video}
            muted
            playsInline
            onLoadedData={syncVideo}
            onResize={syncVideo}
            onPointerDown={focusAt}
            aria-label={copy('Camera chụp bàn tay')}
          />
          {landmarks && landmarks.length === 21 && (
            <svg
              className={s.liveOverlay}
              viewBox={`0 0 ${frameSize.width} ${frameSize.height}`}
              aria-label={copy('Vị trí bàn tay đang được nhận diện')}
            >
              {[
                [0, 1, 2, 3, 4],
                [0, 5, 6, 7, 8],
                [5, 9, 10, 11, 12],
                [9, 13, 14, 15, 16],
                [13, 17, 18, 19, 20],
                [0, 17],
              ].map((chain, i) => (
                <polyline
                  key={i}
                  points={chain
                    .map(n => `${landmarks[n].x * frameSize.width},${landmarks[n].y * frameSize.height}`)
                    .join(' ')}
                  fill="none"
                  stroke="#8be4c2"
                  strokeWidth="1.25"
                  vectorEffect="non-scaling-stroke"
                  opacity=".7"
                />
              ))}
              {landmarks.map((p, i) => (
                <ellipse key={i} cx={p.x * frameSize.width} cy={p.y * frameSize.height} rx="4" ry="4" fill="#c8ffe6" />
              ))}
            </svg>
          )}
          {(!ready || changing) && (
            <div className={s.cameraPending} role="status">
              <span className={s.spinner} />
              {changing ? copy('Đang đổi camera…') : copy('Đang mở camera…')}
            </div>
          )}
          {count > 0 && (
            <span className={s.countdown} role="status">
              {count}
            </span>
          )}
        </div>
        <div className={s.viewfinder} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className={s.detectionBadge} data-detected={!!landmarks}>
          <i />
          {tracking === 'loading'
            ? copy('Đang tải nhận diện')
            : tracking === 'error'
              ? copy('Nhận diện gián đoạn')
              : landmarks
                ? copy('Đã nhận diện bàn tay')
                : copy('Đang tìm bàn tay')}
        </div>
      </div>
      <div className={s.cameraFeedback}>
        <p className={s.cameraHint} role="status">
          {warning ||
            (tracking === 'ready'
              ? hint
              : tracking === 'loading'
                ? copy('Giữ máy yên trong khi chuẩn bị nhận diện…')
                : copy('Kiểm tra kết nối rồi thử nhận diện lại.'))}
        </p>
        <div className={s.qualitySignals}>
          <span data-ok={!!landmarks}>{copy('Bàn tay')}</span>
          <span data-ok={verdict === 'ready'}>{copy('Trong khung')}</span>
          <span data-ok={stability === 100}>{copy('Giữ yên')}</span>
          <span data-ok={quality?.checks.find(c => c.id === 'sharpness')?.status === 'pass'}>
            {en ? 'Sharp' : 'Độ nét'}
          </span>
          <span data-ok={quality?.checks.find(c => c.id === 'lighting')?.status === 'pass'}>
            {en ? 'Light' : 'Ánh sáng'}
          </span>
        </div>
      </div>
      <div className={s.cameraTools}>
        {cameras.length > 1 && (
          <label>
            {copy('Ống kính')}
            <select value={device} disabled={changing || controlBusy} onChange={e => void changeLens(e.target.value)}>
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className={s.toolButton}
          disabled={!controls.torch || !ready || changing || controlBusy}
          aria-pressed={torch}
          title={controls.torch ? copy('Đèn camera') : copy('Trình duyệt không hỗ trợ đèn trên camera này')}
          onClick={() => void toggleTorch()}
        >
          <PalmActionLabel icon="light">{torch ? copy('Đèn: Bật') : copy('Đèn: Tắt')}</PalmActionLabel>
        </button>
      </div>
      <p className={s.cameraNote}>
        {controls.focus
          ? copy('Chạm vào ảnh để lấy nét.')
          : copy('Camera tự lấy nét. Thay đổi khoảng cách nếu ảnh chưa rõ.')}{' '}
        {!controls.torch && copy('Đèn không khả dụng trên camera này.')}
      </p>
      {tracking === 'error' && (
        <div className={s.trackerStatus} role="alert">
          <span>{copy('Chưa thể nhận diện bàn tay. Không chụp khi bộ nhận diện chưa sẵn sàng.')}</span>
          <button className={s.retryButton} disabled={changing} onClick={() => void initializeTracker()}>
            <PalmActionLabel icon="retake">{copy('Thử lại')}</PalmActionLabel>
          </button>
        </div>
      )}
      <div className={s.captureActions}>
        <label className={s.autoSwitch}>
          <input
            type="checkbox"
            checked={autoCapture}
            disabled={tracking !== 'ready' || changing}
            onChange={e => {
              auto.current = e.target.checked;
              setAutoCapture(e.target.checked);
              resetTracking();
            }}
          />
          <span>{copy('Tự chụp')}</span>
        </label>
        <button
          className={s.shutter}
          disabled={!ready || changing || tracking !== 'ready' || verdict !== 'ready' || quality?.state === 'retake'}
          onClick={capture}
          aria-label={copy('Chụp ảnh')}
        >
          <span>
            <PalmActionLabel icon="camera">{null}</PalmActionLabel>
          </span>
        </button>
        <span className={s.captureCaption}>{verdict === 'ready' ? copy('Sẵn sàng') : copy('Căn bàn tay')}</span>
      </div>
      {props.onFallback && (
        <div className={s.cameraFallback}>
          <button
            onClick={() => {
              cleanup();
              callbacks.current.onFallback?.('native');
            }}
          >
            <PalmActionLabel icon="camera">{en ? 'Use phone camera' : 'Dùng camera điện thoại'}</PalmActionLabel>
          </button>
          <button
            onClick={() => {
              cleanup();
              callbacks.current.onFallback?.('upload');
            }}
          >
            <PalmActionLabel icon="image">{en ? 'Choose photo' : 'Chọn ảnh'}</PalmActionLabel>
          </button>
        </div>
      )}
    </section>
  );
}
