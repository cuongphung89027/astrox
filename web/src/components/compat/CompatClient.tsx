'use client';
import { useFeatureResult } from '@/lib/use-feature-result';
import { trackFeature } from '@/lib/feature-telemetry';
import { refreshPromptRevision } from '@/lib/state';
import { PairCompatibility } from './PairCompatibility';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingWhisper } from '@/components/kit/LoadingWhisper';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AiText } from '@/components/kit';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { ReadingLoader } from '@/components/kit/ReadingLoader';
import { SavedReading } from '@/components/kit/SavedReading';
import { ReadingUpgrade, type ReadingUpgradeContext } from '@/components/kit/ReadingUpgrade';
import { useProfileModal } from '@/components/profile/ProfileModal';
import { cacheFingerprint, readAiCache, writeAiCache } from '@/lib/state';
import { runAiPrompt } from '@/lib/api';
import { usePaidPrice } from '@/lib/use-paid-price';
import { PaidPriceBadge } from '@/components/kit/PaidPriceBadge';
import { useProfile } from '@/lib/use-store';
import {
  ZODIAC_SIGNS,
  compatAnalysis,
  compatPrompt,
  extractJson,
  getZodiacSign,
  type CompatAiResult,
  type ZodiacSign,
} from '@/lib/zodiac';
import { CompatWheel } from './CompatWheel';
import styles from './Compat.module.css';
import { useLocale } from '@/i18n/LocaleProvider';
import { readVisualReading } from '../../../../services/admin/visual-reading';
import { VisualReading } from '@/components/kit/VisualReading';
const elementLabel = (value: string, en: boolean) =>
  en ? ({ Hoả: 'Fire', Thổ: 'Earth', Khí: 'Air', Thuỷ: 'Water' } as Record<string, string>)[value] || value : value;
