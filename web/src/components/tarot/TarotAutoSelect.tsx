'use client';
import { useEffect, useRef, useState } from 'react';
import { requestTarotSelection, selectionReason, selectionTour, type TarotSelection } from '@/lib/tarot-selection';
import { TAROT_SPREADS } from '@/lib/tarot';
import { TAROT_SPREADS_EN } from '@/i18n/divination-en';
import styles from './Tarot.module.css';

const reduced = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
/** Enhances the existing spread grid; owns only one cancellable selection operation. */
export function TarotAutoSelect({
  question,
  locale,
  onLight,
  onResolved,
  onIssue,
  onCancel,
}: {
  question: string;
  locale: 'vi' | 'en';
  onLight: (index: number) => void;
  onResolved: (selection: TarotSelection, instant: boolean) => void;
  onIssue: (code: string) => void;
  onCancel: () => void;
}) {
  const en = locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  const [result, setResult] = useState<TarotSelection | null>(null);
  const [skipped, setSkipped] = useState(false);
  const skip = useRef(false);
  const release = useRef<(() => void) | null>(null);
  // The input and callbacks belong to the draw that mounted this component, never a later render.
  const operation = useRef({ question, locale, onLight, onResolved, onIssue });
  useEffect(() => {
    const input = operation.current;
    const controller = new AbortController();
    let live = true,
      lit = 0;
    skip.current = reduced();
    const scan = setInterval(() => {
      if (!skip.current && !reduced()) {
        lit = (lit + 1) % 5;
        input.onLight(lit);
      }
    }, 240);
    const timeout = setTimeout(() => controller.abort(new Error('selection_timeout')), 5500);
    const delay = (ms: number) =>
      new Promise<void>(resolve => {
        const done = () => {
          clearTimeout(timer);
          controller.signal.removeEventListener('abort', done);
          release.current = null;
          resolve();
        };
        const timer = setTimeout(done, ms);
        release.current = done;
        if (controller.signal.aborted) done();
        else controller.signal.addEventListener('abort', done, { once: true });
      });
    void (async () => {
      try {
        // React Strict Mode may clean up the first mount immediately. Do not send that request.
        await Promise.resolve();
        if (!live || controller.signal.aborted) return;
        const choice: TarotSelection = input.question.trim()
          ? await requestTarotSelection(
              { question: input.question.trim(), context: '', locale: input.locale },
              controller.signal,
            )
          : { status: 'selected', spreadId: 'one', reasonCode: 'general', source: 'general' };
        clearTimeout(timeout);
        clearInterval(scan);
        if (!live || controller.signal.aborted) return;
        if (choice.status !== 'selected') {
          input.onIssue(choice.status);
          return;
        }
        setResult(choice);
        const target = TAROT_SPREADS.findIndex(s => s.id === choice.spreadId);
        for (const step of selectionTour(lit, target)) {
          if (!live || controller.signal.aborted || skip.current || reduced()) break;
          input.onLight(step.index);
          await delay(step.delay);
        }
        if (!live || controller.signal.aborted) return;
        input.onLight(target);
        if (!skip.current && !reduced()) await delay(300);
        if (live && !controller.signal.aborted) input.onResolved(choice, skip.current || reduced());
      } catch (error) {
        if (live)
          input.onIssue(error instanceof Error && error.message === 'rate_limited' ? 'rate_limited' : 'unavailable');
      } finally {
        clearTimeout(timeout);
        clearInterval(scan);
      }
    })();
    return () => {
      live = false;
      controller.abort();
      clearTimeout(timeout);
      clearInterval(scan);
      release.current?.();
    };
  }, []);
  const spread = TAROT_SPREADS.find(s => s.id === result?.spreadId);
  return (
    <div className={styles.autoProgress}>
      <p role="status">
        {spread
          ? en
            ? TAROT_SPREADS_EN[spread.id]?.name
            : spread.name
          : copy('Đang chọn theo câu hỏi…', 'Choosing a spread for your question…')}
      </p>
      {result && <small>{selectionReason(result.reasonCode, en)}</small>}
      <div className={styles.autoActions}>
        <button type="button" onClick={onCancel}>
          {copy('Hủy', 'Cancel')}
        </button>
        <button
          type="button"
          disabled={skipped}
          onClick={() => {
            skip.current = true;
            setSkipped(true);
            onLight(-1);
            release.current?.();
          }}
        >
          {skipped ? copy('Đã tắt hiệu ứng', 'Motion skipped') : copy('Bỏ qua hiệu ứng', 'Skip animation')}
        </button>
      </div>
    </div>
  );
}
