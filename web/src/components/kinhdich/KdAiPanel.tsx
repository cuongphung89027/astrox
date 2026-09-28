'use client';
import { useLocale } from '@/i18n/LocaleProvider';
import { useFeatureResult } from '@/lib/use-feature-result';
import { cacheFingerprint, refreshPromptRevision } from '@/lib/state';

/**
 * KdAiPanel — luận giải quẻ bằng AI (useRequireProfile → runAiPrompt, cache
 * "kinhDich"). Chờ: SunSpinner + Skeleton; xong: PanelReveal + AiText +
 * LikeButton + "Gieo quẻ khác". Port prompt từ performCast của app cũ.
 */
import { LoadingWhisper } from '@/components/kit/LoadingWhisper';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Btn } from '@/components/kit';
import { KdReading } from './KdReading';
import { LikeButton } from '@/components/motion';
import styles from './KinhDich.module.css';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { useProfileModal, useRequireProfile } from '@/components/profile/ProfileModal';
import { runAiPrompt } from '@/lib/api';
import { buildKdPrompt, kdCacheKey } from '@/lib/kinhdich';
import type { CastResult } from '@/lib/kinhdich';
import { readAiCache, writeAiCache } from '@/lib/state';
import { useProfile } from '@/lib/use-store';
import { usePaidPrice } from '@/lib/use-paid-price';
import { PaidPriceBadge } from '@/components/kit/PaidPriceBadge';

interface KdAiPanelProps {
  result: CastResult;
  question: string;
  onReset: () => void;
}

type AiState = 'idle' | 'loading' | 'done' | 'error';

export function KdAiPanel(props: KdAiPanelProps) {
  useProfile(); // Subscribe so profile edits replace all result and request state.
  return <KdAiPanelContent key={cacheFingerprint()} {...props} />;
}

export function KdAiPanelContent({ result, question, onReset }: KdAiPanelProps) {
  const en = useLocale().locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  const [state, setState] = useState<AiState>('idle');
  const [text, setText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const profile = useProfile();
  const price = usePaidPrice(
    'kinhdich--interpretation',
    profile
      ? buildKdPrompt(result, question.trim() || '(không có câu hỏi cụ thể — luận giải tổng quát)', profile)
      : undefined,
  );
  const requireProfile = useRequireProfile();
  const { open: openProfile } = useProfileModal();

  const request = useRef(0);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current++;
      busy.current = false;
      controller.current?.abort();
    },
    [],
  );
  const markFresh = useFeatureResult(text, 'kinhdich--interpretation', state === 'done' && !!profile);
  const interpret = useCallback(async () => {
    if (busy.current || !requireProfile()) return;
    const scope = cacheFingerprint(),
      id = ++request.current;
    const current = () => id === request.current && scope === cacheFingerprint();
    const abort = new AbortController();
    controller.current = abort;
    busy.current = true;
    setElapsed(0);
    setErrorMsg('');
    setState('loading');
    try {
      const q = question.trim() || '(không có câu hỏi cụ thể — luận giải tổng quát)';
      const key = kdCacheKey(result, q);
      await refreshPromptRevision();
      if (!current()) return;
      const cached = readAiCache('kinhDich', key);
      if (cached) {
        setText(cached);
        setState('done');
        return;
      }
      const prompt = buildKdPrompt(result, q, profile);
      const out = await runAiPrompt(prompt, {
        withChartImage: false,
        temperature: 0.75,
        serviceId: 'kinhdich--interpretation',
        signal: abort.signal,
      });
      if (!current()) return;
      writeAiCache('kinhDich', key, out, { module: 'kinh-dich', topic: 'interpretation' });
      markFresh(out);
      setText(out);
      setState('done');
    } catch (e) {
      if (!current()) return;
      setErrorMsg(
        en
          ? 'Unable to load your reading. Please try again.'
          : e instanceof Error
            ? e.message
            : 'Không lấy được luận giải.',
      );
      setState('error');
    } finally {
      if (id === request.current) {
        busy.current = false;
        controller.current = null;
      }
    }
  }, [markFresh, requireProfile, question, result, profile, en]);

  const done = state === 'done';
  useEffect(() => {
    if (state !== 'loading') return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [state]);

  if (!profile)
    return (
      <section className={styles.profileInvitation}>
        <div className={styles.invitationIcon}>
          <FeatureIcon name="kinhdich" size={28} />
        </div>
        <h3>{copy('Đọc luận giải của bạn', 'Read your interpretation')}</h3>
        <p>
          {copy(
            'Bổ sung hồ sơ để đọc luận giải cho câu hỏi của bạn.',
            'Complete your profile to get a reading for your question.',
          )}
        </p>
        <button className={styles.primary} onClick={() => openProfile()}>
          {copy('Bổ sung hồ sơ', 'Complete profile')} <span aria-hidden="true">↗</span>
        </button>
      </section>
    );

  return (
    <section className={styles.readingPanel} aria-busy={state === 'loading'}>
      {state !== 'idle' && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl font-normal text-muc">
            {copy('Luận giải quẻ', 'Hexagram interpretation')}
          </h3>
          {done ? <LikeButton label={copy('Thích luận giải này', 'Like this reading')} /> : null}
        </div>
      )}

      {state === 'idle' ? (
        <div>
          <button className={styles.primary} disabled={price.pending} onClick={interpret}>
            {copy('Đọc luận giải', 'Read interpretation')}
            <PaidPriceBadge price={price} /> <span aria-hidden="true">↗</span>
          </button>
        </div>
      ) : null}

      {state === 'loading' ? (
        <div className={styles.readingWait} role="status" aria-live="polite">
          <div className={styles.loadingHex} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <i key={i} style={{ animationDelay: `${i * 120}ms` }}>
                {i % 2 === 0 ? (
                  <>
                    <b />
                    <b />
                  </>
                ) : (
                  <b />
                )}
              </i>
            ))}
          </div>
          <div>
            <span className={styles.eyebrow}>{copy('ĐANG LUẬN GIẢI', 'READING YOUR HEXAGRAM')}</span>
            <p>{copy('Đọc quẻ của bạn…', 'Interpreting your hexagram…')}</p>
            <small>
              <LoadingWhisper kind="kinhdich" />
            </small>
          </div>
          <span className={styles.waitTime} aria-hidden="true">
            {elapsed}s
          </span>
        </div>
      ) : null}

      {state === 'error' ? (
        <div className="mt-4">
          <p role="alert" className="text-sm font-semibold text-son-deep">
            {errorMsg}
          </p>
          <Btn variant="ghost" size="sm" className="mt-3" disabled={price.pending} onClick={interpret}>
            {copy('Thử lại', 'Try again')}
            <PaidPriceBadge price={price} />
          </Btn>
        </div>
      ) : null}

      {done && (
        <div className={styles.readingReveal}>
          <div className="mt-4">
            <KdReading text={text} />
            <Btn variant="ghost" size="md" className="mt-5" onClick={onReset} arrow>
              {copy('Gieo quẻ khác', 'Cast another hexagram')}
            </Btn>
          </div>
        </div>
      )}
    </section>
  );
}
