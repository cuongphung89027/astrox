export type PalmLine = {
  name: string;
  observation: string;
  reading: string;
  visibility: 'clear' | 'partial' | 'uncertain';
  uncertainty: string;
  points: [number, number][];
  /** Only an independently validated detector may authorize an image overlay. */
  overlayVerified: false;
};
export type PalmReading = {
  quality: 'ok' | 'retake';
  message: string;
  summary: string;
  lines: PalmLine[];
};
export function parsePalmReading(text: string): PalmReading {
  const fail = () => {
    throw new Error('Kết quả ảnh chưa đủ tin cậy để hiển thị. Hãy chụp rõ lòng bàn tay rồi thử lại.');
  };
  if (typeof text !== 'string' || text.length > 35000) return fail();
  let data;
  try {
    data = JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, ''),
    );
  } catch {
    return fail();
  }
  const validText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max && !/\p{Script=Han}/u.test(v);
  if (
    !data ||
    !['ok', 'retake'].includes(data.quality) ||
    !validText(data.message, 500) ||
    !validText(data.summary, 4000) ||
    !Array.isArray(data.lines) ||
    data.lines.length > 5
  )
    return fail();
  if (
    (data.quality === 'retake' && (data.lines.length || !data.message.trim() || data.summary.trim())) ||
    (data.quality === 'ok' && (!data.summary.trim() || !data.lines.length))
  )
    return fail();
  for (const line of data.lines) {
    if (
      !line ||
      !validText(line.name, 80) ||
      !validText(line.observation, 1500) ||
      !validText(line.reading, 2000) ||
      !line.name.trim() ||
      !line.observation.trim() ||
      !line.reading.trim() ||
      (line.visibility !== undefined && !['clear', 'partial', 'uncertain'].includes(line.visibility)) ||
      (line.uncertainty !== undefined && !validText(line.uncertainty, 500))
    )
      return fail();
    // Geometry must not turn a valid observation into an unusable response.
    const validPoints =
      Array.isArray(line.points) &&
      line.points.length >= 2 &&
      line.points.length <= 24 &&
      line.points.every(
        (p: unknown) =>
          Array.isArray(p) &&
          p.length === 2 &&
          p.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1),
      );
    if (!validPoints) line.points = [];
  }
  return {
    quality: data.quality,
    message: data.message,
    summary: data.summary,
    lines: data.lines.map((l: PalmLine) => ({
      name: l.name,
      observation: l.observation,
      reading: l.reading,
      visibility: l.visibility ?? 'uncertain',
      uncertainty: l.uncertainty ?? '',
      points: l.points,
      overlayVerified: false,
    })),
  };
}
