/**
 * Camera engine cho Chỉ tay: mở camera sau và chọn đúng ống kính wide
 * trên máy nhiều lens (OPPO Find X9 Ultra mở nhầm tele), kèm đánh giá
 * sáng tối khung hình. Hàm pure tách riêng để test node:test; các hàm
 * gọi getUserMedia chỉ chạy trong trình duyệt.
 *
 * Chọn lens dùng nhiều tín hiệu (nhãn + đáy dải zoom qua getCapabilities
 * hoặc ImageCapture), luôn dò khi máy có >=2 camera sau, và nhớ lựa chọn
 * của người dùng trong localStorage để máy không báo zoom vẫn mở đúng lens.
 */

export type LensCandidate = {
  deviceId: string;
  label: string;
  /** Đáy dải zoom theo đúng đơn vị thiết bị báo (thang 1x hoặc 100%). */
  zoomMin: number | null;
};

/** Các lens cùng một máy dùng chung thang đơn vị; >=30 coi như thang phần trăm. */
const UNIT_THRESHOLD = 30;

/** Nhãn tele/ultra/macro… — lens phụ, không dùng để chụp lòng bàn tay. */
const SIDE_LENS_LABEL = /tele|ultra|macro|depth|portrait|bokeh|monochrome|zoom| closup/i;

/** Nhãn camera trước — không mở cũng không đếm nó khi dò lens sau. */
const FRONT_LABEL = /facing front|front|trước|selfie/i;

/** Nhãn wide/main — tín hiệu cộng điểm khi máy có báo zoom nhưng lệch chuẩn. */
const MAIN_LENS_LABEL = /wide|main/i;

/** Candidate không có thông tin zoom vẫn đáng thử hơn lens bị loại theo nhãn. */
const NEUTRAL_SCORE = 0.5;

export function normalizeZoomUnit(mins: number[]): number[] {
  return mins.every((v) => v >= UNIT_THRESHOLD) ? mins.map((v) => v / 100) : mins;
}

/**
 * Chọn lens chụp lòng bàn tay theo nhiều tín hiệu: loại theo nhãn, rồi điểm số
 * theo khoảng cách đáy dải zoom tới 1x (có cộng điểm cho nhãn wide/main).
 * Máy không báo zoom (Find X9 Ultra: caps rỗng) vẫn đi tiếp tới tiêu chí nhãn
 * thay vì bỏ cuộc — đây là lỗi làm track mặc định (tele) được giữ nguyên.
 */
export function scoreLenses(candidates: LensCandidate[]): LensCandidate | null {
  if (candidates.length === 0) return null;
  const withZoom = candidates.filter(
    (c) => c.zoomMin !== null,
  ) as (LensCandidate & { zoomMin: number })[];
  const zoomOf = new Map<LensCandidate, number>();
  normalizeZoomUnit(withZoom.map((c) => c.zoomMin)).forEach((v, i) => zoomOf.set(withZoom[i], v));
  const preferred = candidates.filter((c) => !SIDE_LENS_LABEL.test(c.label));
  // Mọi candidate đều là lens phụ → bỏ tiêu chí nhãn, còn hơn không thử gì.
  const pool = preferred.length > 0 ? preferred : candidates;
  const scored = pool.map((c) => {
    const zoom = zoomOf.get(c) ?? null;
    let score = zoom === null ? NEUTRAL_SCORE : 1 / (Math.abs(zoom - 1) + 0.05);
    if (MAIN_LENS_LABEL.test(c.label) && !SIDE_LENS_LABEL.test(c.label)) score += 100;
    return { candidate: c, score };
  });
  // So sánh nghiêm ngặt: điểm bằng nhau thì giữ candidate đầu tiên của pool.
  let best = scored[0];
  for (const s of scored) if (s.score > best.score) best = s;
  return best.candidate;
}

/** Giữ tên cũ cho nơi gọi khác (PalmCamera/lensOpenPlan) và test đã có. */
export const pickLens = scoreLenses;

/**
 * Đáy dải không nằm quanh 1x (phòng cả hai thang) → đáng nghi tele/ultra-wide.
 * Từ bản fix này không còn dùng làm cổng chặn việc dò lens — giữ để tham chiếu.
 */
export function needsRescan(zoomMin: number | null): boolean {
  if (zoomMin === null) return false;
  const nearOne = (zoomMin >= 0.9 && zoomMin <= 1.3) || (zoomMin >= 90 && zoomMin <= 130);
  return !nearOne;
}

type ZoomCaps = { zoom?: { min?: number } };
type PhotoCaps = { zoom?: { min?: number } };

