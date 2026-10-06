'use client';
import { useId, useState } from 'react';
import type { VisualInput } from '../../../../services/admin/visual-reading';
import styles from './PeriodTimeline.module.css';

export function PeriodTimeline({ input }: { input: VisualInput }) {
  const period = input.period!,
    en = input.locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  const uid = useId().replace(/:/g, '');
  const [index, setIndex] = useState(0);
  const samples = period.samples;
  const sample = samples[index] ?? samples[0],
    fact = input.facts.find(f => f.id === sample.factId)!;
  const first = Math.min(...samples.map(s => Date.parse(s.date))),
    last = Math.max(...samples.map(s => Date.parse(s.date)));
  const position = (date: string) => (last === first ? 300 : 64 + ((Date.parse(date) - first) / (last - first)) * 472);
  const short = (date: string) =>
    en
      ? new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      : date.slice(8) + '/' + date.slice(5, 7);
  const outside = sample.date < period.start || sample.date > period.end;
  return (
    <div className={styles.timeline} data-period-timeline={period.kind}>
      <div className={styles.window}>
        <div>
          <span>{copy('KỲ ĐANG XEM', 'CALENDAR WINDOW')}</span>
          <strong>{period.label}</strong>
        </div>
        <time dateTime={period.asOf}>
          {copy('Tính ngày', 'As of')} {short(period.asOf)}
        </time>
      </div>
      <svg
        viewBox="0 0 600 236"
        role="group"
        aria-label={copy('Mốc tính trong kỳ và tham chiếu', 'Calculated dates and reference samples')}
      >
        <defs>
        <linearGradient id={uid + '-rail'} gradientUnits="userSpaceOnUse" x1="40" y1="117" x2="560" y2="117">
            <stop stopColor="#90ab91" />
            <stop offset=".55" stopColor="#ead59d" />
            <stop offset="1" stopColor="#aac0a1" />
          </linearGradient>
          <radialGradient id={uid + '-halo'}>
            <stop stopColor="#edd9a5" stopOpacity=".24" />
            <stop offset="1" stopColor="#edd9a5" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <path key={i} d={`M${64 + i * 78.6} 54V172`} stroke="#d8cca4" strokeOpacity=".1" strokeDasharray="2 7" />
        ))}
        <path data-reveal="true" d="M40 117H560" fill="none" stroke={`url(#${uid}-rail)`} strokeWidth="2" />
        {samples.map((s, i) => {
          const x = position(s.date),
            active = i === index,
            beyond = s.date < period.start || s.date > period.end;
          return (
            <g
              key={s.factId}
              className={styles.sample}
              role="button"
              tabIndex={0}
              data-sample-date={s.date}
              data-selected={active}
              aria-pressed={active}
              aria-label={
                short(s.date) + (beyond ? copy(' · mốc tham chiếu ngoài kỳ', ' · reference outside this window') : '')
              }
              onClick={() => setIndex(i)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIndex(i);
                }
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + samples.length) % samples.length;
                  setIndex(next);
                  (e.currentTarget.parentElement?.querySelectorAll('[data-sample-date]')[next] as SVGElement)?.focus();
                }
              }}
            >
              {active && <circle cx={x} cy="117" r="62" fill={`url(#${uid}-halo)`} />}
              <circle cx={x} cy="117" r="56" fill="transparent" />
              <path d={`M${x} ${i % 2 ? 141 : 93}V${i % 2 ? 164 : 69}`} stroke="#ddcc9c" strokeOpacity=".55" />
              <circle className={styles.node} cx={x} cy="117" r="15" />
              <circle cx={x} cy="117" r="3" fill={active ? '#244d40' : '#e4d3a1'} />
              <text
                x={x}
                y={i % 2 ? 195 : 49}
                textAnchor="middle"
                fill={active ? '#f2dfae' : '#bdd0ba'}
                fontSize="30"
                fontFamily="var(--font-display)"
              >
                {short(s.date)}
              </text>
              {beyond && (
                <text x={x} y={i % 2 ? 217 : 28} textAnchor="middle" fill="#b9c5ab" fontSize="14">
                  {copy('THAM CHIẾU', 'REFERENCE')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className={styles.sampleCopy} aria-live="polite">
        <span>{copy('DỮ KIỆN Ở MỐC BẠN CHỌN', 'EVIDENCE AT THE SELECTED DATE')}</span>
        <h4>{short(sample.date)}</h4>
        <details key={sample.factId}>
          <summary>
            {String(fact.value).slice(0, 150)}
            {String(fact.value).length > 150 ? '…' : ''}
          </summary>
          <p>{fact.value}</p>
        </details>
        {outside && (
          <small>
            {copy(
              'Mốc này nằm ngoài kỳ lịch, được giữ làm dữ kiện tham chiếu.',
              'This sample is outside the calendar window and is retained as reference evidence.',
            )}
          </small>
        )}
      </div>
    </div>
  );
}
