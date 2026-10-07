'use client';
import { ReadingToolbar } from './ReadingToolbar';
import { visualReadingText } from '@/lib/reading-text';
import { PeriodTimeline } from './PeriodTimeline';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { Chapter, Insight, SavedVisualReading, VisualInput } from '../../../../services/admin/visual-reading';
import styles from './VisualReading.module.css';

const polar = (r: number, angle: number) => ({ x: 210 + Math.cos(angle) * r, y: 150 + Math.sin(angle) * r });
const kinds: Record<string, [string, string]> = {
  'trait-spectrum': ['Khuynh hướng của bạn', 'Your tendencies'],
  'trait-map': ['Bản đồ dấu ấn', 'Your signature map'],
  'palace-map': ['Mối liên hệ giữa các cung', 'Palace connections'],
  'natal-map': ['Các điểm tựa trong bản đồ sao', 'Natal chart anchors'],
  'element-flow': ['Dòng chảy ngũ hành', 'Five Elements flow'],
  'pair-map': ['Hai góc nhìn, một kết nối', 'Two perspectives, one connection'],
  'balance-path': ['Từ thử thách đến cân bằng', 'From challenge to balance'],
  'factor-map': ['Những yếu tố tác động', 'Connecting the influences'],
  'action-path': ['Một bước nhỏ để bắt đầu', 'A small step forward'],
  'period-timeline': ['Trục thời gian của kỳ', 'The period timeline'],
};

/** Finite transitions; cancel on a new selection, hidden view, reduced motion or unmount. */
function useReportMotion(key: string) {
  const root = useRef<HTMLDivElement>(null),
    content = useRef<HTMLDivElement>(null),
    height = useRef(0),
    inView = useRef(true),
    first = useRef(true),
    active = useRef(new Set<Animation>());
  const cancel = () => {
    for (const animation of active.current) animation.cancel();
    active.current.clear();
  };
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      const suspended =
        document.hidden || media.matches || document.documentElement.dataset.motion === 'reduced' || !inView.current;
      if (root.current) root.current.dataset.motionSuspended = String(suspended);
      if (suspended) cancel();
    };
    const observer = new MutationObserver(stop);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    const view = new IntersectionObserver(entries => {
      inView.current = entries.some(e => e.isIntersecting);
      stop();
    });
    if (root.current) view.observe(root.current);
    media.addEventListener('change', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      cancel();
      observer.disconnect();
      view.disconnect();
      media.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, []);
  useLayoutEffect(() => {
    cancel();
    const node = content.current;
    if (!node) return;
    const target = node.getBoundingClientRect().height,
      previous = height.current;
    height.current = target;
    if (first.current) {
      first.current = false;
      return;
    }
    if (
      document.hidden ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduced' ||
      !inView.current ||
      !node.animate
    )
      return;
    const animate = (element: Element, frames: Keyframe[], duration: number) => {
      const a = element.animate(frames, { duration, easing: 'cubic-bezier(.22,1,.36,1)' });
      active.current.add(a);
      a.finished.then(
        () => active.current.delete(a),
        () => active.current.delete(a),
      );
    };
    animate(
      node,
      [
        { opacity: 0.35, transform: 'translateY(9px)', height: `${previous || target}px` },
        { opacity: 1, transform: 'translateY(0)', height: `${target}px` },
      ],
      420,
    );
    root.current?.querySelectorAll<SVGPathElement>('[data-reveal]').forEach(path => {
      const length = path.getTotalLength();
      animate(
        path,
        [
          { strokeDasharray: `${length}`, strokeDashoffset: `${length}`, opacity: 0.2 },
          { strokeDasharray: `${length}`, strokeDashoffset: '0', opacity: 1 },
        ],
        650,
      );
    });
    return cancel;
  }, [key]);
  return { root, content };
}

