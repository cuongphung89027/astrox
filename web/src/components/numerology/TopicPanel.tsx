'use client';
import type { ReadingUpgradeContext } from '@/components/kit/ReadingUpgrade';
import { useFeatureResult } from '@/lib/use-feature-result';
import { refreshPromptRevision } from '@/lib/state';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReadingLoader } from '@/components/kit/ReadingLoader';
import { SavedReading, ReadingInvitation } from '@/components/kit/SavedReading';
import { useRequireProfile } from '@/components/profile/ProfileModal';
import { runAiPrompt } from '@/lib/api';
import { readAiCache, writeAiCache } from '@/lib/state';
import { numerologyPromptBody, type NumerologyChart, type NumerologyTopic } from '@/lib/numerology';
import type { Profile } from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';
export function TopicPanel({
  topic,
  chart,
  profile,
}: {
  topic: NumerologyTopic;
  chart: NumerologyChart;
  profile: Profile | null;
}) {
  const t = useLocale();
  const en = t.locale === 'en';

  const requireProfile = useRequireProfile();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [text, setText] = useState(''),
    [error, setError] = useState('');
  const generation = useRef(0);
  const markFresh = useFeatureResult(text, `numerology--${topic.id}`, state === 'done');
  const key = topic.id === 'personal-year' ? `${topic.id}::${chart.now.year}` : topic.id;
  const scope = key + JSON.stringify(profile),
    [previousScope, setPreviousScope] = useState<string | null>(null);
  if (scope !== previousScope) {
    setPreviousScope(scope);
    const cached = readAiCache('numerologyTopics', key);
    setText(cached);
    setState(cached ? 'done' : 'idle');
    setError('');
  }
  useEffect(
    () => () => {
      generation.current++;
    },
    [scope],
  );
  const run = useCallback(async () => {
    if (!requireProfile()) return;
    await refreshPromptRevision();
    const cached = readAiCache('numerologyTopics', key);
    if (cached) {
      setText(cached);
      setState('done');
      return;
    }
    const id = ++generation.current;
    setState('loading');
    setError('');
    try {
      const out = await runAiPrompt(numerologyPromptBody(topic.prompt, chart, profile), {
        serviceId: `numerology--${topic.id}`,
      });
      if (id !== generation.current) return;
      writeAiCache('numerologyTopics', key, out, { module: 'numerology', topic: topic.id });
      markFresh(out);
      setText(out);
      setState('done');
    } catch (e) {
      if (id !== generation.current) return;
      setError(e instanceof Error ? e.message : 'Không lấy được luận giải.');
      setState('error');
    }
  }, [markFresh, requireProfile, key, topic, chart, profile]);
  const upgrade: ReadingUpgradeContext = {
    serviceId: `numerology--${topic.id}`,
    prompt: numerologyPromptBody(topic.prompt, chart, profile),
    cache: { group: 'numerologyTopics', key, meta: { module: 'numerology', topic: topic.id } },
    onComplete: next => {
      generation.current++;
      markFresh(next);
      setText(next);
      setState('done');
      setError('');
    },
  };
  return (
    <div aria-live="polite" aria-busy={state === 'loading'}>
      {state === 'idle' ? (
        <ReadingInvitation
          label={en ? 'Read the interpretation' : 'Đọc luận giải'}
          onRun={run}
          serviceId={`numerology--${topic.id}`}
          prompt={numerologyPromptBody(topic.prompt, chart, profile)}
          upgrade={upgrade}
        />
      ) : state === 'loading' ? (
        <ReadingLoader kind="numerology" />
      ) : state === 'done' ? (
        <SavedReading text={text} periodic={topic.id === 'personal-year'} upgrade={upgrade} />
      ) : (
        <div>
          <p role="alert">{error}</p>
          <ReadingInvitation
            label={en ? 'Retry' : 'Thử lại'}
            onRun={run}
            serviceId={`numerology--${topic.id}`}
            prompt={numerologyPromptBody(topic.prompt, chart, profile)}
            upgrade={upgrade}
          />
        </div>
      )}
    </div>
  );
}