/**
 * Đáy dải zoom từ track: `getCapabilities()` trước, rồi tới ImageCapture photo
 * caps — nhiều máy Android chỉ trả zoom ở đường thứ hai. Không có cả hai thì
 * trả null (caller tự quyết theo tín hiệu khác), không ném ra ngoài.
 */
export async function probeZoomMin(track: MediaStreamTrack): Promise<number | null> {
  try {
    const caps = (track.getCapabilities?.() ?? {}) as ZoomCaps;
    if (caps.zoom?.min != null) return caps.zoom.min;
  } catch {
    /* track đã đóng hoặc không hỗ trợ getCapabilities */
  }
  try {
    const IC = (
      window as unknown as {
        ImageCapture?: new (t: MediaStreamTrack) => {
          getPhotoCapabilities(): Promise<PhotoCaps>;
        };
      }
    ).ImageCapture;
    if (IC) {
      const photo = await new IC(track).getPhotoCapabilities();
      if (photo?.zoom?.min != null) return photo.zoom.min;
    }
  } catch {
    /* Safari/Firefox và một số máy Android không có ImageCapture */
  }
  return null;
}

function checkCameraAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Đã đóng camera", "AbortError");
}
const stopCameraStream = (stream: MediaStream) => stream.getTracks().forEach(track => track.stop());

/** Browser camera promises cannot be cancelled; dispose results arriving after close. */
function cameraAwait<T>(pending: Promise<T>, signal?: AbortSignal, dispose?: (value: T) => void): Promise<T> {
  if (!signal) return pending;
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("Đã đóng camera", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    pending.then(value => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) { dispose?.(value); abort(); }
      else resolve(value);
    }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}

/** Liệt kê camera sau; đóng từng stream cả khi hủy hoặc probe thất bại. */
export async function listBackCameras(signal?: AbortSignal): Promise<LensCandidate[]> {
  checkCameraAbort(signal);
  const devices = await cameraAwait(navigator.mediaDevices.enumerateDevices(), signal);
  checkCameraAbort(signal);
  const out: LensCandidate[] = [];
  for (const d of devices.filter(v => v.kind === "videoinput" && !FRONT_LABEL.test(v.label))) {
    checkCameraAbort(signal);
    let stream: MediaStream | null = null;
    try {
      stream = await cameraAwait(navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: d.deviceId } }, audio: false }), signal, stopCameraStream);
      checkCameraAbort(signal);
      const track = stream.getVideoTracks()[0];
      if (track.getSettings().facingMode === "environment" || (!track.getSettings().facingMode && /back|rear|sau|wide|main/i.test(d.label))) {
        const zoomMin = await cameraAwait(probeZoomMin(track), signal);
        checkCameraAbort(signal);
        out.push({ deviceId: d.deviceId, label: d.label, zoomMin });
      }
    } catch {
      checkCameraAbort(signal);
      // An unavailable lens does not prevent trying the remaining devices.
    } finally {
      if (stream) stopCameraStream(stream);
    }
  }
  return out;
}

let cachedLensId: string | null = null;
let cachedBackList: LensCandidate[] = [];
const BASE_VIDEO: MediaTrackConstraints = { facingMode: "environment", width: { ideal: 1280 } };
const LENS_STORAGE_KEY = "astrox.palm.lensId";

function readStoredLens(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(LENS_STORAGE_KEY);
  } catch {
    return null; // Safari private mode — coi như chưa có lựa chọn nào
  }
}

function clearStoredLens(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(LENS_STORAGE_KEY);
  } catch {
    /* không xoá được cũng không sao */
  }
}

/** Nhớ lens người dùng đã chọn — máy không có tín hiệu zoom vẫn đúng ở lần sau. */
export function persistLensChoice(deviceId: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(LENS_STORAGE_KEY, deviceId);
  } catch {
    /* Safari private mode ném khi ghi — bỏ qua */
  }
}

function openLensStream(deviceId: string, signal?: AbortSignal): Promise<MediaStream> {
  checkCameraAbort(signal);
  return cameraAwait(navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId }, width: { ideal: 1280 } },
    audio: false,
  }), signal, stopCameraStream);
}

/**
 * Danh sách lens cho nút "Đổi ống kính" khi đang giữ stream (không dò được zoom
 * vì không thể mở camera thứ hai): chỉ liệt kê thiết bị, bỏ camera trước nếu
 * nhận ra qua nhãn. Lens đang dùng luôn đứng đầu để chỉ số khớp UI.
 */