const signById = (id: string) => ZODIAC_SIGNS.find(s => s.id === id);
function SignPicker({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const en = useLocale().locale === 'en',
    copy = (vi: string, us: string) => (en ? us : vi);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const old = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      if (old instanceof HTMLElement && old.isConnected) old.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.picker}
      aria-label={copy('Chọn cung hoàng đạo', 'Select a zodiac sign')}
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{copy('Chọn cung hoàng đạo', 'Select a zodiac sign')}</h2>
        <button onClick={onClose} aria-label={copy('Đóng chọn cung', 'Close sign picker')}>
          <FeatureIcon name="close" size={20} />
        </button>
      </header>
      <div>
        {ZODIAC_SIGNS.map(s => (
          <button key={s.id} onClick={() => onSelect(s.id)} aria-pressed={s.id === value}>
            <span>
              {s.symbol}
              {'\uFE0E'}
            </span>
            <strong>{en ? s.en : s.name}</strong>
            <small>{elementLabel(s.element, en)}</small>
          </button>
        ))}
      </div>
    </dialog>
  );
}
function Reading({ raw }: { raw: string }) {
  const en = useLocale().locale === 'en',
    copy = (vi: string, us: string) => (en ? us : vi);
  const visual = readVisualReading(raw);
  if (visual) return <VisualReading key={visual.createdAt + visual.report.serviceId} saved={visual} />;
  let parsed: CompatAiResult | null = null;
  try {
    const p = extractJson<CompatAiResult>(raw);
    if (
      Array.isArray(p.strengths) &&
      p.strengths.every(s => typeof s === 'string') &&
      Array.isArray(p.watchouts) &&
      p.watchouts.every(s => typeof s === 'string') &&
      typeof p.advice === 'string'
    )
      parsed = p;
  } catch {}
  if (!parsed) return <AiText text={raw} />;
  return (
    <div className={styles.readingParts}>
      <section>
        <span className={styles.eyebrow}>{copy('ĐIỂM GẶP NHAU', 'COMMON GROUND')}</span>
        <h3>{copy('Điều kết nối hai bạn', 'What connects you')}</h3>
        <ul>
          {parsed.strengths.map((s, i) => (
            <li key={i}>
              <span aria-hidden="true">0{i + 1}</span>
              <AiText text={s} />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <span className={styles.eyebrow}>{copy('DÀNH CHỖ CHO KHÁC BIỆT', 'ROOM FOR DIFFERENCES')}</span>
        <h3>{copy('Điều cần dung hòa', 'Where to find balance')}</h3>
        <ul>
          {parsed.watchouts.map((s, i) => (
            <li key={i}>
              <span aria-hidden="true">↗</span>
              <AiText text={s} />
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.advice}>
        <header>
          <FeatureIcon name="compat" size={23} />
          <h3>{copy('Gợi ý cho hai bạn', 'Advice for you both')}</h3>
        </header>
        <AiText text={parsed.advice} />
      </section>
    </div>
  );
}
function WesternCompatClient() {
  const t = useLocale();
  const en = t.locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  const profile = useProfile();
  const { open } = useProfileModal();
  const [aOverride, setA] = useState<string | null>(null),
    [bId, setB] = useState('');
  const aId = aOverride ?? getZodiacSign(profile?.dob)?.id ?? '';
  const [picker, setPicker] = useState<'a' | 'b' | null>(null),
    [phase, setPhase] = useState<'choose' | 'joining' | 'result'>('choose');
  const [checked, setChecked] = useState<{ a: string; b: string } | null>(null);
  const [raw, setRaw] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const markFresh = useFeatureResult(raw, 'compat--pair', phase === 'result' && !loading && !!profile);
  const req = useRef(0);
  const a = signById(aId),
    b = signById(bId),
    ca = checked ? signById(checked.a) : undefined,
    cb = checked ? signById(checked.b) : undefined;
  const analysis = useMemo(() => (ca && cb ? compatAnalysis(ca, cb, t.locale) : null), [ca, cb, t.locale]);
  const price = usePaidPrice(
    'compat--pair',
    ca && cb && analysis && profile ? compatPrompt(ca, cb, analysis, profile) : undefined,
  );
  const key = checked ? `${[checked.a, checked.b].sort().join('+')}::${cacheFingerprint()}` : '';
  const upgrade: ReadingUpgradeContext | undefined =
    ca && cb && analysis && profile
      ? {
          serviceId: 'compat--pair',
          prompt: compatPrompt(ca, cb, analysis, profile),
          cache: { group: 'compatibility', key, meta: { module: 'compatibility', topic: 'pair' } },
          onComplete: next => {
            req.current++;
            markFresh(next);
            setRaw(next);
            setLoading(false);
            setError('');
          },
        }
      : undefined;
  const scope = key + JSON.stringify(profile),
    [previousScope, setPreviousScope] = useState<string | null>(null);
  if (scope !== previousScope) {
    setPreviousScope(scope);
    setLoading(false);
    setError('');
    setRaw(key && profile ? readAiCache('compatibility', key) : '');
  }
  useEffect(
    () => () => {
      req.current++;
    },
    [scope],
  );
  useEffect(() => {
    if (phase === 'result') trackFeature('result_view', 'compat', 'calculation');
  }, [phase]);
  useEffect(() => {
    if (phase !== 'joining') return;
    const timer = setTimeout(() => setPhase('result'), 1100);
    return () => clearTimeout(timer);
  }, [phase]);
  const check = () => {
    if (!a || !b) return;
    trackFeature('feature_start', 'compat', 'calculation');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setChecked({ a: a.id, b: b.id });
    const reduced =
      matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    setPhase(reduced ? 'result' : 'joining');
  };
  const reset = () => {
    req.current++;
    setLoading(false);
    setChecked(null);
    setPhase('choose');
    setRaw('');
    setError('');
  };
  const run = async () => {
    if (!ca || !cb || !analysis) return;
    if (!profile) {
      open();
      return;
    }
    await refreshPromptRevision();
    const cached = readAiCache('compatibility', key);
    if (cached) {
      setRaw(cached);
      return;
    }
    const id = ++req.current;
    setLoading(true);
    setError('');
    try {
      const text = await runAiPrompt(compatPrompt(ca, cb, analysis, profile), {
        withChartImage: false,
        temperature: 0.6,
        serviceId: 'compat--pair',
      });
      if (id !== req.current) return;
      writeAiCache('compatibility', key, text, { module: 'compatibility', topic: 'pair' });
      markFresh(text);
      setRaw(text);
    } catch (e) {
      if (id === req.current)
        setError(
          e instanceof Error ? e.message : copy('Không lấy được luận giải.', 'The reading could not be loaded.'),
        );
    } finally {
      if (id === req.current) setLoading(false);
    }
  };
  const person = (sign: ZodiacSign | undefined, side: 'a' | 'b') => (
    <button
      className={styles.person}
      onClick={() => setPicker(side)}
      aria-label={`${en ? 'Select sign for person' : 'Chọn cung người thứ'} ${side === 'a' ? '1' : '2'}${sign ? `: ${en ? sign.en : sign.name}` : ''}`}
    >
      <span>{side === 'a' ? copy('BẠN', 'YOU') : copy('NGƯỜI ẤY', 'YOUR PARTNER')}</span>
      <div className={styles.signSeal}>
        {sign ? (
          <b>
            {sign.symbol}
            {'\uFE0E'}
          </b>
        ) : (
          <FeatureIcon name="profile" size={35} />
        )}
      </div>
      <h3>{(sign ? (en ? sign.en : sign.name) : undefined) ?? copy('Chọn cung', 'Select sign')}</h3>
      <small>
        {sign
          ? `${elementLabel(sign.element, en)} · ${copy('Thay đổi', 'Change')}`
          : copy('Chạm để chọn', 'Tap to choose')}
        <i aria-hidden="true">⌄</i>
      </small>
    </button>
  );
  return (
    <section className={styles.page}>
      <h1 className="sr-only">{en ? 'Compatibility' : 'Tương Hợp'}</h1>
      {phase === 'choose' ? (
        <div className={styles.choose}>
          <header className={styles.intro}>
            <span className={styles.eyebrow}>{en ? 'TWO IMRINTS. ONE CONNECTION.' : 'HAI DẤU ẤN. MỘT KẾT NỐI.'}</span>
            <h2>{en ? 'Where do you meet?' : 'Gặp nhau ở đâu?'}</h2>
          </header>
          <div className={styles.pair}>
            {person(a, 'a')}
            <span className={styles.pairLink} aria-hidden="true">
              <FeatureIcon name="compat" size={21} />
            </span>
            {person(b, 'b')}
          </div>
          <p className={styles.scope}>
            {en ? "Compared by both people's Sun signs." : 'Đối chiếu theo cung Mặt Trời của hai người.'}
          </p>
          <button className={styles.primary} disabled={!a || !b} onClick={check}>
            {en ? 'Explore the connection' : 'Khám phá sự kết nối'} <span>↗</span>
          </button>
          {!profile && (
            <button className={styles.profileLink} onClick={() => open()}>
              {en ? 'Use the sign from your profile ↗' : 'Dùng cung từ hồ sơ của bạn ↗'}
            </button>
          )}
        </div>
      ) : ca && cb && analysis ? (
        <>
          <header className={styles.resultNav}>
            <button onClick={reset} aria-label={copy('Chọn lại hai cung', 'Choose two signs again')}>
              ←
            </button>
            <span>{phase === 'joining' ? copy('ĐANG KẾT NỐI', 'CONNECTING') : copy('HAI BẠN', 'YOU BOTH')}</span>
          </header>
          <div className={styles.resultHero} data-joining={phase === 'joining'}>
            <div className={styles.pairNames}>
              <h2>{en ? ca.en : ca.name}</h2>
              <span>&</span>
              <h2>{en ? cb.en : cb.name}</h2>
            </div>
            <CompatWheel a={ca} b={cb} pairKey={`${ca.id}:${cb.id}`} />
            {phase === 'joining' ? (
              <p className={styles.joiningText} role="status">
                <LoadingWhisper kind="compat" />
              </p>
            ) : (
              <div className={styles.score}>
                <strong>
                  {analysis.percent}
                  <small>/100</small>
                </strong>
                <h3>{analysis.relation}</h3>
                <span>{copy('Chỉ số tham khảo theo cung Mặt Trời', 'An indicative Sun-sign score')}</span>
              </div>
            )}
          </div>
          {phase === 'result' && (
            <div className={styles.resultBody}>
              <div className={styles.elementPair}>
                <span>{elementLabel(ca.element, en)}</span>
                <i>↔</i>
                <span>{elementLabel(cb.element, en)}</span>
              </div>
              <p className={styles.elementNote}>{analysis.elementNote}</p>
              <details className={styles.details}>
                <summary>{copy('Cách đối chiếu', 'How this comparison works')}</summary>
                <p>
                  {en ? (
                    <>
                      Angular distance: {analysis.angle}° · {analysis.aspectLabel}. This score follows sign and element
                      rules; it is not a probability of relationship success.
                    </>
                  ) : (
                    <>
                      Khoảng cách giữa hai cung: {analysis.angle}° · {analysis.aspectLabel}. Chỉ số được tính theo quy
                      tắc cung và nguyên tố, không phải xác suất thành công của mối quan hệ.
                    </>
                  )}
                </p>
              </details>
              <section className={styles.reading} aria-busy={loading}>
                {!profile ? (
                  <div className={styles.profileInvite}>
                    <FeatureIcon name="compat" size={28} />
                    <h3>{copy('Hiểu nhau sâu hơn', 'Understand each other better')}</h3>
                    <p>
                      {copy(
                        'Bổ sung hồ sơ để mở phần luận giải cho hai bạn.',
                        'Add your profile to unlock a reading for you both.',
                      )}
                    </p>
                    <button className={styles.primary} onClick={() => open()}>
                      {copy('Bổ sung hồ sơ ↗', 'Add your profile ↗')}
                    </button>
                  </div>
                ) : loading ? (
                  <ReadingLoader kind="compat" />
                ) : raw ? (
                  <>
                    <SavedReading text={raw} upgrade={upgrade} renderLegacy={value => <Reading raw={value} />} />
                    <span className={styles.saved}>{copy('✓ Đã lưu luận giải', '✓ Reading saved')}</span>
                  </>
                ) : (
                  <>
                    <h3 className={styles.readingTitle}>{copy('Hiểu nhau sâu hơn', 'Understand each other better')}</h3>
                    {ca && cb && analysis && profile && <ReadingUpgrade context={upgrade!} onlyEntitled />}
                    {error && (
                      <p role="alert" className={styles.error}>
                        {error}
                      </p>
                    )}
                    <button className={styles.primary} disabled={price.pending} onClick={run}>
                      {error
                        ? copy('Thử lại', 'Try again')
                        : copy('Đọc luận giải hai bạn', 'Read your couple interpretation')}
                      <PaidPriceBadge price={price} />
                      <span aria-hidden="true">↗</span>
                    </button>
                  </>
                )}
              </section>
            </div>
          )}
        </>
      ) : null}
      {picker && (
        <SignPicker
          value={picker === 'a' ? aId : bId}
          onClose={() => setPicker(null)}
          onSelect={id => {
            if (picker === 'a') setA(id);
            else setB(id);
            setPicker(null);
          }}
        />
      )}
    </section>
  );
}

export function CompatClient() {
  const { locale } = useLocale();
  return (
    <Suspense
      fallback={
        <>
          <h1 className="sr-only">{locale === 'en' ? 'Compatibility' : 'Tương Hợp'}</h1>
          <ReadingLoader kind="compat" />
        </>
      }
    >
      <CompatModes />
    </Suspense>
  );
}
function CompatModes() {
  const en = useLocale().locale === 'en',
    copy = (vi: string, us: string) => (en ? us : vi);
  const profile = useProfile(),
    params = useSearchParams();
  const scope = profile ? cacheFingerprint() : 'guest';
  const [selected, setMode] = useState<'tuvi' | 'batu' | 'western' | null>(null);
  const requested = params.get('mode');
  const mode = selected ?? (requested === 'batu' || requested === 'western' ? requested : 'tuvi');
  return (
    <>
      <nav className={styles.modeNav} aria-label={copy('Phương pháp tương hợp', 'Compatibility method')}>
        {(
          [
            ['tuvi', copy('Tử Vi', 'Zi Wei')],
            ['batu', copy('Bát Tự', 'Ba Zi')],
            ['western', copy('Cung hoàng đạo', 'Zodiac signs')],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}>
            {label}
          </button>
        ))}
      </nav>
      <div hidden={mode === 'western'}>
        <PairCompatibility key={scope} mode={mode === 'western' ? 'tuvi' : mode} />
      </div>
      <div hidden={mode !== 'western'}>
        <WesternCompatClient key={scope} />
      </div>
    </>
  );
}
