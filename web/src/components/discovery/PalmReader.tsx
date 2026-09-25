"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { callAiText } from "@/lib/api";
import { managedPrompt } from "@/lib/managed-prompts";
import { usePaidPrice } from "@/lib/use-paid-price";
import { parsePalmReading, type PalmReading } from "@/lib/palm";
import s from "./Discovery.module.css";
function HandArt() {
  return (
    <svg
      className={s.hand}
      viewBox="0 0 240 320"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M79 290c0-33-5-47-24-71l-27-48c-8-17 10-25 20-13l25 31-9-101c-2-22 19-24 22-3l10 69-1-117c0-22 23-22 24 0l3 110 7-128c1-20 23-19 23 2l-2 130 15-108c3-19 25-16 22 6l-11 114 18-71c5-20 26-15 21 7l-13 80c-3 50-15 84-30 113l-1 21Z" />
      <path
        d="M84 190c15-18 27-13 39 5 15 23 8 51-3 68M100 174c22-11 42-3 67 2M94 211c27-8 49-8 69-20"
        opacity=".45"
      />
      <circle cx="124" cy="167" r="112" strokeDasharray="2 8" opacity=".25" />
    </svg>
  );
}
export function PalmReader() {
  const [photo, setPhoto] = useState(""),
    [size, setSize] = useState({ w: 1, h: 1 }),
    [camera, setCamera] = useState(false),
    [side, setSide] = useState("Tay trái"),
    [dominant, setDominant] = useState("Tay phải"),
    [question, setQuestion] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<PalmReading | null>(null),
    [active, setActive] = useState(0),
    [overlay, setOverlay] = useState(true);
  const price = usePaidPrice("palm", managedPrompt("palm.read.v1", [side, dominant, question]));
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    abort = useRef<AbortController | null>(null),
    generation = useRef(0),
    upload = useRef<HTMLInputElement>(null);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  }
  useEffect(
    () => () => {
      generation.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      abort.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (camera && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current
        .play()
        .catch(() =>
          setError("Không mở được camera. Bạn có thể chọn ảnh từ thư viện."),
        );
    }
  }, [camera]);
  async function start() {
    setError("");
    const token = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera chưa khả dụng. Hãy mở bằng HTTPS hoặc chọn ảnh.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      if (token !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = media;
      setCamera(true);
      setResult(null);
    } catch {
      if (token === generation.current)
        setError(
          "Không mở được camera. Cho phép truy cập camera hoặc chọn ảnh từ thư viện.",
        );
    }
  }
  function process(source: CanvasImageSource, width: number, height: number) {
    if (Math.min(width, height) < 350)
      throw new Error("Ảnh quá nhỏ. Chọn ảnh rõ hơn, đủ lòng bàn tay.");
    const ratio = Math.min(1, 1200 / Math.max(width, height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Không xử lý được ảnh.");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/jpeg", 0.85);
    if (data.length > 1150000) data = canvas.toDataURL("image/jpeg", 0.6);
    if (data.length > 1150000)
      throw new Error("Ảnh còn quá lớn. Hãy chọn ảnh khác.");
    setPhoto(data);
    setSize({ w: canvas.width, h: canvas.height });
    setResult(null);
    setConsent(false);
    setError("");
    stop();
  }
  async function load(file?: File) {
    if (!file) return;
    setError("");
    const token = ++generation.current;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("Chọn ảnh JPG, PNG hoặc WebP dưới 8 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      try {
        if (token === generation.current)
          process(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch (e) {
      if (token === generation.current)
        setError((e as Error).message || "Không đọc được ảnh.");
    }
  }
  async function read() {
    if (!photo || !consent) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const text = await callAiText({
        serviceId: "palm",
        signal: controller.signal,
        temperature: 0.2,
        parts: [
          { text: managedPrompt("palm.read.v1", [side, dominant, question]) },
          {
            inline_data: { mime_type: "image/jpeg", data: photo.split(",")[1] },
          },
        ],
      });
      if (controller.signal.aborted) return;
      setResult(parsePalmReading(text));
      setActive(0);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (abort.current === controller) setBusy(false);
    }
  }
  function reset() {
    abort.current?.abort();
    generation.current++;
    stop();
    setPhoto("");
    setResult(null);
    setError("");
    setConsent(false);
    setBusy(false);
  }
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <div>
          <h1>Chỉ tay</h1>
        </div>
        <span className={s.pill}>Thử nghiệm</span>
      </header>
      <div className={`${s.grid} ${!photo ? s.captureOnly : ""}`}>
        <section>
          <div
            className={`${s.art} ${!photo && !camera ? s.emptyArt : ""}`}
            style={
              photo
                ? { aspectRatio: `${size.w}/${size.h}`, maxHeight: "none" }
                : {}
            }
          >
            {camera ? (
              <video
                ref={video}
                muted
                playsInline
                aria-label="Camera chụp bàn tay"
              />
            ) : photo ? (
              <img src={photo} alt="Ảnh lòng bàn tay bạn đã chọn" />
            ) : (
              <HandArt />
            )}
            {busy && <div className={s.scan} />}{" "}
            {photo && !camera && overlay && result?.quality === "ok" && (
              <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
                aria-label="Đường gợi ý trên ảnh"
              >
                {result.lines.map((line, i) => (
                  <polyline
                    key={i}
                    points={line.points
                      .map(([x, y]) => `${x * 1000},${y * 1000}`)
                      .join(" ")}
                    fill="none"
                    stroke={i === active ? "#f3cf79" : "#e0e8d4"}
                    strokeWidth={i === active ? 7 : 4}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onClick={() => setActive(i)}
                    style={{
                      cursor: "pointer",
                      opacity: i === active ? 1 : 0.6,
                    }}
                  />
                ))}
              </svg>
            )}
          </div>
          <div className={s.actions}>
            {camera ? (
              <>
                <button
                  className={s.button}
                  onClick={() => {
                    const v = video.current;
                    if (v)
                      try {
                        process(v, v.videoWidth, v.videoHeight);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                  }}
                >
                  Chụp ảnh
                </button>
                <button
                  className={s.secondary}
                  onClick={() => {
                    generation.current++;
                    stop();
                  }}
                >
                  Tắt camera
                </button>
              </>
            ) : (
              <>
                <button
                  className={s.button}
                  disabled={busy}
                  onClick={() => void start()}
                >
                  Chụp bàn tay
                </button>
                <button
                  className={s.secondary}
                  disabled={busy}
                  onClick={() => upload.current?.click()}
                >
                  Chọn ảnh
                </button>
              </>
            )}
            <input
              ref={upload}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                void load(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {photo && (
            <button
              className={s.secondary}
              style={{ marginTop: 14 }}
              onClick={reset}
            >
              Xóa ảnh & bắt đầu lại
            </button>
          )}
        </section>
        <section className={s.stack}>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          {result?.quality === "retake" ? (
            <div className={s.card}>
              <h2>Chụp lại một chút nhé</h2>
              <p>{result.message}</p>
            </div>
          ) : result ? (
            <div className={`${s.card} ${s.reveal}`}>
              <h2>Những gì ảnh đang kể</h2>
              <p className={s.reading}>{result.summary}</p>
              {result.lines.length > 0 && (
                <>
                  <hr className={s.divider} />
                  <label className={s.check}>
                    <input
                      type="checkbox"
                      checked={overlay}
                      onChange={(e) => setOverlay(e.target.checked)}
                    />
                    Hiện đường gợi ý trên ảnh
                  </label>
                  <div className={s.tabs} style={{ marginTop: 20 }}>
                    {result.lines.map((l, i) => (
                      <button
                        key={i}
                        aria-pressed={active === i}
                        onClick={() => setActive(i)}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                  {result.lines[active] && (
                    <div aria-live="polite">
                      <h3>{result.lines[active].name}</h3>
                      <p className={s.muted}>Quan sát trên ảnh</p>
                      <p>{result.lines[active].observation}</p>
                      <p className={s.muted} style={{ marginTop: 18 }}>
                        Góc nhìn truyền thống
                      </p>
                      <p>{result.lines[active].reading}</p>
                    </div>
                  )}
                </>
              )}
              <div className={s.actions}>
                <Link className={s.secondary} href="/chuyengia">
                  Trao đổi với chuyên gia ↗
                </Link>
              </div>
              <p className={s.muted} style={{ marginTop: 16 }}>
                Đường đánh dấu do AI gợi ý, có thể lệch so với nếp tay thật.
              </p>
            </div>
          ) : photo ? (
            <form
              className={`${s.card} ${s.stack}`}
              onSubmit={(e) => {
                e.preventDefault();
                void read();
              }}
            >
              <label className={s.field}>
                Bàn tay trong ảnh
                <select
                  value={side}
                  disabled={busy}
                  onChange={(e) => setSide(e.target.value)}
                >
                  <option>Tay trái</option>
                  <option>Tay phải</option>
                </select>
              </label>
              <label className={s.field}>
                Tay thuận
                <select
                  value={dominant}
                  disabled={busy}
                  onChange={(e) => setDominant(e.target.value)}
                >
                  <option>Tay phải</option>
                  <option>Tay trái</option>
                  <option>Cả hai tay</option>
                </select>
              </label>
              <label className={s.field}>
                Điều bạn quan tâm <span className={s.muted}>Tùy chọn</span>
                <textarea
                  maxLength={600}
                  disabled={busy}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Một câu hỏi dành cho mình…"
                />
              </label>
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={busy || !photo}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                Tôi đồng ý gửi ảnh này tới dịch vụ AI để phân tích. Ảnh không
                được lưu vào hồ sơ AstroX.
              </label>
              <button
                className={s.button}
                disabled={!photo || !consent || busy || camera || price.pending}
              >
                {busy ? "Đang quan sát ảnh…" : `Khám phá chỉ tay${price.paid ? ` · ${price.text}` : ''} ↗`}
              </button>
              {busy && (
                <button
                  type="button"
                  className={s.secondary}
                  onClick={() => {
                    abort.current?.abort();
                    setBusy(false);
                  }}
                >
                  Dừng phân tích
                </button>
              )}
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
