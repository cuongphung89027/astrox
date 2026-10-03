import { loadHandTracker, assessHand, frameFromLandmarks, type HandPoint } from './hand-tracker';

export type PalmQualityCheck = {
  id: 'resolution' | 'lighting' | 'sharpness' | 'hand' | 'framing';
  status: 'pass' | 'warn' | 'fail' | 'unknown';
};
export type PalmQuality = { state: 'ready' | 'review' | 'retake'; checks: PalmQualityCheck[] };
type Options = { sourceWidth?: number; sourceHeight?: number; hand?: HandPoint[] | null };

/** Photo-quality heuristics describe pixels, never a probability that a reading is true. */
export function assessPalmPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: Options = {},
): PalmQuality {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 3 ||
    height < 3 ||
    data.length !== width * height * 4
  )
    throw new Error('INVALID_PALM_PIXELS');
  const hand = options.hand;
  const validHand = !!hand?.length && hand.every(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  const framed =
    validHand &&
    assessHand(frameFromLandmarks(hand!, null, options.sourceWidth ?? width, options.sourceHeight ?? height)) ===
      'ready';
  // Use the palm region when available, so a bright background cannot hide a dark palm.
  const palm = validHand && hand!.length === 21 ? [0, 1, 2, 5, 9, 13, 17].map(i => hand![i]) : null;
  const left = palm ? Math.max(1, Math.floor(Math.min(...palm.map(p => p.x)) * width)) : 1;
  const right = palm ? Math.min(width - 1, Math.ceil(Math.max(...palm.map(p => p.x)) * width)) : width - 1;
  const top = palm ? Math.max(1, Math.floor(Math.min(...palm.map(p => p.y)) * height)) : 1;
  const bottom = palm ? Math.min(height - 1, Math.ceil(Math.max(...palm.map(p => p.y)) * height)) : height - 1;
  const lum = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  };
  let sum = 0,
    count = 0,
    blown = 0,
    lap = 0,
    lap2 = 0;
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++) {
      const value = lum(x, y);
      sum += value;
      count++;
      if (value > 245) blown++;
      const edge = lum(x - 1, y) + lum(x + 1, y) + lum(x, y - 1) + lum(x, y + 1) - 4 * value;
      lap += edge;
      lap2 += edge * edge;
    }
  const mean = count ? sum / count : 0;
  const variance = count ? Math.max(0, lap2 / count - (lap / count) ** 2) : 0;
  const checks: PalmQualityCheck[] = [
    {
      id: 'resolution',
      status: Math.min(options.sourceWidth ?? width, options.sourceHeight ?? height) >= 350 ? 'pass' : 'fail',
    },
    {
      id: 'lighting',
      status:
        mean < 18 || mean > 242 || blown / Math.max(1, count) > 0.6
          ? 'fail'
          : mean < 50 || mean > 225 || blown / Math.max(1, count) > 0.2
            ? 'warn'
            : 'pass',
    },
    { id: 'sharpness', status: variance < 18 ? 'warn' : 'pass' },
    { id: 'hand', status: hand === undefined ? 'unknown' : validHand ? 'pass' : 'fail' },
    { id: 'framing', status: hand === undefined ? 'unknown' : !framed ? 'fail' : 'pass' },
  ];
  return {
    state: checks.some(c => c.status === 'fail')
      ? 'retake'
      : checks.some(c => c.status === 'warn' || c.status === 'unknown')
        ? 'review'
        : 'ready',
    checks,
  };
}

export function samplePalmQuality(
  source: CanvasImageSource,
  width: number,
  height: number,
  hand?: HandPoint[] | null,
): PalmQuality {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = Math.max(3, Math.round((160 * height) / width));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('PALM_CANVAS_UNAVAILABLE');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return assessPalmPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, {
    sourceWidth: width,
    sourceHeight: height,
    hand,
  });
}

/** Shared final-image inspection for upload and native camera; no network image transfer. */
export async function inspectPalmPhoto(dataUrl: string, signal: AbortSignal): Promise<PalmQuality> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      image.src = '';
      reject(new DOMException('Aborted', 'AbortError'));
    };
    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('PALM_PHOTO_READ_ERROR'));
    };
    signal.addEventListener('abort', abort, { once: true });
    image.src = dataUrl;
  });
  let hand: HandPoint[] | null | undefined;
  try {
    const tracker = await loadHandTracker({ signal, runningMode: 'IMAGE', timeoutMs: 8000 });
    try {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      hand = tracker.detect(image).landmarks?.[0] ?? null;
    } finally {
      tracker.close();
    }
  } catch (error) {
    if (signal.aborted || (error as Error).name === 'AbortError') throw error;
  }
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  return samplePalmQuality(image, image.naturalWidth, image.naturalHeight, hand);
}
