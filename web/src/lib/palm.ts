export type PalmLine = {
  name: string;
  observation: string;
  reading: string;
  points: [number, number][];
};
export type PalmReading = {
  quality: "ok" | "retake";
  message: string;
  summary: string;
  lines: PalmLine[];
};
export function parsePalmReading(text: string): PalmReading {
  const fail = () => {
    throw new Error(
      "Kết quả ảnh chưa đủ tin cậy để hiển thị. Hãy chụp rõ lòng bàn tay rồi thử lại.",
    );
  };
  let data;
  try {
    data = JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, ""),
    );
  } catch {
    return fail();
  }
  const validText = (v: unknown, max: number) =>
    typeof v === "string" && v.length <= max && !/\p{Script=Han}/u.test(v);
  if (
    !data ||
    !["ok", "retake"].includes(data.quality) ||
    !validText(data.message, 500) ||
    !validText(data.summary, 4000) ||
    !Array.isArray(data.lines) ||
    data.lines.length > 5
  )
    return fail();
  if (
    (data.quality === "retake" &&
      (data.lines.length || !data.message.trim())) ||
    (data.quality === "ok" && !data.summary.trim())
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
      !Array.isArray(line.points) ||
      line.points.length < 2 ||
      line.points.length > 24
    )
      return fail();
    for (const p of line.points)
      if (
        !Array.isArray(p) ||
        p.length !== 2 ||
        p.some(
          (v) => typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1,
        )
      )
        return fail();
  }
  return {
    quality: data.quality,
    message: data.message,
    summary: data.summary,
    lines: data.lines.map((l: PalmLine) => ({
      name: l.name,
      observation: l.observation,
      reading: l.reading,
      points: l.points,
    })),
  };
}
