'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/lib/auth';
import { openLoginDialog } from '@/lib/login-dialog';
import { fetchReadingUpgrade, runAiPrompt, type ReadingUpgradeQuote } from '@/lib/api';
import { cacheFingerprint, writeAiCache } from '@/lib/state';
import { readVisualReading } from '../../../../services/admin/visual-reading';
import styles from './ReadingUpgrade.module.css';
export type ReadingUpgradeContext = {
  serviceId: string;
  prompt: string;
  cache: { group: Parameters<typeof writeAiCache>[0]; key: string; meta?: Parameters<typeof writeAiCache>[3] };
  onComplete: (text: string) => void;
};
export function ReadingUpgrade({
  context,
  onlyEntitled = false,
}: {
  context: ReadingUpgradeContext;
  onlyEntitled?: boolean;
}) {
  const { locale } = useLocale(),
    en = locale === 'en';
  const { astroxUser } = useAuth();
  const copy = (vi: string, us: string) => (en ? us : vi);
  const [quote, setQuote] = useState<ReadingUpgradeQuote | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const running = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return null;
        setQuote(null);
        setBusy(false);
        setError('');
        return fetchReadingUpgrade(context.serviceId, context.prompt, controller.signal, onlyEntitled);
      })
      .then(q => {
        if (q && !controller.signal.aborted) setQuote(q);
      })
      .catch(e => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '');
      });
    return () => {
      controller.abort();
      running.current?.abort();
      running.current = null;
    };
  }, [context.serviceId, context.prompt, astroxUser?.id, locale, onlyEntitled]);
  async function convert() {
    if (busy) return;
    const controller = new AbortController(),
      fingerprint = cacheFingerprint();
    running.current = controller;
    setBusy(true);
    setError('');
    try {
      const text = await runAiPrompt(context.prompt, {
        serviceId: context.serviceId,
        formatUpgrade: true,
        signal: controller.signal,
      });
      if (controller.signal.aborted || running.current !== controller || cacheFingerprint() !== fingerprint) return;
      const report = readVisualReading(text);
      if (!report || report.report.serviceId !== context.serviceId || report.report.locale !== locale)
        throw new Error(
          copy(
            'Chưa nhận được bản nâng cấp hợp lệ. Bài cũ vẫn được giữ.',
            'A valid upgraded report was not received. Your original is kept.',
          ),
        );
      writeAiCache(context.cache.group, context.cache.key, text, { ...context.cache.meta, formatUpgrade: true });
      context.onComplete(text);
    } catch (e) {
      if (!controller.signal.aborted && running.current === controller)
        setError(e instanceof Error ? e.message : copy('Chưa hoàn tất nâng cấp.', 'The upgrade was not completed.'));
    } finally {
      if (running.current === controller) {
        setBusy(false);
        running.current = null;
      }
    }
  }
  if (quote && !quote.available && !quote.pending && !quote.requiresLogin && !quote.result) return null;
  if (onlyEntitled && (!quote || (!quote.available && !quote.pending && !quote.result))) return null;
  return (
    <section className={styles.upgrade} aria-busy={busy} data-reading-upgrade>
      <span className={styles.eyebrow}>{copy('MỘT GÓC NHÌN MỚI', 'A NEW PERSPECTIVE')}</span>
      <h3>{copy('Bài của bạn, trực quan hơn', 'See your reading come to life')}</h3>
      <p>
        {copy(
          'Khám phá bằng sơ đồ, căn cứ và gợi ý cụ thể. Bài cũ vẫn có trong lịch sử.',
          'Explore diagrams, evidence and practical guidance. Your original stays in reading history.',
        )}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy || (!error && !quote) || quote?.pending}
        onClick={() => (quote?.requiresLogin ? openLoginDialog() : void convert())}
      >
        {busy
          ? copy('Đang nâng cấp…', 'Upgrading…')
          : quote?.requiresLogin
            ? copy('Đăng nhập để kiểm tra lượt miễn phí', 'Sign in to check your free upgrade')
            : quote?.result
              ? copy('Mở phiên bản trực quan', 'Open your visual reading')
              : quote?.pending
                ? copy('Nâng cấp đang được xử lý', 'Upgrade in progress')
                : !quote && !error
                  ? copy('Đang kiểm tra lượt miễn phí…', 'Checking your free upgrade…')
                  : copy('Nâng cấp miễn phí', 'Free visual upgrade')}
        <span aria-hidden="true">↗</span>
      </button>
    </section>
  );
}
