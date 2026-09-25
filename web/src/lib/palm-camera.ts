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
let cachedBackList: LensCandidate[] = [];
const BASE_VIDEO: MediaTrackConstraints = { facingMode: "environment", width: { ideal: 1280 } };

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

export async function openBackCamera(): Promise<OpenedCamera> {
  if (cachedLensId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cachedLensId }, width: { ideal: 1280 } },
        audio: false,
      });
      return { stream, deviceId: cachedLensId, backList: [...cachedBackList] };
    } catch {
      cachedLensId = null; // thiết bị đã biến mất — rơi về luồng mặc định
      cachedBackList = [];
    }
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: BASE_VIDEO, audio: false });
  const track = stream.getVideoTracks()[0];
  const defaultId = track.getSettings().deviceId ?? "";
  const defaultLens: LensCandidate = {
    deviceId: defaultId,
    label: track.label,
    zoomMin: zoomMinOf(track),
  };
  if (!needsRescan(defaultLens.zoomMin)) {
    cacheLens(defaultId, [defaultLens]);
    return { stream, deviceId: defaultId, backList: [...cachedBackList] };
  }
  // Nhiều lens đáng nghi: nhả stream mặc định TRƯỚC khi quét — Android/Chrome
  // từ chối mở camera thứ hai khi camera thứ nhất còn giữ (NotReadableError).
  stream.getTracks().forEach((t) => t.stop());
  const backList: LensCandidate[] = [defaultLens];
  const others = await listBackCameras();
  for (const c of others) if (c.deviceId !== defaultId) backList.push(c);
  const plan = lensOpenPlan(backList, defaultId);
  try {
    const opened = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: plan.primary }, width: { ideal: 1280 } },
      audio: false,
    });
    cacheLens(plan.primary, backList);
    return { stream: opened, deviceId: plan.primary, backList: [...cachedBackList] };
  } catch (err) {
    if (plan.fallback === plan.primary) throw err; // không còn lens dự phòng
    // Mở lens tốt nhất hụt — mở lại lens mặc định để caller luôn có preview.
    const reopened = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: plan.fallback }, width: { ideal: 1280 } },
      audio: false,
    });
    cacheLens(plan.fallback, backList);
    return { stream: reopened, deviceId: plan.fallback, backList: [...cachedBackList] };
  }
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
