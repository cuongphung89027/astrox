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
    if (MAIN_LENS_LABEL.test(c.label)) score += 1;
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
        out.push({ deviceId: d.deviceId, label: d.label, zoomMin: await probeZoomMin(track) });
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

function openLensStream(deviceId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId }, width: { ideal: 1280 } },
    audio: false,
  });
}

/**
 * Danh sách lens cho nút "Đổi ống kính" khi đang giữ stream (không dò được zoom
 * vì không thể mở camera thứ hai): chỉ liệt kê thiết bị, bỏ camera trước nếu
 * nhận ra qua nhãn. Lens đang dùng luôn đứng đầu để chỉ số khớp UI.
 */
async function lensListFromDevices(activeId: string): Promise<LensCandidate[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter((d) => d.kind === "videoinput");
  const back = cams.filter((d) => !/front|trước|selfie/i.test(d.label));
  const list = back.length > 0 ? back : cams;
  const ordered = [
    ...list.filter((d) => d.deviceId === activeId),
    ...list.filter((d) => d.deviceId !== activeId),
  ];
  const out = ordered.map((d) => ({ deviceId: d.deviceId, label: d.label, zoomMin: null }));
  return out.length > 0 ? out : [{ deviceId: activeId, label: "", zoomMin: null }];
}

/** Mở lens đã chọn trước đó (localStorage rồi cache session) — khỏi dò lại. */
async function openRememberedLens(deviceId: string): Promise<OpenedCamera | null> {
  try {
    const stream = await openLensStream(deviceId);
    const backList =
      cachedBackList.some((c) => c.deviceId === deviceId) && cachedBackList.length > 1
        ? cachedBackList
        : await lensListFromDevices(deviceId);
    cacheLens(deviceId, backList);
    return { stream, deviceId, backList: [...backList] };
  } catch {
    return null; // thiết bị đã biến mất hoặc đang bận — rơi về luồng mặc định
  }
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
export async function openBackCamera(): Promise<OpenedCamera> {
  const stored = readStoredLens();
  if (stored) {
    const opened = await openRememberedLens(stored);
    if (opened) return opened;
    clearStoredLens(); // thiết bị đã biến mất — lựa chọn cũ không còn nghĩa
  }
  if (cachedLensId) {
    const opened = await openRememberedLens(cachedLensId);
    if (opened) return opened;
    cachedLensId = null;
    cachedBackList = [];
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: BASE_VIDEO, audio: false });
  const track = stream.getVideoTracks()[0];
  const defaultId = track.getSettings().deviceId ?? "";
  const defaultLens: LensCandidate = {
    deviceId: defaultId,
    label: track.label,
    zoomMin: await probeZoomMin(track),
  };
  const deviceCount = (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === "videoinput",
  ).length;
  if (deviceCount < 2) {
    // Một camera sau duy nhất — không có gì để chọn.
    cacheLens(defaultId, [defaultLens]);
    return { stream, deviceId: defaultId, backList: [...cachedBackList] };
  }
  // Nhiều lens: nhả stream mặc định TRƯỚC khi quét — Android/Chrome từ chối mở
  // camera thứ hai khi camera thứ nhất còn giữ (NotReadableError).
  stream.getTracks().forEach((t) => t.stop());
  const backList: LensCandidate[] = [defaultLens];
  const others = await listBackCameras();
  for (const c of others) if (c.deviceId !== defaultId) backList.push(c);
  const plan = lensOpenPlan(backList, defaultId);
  console.info("[palm] lens scan", JSON.stringify(backList));
  try {
    const opened = await openLensStream(plan.primary);
    if (plan.primary !== defaultId) persistLensChoice(plan.primary);
    cacheLens(plan.primary, backList);
    return { stream: opened, deviceId: plan.primary, backList: [...cachedBackList] };
  } catch (err) {
    if (plan.fallback === plan.primary) throw err; // không còn lens dự phòng
    // Mở lens tốt nhất hụt — mở lại lens mặc định để caller luôn có preview.
    const reopened = await openLensStream(plan.fallback);
    cacheLens(plan.fallback, backList);
    return { stream: reopened, deviceId: plan.fallback, backList: [...cachedBackList] };
  }
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