async function lensListFromDevices(activeId: string, signal?: AbortSignal): Promise<LensCandidate[]> {
  checkCameraAbort(signal);
  const devices = await cameraAwait(navigator.mediaDevices.enumerateDevices(), signal);
  checkCameraAbort(signal);
  const cams = devices.filter((d) => d.kind === "videoinput");
  const back = cams.filter((d) => !FRONT_LABEL.test(d.label));
  const list = back.length > 0 ? back : cams;
  const ordered = [
    ...list.filter((d) => d.deviceId === activeId),
    ...list.filter((d) => d.deviceId !== activeId),
  ];
  const out = ordered.map((d) => ({ deviceId: d.deviceId, label: d.label, zoomMin: null }));
  return out.length > 0 ? out : [{ deviceId: activeId, label: "", zoomMin: null }];
}

/** Mở lens đã chọn trước đó (localStorage rồi cache session) — khỏi dò lại. */
async function openRememberedLens(
  deviceId: string,
  signal?: AbortSignal,
): Promise<{ opened: OpenedCamera | null; gone: boolean }> {
  let stream: MediaStream | null = null;
  try {
    stream = await openLensStream(deviceId, signal);
    checkCameraAbort(signal);
    const backList =
      cachedBackList.some(c => c.deviceId === deviceId) && cachedBackList.length > 1
        ? cachedBackList
        : await lensListFromDevices(deviceId, signal);
    checkCameraAbort(signal);
    cacheLens(deviceId, backList);
    return { opened: { stream, deviceId, backList: [...backList] }, gone: false };
  } catch (err) {
    if (stream) stopCameraStream(stream);
    checkCameraAbort(signal);
    return { opened: null, gone: isGoneError(err) };
  }
}

/** Lỗi khẳng định lens không còn tồn tại (khác lỗi tạm thời như bận/quyền). */
function isGoneError(err: unknown): boolean {
  const name = (err as { name?: string } | null | undefined)?.name;
  return name === "NotFoundError" || name === "OverconstrainedError";
}

export type OpenedCamera = { stream: MediaStream; deviceId: string; backList: LensCandidate[] };

/**
 * Kế hoạch mở lens sau khi quét: thử `primary` (lens tốt nhất) trước; nếu mở
 * hụt thì mở lại `fallback` (lens mặc định) để caller luôn còn preview. Hai id
 * trùng nhau nghĩa là không có phương án dự phòng — lỗi mở phải nổi lên caller.
 */
export function lensOpenPlan(
  backList: LensCandidate[],
  defaultId: string,
): { primary: string; fallback: string } {
  const best = pickLens(backList);
  const primary = best?.deviceId ?? defaultId;
  return { primary, fallback: defaultId };
}

function cacheLens(deviceId: string, backList: LensCandidate[]): void {
  cachedLensId = deviceId;
  cachedBackList = backList;
}

/**
 * Mở camera sau và chọn lens chụp lòng bàn tay. Thứ tự ưu tiên: lens đã nhớ
 * (localStorage), rồi lens của session này (cache module), cuối cùng mới mở
 * luồng mặc định và dò. Máy có >=2 camera sau thì LUÔN dò một lần per session —
 * `needsRescan` không còn là cổng chặn (máy không expose zoom từng bị giữ
 * nguyên lens mặc định, thường là tele).
 */
