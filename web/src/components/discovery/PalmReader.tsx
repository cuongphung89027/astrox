"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { callAiText } from "@/lib/api";
import { managedPrompt } from "@/lib/managed-prompts";
import { usePaidPrice } from "@/lib/use-paid-price";
import { isWellLit } from "@/lib/palm-camera";
import type { HandPoint } from "@/lib/hand-tracker";
import { PaidPriceBadge } from "@/components/kit/PaidPriceBadge";
import { parsePalmReading, type PalmReading } from "@/lib/palm";
import { PalmCamera, type PalmCapture } from "@/components/discovery/PalmCamera";
import { PalmGuide, PALM_HAND_PATH } from "@/components/discovery/PalmGuide";
import s from "./Discovery.module.css";

const GUIDE_SEEN_KEY = "palmGuideSeen";

/** Hướng dẫn chụp chỉ hiện một lần mỗi phiên — không làm phiền lần chụp sau. */
function guideSeen(): boolean {
  try {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(GUIDE_SEEN_KEY) !== null;
  } catch {
    return false; // chế độ riêng tư — coi như chưa xem
  }
}

function markGuideSeen(): void {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(GUIDE_SEEN_KEY, "1");
  } catch {
    /* không ghi được thì lần sau vẫn hiện hướng dẫn */
  }
}

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
      <path d={PALM_HAND_PATH} strokeLinecap="round" strokeLinejoin="round" />
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
  const [tips, setTips] = useState<HandPoint[] | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const price = usePaidPrice("palm", managedPrompt("palm.read.v1", [side, dominant, question]));
  const abort = useRef<AbortController | null>(null),
    generation = useRef(0),
    upload = useRef<HTMLInputElement>(null),
    guidePrimary = useRef<HTMLButtonElement>(null),
    guideReturn = useRef<HTMLElement | null>(null);
  useEffect(
    () => () => {
      generation.current++;
      abort.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!guideOpen) return;
    // preventScroll: card cuộn xuống để lộ nút là mất phần hình minh hoạ trên đầu.
    guidePrimary.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuideOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Mọi đường đóng popup (Escape, nút, bấm nền) đều trả focus về nơi đã mở.
      guideReturn.current?.focus();
      guideReturn.current = null;
    };
  }, [guideOpen]);
  function start() {
    generation.current++;
    setError("");
    setCamera(true);
  }
  /** Lần đầu trong phiên: mở popup hướng dẫn trước khi xin quyền camera. */
  function beginCapture() {
    if (guideSeen()) {
      start();
      return;
    }
    guideReturn.current = document.activeElement as HTMLElement | null;
    setGuideOpen(true);
  }
  function process(source: CanvasImageSource, width: number, height: number) {
    if (Math.min(width, height) < 350)
      throw new Error("Ảnh quá nhỏ. Chọn ảnh rõ hơn, đủ lòng bàn tay.");
    const tooDarkOrBright = !isWellLit(source, width, height);
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
    applyPhoto(data, canvas.width, canvas.height, null);
    // Đúng spec §3.4: sáng tối chỉ cảnh báo, không chặn người dùng.
    if (tooDarkOrBright)
      setError(
        "Ảnh hơi tối hoặc hơi chói — kết quả có thể kém chính xác. Nên chụp lại ở nơi sáng.",
      );
  }
  function applyPhoto(
    data: string,
    w: number,
    h: number,
    next: HandPoint[] | null,
  ) {
    setPhoto(data);
    setSize({ w, h });
    setTips(next);
    setResult(null);
    setConsent(false);
    setError("");
    setCamera(false);
  }
  /**
   * I1 (review Task 6): flash cảnh báo tối/chói trong PalmCamera chết cùng nhịp
   * unmount nên người dùng không thấy — đo lại trên chính ảnh vừa chụp. Chỉ cảnh
   * báo (spec §3.4), không chặn: ảnh vẫn được áp ngay, lời nhắc tới sau khi decode.
   */
  function lightWarning(dataUrl: string, w: number, h: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve(
          isWellLit(img, w, h)
            ? ""
            : "Ảnh hơi tối hoặc hơi chói — kết quả có thể kém chính xác. Nên chụp lại ở nơi sáng.",
        );
      img.onerror = () => resolve("");
      img.src = dataUrl;
    });
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
    setCamera(false);
    setTips(null);
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
          {camera ? (
            <PalmCamera
              onCapture={(shot: PalmCapture) => {
                try {
                  if (Math.min(shot.w, shot.h) < 350) {
                    // PalmCamera đã nhả stream trong capture() trước khi báo về, nên giữ
                    // nó mounted sẽ thành khung hình chết — đóng camera rồi báo lỗi.
                    setCamera(false);
                    throw new Error("Ảnh quá nhỏ. Đưa tay sát hơn rồi chụp lại.");
                  }
                  const token = generation.current;
                  // Đo sáng khởi động trước nhưng không chặn: ảnh vẫn được áp ngay.
                  const light = lightWarning(shot.dataUrl, shot.w, shot.h);
                  applyPhoto(shot.dataUrl, shot.w, shot.h, shot.fingertips);
                  void light.then((warn) => {
                    // reset()/unmount đã tăng generation → cảnh báo lượt chụp cũ bị bỏ.
                    if (warn && token === generation.current) setError(warn);
                  });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
              onClose={() => {
                generation.current++;
                setCamera(false);
              }}
              onFatal={(message) => {
                setError(message);
                setCamera(false);
              }}
            />
          ) : (
            <>
              <div
                className={`${s.art} ${!photo ? s.emptyArt : ""}`}
                style={
                  photo
                    ? { aspectRatio: `${size.w}/${size.h}`, maxHeight: "none" }
                    : {}
                }
              >
                {photo ? (
                  <img src={photo} alt="Ảnh lòng bàn tay bạn đã chọn" />
                ) : (
                  <HandArt />
                )}
                {busy && <div className={s.scan} />}{" "}
                {photo && overlay && result?.quality === "ok" && (
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
                        pathLength={100}
                        className={s.revealLine}
                        onClick={() => setActive(i)}
                        style={{
                          cursor: "pointer",
                          animationDelay: `${i * 0.55}s`,
                          opacity: i === active ? 1 : 0.6,
                        }}
                      />
                    ))}
                    {result.lines.map((line, i) => (
                      <g key={`d${i}`}>
                        {[
                          line.points[0],
                          line.points[line.points.length - 1],
                        ].map(([x, y], j) => (
                          <circle
                            key={j}
                            cx={x * 1000}
                            cy={y * 1000}
                            r={9}
                            fill={i === active ? "#f3cf79" : "#e0e8d4"}
                            className={s.revealDot}
                            style={{ animationDelay: `${i * 0.55 + 0.7}s` }}
                          />
                        ))}
                      </g>
                    ))}
                    {tips &&
                      tips.length > 0 &&
                      tips.map((p, i) => (
                        <circle
                          key={`t${i}`}
                          cx={p.x * 1000}
                          cy={p.y * 1000}
                          r={7}
                          fill="#f3cf79"
                          opacity={0.85}
                          className={s.revealDot}
                          style={{
                            animationDelay: `${result.lines.length * 0.55 + 0.3}s`,
                          }}
                        />
                      ))}
                  </svg>
                )}
              </div>
              <div className={s.actions}>
                <button
                  className={s.button}
                  disabled={busy}
                  onClick={() => void beginCapture()}
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
              </div>
            </>
          )}
          {!photo && !camera && <PalmGuide />}
          {/* Input file nằm ngoài nhánh camera: đổi trạng thái camera không làm mất ref ảnh. */}
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
                {busy ? "Đang quan sát ảnh…" : <>Khám phá chỉ tay<PaidPriceBadge price={price} /><span aria-hidden="true">↗</span></>}
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
              {busy && (
                <p className={s.waitNote} aria-live="polite">
                  Sẽ đọc: đường Tâm · đường Đầu · đường Sống · đường Tài Lộc —
                  đường nào thấy rõ mới hiện.
                </p>
              )}
            </form>
          ) : null}
        </section>
      </div>
      {guideOpen && (
        <div
          className={s.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Hướng dẫn chụp bàn tay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGuideOpen(false);
          }}
        >
          <div className={s.modalCard}>
            <PalmGuide />
            <div className={s.modalActions}>
              <button
                ref={guidePrimary}
                className={s.button}
                onClick={() => {
                  markGuideSeen();
                  setGuideOpen(false);
                  start();
                }}
              >
                Chụp ngay
              </button>
              <button className={s.secondary} onClick={() => setGuideOpen(false)}>
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
