'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Btn, GlassCard } from '@/components/kit';
import { PaidPriceBadge } from '@/components/kit/PaidPriceBadge';
import { callAiText } from '@/lib/api';
import { managedPrompt } from '@/lib/managed-prompts';
import { normalizePalmPhoto } from '@/lib/palm-photo';
import { usePaidPrice } from '@/lib/use-paid-price';
import { inspectPalmPhoto, type PalmQuality } from '@/lib/palm-quality';
import { PalmQualityPanel } from './PalmQualityPanel';
import { PalmReadingCards } from './PalmReadingCards';
import { readPalmHistory, savePalmHistory, deletePalmHistory, type PalmHistoryEntry } from '@/lib/palm-history';
import { accountStorageKey, getAccountEpoch, subscribe } from '@/lib/state';
import { AiText } from '@/components/kit/AiText';
import { parsePalmReading, type PalmReading } from '@/lib/palm';
import { PalmCamera, type PalmCapture } from './PalmCamera';
import { PalmGuide, PalmIllustration } from './PalmGuide';
import s from './Palm.module.css';
import { useLocale } from '@/i18n/LocaleProvider';

export function PalmReader() {
  const locale = useLocale().locale;
  const epoch = useSyncExternalStore(subscribe, getAccountEpoch, () => 0);
  return <PalmReaderSession key={`${epoch}:${locale}`} />;
}