export async function openBackCamera(signal?: AbortSignal): Promise<OpenedCamera> {
  checkCameraAbort(signal);
  const stored = readStoredLens();
  if (stored) {
    const { opened, gone } = await openRememberedLens(stored, signal);
    if (signal?.aborted && opened) stopCameraStream(opened.stream);
    checkCameraAbort(signal);
    if (opened) return opened;
    if (gone) clearStoredLens();
  }
  if (cachedLensId) {
    const { opened } = await openRememberedLens(cachedLensId, signal);
    if (signal?.aborted && opened) stopCameraStream(opened.stream);
    checkCameraAbort(signal);
    if (opened) return opened;
    cachedLensId = null;
    cachedBackList = [];
  }
  checkCameraAbort(signal);
  const stream = await cameraAwait(navigator.mediaDevices.getUserMedia({ video: BASE_VIDEO, audio: false }), signal, stopCameraStream);
  let keepDefault = false;
  let defaultLens: LensCandidate;
  try {
    checkCameraAbort(signal);
    const track = stream.getVideoTracks()[0];
    defaultLens = {
      deviceId: track.getSettings().deviceId ?? "",
      label: track.label,
      zoomMin: await cameraAwait(probeZoomMin(track), signal),
    };
    checkCameraAbort(signal);
    const inputs = (await cameraAwait(navigator.mediaDevices.enumerateDevices(), signal)).filter(d => d.kind === "videoinput");
    checkCameraAbort(signal);
    const deviceCount = inputs.some(d => FRONT_LABEL.test(d.label))
      ? inputs.filter(d => !FRONT_LABEL.test(d.label)).length : inputs.length;
    if (deviceCount < 2) {
      cacheLens(defaultLens.deviceId, [defaultLens]);
      keepDefault = true;
      return { stream, deviceId: defaultLens.deviceId, backList: [...cachedBackList] };
    }
  } finally {
    if (!keepDefault) stopCameraStream(stream);
  }
  // Android requires releasing the default stream before probing another lens.
  const backList: LensCandidate[] = [defaultLens];
  const others = await listBackCameras(signal);
  checkCameraAbort(signal);
  for (const c of others) if (c.deviceId !== defaultLens.deviceId) backList.push(c);
  const plan = lensOpenPlan(backList, defaultLens.deviceId);
  let opened: MediaStream;
  let selected = plan.primary;
  try {
    opened = await openLensStream(plan.primary, signal);
  } catch (err) {
    checkCameraAbort(signal);
    if (plan.fallback === plan.primary) throw err;
    opened = await openLensStream(plan.fallback, signal);
    selected = plan.fallback;
  }
  if (signal?.aborted) { stopCameraStream(opened); checkCameraAbort(signal); }
  cacheLens(selected, backList);
  return { stream: opened, deviceId: selected, backList: [...cachedBackList] };
}

/**
 * Đổi sang lens khác theo deviceId (PalmCamera gọi khi người dùng bấm "Đổi ống
 * kính") và nhớ lựa chọn cho các lần mở sau — kể cả máy không có tín hiệu zoom.
 */
export async function switchToLens(deviceId: string): Promise<MediaStream> {
  const stream = await openLensStream(deviceId);
  persistLensChoice(deviceId);
  return stream;
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

type CaptureCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  focusMode?: string[];
  pointsOfInterest?: unknown;
};
function capabilities(track: MediaStreamTrack): CaptureCapabilities {
  try { return track.getCapabilities?.() ?? {}; } catch { return {}; }
}
export function cameraControls(track: MediaStreamTrack): { torch: boolean; focus: boolean } {
  const caps = capabilities(track);
  return { torch: caps.torch === true, focus: !!caps.pointsOfInterest && !!caps.focusMode?.some(m => m === "single-shot" || m === "continuous") };
}

/** Yêu cầu điều khiển phải tự kết thúc; track treo không được giữ UI khóa vô hạn. */
export const CONTROL_SETTLE_MS = 5000;

export type SettleResult<T> = { settled: true; value: T } | { settled: false; reason: "timeout" | "error" };

/**
 * Kết quả trong hạn hay không. Promise đến muộn (sau deadline) bị bỏ qua nhưng
 * vẫn có handler nên không sinh unhandled rejection.
 */
export function settleWithin<T>(pending: Promise<T>, timeoutMs: number = CONTROL_SETTLE_MS): Promise<SettleResult<T>> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (result: SettleResult<T>) => { if (!done) { done = true; resolve(result); } };
    const timer = setTimeout(() => finish({ settled: false, reason: "timeout" }), timeoutMs);
    pending.then(
      (value) => { clearTimeout(timer); finish({ settled: true, value }); },
      () => { clearTimeout(timer); finish({ settled: false, reason: "error" }); },
    );
  });
}

type ControlOptions = { timeoutMs?: number };

export async function setCameraTorch(track: MediaStreamTrack, enabled: boolean, options: ControlOptions = {}): Promise<boolean> {
  if (!cameraControls(track).torch) return false;
  const applied = await settleWithin(
    (async () => {
      await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] });
      return (track.getSettings() as MediaTrackSettings & { torch?: boolean }).torch === enabled;
    })(),
    options.timeoutMs,
  );
  return applied.settled && applied.value;
}
/** True means the focus request was accepted; it cannot prove optical sharpness. */
export async function focusCamera(track: MediaStreamTrack, x: number, y: number, options: ControlOptions = {}): Promise<boolean> {
  if (!cameraControls(track).focus || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const caps = capabilities(track);
  const applied = await settleWithin(
    (async () => {
      await track.applyConstraints({ advanced: [{
        focusMode: caps.focusMode?.includes("single-shot") ? "single-shot" : "continuous",
        pointsOfInterest: [{ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }],
      } as MediaTrackConstraintSet] });
      return true;
    })(),
    options.timeoutMs,
  );
  return applied.settled && applied.value;
}
