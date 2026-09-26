/**
 * Chuẩn hoá ảnh lòng bàn tay cho Chỉ tay: kiểm tra loại/kích thước, giải mã
 * tôn trọng EXIF, rồi vẽ lại JPEG tối đa 1200px để màn hình hiển thị và
 * request AI dùng CHUNG một ảnh.
 *
 * Giải mã có hai đường: `createImageBitmap(file, {imageOrientation:'from-image'})`
 * là đường nhanh, còn `HTMLImageElement` + blob URL là đường dự phòng khi API
 * này thiếu hoặc ném lỗi (một số bản WebKit/thiết bị cũ). Cả hai đường đều
 * giải phóng tài nguyên (bitmap.close / revokeObjectURL) kể cả khi lỗi, bị hủy
 * hoặc kết quả đến muộn.
 */

export type PalmPhoto = { dataUrl: string; width: number; height: number };

/** Ba định dạng trình duyệt giải mã ổn định; HEIC cần người dùng tự chuyển. */
export const PALM_PHOTO_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];
export const PALM_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PALM_PHOTO_MAX_EDGE = 1200;
/** Trần độ dài dataURL (khoảng 825 KB nhị phân) để ảnh gửi AI không phình. */
export const PALM_PHOTO_MAX_DATA_LENGTH = 1_150_000;
export const PALM_PHOTO_TYPE_ERROR =
  "Chọn ảnh JPG, PNG hoặc WebP dưới 8 MB. Nếu ảnh là HEIC, hãy chuyển sang JPG.";
export const PALM_PHOTO_READ_ERROR = "Không đọc được ảnh. Hãy chọn ảnh khác.";
export const PALM_PHOTO_SIZE_ERROR = "Ảnh còn quá lớn. Hãy chọn ảnh khác.";

/** Lỗi đầu vào trả về chuỗi cho UI; null nghĩa là file đủ điều kiện giải mã. */
export function palmPhotoGate(file: File): string | null {
  return !PALM_PHOTO_TYPES.includes(file.type) || file.size > PALM_PHOTO_MAX_BYTES
    ? PALM_PHOTO_TYPE_ERROR
    : null;
}

type DecodedPhoto = {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Giải phóng nguồn giải mã; gọi đúng một lần trong finally của normalize. */
  release: () => void;
};

const abortError = () => new DOMException("Đã hủy đọc ảnh", "AbortError");
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

async function decodeWithBitmap(file: File): Promise<DecodedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
}

/** Dự phòng không phụ thuộc API ảnh mới; trình duyệt tự xoay EXIF khi render <img>. */
function decodeWithElement(file: File, signal?: AbortSignal): Promise<DecodedPhoto> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let settled = false;
    const detach = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", onAbort);
      URL.revokeObjectURL(url);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      detach();
      image.src = "";
      reject(error);
    };
    const onAbort = () => fail(abortError());
    image.onload = () => {
      if (settled) return;
      settled = true;
      detach();
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => {} });
    };
    image.onerror = () => fail(new Error(PALM_PHOTO_READ_ERROR));
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      fail(abortError());
      return;
    }
    image.src = url;
  });
}

async function decode(file: File, signal?: AbortSignal): Promise<DecodedPhoto> {
  if (typeof createImageBitmap === "function") {
    try {
      return await decodeWithBitmap(file);
    } catch (error) {
      if ((error as DOMException | undefined)?.name === "AbortError") throw error;
      // API có nhưng không dùng được (bản cũ, ảnh lạ) → thử đường <img>.
      throwIfAborted(signal);
    }
  }
  throwIfAborted(signal);
  return decodeWithElement(file, signal);
}

export async function normalizePalmPhoto(file: File, options: { signal?: AbortSignal } = {}): Promise<PalmPhoto> {
  const gate = palmPhotoGate(file);
  if (gate) throw new Error(gate);
  const { signal } = options;
  throwIfAborted(signal);
  const decoded = await decode(file, signal);
  try {
    throwIfAborted(signal);
    if (!decoded.width || !decoded.height) throw new Error(PALM_PHOTO_READ_ERROR);
    const ratio = Math.min(1, PALM_PHOTO_MAX_EDGE / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decoded.width * ratio));
    canvas.height = Math.max(1, Math.round(decoded.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(PALM_PHOTO_READ_ERROR);
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    if (dataUrl.length > PALM_PHOTO_MAX_DATA_LENGTH) dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    if (dataUrl.length > PALM_PHOTO_MAX_DATA_LENGTH) throw new Error(PALM_PHOTO_SIZE_ERROR);
    return { dataUrl, width: canvas.width, height: canvas.height };
  } finally {
    decoded.release();
  }
}