export function PalmReaderSession() {
  const t = useLocale();
  const en = t.locale === 'en';
  const text = (vi: string, us: string) => (en ? us : vi);
  const epoch = getAccountEpoch();
  const owner = `${epoch}:${t.locale}`;
  const [sessionOwner] = useState(owner);
  const [quality, setQuality] = useState<PalmQuality | null>(null);
  const [snapshot, setSnapshot] = useState<PalmHistoryEntry | null>(null);
  const [otherHand, setOtherHand] = useState<PalmHistoryEntry | null>(null);
  const [history, setHistory] = useState<PalmHistoryEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [followQuestion, setFollowQuestion] = useState('');
  const [followAnswer, setFollowAnswer] = useState('');
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState('');
  const followAbort = useRef<AbortController | null>(null);
  const historyKey = accountStorageKey('astrox_palm_history_v1');
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
  const questionTooLong = question.length > 80000;
  const followTooLong = followQuestion.length > 50000;
  const price = usePaidPrice('palm', managedPrompt('palm.read.v1', [side, dominant, questionTooLong ? '' : question]));
  const followPrompt = managedPrompt('palm.followup.v1', [
    JSON.stringify(snapshot ? { side: snapshot.side, dominant: snapshot.dominant, reading: snapshot.reading } : {}),
    followTooLong ? '' : followQuestion,
  ]);
  const followPrice = usePaidPrice(snapshot ? 'palm' : '', followPrompt);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (alive && typeof localStorage !== 'undefined') setHistory(readPalmHistory(localStorage, historyKey, t.locale));
    };
    // Local storage is an external system; defer its initial snapshot until after hydration.
    queueMicrotask(refresh);
    window.addEventListener('storage', refresh);
    return () => {
      alive = false;
      window.removeEventListener('storage', refresh);
    };
  }, [historyKey, t.locale]);
  useEffect(
    () => () => {
      generation.current++;
      abort.current?.abort();
      followAbort.current?.abort();
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
  function reset(clearComparison = true) {
    generation.current++;
    abort.current?.abort();
    photoAbort.current?.abort();
    followAbort.current?.abort();
    setFollowBusy(false);
    setFollowQuestion('');
    setFollowAnswer('');
    setFollowError('');
    setSnapshot(null);
    setSaved(false);
    setQuality(null);
    if (clearComparison) setOtherHand(null);
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
    reset(false);
    setCamera(true);
  }
  async function applyPhoto(data: string, w: number, h: number, inspection?: AbortController) {
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
    const controller = inspection ?? new AbortController();
    if (photoAbort.current !== controller) photoAbort.current?.abort();
    photoAbort.current = controller;
    // The normalizer's controller is still valid when passed from upload.
    if (inspection?.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    setLoadingPhoto(true);
    setQuality(null);
    setSnapshot(null);
    setSaved(false);
    followAbort.current?.abort();
    setFollowAnswer('');
    setFollowQuestion('');
    setFollowBusy(false);
    try {
      const checked = await inspectPalmPhoto(data, controller.signal);
      if (!controller.signal.aborted && token === generation.current) setQuality(checked);
    } catch {
      if (!controller.signal.aborted && token === generation.current)
        setWarning(
          text(
            'Chưa kiểm tra được ảnh trên thiết bị. Hãy xem kỹ độ rõ và lòng bàn tay trước khi gửi.',
            'Unable to check the photo on this device. Review the palm and sharpness before sending.',
          ),
        );
    } finally {
      if (token === generation.current) setLoadingPhoto(false);
    }
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
      await applyPhoto(shot.dataUrl, shot.width, shot.height, controller);
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
    if (
      !photo ||
      !consent ||
      busy ||
      loadingPhoto ||
      questionTooLong ||
      quality?.state === 'retake' ||
      sessionOwner !== owner
    )
      return;
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
        locale: t.locale,
        signal: controller.signal,
        temperature: 0.2,
        parts: [
          { text: managedPrompt('palm.read.v1', [side, dominant, question]) },
          { inline_data: { mime_type: 'image/jpeg', data: photo.split(',')[1] } },
        ],
      });
      if (!controller.signal.aborted && token === generation.current) {
        const reading = parsePalmReading(text);
        setResult(reading);
        setSnapshot(
          reading.quality === 'ok'
            ? { id: crypto.randomUUID(), savedAt: Date.now(), locale: t.locale, side, dominant, question, reading }
            : null,
        );
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
  function addOtherHand() {
    if (!snapshot) return;
    setOtherHand(snapshot);
    reset(false);
    setSide(snapshot.side === 'Tay trái' ? 'Tay phải' : 'Tay trái');
    setCamera(true);
  }
  function save() {
    if (!snapshot || sessionOwner !== owner) return;
    try {
      savePalmHistory(localStorage, historyKey, snapshot);
      setHistory(readPalmHistory(localStorage, historyKey, t.locale));
      setSaved(true);
      setError('');
    } catch {
      setError(
        text(
          'Không lưu được trên thiết bị. Kiểm tra dung lượng hoặc quyền lưu của trình duyệt.',
          'Unable to save on this device. Check browser storage permissions or space.',
        ),
      );
    }
  }
  function reopen(entry: PalmHistoryEntry) {
    reset();
    setSide(entry.side);
    setDominant(entry.dominant);
    setQuestion(entry.question);
    setResult(entry.reading);
    setSnapshot(entry);
    setSaved(true);
    setActive(0);
  }
  async function followUp() {
    if (
      !snapshot ||
      !followQuestion.trim() ||
      followBusy ||
      busy ||
      loadingPhoto ||
      followTooLong ||
      followPrice.pending ||
      sessionOwner !== owner
    )
      return;
    followAbort.current?.abort();
    const controller = new AbortController();
    followAbort.current = controller;
    const token = generation.current;
    setFollowBusy(true);
    setFollowError('');
    try {
      const reply = await callAiText({
        serviceId: 'palm',
        locale: t.locale,
        signal: controller.signal,
        temperature: 0.2,
        parts: [{ text: followPrompt }],
      });
      const data = JSON.parse(
        reply
          .trim()
          .replace(/^```(?:json)?\s*/, '')
          .replace(/\s*```$/, ''),
      );
      if (typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 8000)
        throw new Error('INVALID_PALM_FOLLOWUP');
      if (!controller.signal.aborted && token === generation.current) setFollowAnswer(data.answer);
    } catch {
      if (!controller.signal.aborted && token === generation.current)
        setFollowError(
          text(
            'Chưa trả lời được. Bạn có thể thử lại; bài đọc vẫn được giữ.',
            'Unable to answer. Try again; your reading is still here.',
          ),
        );
    } finally {
      if (followAbort.current === controller) setFollowBusy(false);
    }
  }
  if (sessionOwner !== owner)
    return <p role="status">{text('Đang mở phiên Chỉ tay…', 'Opening your palm session…')}</p>;
  const entry = !photo && !camera && !result;
  return (
    <section className={`${s.page} ${entry ? s.entryPage : ''}`}>
      <header className={s.heading}>
        <div>
          <span className={s.moduleLabel}>{text('ASTROX / KHÁM PHÁ', 'ASTROX / EXPLORE')}</span>
          <h1>{en ? 'Palm Reading' : 'Chỉ tay'}</h1>
        </div>
        <span className={s.privateBadge}>{en ? 'You control your photo' : 'Bạn kiểm soát ảnh của mình'}</span>
      </header>
      <nav className={s.flowSteps} aria-label={text('Các bước xem chỉ tay', 'Palm reading steps')}>
        <span data-current={!photo && !result}>{text('01 · Chụp ảnh', '01 · Capture')}</span>
        <span data-current={!!photo && !result}>{text('02 · Kiểm tra', '02 · Review')}</span>
        <span data-current={!!result}>{text('03 · Khám phá', '03 · Explore')}</span>
      </nav>
      {history.length > 0 && (
        <details className={s.historyPanel}>
          <summary>
            {text('Bài đọc đã lưu', 'Saved readings')} · {history.length}
          </summary>
          <p className={s.muted}>
            {text(
              'Chỉ lưu nội dung trên thiết bị này, không kèm ảnh.',
              'Readings are saved on this device only, without photos.',
            )}
          </p>
          <ul>
            {history.map(item => (
              <li key={item.id}>
                <button onClick={() => reopen(item)}>
                  <strong>{en ? (item.side === 'Tay trái' ? 'Left hand' : 'Right hand') : item.side}</strong>
                  <span>
                    {new Date(item.savedAt).toLocaleDateString(en ? 'en-US' : 'vi-VN')} ·{' '}
                    {item.question || item.reading.summary.slice(0, 90)}
                  </span>
                </button>
                <button
                  aria-label={
                    text('Xóa bài đọc', 'Delete reading') +
                    ' ' +
                    (en ? (item.side === 'Tay trái' ? 'Left hand' : 'Right hand') : item.side) +
                    ' · ' +
                    new Date(item.savedAt).toLocaleDateString(en ? 'en-US' : 'vi-VN')
                  }
                  onClick={() => {
                    try {
                      deletePalmHistory(localStorage, historyKey, item.id);
                      setHistory(readPalmHistory(localStorage, historyKey, t.locale));
                      if (snapshot?.id === item.id) setSaved(false);
                    } catch {
                      setError(text('Chưa xóa được bài đọc.', 'Unable to delete this reading.'));
                    }
                  }}
                >
                  {text('Xóa', 'Delete')}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
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
              <button className={s.startCamera} disabled={loadingPhoto} onClick={() => beginCapture()}>
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
            onCapture={async (shot: PalmCapture) => {
              try {
                await applyPhoto(shot.dataUrl, shot.w, shot.h);
              } catch (e) {
                setCamera(false);
                setError((e as Error).message);
              }
            }}
            onFallback={kind => {
              setCamera(false);
              if (kind === 'native') nativeCamera.current?.click();
              else upload.current?.click();
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
      {(photo || result) && (
        <div className={s.resultLayout} style={!photo ? { gridTemplateColumns: '1fr' } : undefined}>
          {photo && (
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
                <button className={s.textButton} disabled={busy || loadingPhoto} onClick={() => beginCapture()}>
                  {text('Chụp lại', 'Retake photo')}
                </button>
                <button
                  className={s.textButton}
                  disabled={busy || loadingPhoto}
                  onClick={() => upload.current?.click()}
                >
                  {text('Thay ảnh', 'Change photo')}
                </button>
                <button className={s.textButton} onClick={() => reset()}>
                  {text('Xóa ảnh', 'Remove photo')}
                </button>
              </div>
              {quality && <PalmQualityPanel quality={quality} en={en} />}
              {warning && <p className={s.notice}>{warning}</p>}
            </GlassCard>
          )}
          <div className={s.readingColumn}>
            {result?.quality === 'retake' ? (
              <GlassCard className={s.panel}>
                <p>{result.message}</p>
                <Btn onClick={() => beginCapture()}>{text('Chụp lại', 'Retake photo')}</Btn>
              </GlassCard>
            ) : result ? (
              <>
                <PalmReadingCards
                  result={result}
                  side={snapshot?.side ?? side}
                  active={active}
                  onSelect={setActive}
                  en={en}
                />
                <div className={s.resultActions}>
                  <button className={s.primaryAction} onClick={save} disabled={saved || loadingPhoto || busy}>
                    {saved ? text('Đã lưu trên thiết bị', 'Saved on this device') : text('Lưu bài đọc', 'Save reading')}
                  </button>
                  {!photo && (
                    <button className={s.secondaryAction} disabled={busy || followBusy} onClick={() => beginCapture()}>
                      {text('Chụp ảnh mới', 'Take a new photo')}
                    </button>
                  )}
                  <button
                    className={s.secondaryAction}
                    disabled={loadingPhoto || busy || followBusy}
                    onClick={addOtherHand}
                  >
                    {text('Thêm tay còn lại', 'Add your other hand')}
                  </button>
                </div>
                {snapshot && history.some(item => item.side !== snapshot.side) && (
                  <label className={s.comparePicker}>
                    {text('So sánh với bài đã lưu', 'Compare with a saved reading')}
                    <select
                      aria-label={text('Bài đọc của tay còn lại', 'Other hand reading')}
                      value={history.some(item => item.id === otherHand?.id) ? (otherHand?.id ?? '') : ''}
                      onChange={e => setOtherHand(history.find(item => item.id === e.target.value) ?? null)}
                    >
                      <option value="">{text('Chọn bài của tay còn lại', 'Choose your other hand')}</option>
                      {history
                        .filter(item => item.side !== snapshot.side)
                        .map(item => (
                          <option key={item.id} value={item.id}>
                            {en ? (item.side === 'Tay trái' ? 'Left hand' : 'Right hand') : item.side} ·{' '}
                            {new Date(item.savedAt).toLocaleDateString(en ? 'en-US' : 'vi-VN')}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {otherHand && snapshot && otherHand.side !== snapshot.side && (
                  <GlassCard className={s.panel}>
                    <h2>{text('Hai tay, hai góc nhìn', 'Two hands, two perspectives')}</h2>
                    <p className={s.muted}>
                      {text(
                        'Đối chiếu hai bài đọc theo ảnh bạn đã xác nhận.',
                        'Compare readings from the two photos you confirmed.',
                      )}
                    </p>
                    <div className={s.comparison}>
                      {[otherHand, snapshot].map(hand => (
                        <article key={hand.id}>
                          <h3>{en ? (hand.side === 'Tay trái' ? 'Left hand' : 'Right hand') : hand.side}</h3>
                          <p>{hand.reading.summary}</p>
                          {hand.reading.lines.map((l, i) => (
                            <div key={i}>
                              <strong>{l.name}</strong>
                              <p>{l.observation}</p>
                              {l.uncertainty && (
                                <p className={s.uncertainty}>
                                  {text('Chưa rõ: ', 'Uncertain: ')}
                                  {l.uncertainty}
                                </p>
                              )}
                              <div className={s.interpretation}>
                                <span>{text('Diễn giải truyền thống', 'Traditional interpretation')}</span>
                                <p>{l.reading}</p>
                              </div>
                            </div>
                          ))}
                        </article>
                      ))}
                    </div>
                  </GlassCard>
                )}
                <GlassCard className={s.panel}>
                  <h2>{text('Khám phá thêm', 'Explore further')}</h2>
                  <p className={s.muted}>
                    {text(
                      'Hỏi tiếp dựa trên bài đọc này. Ảnh không được gửi lại.',
                      'Ask about this reading. Your photo will not be sent again.',
                    )}
                  </p>
                  <form
                    className={s.form}
                    onSubmit={e => {
                      e.preventDefault();
                      void followUp();
                    }}
                  >
                    <label htmlFor="palm-followup">
                      {text('Câu hỏi tiếp', 'Follow-up question')}
                      <textarea
                        id="palm-followup"
                        value={followQuestion}
                        disabled={followBusy}
                        onChange={e => setFollowQuestion(e.target.value)}
                        placeholder={text('Bạn muốn hiểu thêm điều gì?', 'What would you like to explore?')}
                      />
                    </label>
                    {followTooLong && (
                      <p role="alert" className={s.error}>
                        {text(
                          'Câu hỏi quá dài cho một lượt hỏi tiếp. Hãy rút gọn; nội dung chưa bị cắt.',
                          'This follow-up is too long for one request. Please shorten it; your text has not been truncated.',
                        )}
                      </p>
                    )}
                    <div className={s.suggestions}>
                      {[
                        text('Giải thích rõ hơn về tâm đạo', 'Explain the heart line'),
                        text('Quan sát nào còn chưa chắc?', 'Which observations are uncertain?'),
                      ].map(q => (
                        <button key={q} type="button" disabled={followBusy} onClick={() => setFollowQuestion(q)}>
                          {q}
                        </button>
                      ))}
                    </div>
                    <Btn
                      type="submit"
                      disabled={
                        followBusy ||
                        loadingPhoto ||
                        busy ||
                        followTooLong ||
                        !followQuestion.trim() ||
                        followPrice.pending
                      }
                    >
                      {followBusy ? text('Đang trả lời…', 'Answering…') : text('Hỏi tiếp', 'Ask a follow-up')}
                      {!followBusy && <PaidPriceBadge price={followPrice} />}
                    </Btn>
                    {followBusy && (
                      <button
                        type="button"
                        className={s.textButton}
                        onClick={() => {
                          followAbort.current?.abort();
                          setFollowBusy(false);
                        }}
                      >
                        {text('Dừng trả lời', 'Cancel answer')}
                      </button>
                    )}
                  </form>
                  {followError && (
                    <p className={s.error} role="alert">
                      {followError}
                    </p>
                  )}
                  {followAnswer && (
                    <div className={s.followAnswer} aria-live="polite">
                      <AiText text={followAnswer} />
                    </div>
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
                      <textarea disabled={busy} value={question} onChange={e => setQuestion(e.target.value)} />
                    </label>
                  </details>
                  {questionTooLong && (
                    <p role="alert" className={s.error}>
                      {text(
                        'Câu hỏi quá dài để gửi trong một lượt. Hãy rút gọn; nội dung của bạn chưa bị cắt.',
                        'This question is too long for one request. Please shorten it; your text has not been truncated.',
                      )}
                    </p>
                  )}
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
                  {quality?.state === 'retake' && (
                    <div className={s.retakeRecovery}>
                      <p>
                        {text(
                          'Ảnh cần chụp lại trước khi phân tích.',
                          'This photo needs to be retaken before analysis.',
                        )}
                      </p>
                      <button type="button" className={s.secondaryAction} onClick={() => beginCapture()}>
                        {text('Chụp lại', 'Retake')}
                      </button>
                      <button type="button" className={s.textButton} onClick={() => upload.current?.click()}>
                        {text('Chọn ảnh khác', 'Choose another photo')}
                      </button>
                    </div>
                  )}
                  <Btn
                    type="submit"
                    disabled={
                      !consent ||
                      busy ||
                      loadingPhoto ||
                      questionTooLong ||
                      price.pending ||
                      quality?.state === 'retake'
                    }
                    arrow
                  >
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
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
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
