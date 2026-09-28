'use client';

/**
 * TopicsPanel — khối 2: chủ đề luận giải Tử Vi (TUVI_TOPICS port từ app cũ,
 * giữ nguyên id + label VN). Mỗi mục: đọc cache "tuviTopics" key "topic::sub";
 * chưa có → nút chạy runAiPrompt với prompt đính kèm JSON lá số.
 */
import { useParityCopy } from '@/i18n/parity-copy';
import { ReadingQuestion } from '@/components/kit/ReadingQuestion';
import { useState, useEffect } from 'react';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import styles from './TopicsPanel.module.css';
import { TUVI_TOPICS, tuviPromptBody, type ZiweiChart } from '@/lib/tuvi';
import { TUVI_TOPIC_DESCRIPTIONS_EN, TUVI_TOPICS_EN } from '@/i18n/astrology-en';
import { useLocale } from '@/i18n/LocaleProvider';
import type { Profile } from '@/lib/types';
import { AiPanel } from './AiPanel';
import { useAiText } from './useAiText';

interface TopicsPanelProps {
  profile: Profile;
  chart: ZiweiChart | null;
}

export function TopicsPanel({ profile, chart }: TopicsPanelProps) {
  const parityCopy = useParityCopy();

  const t = useLocale();
  const en = t.locale === 'en';
  const descOf = (topic: (typeof TUVI_TOPICS)[number]) =>
    en ? TUVI_TOPIC_DESCRIPTIONS_EN[topic.id] || '' : topic.desc;
  const [reading, setReading] = useState(false);
  const [query, setQuery] = useState('');
  const [topicId, setTopicId] = useState(TUVI_TOPICS[0].id);
  const topic = TUVI_TOPICS.find(t => t.id === topicId) ?? TUVI_TOPICS[0];

  const titleOf = (topic: (typeof TUVI_TOPICS)[number]) =>
    t.locale === 'en' ? (TUVI_TOPICS_EN[topic.id]?.title ?? topic.title) : topic.title;
  const subLabelOf = (sub: { id: string; label: string }) =>
    t.locale === 'en' ? (TUVI_TOPICS_EN[topic.id]?.subs[sub.id] ?? sub.label) : sub.label;

  const [subId, setSubId] = useState(topic.subs[0].id);
  const sub = topic.subs.find(s => s.id === subId) ?? topic.subs[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = TUVI_TOPICS.find(t => t.id === params.get('topic'));
    if (!target) return;
    // Restore the requested saved reading after static-page hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTopicId(target.id);
    setSubId(target.subs.find(s => s.id === params.get('sub'))?.id || target.subs[0].id);
    setReading(true);
  }, []);

  const selectTopic = (id: string) => {
    setTopicId(id);
    setReading(true);
    const t = TUVI_TOPICS.find(x => x.id === id);
    if (t) setSubId(t.subs[0].id); // đổi chủ đề → quay về mục nhỏ đầu tiên
  };

  const normalizedQuery = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
  const filtered = TUVI_TOPICS.filter(t =>
    `${titleOf(t)} ${descOf(t)}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .includes(normalizedQuery),
  );

  const prompt = tuviPromptBody(profile, chart, sub.prompt);
  const ai = useAiText({ group: 'tuviTopics', cacheKey: `${topic.id}::${sub.id}`, prompt, topic: topic.id });

  if (!reading)
    return (
      <section className={styles.library} aria-label={parityCopy('Chủ đề luận giải')}>
        <header className={styles.header}>
          <div>
            <h2>{parityCopy('Bạn muốn hiểu điều gì?')}</h2>
            <p>{parityCopy('Chọn một chủ đề để khám phá từ lá số của bạn.')}</p>
          </div>
          <label className={styles.search}>
            <span className="sr-only">{parityCopy('Tìm chủ đề')}</span>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={parityCopy('Tìm chủ đề…')}
            />
          </label>
        </header>
        <div className={styles.grid}>
          {filtered.map(t => (
            <button
              key={t.id}
              className={styles.topic}
              data-layout={
                query
                  ? 'compact'
                  : [
                      'featured',
                      'wide',
                      'small',
                      'small',
                      'wide',
                      'small',
                      'row',
                      'row',
                      'wide',
                      'small',
                      'small',
                      'wide',
                      'row',
                    ][TUVI_TOPICS.indexOf(t)]
              }
              onClick={() => selectTopic(t.id)}
            >
              <span className={styles.topicTop}>
                <span>{String(TUVI_TOPICS.indexOf(t) + 1).padStart(2, '0')}</span>
                <span aria-hidden="true">↗</span>
              </span>
              {!query && TUVI_TOPICS.indexOf(t) === 0 && (
                <span className={styles.orbit} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <b>
                    <FeatureIcon name="tuvi" size={60} />
                  </b>
                </span>
              )}
              <h3>{titleOf(t)}</h3>
              <p>{descOf(t)}</p>
              <span className={styles.count}>
                {t.subs.length} {en ? 'perspectives' : 'góc nhìn'}
              </span>
            </button>
          ))}
        </div>
        {!filtered.length && (
          <p className={styles.noResults}>{parityCopy('Chưa tìm thấy chủ đề phù hợp. Thử một từ khoá khác nhé.')}</p>
        )}
      </section>
    );

  return (
    <section className={styles.reader} aria-label={`${en ? 'Reading' : 'Luận giải'} ${titleOf(topic)}`}>
      <button className={styles.back} onClick={() => setReading(false)}>
        {parityCopy('← Tất cả chủ đề')}
      </button>
      <header className={styles.readerHeader}>
        <span className={styles.eyebrow}>
          {en ? 'READING FOR' : 'LUẬN GIẢI CỦA'} {profile.name.toUpperCase()}
        </span>
        <h2>{titleOf(topic)}</h2>
        <p>{descOf(topic)}</p>
      </header>
      <div className={styles.readingLayout}>
        <nav className={styles.questions} aria-label={parityCopy('Chọn góc nhìn')}>
          <p>{parityCopy('GÓC NHÌN')}</p>
          {topic.subs.map((s, i) => (
            <button key={s.id} aria-pressed={s.id === sub.id} onClick={() => setSubId(s.id)}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {subLabelOf(s)}
            </button>
          ))}
        </nav>
        <article className={styles.answer} aria-label={subLabelOf(sub)}>
          <ReadingQuestion label={parityCopy('GÓC NHÌN BẠN CHỌN')}>{subLabelOf(sub)}</ReadingQuestion>
          <AiPanel
            cached={ai.text}
            loading={ai.loading}
            error={ai.error}
            runLabel={parityCopy('Khám phá luận giải')}
            emptyText={parityCopy(
              'Một góc nhìn dành riêng cho bạn, dựa trên thông tin và các cung trong lá số đã lưu.',
            )}
            onRun={ai.run}
            serviceId={`tuvi--${topic.id}--${sub.id}`}
            prompt={prompt}
          />
        </article>
      </div>
    </section>
  );
}
