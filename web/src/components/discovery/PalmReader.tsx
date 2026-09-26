"use client";
import { useEffect, useRef, useState } from "react";
import { Btn, GlassCard } from "@/components/kit";
import { PaidPriceBadge } from "@/components/kit/PaidPriceBadge";
import { callAiText } from "@/lib/api";
import { managedPrompt } from "@/lib/managed-prompts";
import { normalizePalmPhoto } from "@/lib/palm-photo";
import { usePaidPrice } from "@/lib/use-paid-price";
import { isWellLit } from "@/lib/palm-camera";
import { parsePalmReading, type PalmReading } from "@/lib/palm";
import { PalmCamera, type PalmCapture } from "./PalmCamera";
import { PalmGuide, PalmIllustration } from "./PalmGuide";
import s from "./Palm.module.css";

export function PalmReader() {
  const [photo, setPhoto] = useState("");
  const [camera, setCamera] = useState(false), [zoom, setZoom] = useState(false);
  const [side, setSide] = useState("Tay trái"), [dominant, setDominant] = useState("Tay phải");
  const [question, setQuestion] = useState(""), [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false), [loadingPhoto, setLoadingPhoto] = useState(false);
  const [error, setError] = useState(""), [warning, setWarning] = useState("");
  const [result, setResult] = useState<PalmReading | null>(null), [active, setActive] = useState(0);
  const upload = useRef<HTMLInputElement>(null), nativeCamera = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null), photoAbort = useRef<AbortController | null>(null), generation = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null), zoomTrigger = useRef<HTMLButtonElement>(null), zoomWasOpen = useRef(false);
  const price = usePaidPrice("palm", managedPrompt("palm.read.v1", [side, dominant, question]));
  useEffect(() => () => { generation.current++; abort.current?.abort(); photoAbort.current?.abort(); }, []);
  useEffect(() => {
    if (zoom) { zoomWasOpen.current = true; dialog.current?.showModal(); return; }
    if (!zoomWasOpen.current) return;
    // WebKit không luôn trả tiêu điểm về nút mở dialog sau khi đóng.
    zoomWasOpen.current = false; dialog.current?.close(); zoomTrigger.current?.focus();
  }, [zoom]);
  function reset() {
    generation.current++; abort.current?.abort(); photoAbort.current?.abort(); setBusy(false); setLoadingPhoto(false);
    setPhoto(""); setResult(null); setConsent(false); setCamera(false); setZoom(false); setError(""); setWarning("");
  }
  function beginCapture() { reset(); setCamera(true); }
  function applyPhoto(data: string, w: number, h: number) {
    if (Math.min(w, h) < 350) throw new Error("Ảnh quá nhỏ. Chọn ảnh rõ hơn, đủ lòng bàn tay.");
    setPhoto(data); setResult(null); setConsent(false); setCamera(false); setError(""); setWarning(""); setActive(0);
    const token = generation.current;
    const img = new Image();
    img.onload = () => {
      if (token === generation.current && !isWellLit(img, w, h)) setWarning("Ảnh hơi tối hoặc chói. Bạn có thể chụp lại ở nơi sáng dịu để thấy rõ nếp tay hơn.");
    };
    img.src = data;
  }
  async function load(file?: File) {
    if (!file) return;
    abort.current?.abort(); setBusy(false); setError("");
    const token = ++generation.current;
    photoAbort.current?.abort();
    const controller = new AbortController();
    photoAbort.current = controller;
    // Bật cờ trước cả file sai: finally của lần chọn này phải luôn dọn được
    // trạng thái "đang chuẩn bị" kể cả khi lần decode trước bị thay thế.
    setLoadingPhoto(true);
    try {
      const shot = await normalizePalmPhoto(file, { signal: controller.signal });
      if (controller.signal.aborted || token !== generation.current) return;
      applyPhoto(shot.dataUrl, shot.width, shot.height);
    } catch (e) {
      // Hủy để chọn ảnh mới không phải lỗi cần báo cho người dùng.
      if (token === generation.current && (e as Error)?.name !== "AbortError") {
        setError((e as Error).message || "Không đọc được ảnh.");
      }
    } finally {
      if (token === generation.current) setLoadingPhoto(false);
    }
  }
  async function read() {
    if (!photo || !consent || busy) return;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    const token = generation.current; setBusy(true); setError(""); setResult(null);
    try {
      const text = await callAiText({ serviceId: "palm", signal: controller.signal, temperature: .2, parts: [
        { text: managedPrompt("palm.read.v1", [side, dominant, question]) },
        { inline_data: { mime_type: "image/jpeg", data: photo.split(",")[1] } },
      ] });
      if (!controller.signal.aborted && token === generation.current) { setResult(parsePalmReading(text)); setActive(0); }
    } catch (e) { if (!controller.signal.aborted && token === generation.current) setError((e as Error).message || "Chưa phân tích được ảnh. Hãy thử lại."); }
    finally { if (abort.current === controller) setBusy(false); }
  }
  const entry = !photo && !camera;
  const line = result?.lines[active];
  return <section className={`${s.page} ${entry ? s.entryPage : ""}`}>
    <header className={s.heading}><h1>Chỉ tay</h1></header>
    {error && <p className={s.error} role="alert">{error}</p>}
    {loadingPhoto && <p className={s.notice} role="status">Đang chuẩn bị ảnh…</p>}
    {entry && <GlassCard className={s.intro}>
      <div className={s.introArt}><PalmIllustration /></div>
      <div className={s.actions}><Btn disabled={loadingPhoto} onClick={beginCapture} arrow>Chụp bàn tay</Btn><Btn variant="ghost" disabled={loadingPhoto} onClick={() => upload.current?.click()}>Chọn ảnh</Btn></div>
      <details className={s.guideDetails}><summary>Hướng dẫn chụp</summary><PalmGuide /></details>
    </GlassCard>}
    {camera && <div className={s.captureLayout}><PalmCamera onCapture={(shot: PalmCapture) => { try { applyPhoto(shot.dataUrl, shot.w, shot.h); } catch (e) { setCamera(false); setError((e as Error).message); } }} onClose={() => { generation.current++; setCamera(false); }} onFatal={message => { setError(message); setCamera(false); }} /><aside className={s.captureAside}><details className={s.guideDetails}><summary>Hướng dẫn chụp</summary><PalmGuide /></details><button className={s.textButton} onClick={() => { setCamera(false); nativeCamera.current?.click(); }}>Dùng camera của điện thoại</button></aside></div>}
    {photo && <div className={s.resultLayout}>
      <GlassCard className={s.photoCard}>
        <div className={s.photoTop}><span>{side}</span><button ref={zoomTrigger} className={s.textButton} onClick={() => setZoom(true)}>Phóng to ↗</button></div>
        <button className={s.photoButton} onClick={() => setZoom(true)} aria-label="Phóng to ảnh bàn tay"><img className={s.photo} src={photo} alt="Ảnh lòng bàn tay bạn đã chọn" /></button>
        <div className={s.photoActions}><button className={s.textButton} disabled={busy || loadingPhoto} onClick={beginCapture}>Chụp lại</button><button className={s.textButton} disabled={busy || loadingPhoto} onClick={() => upload.current?.click()}>Thay ảnh</button><button className={s.textButton} onClick={reset}>Xóa ảnh</button></div>
        {warning && <p className={s.notice}>{warning}</p>}
      </GlassCard>
      <div className={s.readingColumn}>
        {result?.quality === "retake" ? <GlassCard className={s.panel}><p>{result.message}</p><Btn onClick={beginCapture}>Chụp lại</Btn></GlassCard> : result ? <>
          <GlassCard className={s.panel}>
            <p className={s.summary}>{result.summary}</p>
            {result.lines.length > 0 && <>
              <div className={s.lineTabs} role="group" aria-label="Chọn đường chỉ tay">{result.lines.map((l, i) => <button key={`${l.name}-${i}`} aria-pressed={active === i} onClick={() => setActive(i)}>{l.name}</button>)}</div>
              {line && <div className={s.lineReading} aria-live="polite"><p>{line.reading}</p><details key={active} className={s.observation}><summary>Quan sát từ ảnh</summary><p>{line.observation}</p></details></div>}
            </>}
          </GlassCard>
          <p className={s.privacy}>Ảnh chưa xác minh đường tay; luận giải chỉ để chiêm nghiệm.</p>
          <Btn variant="ghost" href="/chuyengia" arrow>Trao đổi với chuyên gia</Btn>
        </> : <GlassCard className={s.panel}>
          <form className={s.form} onSubmit={e => { e.preventDefault(); void read(); }}>
            <div className={s.fields}><label>Bàn tay trong ảnh<select value={side} disabled={busy} onChange={e => setSide(e.target.value)}><option>Tay trái</option><option>Tay phải</option></select></label><label>Tay thuận<select value={dominant} disabled={busy} onChange={e => setDominant(e.target.value)}><option>Tay phải</option><option>Tay trái</option><option>Cả hai tay</option></select></label></div>
            <details className={s.question}><summary>Thêm câu hỏi</summary><label>Câu hỏi<textarea maxLength={600} disabled={busy} value={question} onChange={e => setQuestion(e.target.value)} /></label></details>
            <label className={s.check}><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />Tôi đồng ý gửi ảnh tới dịch vụ AI để phân tích. Ảnh không được lưu vào hồ sơ AstroX.</label>
            <Btn type="submit" disabled={!consent || busy || loadingPhoto || price.pending} arrow>{busy ? "Đang quan sát ảnh…" : <>Khám phá chỉ tay <PaidPriceBadge price={price} /></>}</Btn>
            {busy && <div className={s.pending} role="status"><button className={s.textButton} type="button" onClick={() => { abort.current?.abort(); setBusy(false); }}>Dừng phân tích</button></div>}
          </form>
        </GlassCard>}
      </div>
    </div>}
    <input ref={upload} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e => { void load(e.target.files?.[0]); e.target.value = ""; }} />
    <input ref={nativeCamera} type="file" hidden accept="image/*" capture="environment" onChange={e => { void load(e.target.files?.[0]); e.target.value = ""; }} />
    <dialog ref={dialog} className={s.zoomDialog} aria-label="Ảnh bàn tay phóng to" onCancel={() => setZoom(false)} onClose={() => setZoom(false)} onClick={e => { if (e.target === e.currentTarget) setZoom(false); }}>
      <div className={s.zoomHeader}><span>Ảnh gốc · Cuộn để xem chi tiết</span><button autoFocus className={s.toolButton} onClick={() => setZoom(false)}>Đóng</button></div>
      <div className={s.zoomScroll}>{photo && <img src={photo} alt="Ảnh bàn tay phóng to" />}</div>
    </dialog>
  </section>;
}
