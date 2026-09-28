'use client';
import { useEffect, useRef, useState } from 'react';
import { Btn, GlassCard } from '@/components/kit';
import { PaidPriceBadge } from '@/components/kit/PaidPriceBadge';
import { callAiText } from '@/lib/api';
import { managedPrompt } from '@/lib/managed-prompts';
import { normalizePalmPhoto } from '@/lib/palm-photo';
import { usePaidPrice } from '@/lib/use-paid-price';
import { isWellLit } from '@/lib/palm-camera';
import { parsePalmReading, type PalmReading } from '@/lib/palm';
import { PalmCamera, type PalmCapture } from './PalmCamera';
import { PalmGuide, PalmIllustration } from './PalmGuide';
import s from './Palm.module.css';
import { useLocale } from '@/i18n/LocaleProvider';

export function PalmReader() {
  const t = useLocale();
  const en = t.locale === 'en';
  const text = (vi: string, us: string) => (en ? us : vi);
  const [photo, setPhoto] = useState('');
  const [camera, setCamera] = useState(false),
    [zoom, setZoom] = useState(false);
  const [side, setSide] = useState('Tay trái'),
    [dominant, setDominant] = useState('Tay phải');
  const [question, setQuestion] = useState(''),
    [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false),
    [loadingPhoto, setLoadingPhoto] = useState(false);
  const [error, setError] = useState(''),
    [warning, setWarning] = useState('');
  const [result, setResult] = useState<PalmReading | null>(null),
    [active, setActive] = useState(0);
  const upload = useRef<HTMLInputElement>(null),
    nativeCamera = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null),
    photoAbort = useRef<AbortController | null>(null),
    generation = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null),
    zoomTrigger = useRef<HTMLButtonElement>(null),
    zoomWasOpen = useRef(false);
  const price = usePaidPrice('palm', managedPrompt('palm.read.v1', [side, dominant, question]));
  useEffect(
    () => () => {
      generation.current++;
      abort.current?.abort();
      photoAbort.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (zoom) {
      zoomWasOpen.current = true;
      dialog.current?.showModal();
      return;
    }
    if (!zoomWasOpen.current) return;
    // WebKit không luôn trả tiêu điểm về nút mở dialog sau khi đóng.
    zoomWasOpen.current = false;
    dialog.current?.close();
    zoomTrigger.current?.focus();
  }, [zoom]);
  function reset() {
    generation.current++;
    abort.current?.abort();
    photoAbort.current?.abort();
    setBusy(false);
    setLoadingPhoto(false);
    setPhoto('');
    setResult(null);
    setConsent(false);
    setCamera(false);
    setZoom(false);
    setError('');
    setWarning('');
  }
  function beginCapture() {
    reset();
    setCamera(true);
  }
  function applyPhoto(data: string, w: number, h: number) {
    if (Math.min(w, h) < 350)
      throw new Error(
        en
          ? 'Photo too small. Choose a clearer one showing the full palm.'
          : 'Ảnh quá nhỏ. Chọn ảnh rõ hơn, đủ lòng bàn tay.',
      );
    setPhoto(data);
    setResult(null);
    setConsent(false);
    setCamera(false);
    setError('');
    setWarning('');
    setActive(0);
    const token = generation.current;
    const img = new Image();
    img.onload = () => {
      if (token === generation.current && !isWellLit(img, w, h))
        setWarning(
          text(
            'Ảnh hơi tối hoặc chói. Bạn có thể chụp lại ở nơi sáng dịu để thấy rõ nếp tay hơn.',
            'The photo is dark or overexposed. Try softer lighting to make your palm lines clearer.',
          ),
        );
    };
    img.src = data;
  }
  async function load(file?: File) {
    if (!file) return;
    abort.current?.abort();
    setBusy(false);
    setError('');
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
      if (token === generation.current && (e as Error)?.name !== 'AbortError') {
        setError(
          en
            ? 'Unable to read this photo. Try a clear JPEG, PNG or WebP image.'
            : (e as Error).message || 'Không đọc được ảnh.',
        );
      }
    } finally {
      if (token === generation.current) setLoadingPhoto(false);
    }
  }
  async function read() {
    if (!photo || !consent || busy) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const token = generation.current;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const text = await callAiText({
        serviceId: 'palm',
        signal: controller.signal,
        temperature: 0.2,
        parts: [
          { text: managedPrompt('palm.read.v1', [side, dominant, question]) },
          { inline_data: { mime_type: 'image/jpeg', data: photo.split(',')[1] } },
        ],
      });
      if (!controller.signal.aborted && token === generation.current) {
        setResult(parsePalmReading(text));
        setActive(0);
      }
    } catch (e) {
      if (!controller.signal.aborted && token === generation.current)
        setError(
          en
            ? 'Unable to analyze this photo. Please try again.'
            : (e as Error).message || 'Chưa phân tích được ảnh. Hãy thử lại.',
        );
    } finally {
      if (abort.current === controller) setBusy(false);
    }
  }
  const entry = !photo && !camera;
  const line = result?.lines[active];
  return (
    <section className={`${s.page} ${entry ? s.entryPage : ''}`}>
      <header className={s.heading}>
        <div>
          <span className={s.moduleLabel}>{text('ASTROX / KHÁM PHÁ', 'ASTROX / EXPLORE')}</span>
          <h1>{en ? 'Palm Reading' : 'Chỉ tay'}</h1>
        </div>
        <span className={s.privateBadge}>{en ? 'Processed on your device' : 'Xử lý camera trên thiết bị'}</span>
      </header>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {loadingPhoto && (
        <p className={s.notice} role="status">
          {text('Đang chuẩn bị ảnh…', 'Preparing your photo…')}
        </p>
      )}
      {entry && (
        <div className={s.entryWorkspace}>
          <div className={s.scannerCard}>
            <div className={s.scannerTop}>
              <span>
                <i /> {text('NHẬN DIỆN BÀN TAY', 'HAND DETECTION')}
              </span>
              <span>{text('CAMERA CHƯA BẬT', 'CAMERA OFF')}</span>
            </div>
            <div className={s.scannerPreview}>
              <div className={s.scanGrid} />
              <div className={s.previewGuide}>
                <PalmIllustration />
                <span className={s.scanBeam} />
              </div>
              <div className={s.viewfinder} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <span className={s.previewCaption}>
                {text('Đặt lòng bàn tay trong khung', 'Place your palm inside the frame')}
              </span>
            </div>
            <div className={s.scannerBottom}>
              <span className={s.cameraIcon} aria-hidden="true">
                ◎
              </span>
              <div>
                <strong>{text('Nhận diện theo thời gian thực', 'Real-time detection')}</strong>
                <span>{en ? 'Align hand · Hold still · Capture' : 'Căn tay · Giữ yên · Chụp ảnh'}</span>
              </div>
            </div>
            <div className={s.scannerActions}>
              <button className={s.startCamera} disabled={loadingPhoto} onClick={beginCapture}>
                {en ? 'Open camera' : 'Mở camera'} <span aria-hidden="true">↗</span>
              </button>
              <button className={s.uploadButton} disabled={loadingPhoto} onClick={() => upload.current?.click()}>
                {en ? 'Choose photo' : 'Chọn ảnh'}
              </button>
            </div>
          </div>
          <aside className={s.entryAside}>
            <span className={s.moduleLabel}>{text('TRƯỚC KHI CHỤP', 'BEFORE YOU CAPTURE')}</span>
            <h2>
              {text('Một ảnh rõ.', 'One clear photo.')}
              <br />
              {text('Từng nét riêng.', 'Every line is yours.')}
            </h2>
            <PalmGuide />
            <div className={s.localNote}>
              <span aria-hidden="true">◈</span>
              <p>
                {text(
                  'Camera nhận diện ngay trên thiết bị. Ảnh chỉ được gửi tới AI khi bạn đồng ý phân tích.',
                  'Hand detection runs on your device. Your photo is sent to AI only after you consent to analysis.',
                )}
              </p>
            </div>
          </aside>
        </div>
      )}
      {camera && (
        <div className={s.captureLayout}>
          <PalmCamera
            onCapture={(shot: PalmCapture) => {
              try {
                applyPhoto(shot.dataUrl, shot.w, shot.h);
              } catch (e) {
                setCamera(false);
                setError((e as Error).message);
              }
            }}
            onClose={() => {
              generation.current++;
              setCamera(false);
            }}
            onFatal={message => {
              setError(message);
              setCamera(false);
            }}
          />
          <aside className={s.captureAside}>
            <div className={s.sessionSteps}>
              <span className={s.currentStep}>{text('01 · Nhận diện', '01 · Detect')}</span>
              <span>{text('02 · Kiểm tra ảnh', '02 · Review photo')}</span>
              <span>{text('03 · Luận giải', '03 · Reading')}</span>
            </div>
            <details className={s.guideDetails}>
              <summary>{en ? 'Photo guide' : 'Hướng dẫn chụp'}</summary>
              <PalmGuide />
            </details>
            <button
              className={s.textButton}
              onClick={() => {
                setCamera(false);
                nativeCamera.current?.click();
              }}
            >
              {en ? 'Use your phone camera' : 'Dùng camera của điện thoại'}
            </button>
          </aside>
        </div>
      )}
      {photo && (
        <div className={s.resultLayout}>
          <GlassCard className={s.photoCard}>
            <div className={s.photoTop}>
              <span>{en ? (side === 'Tay trái' ? 'Left hand' : 'Right hand') : side}</span>
              <button ref={zoomTrigger} className={s.textButton} onClick={() => setZoom(true)}>
                {text('Phóng to ↗', 'Zoom ↗')}
              </button>
            </div>
            <button
              className={s.photoButton}
              onClick={() => setZoom(true)}
              aria-label={en ? 'Zoom palm photo' : 'Phóng to ảnh bàn tay'}
            >
              <img
                className={s.photo}
                src={photo}
                alt={en ? 'Your selected palm photo' : 'Ảnh lòng bàn tay bạn đã chọn'}
              />
            </button>
            <div className={s.photoActions}>
              <button className={s.textButton} disabled={busy || loadingPhoto} onClick={beginCapture}>
                {text('Chụp lại', 'Retake photo')}
              </button>
              <button className={s.textButton} disabled={busy || loadingPhoto} onClick={() => upload.current?.click()}>
                {text('Thay ảnh', 'Change photo')}
              </button>
              <button className={s.textButton} onClick={reset}>
                {text('Xóa ảnh', 'Remove photo')}
              </button>
            </div>
            {warning && <p className={s.notice}>{warning}</p>}
          </GlassCard>
          <div className={s.readingColumn}>
            {result?.quality === 'retake' ? (
              <GlassCard className={s.panel}>
                <p>{result.message}</p>
                <Btn onClick={beginCapture}>{text('Chụp lại', 'Retake photo')}</Btn>
              </GlassCard>
            ) : result ? (
              <>
                <GlassCard className={s.panel}>
                  <p className={s.summary}>{result.summary}</p>
                  {result.lines.length > 0 && (
                    <>
                      <div
                        className={s.lineTabs}
                        role="group"
                        aria-label={en ? 'Select palm lines' : 'Chọn đường chỉ tay'}
                      >
                        {result.lines.map((l, i) => (
                          <button key={`${l.name}-${i}`} aria-pressed={active === i} onClick={() => setActive(i)}>
                            {l.name}
                          </button>
                        ))}
                      </div>
                      {line && (
                        <div className={s.lineReading} aria-live="polite">
                          <p>{line.reading}</p>
                          <details key={active} className={s.observation}>
                            <summary>{text('Quan sát từ ảnh', 'Photo observations')}</summary>
                            <p>{line.observation}</p>
                          </details>
                        </div>
                      )}
                    </>
                  )}
                </GlassCard>
                <p className={s.privacy}>
                  {text(
                    'Ảnh chưa xác minh đường tay; luận giải chỉ để chiêm nghiệm.',
                    'Palm lines are not independently verified. This reading is for reflection.',
                  )}
                </p>
                {!en && (
                  <Btn variant="ghost" href="/chuyengia" arrow>
                    Trao đổi với chuyên gia
                  </Btn>
                )}
              </>
            ) : (
              <GlassCard className={s.panel}>
                <form
                  className={s.form}
                  onSubmit={e => {
                    e.preventDefault();
                    void read();
                  }}
                >
                  <div className={s.fields}>
                    <label>
                      {en ? 'Hand in photo' : 'Bàn tay trong ảnh'}
                      <select value={side} disabled={busy} onChange={e => setSide(e.target.value)}>
                        <option value="Tay trái">{text('Tay trái', 'Left hand')}</option>
                        <option value="Tay phải">{text('Tay phải', 'Right hand')}</option>
                      </select>
                    </label>
                    <label>
                      {en ? 'Dominant hand' : 'Tay thuận'}
                      <select value={dominant} disabled={busy} onChange={e => setDominant(e.target.value)}>
                        <option value="Tay phải">{text('Tay phải', 'Right hand')}</option>
                        <option value="Tay trái">{text('Tay trái', 'Left hand')}</option>
                        <option value="Cả hai tay">{text('Cả hai tay', 'Both hands')}</option>
                      </select>
                    </label>
                  </div>
                  <details className={s.question}>
                    <summary>{text('Thêm câu hỏi', 'Add a question')}</summary>
                    <label>
                      {text('Câu hỏi', 'Question')}
                      <textarea
                        maxLength={600}
                        disabled={busy}
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                      />
                    </label>
                  </details>
                  <label className={s.check}>
                    <input
                      type="checkbox"
                      checked={consent}
                      disabled={busy}
                      onChange={e => setConsent(e.target.checked)}
                    />
                    {text(
                      'Tôi đồng ý gửi ảnh tới dịch vụ AI để phân tích. Ảnh không được lưu vào hồ sơ AstroX.',
                      'I agree to send this photo to the AI service for analysis. The photo will not be saved to my AstroX profile.',
                    )}
                  </label>
                  <Btn type="submit" disabled={!consent || busy || loadingPhoto || price.pending} arrow>
                    {busy ? (
                      text('Đang quan sát ảnh…', 'Analyzing your photo…')
                    ) : (
                      <>
                        {text('Khám phá chỉ tay', 'Explore your palm')} <PaidPriceBadge price={price} />
                      </>
                    )}
                  </Btn>
                  {busy && (
                    <div className={s.pending} role="status">
                      <button
                        className={s.textButton}
                        type="button"
                        onClick={() => {
                          abort.current?.abort();
                          setBusy(false);
                        }}
                      >
                        {text('Dừng phân tích', 'Stop analysis')}
                      </button>
                    </div>
                  )}
                </form>
              </GlassCard>
            )}
          </div>
        </div>
      )}
      <input
        ref={upload}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        onChange={e => {
          void load(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={nativeCamera}
        type="file"
        hidden
        accept="image/*"
        capture="environment"
        onChange={e => {
          void load(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <dialog
        ref={dialog}
        className={s.zoomDialog}
        aria-label={text('Ảnh bàn tay phóng to', 'Enlarged palm photo')}
        onCancel={() => setZoom(false)}
        onClose={() => setZoom(false)}
        onClick={e => {
          if (e.target === e.currentTarget) setZoom(false);
        }}
      >
        <div className={s.zoomHeader}>
          <span>{text('Ảnh gốc · Cuộn để xem chi tiết', 'Original photo · Scroll to explore')}</span>
          <button autoFocus className={s.toolButton} onClick={() => setZoom(false)}>
            {text('Đóng', 'Close')}
          </button>
        </div>
        <div className={s.zoomScroll}>
          {photo && <img src={photo} alt={text('Ảnh bàn tay phóng to', 'Enlarged palm photo')} />}
        </div>
      </dialog>
    </section>
  );
}