function Diagram({
  chapter,
  input,
  selected,
  onSelect,
}: {
  chapter: Chapter;
  input: VisualInput;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const uid = useId().replace(/:/g, ''),
    en = input.locale === 'en';
  const plan = input.chapters.find(p => p.id === chapter.id)!;
  if (chapter.visual.kind === 'period-timeline' && input.period) return <PeriodTimeline input={input} />;
  if (plan.allowedAxes) {
    return (
      <div className={styles.spectrum}>
        {plan.allowedAxes.map(axis => {
          const signal = chapter.visual.signals?.find(s => s.axisId === axis.id),
            lean = signal?.lean ?? 'unknown';
          return (
            <button
              type="button"
              key={axis.id}
              disabled={!signal}
              aria-pressed={!!signal && signal.insightId === selected}
              onClick={() => signal && onSelect(signal.insightId)}
              className={styles.spectrumRow}
            >
              <span className={styles.axisLabels}>
                <span>{axis.left}</span>
                <span>{axis.right}</span>
              </span>
              <span className={styles.axisTrack} data-lean={lean}>
                <i />
                <i />
                <i />
                <i />
                <i />
                <b />
              </span>
              <small>
                {lean === 'unknown'
                  ? en
                    ? 'No clear tendency'
                    : 'Chưa đủ cơ sở nghiêng về một phía'
                  : lean === 'balanced'
                    ? en
                      ? 'Both tendencies'
                      : 'Có cả hai khuynh hướng'
                    : lean === 'left'
                      ? axis.left
                      : axis.right}
              </small>
            </button>
          );
        })}
      </div>
    );
  }
  const items = chapter.insights,
    n = items.length;
  const nodes = items.map((item, i) => ({ item, ...polar(101, -Math.PI / 2 + i * ((Math.PI * 2) / n)) }));
  const kind = chapter.visual.kind;
  const primary = input.facts.find(f => chapter.visual.factIds.includes(f.id)) ?? input.facts[0];
  const countFacts = input.facts.filter(f => f.sourcePath.startsWith('wuxing.') && typeof f.value === 'number');
  return (
    <div className={styles.plot} data-kind={kind}>
      <svg viewBox="0 0 420 300" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-glow`}>
            <stop stopColor="#f5d998" stopOpacity=".19" />
            <stop offset="1" stopColor="#f5d998" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="210" cy="150" r="147" fill={`url(#${uid}-glow)`} />
        {kind === 'palace-map' &&
          Array.from({ length: 12 }, (_, i) => {
            const a = polar(61, (i * Math.PI) / 6),
              b = polar(125, (i * Math.PI) / 6);
            return <path key={`palace-${i}`} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="#d6c496" strokeOpacity=".22" />;
          })}
        {kind === 'natal-map' &&
          [-35, 35, 90].map(angle => (
            <ellipse
              key={angle}
              cx="210"
              cy="150"
              rx="137"
              ry="65"
              transform={`rotate(${angle} 210 150)`}
              fill="none"
              stroke="#e5d09d"
              strokeOpacity=".18"
            />
          ))}
        {kind === 'pair-map' && (
          <g fill="none" stroke="#d6c496" strokeOpacity=".35">
            <circle cx="166" cy="150" r="68" />
            <circle cx="254" cy="150" r="68" />
          </g>
        )}
        {kind === 'balance-path' && (
          <path
            d="M95 150L155 105L210 150L265 105L325 150L265 195L210 150L155 195Z"
            fill="#c4caa3"
            fillOpacity=".07"
            stroke="#d6c496"
            strokeOpacity=".2"
          />
        )}
        {[68, 116, 138].map(r => (
          <circle
            key={r}
            cx="210"
            cy="150"
            r={r}
            fill="none"
            stroke="#e8d4a5"
            strokeOpacity=".16"
            strokeDasharray={r === 116 ? '2 9' : undefined}
          />
        ))}
        {Array.from({ length: 24 }, (_, i) => {
          const a = polar(130, (i * Math.PI) / 12),
            b = polar(135, (i * Math.PI) / 12);
          return <path key={i} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="#ddc993" strokeOpacity=".4" />;
        })}
        {kind === 'element-flow' && countFacts.length === 5 ? (
          <>
            {[0, 1, 2, 3].map(i => (
              <rect
                key={i}
                x={50 + i * 90}
                y="37"
                width="50"
                height="28"
                rx="9"
                fill="#e8d6a7"
                fillOpacity=".15"
                stroke="#ddca98"
                strokeOpacity=".5"
              />
            ))}
            {countFacts.map((f, i) => {
              const value = Number(f.value),
                x = 45 + i * 82;
              return (
                <g key={f.id}>
                  {value > 0 && (
                    <path
                      data-reveal="true"
                      d={`M210 85C210 140 ${x} 140 ${x} 218`}
                      fill="none"
                      stroke={['#bfd0a4', '#d9b67c', '#dbcfb0', '#dddcc1', '#a8c5b5'][i]}
                      strokeWidth={Math.max(2, value * 5)}
                      strokeOpacity=".65"
                    />
                  )}
                  <circle cx={x} cy="235" r="18" fill="#e9d8a8" />
                  <text x={x} y="240" textAnchor="middle" fill="#244d40" fontSize="16">
                    {value}
                  </text>
                </g>
              );
            })}
          </>
        ) : kind === 'action-path' ? (
          <>
            <path
              data-reveal="true"
              d="M55 222C125 222 113 135 210 150S281 65 365 65"
              stroke="#d9c48d"
              strokeWidth="3"
              fill="none"
            />
            {items.map((item, i) => {
              const points = [
                  { x: 65, y: 220 },
                  { x: 210, y: 150 },
                  { x: 355, y: 65 },
                ],
                p = points[i];
              return (
                <g
                  key={item.id}
                  className={styles.diagramNode}
                  data-selected={item.id === selected}
                  onClick={() => onSelect(item.id)}
                >
                  <circle cx={p.x} cy={p.y} r="38" fill="transparent" />
                  <circle className={styles.node} cx={p.x} cy={p.y} r="23" />
                  <text
                    x={p.x}
                    y={p.y + 6}
                    fill={item.id === selected ? '#244d40' : '#e9d8a8'}
                    textAnchor="middle"
                    fontSize="18"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <>
            {nodes.map(({ item, x, y }, i) => (
              <g
                key={item.id}
                className={styles.diagramNode}
                data-selected={item.id === selected}
                onClick={() => onSelect(item.id)}
              >
                <path
                  data-reveal="true"
                  d={`M210 150Q${210 + (x - 210) * 0.2 - 20} ${150 + (y - 150) * 0.6} ${x} ${y}`}
                  fill="none"
                  stroke={item.id === selected ? '#edd59d' : '#8b9b7a'}
                  strokeWidth="2"
                />
                {kind === 'trait-map' && (
                  <path
                    d={`M210 150Q${x - 54} ${y - 18} ${x} ${y}Q${x + 54} ${y + 18} 210 150`}
                    fill="#c1cba2"
                    fillOpacity={item.id === selected ? '.28' : '.08'}
                    stroke="#d4c391"
                    strokeOpacity=".28"
                  />
                )}
                {kind === 'pair-map' && <circle cx={x} cy={y} r="35" fill="none" stroke="#d4c391" strokeOpacity=".3" />}
                <circle cx={x} cy={y} r="38" fill="transparent" />
                <circle className={styles.node} cx={x} cy={y} r="23" />
                <text
                  x={x}
                  y={y + 5}
                  fill={item.id === selected ? '#244d40' : '#e9d8a8'}
                  textAnchor="middle"
                  fontSize="15"
                >
                  {String(i + 1).padStart(2, '0')}
                </text>
              </g>
            ))}
            <circle cx="210" cy="150" r="38" fill="#244d40" stroke="#c5b17d" />
            <text x="210" y="160" textAnchor="middle" fill="#e9d8a8" fontSize="30" fontFamily="var(--font-display)">
              {typeof primary.value === 'number' ? primary.value : '✦'}
            </text>
          </>
        )}
      </svg>
      {kind === 'element-flow' && countFacts.length === 5 && (
        <div className={styles.elementLabels}>
          {countFacts.map(f => (
            <span key={f.id}>
              {(en
                ? { moc: 'Wood', hoa: 'Fire', tho: 'Earth', kim: 'Metal', thuy: 'Water' }
                : { moc: 'Mộc', hoa: 'Hỏa', tho: 'Thổ', kim: 'Kim', thuy: 'Thủy' })[f.label as 'moc'] ?? f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function VisualReading({ saved }: { saved: SavedVisualReading }) {
  const { report, snapshot } = saved,
    en = report.locale === 'en',
    copy = (vi: string, us: string) => (en ? us : vi);
  const [page, setPage] = useState(0),
    [selection, setSelection] = useState(''),
    [expanded, setExpanded] = useState(false);
  const chapter = report.chapters[page] ?? report.chapters[0],
    insight = chapter.insights.find(i => i.id === selection) ?? chapter.insights[0];
  const { root, content } = useReportMotion(`${chapter.id}:${insight.id}:${expanded}`),
    uid = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectPage = (i: number) => {
    setPage(i);
    setSelection('');
    setExpanded(false);
  };
  const selectInsight = (id: string) => {
    setSelection(id);
    setExpanded(false);
  };
  const jump = (c: Chapter, i: Insight) => {
    setPage(report.chapters.indexOf(c));
    setSelection(i.id);
    setExpanded(false);
  };
  return (
    <div ref={root} className={styles.reader} data-visual-reading={report.module}>
      <header className={styles.intro}>
        <span className={styles.eyebrow}>
          {snapshot.period
            ? copy('VẬN TRÌNH DÀNH CHO BẠN', 'YOUR PERIOD FORECAST')
            : copy('GÓC NHÌN DÀNH CHO BẠN', 'A PERSPECTIVE FOR YOU')}
        </span>
        <h2>{report.title}</h2>
        <p>{report.summary}</p>
        <span className={styles.primaryFact}>
          {snapshot.period ? (
            snapshot.period.label
          ) : (
            <>
              {snapshot.facts[0].label}: {String(snapshot.facts[0].value).slice(0, 160)}
            </>
          )}
        </span>
      </header>
      <ReadingToolbar text={visualReadingText(saved)} locale={report.locale} />
      <div role="tablist" aria-label={copy('Các chương luận giải', 'Reading chapters')} className={styles.contents}>
        {report.chapters.map((c, i) => (
          <button
            type="button"
            ref={el => {
              tabs.current[i] = el;
            }}
            key={c.id}
            role="tab"
            aria-selected={page === i}
            aria-controls={`${uid}-panel`}
            id={`${uid}-tab-${i}`}
            tabIndex={page === i ? 0 : -1}
            onKeyDown={e => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? report.chapters.length - 1
                      : (page + (e.key === 'ArrowRight' ? 1 : -1) + report.chapters.length) % report.chapters.length;
                selectPage(next);
                tabs.current[next]?.focus();
              }
            }}
            onClick={() => selectPage(i)}
            className={styles.chapterTab}
          >
            <span className={styles.tabIndex}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.tabLabel}>{c.title}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${page}`} tabIndex={0}>
        <header className={styles.cover}>
          <div>
            <span className={styles.eyebrow}>
              {copy('CHƯƠNG', 'CHAPTER')} {String(page + 1).padStart(2, '0')}
            </span>
            <h3>{chapter.title}</h3>
            <p>{chapter.summary}</p>
          </div>
          <span aria-hidden="true" className={styles.coverIndex}>
            {String(page + 1).padStart(2, '0')}
          </span>
        </header>
        <div ref={content} className={styles.body}>
          <div className={styles.figureLabel}>
            <h3>{kinds[chapter.visual.kind]?.[en ? 1 : 0]}</h3>
            <span>
              {copy('Chạm để khám phá', 'Tap to explore')}
              <br />
              {copy('Diễn giải định tính', 'Qualitative interpretation')}
            </span>
          </div>
          <Diagram chapter={chapter} input={snapshot} selected={insight.id} onSelect={selectInsight} />
          <div className={styles.choose} aria-label={copy('Chọn góc nhìn', 'Choose an insight')}>
            {chapter.insights.map((i, index) => (
              <button
                type="button"
                key={i.id}
                className={styles.insightButton}
                aria-pressed={i.id === insight.id}
                onClick={() => selectInsight(i.id)}
              >
                {String(index + 1).padStart(2, '0')} · {i.label}
              </button>
            ))}
          </div>
          <section className={styles.insightArea}>
            <span className={styles.eyebrow}>{copy('ĐIỀU ĐÁNG CHÚ Ý', 'A CLOSER LOOK')}</span>
            <h3>{insight.label}</h3>
            <p>{insight.summary}</p>
            <details className={styles.details} open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}>
              <summary aria-expanded={expanded}>
                {copy('Hiểu sâu hơn & xem căn cứ', 'Explore the meaning & evidence')}
                <span aria-hidden="true">{expanded ? '−' : '+'}</span>
              </summary>
              <div className={styles.detailCopy}>
                <section>
                  <h4>{copy('Ý nghĩa trong đời sống', 'What this means in everyday life')}</h4>
                  <p>{insight.detail}</p>
                </section>
                <section>
                  <h4>{copy('Vì sao có nhận định này?', 'Why this interpretation?')}</h4>
                  <p>{insight.rationale}</p>
                  <div className={styles.facts}>
                    {insight.sourceFactIds.map(id => {
                      const f = snapshot.facts.find(t => t.id === id)!;
                      return (
                        <span key={id} className={styles.fact}>
                          <strong>{f.label}</strong>
                          {f.value}
                        </span>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <h4>{copy('Ví dụ để dễ hình dung', 'An example to picture it')}</h4>
                  <p>{insight.example}</p>
                </section>
                {!!insight.terms.length && (
                  <section>
                    <h4>{copy('Thuật ngữ, nói đơn giản', 'Terms in plain language')}</h4>
                    <dl>
                      {insight.terms.map(t => (
                        <div key={t.term}>
                          <dt>{t.term}</dt>
                          <dd>{t.explanation}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </div>
            </details>
            <aside className={styles.action}>
              <span className={styles.eyebrow}>{copy('MỘT VIỆC BẠN CÓ THỂ THỬ', 'ONE THING TO TRY')}</span>
              <p>{insight.action}</p>
            </aside>
          </section>
        </div>
      </div>
      <div className={styles.overview}>
        {['strength', 'balance'].map(role => (
          <section key={role}>
            <span className={styles.eyebrow}>{copy('NHÌN LẠI', 'AT A GLANCE')}</span>
            <h3>
              {role === 'strength'
                ? snapshot.period
                  ? copy('Cơ hội trong kỳ', 'Opportunities this period')
                  : copy('Điểm tựa của bạn', 'Your strengths')
                : copy('Để cân bằng hơn', 'Finding your balance')}
            </h3>
            {report.chapters
              .flatMap(c =>
                c.insights
                  .filter(i => i.role === role)
                  .map(i => (
                    <button type="button" key={i.id} onClick={() => jump(c, i)}>
                      <span aria-hidden="true">↗</span>
                      {i.label}
                    </button>
                  )),
              )
              .slice(0, 4)}
          </section>
        ))}
      </div>
      <nav className={styles.pageNav} aria-label={copy('Chuyển chương', 'Chapter navigation')}>
        <button type="button" disabled={page === 0} onClick={() => selectPage(page - 1)}>
          ← {copy('Chương trước', 'Previous')}
        </button>
        <span className={styles.pagePosition}>
          {page + 1} / {report.chapters.length}
        </span>
        <button type="button" disabled={page === report.chapters.length - 1} onClick={() => selectPage(page + 1)}>
          {copy('Tiếp theo', 'Next')} →
        </button>
      </nav>
      <p className={styles.provenance}>
        {snapshot.period
          ? copy(
              'Dữ kiện lưu chuyển và quá cảnh theo ngày đã tính, được giữ cùng kỳ vận trình này.',
              'Dated moving-chart and transit evidence is saved with this forecast window.',
            )
          : copy(
              'Dữ kiện từ lá số đã tính; sơ đồ giúp khám phá các mối liên hệ trong luận giải, không phải phép đo tính cách.',
              'Calculated chart evidence; diagrams help explore interpretive connections, rather than measure personality.',
            )}
      </p>
    </div>
  );
}
