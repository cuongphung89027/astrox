'use client';
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  solarToLunar,
  lunarToSolar,
  vietnamToday,
  lunarLabel,
  civilDay,
  eventIcs,
  MIN_YEAR,
  MAX_YEAR,
} from '@/lib/calendar-vn';
import {
  dayFacts,
  tradition,
  holidays,
  dateLabel,
  shiftDay,
  shiftMonth,
  parseEvents,
  occurrenceDates,
  eventsOn,
  exportEvents,
  matchesFilters,
  type CalendarEvent,
  type DayFilters,
} from '@/lib/almanac';
import s from './LunarCalendar.module.css';
import { useLocale } from '@/i18n/LocaleProvider';
import { Term } from '@/components/kit/Term';
import { getDayGuideByName, formatDaySummary } from '@/lib/day-guide';
const STORE = 'astrox-lunar-events-v1';
// Select tháng/năm riêng thay cho input[type=month]: ô month native hiển thị
// theo locale trình duyệt (vd. "September 2026") ngoài tầm kiểm soát của app.
const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const weekday = (date: string, en = false) =>
  new Date(date + 'T12:00:00Z').toLocaleDateString(en ? 'en-US' : 'vi-VN', {
    weekday: 'long',
    timeZone: 'UTC',
  });
function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'astrox-lich-am.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function LunarCalendar() {
  const t = useLocale();
  const en = t.locale === 'en';
  const copy = useCallback((vi: string, us: string) => (en ? us : vi), [en]);
  const [today, setToday] = useState(''),
    [selected, setSelected] = useState(''),
    [tab, setTab] = useState('calendar');
  const [events, setEvents] = useState<CalendarEvent[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [filters, setFilters] = useState<DayFilters>({
    good: true,
    avoidTaboo: true,
    weekend: false,
  });
  const [deleted, setDeleted] = useState<CalendarEvent | null>(null);
  const [direction, setDirection] = useState('solar'),
    [conversion, setConversion] = useState('');
  const [editing, setEditing] = useState<CalendarEvent | null>(null),
    [editor, setEditor] = useState(false),
    [eventCalendar, setEventCalendar] = useState<'lunar' | 'solar'>('lunar');
  useEffect(() => {
    const now = vietnamToday();
    // Initialize browser-only date, URL and storage after static-export hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(now);
    let date = now;
    const query = new URLSearchParams(location.search).get('date');
    if (query)
      try {
        civilDay(query);
        date = query;
      } catch {}
    setSelected(date);
    try {
      setEvents(parseEvents(JSON.parse(localStorage.getItem(STORE) || '[]')));
    } catch {
      setError(copy('Không đọc được ngày đã lưu trên thiết bị.', 'Unable to read saved dates on this device.'));
    }
    const refresh = () => setToday(vietnamToday());
    const interval = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    const sync = (e: StorageEvent) => {
      if (e.key === STORE)
        try {
          setEvents(parseEvents(JSON.parse(e.newValue || '[]')));
        } catch {}
    };
    window.addEventListener('storage', sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', sync);
    };
  }, [copy]);
  const month = selected.slice(0, 7);
  const facts = useMemo(() => (selected ? dayFacts(selected, t.locale) : null), [selected, t.locale]);
  const days = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split('-').map(Number);
    return Array.from({ length: new Date(Date.UTC(y, m, 0)).getUTCDate() }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, '0')}`;
      return { date, ...tradition(date, t.locale), holidays: holidays(date, t.locale) };
    });
  }, [month, t.locale]);
  const upcoming = useMemo(
    () =>
      today
        ? events
            .map(event => ({
              event,
              next: occurrenceDates(event, today, 1)[0],
            }))
            .sort((a, b) => (a.next || '9999').localeCompare(b.next || '9999'))
        : [],
    [events, today],
  );
  const matching = useMemo(() => days.filter(d => matchesFilters(d.date, filters)), [days, filters]);
  const currentEvents = selected ? events.filter(e => eventsOn(e, selected)) : [];
  function choose(date: string) {
    setSelected(date);
    setError('');
    setNotice('');
  }
  function persist(next: CalendarEvent[]) {
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
      setEvents(next);
      setError('');
      return true;
    } catch {
      setError(copy('Không lưu được trên thiết bị này.', 'Unable to save on this device.'));
      return false;
    }
  }
  function addEvent() {
    setEditing(null);
    setEventCalendar('lunar');
    setEditor(true);
    setTab('events');
    setError('');
  }
  function keyDay(e: KeyboardEvent<HTMLButtonElement>, date: string) {
    const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = shiftDay(date, delta);
    choose(next);
    requestAnimationFrame(() => document.getElementById(`date-${next}`)?.focus());
  }
  const monthControls = (
    <div className={s.monthControls}>
      <button
        type="button"
        aria-label={copy('Tháng trước', 'Previous month')}
        disabled={!selected || month === `${MIN_YEAR}-01`}
        onClick={() => choose(shiftMonth(selected, -1))}
      >
        ‹
      </button>
      <label>
        <span className={s.sr}>{copy('Chọn tháng', 'Choose month')}</span>
        <select
          aria-label={copy('Chọn tháng', 'Choose month')}
          value={Number(month.slice(5, 7)) || 1}
          onChange={e => {
            const next = `${month.slice(0, 4)}-${String(e.target.value).padStart(2, '0')}-01`;
            try {
              civilDay(next);
              choose(next);
            } catch {}
          }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>
              {copy(`Tháng ${m}`, ENGLISH_MONTHS[m - 1])}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={s.sr}>{copy('Chọn năm', 'Choose year')}</span>
        <select
          aria-label={copy('Chọn năm', 'Choose year')}
          value={Number(month.slice(0, 4)) || MIN_YEAR}
          onChange={e => {
            const next = `${e.target.value}-${month.slice(5, 7) || '01'}-01`;
            try {
              civilDay(next);
              choose(next);
            } catch {}
          }}
        >
          {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label={copy('Tháng sau', 'Next month')}
        disabled={!selected || month === `${MAX_YEAR}-12`}
        onClick={() => choose(shiftMonth(selected, 1))}
      >
        ›
      </button>
      <button type="button" className={s.todayButton} onClick={() => choose(today)} disabled={!today}>
        {copy('Hôm nay', 'Today')}
      </button>
    </div>
  );
  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1>{en ? 'Lunar Calendar' : 'Lịch âm'}</h1>
        <label className={s.jump}>
          <span>{copy('Đến ngày', 'Go to date')}</span>
          <input
            aria-label={copy('Đến ngày', 'Go to date')}
            type="date"
            min={`${MIN_YEAR}-01-01`}
            max={`${MAX_YEAR}-12-31`}
            value={selected}
            onChange={e => {
              try {
                civilDay(e.target.value);
                choose(e.target.value);
              } catch {}
            }}
          />
        </label>
      </header>
      <nav className={s.tabs} aria-label={copy('Chức năng lịch', 'Calendar tools')}>
        {[
          ['calendar', copy('Lịch', 'Calendar')],
          ['good', copy('Ngày tốt', 'Auspicious dates')],
          ['convert', copy('Đổi ngày', 'Convert dates')],
          ['events', copy('Sự kiện', 'Events')],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setError('');
              setNotice('');
            }}
          >
            {label}
            {id === 'events' && events.length > 0 && <small>{events.length}</small>}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
          {deleted && (
            <button
              onClick={() => {
                if (events.length < 100 && !events.some(e => e.id === deleted.id) && persist([...events, deleted])) {
                  setDeleted(null);
                  setNotice(copy('Đã khôi phục sự kiện.', 'Event restored.'));
                }
              }}
            >
              {' '}
              {copy('Hoàn tác', 'Undo')}
            </button>
          )}
        </p>
      )}
      {!facts ? (
        <div className={s.skeleton} role="status">
          {copy('Đang mở lịch…', 'Loading calendar…')}
        </div>
      ) : (
        <>
          {tab === 'calendar' && (
            <>
              <section className={s.dayHero} aria-label={copy('Ngày đang chọn', 'Selected date')}>
                <div>
                  <span className={s.eyebrow}>{weekday(selected, en)}</span>
                  <div className={s.heroDate}>
                    <strong>{Number(selected.slice(-2))}</strong>
                    <span>
                      {copy('Tháng', 'Month')} {Number(selected.slice(5, 7))}
                      <br />
                      {selected.slice(0, 4)}
                    </span>
                  </div>
                </div>
                <div className={s.lunarHero}>
                  <span>{copy('Âm lịch', 'Lunar calendar')}</span>
                  <strong>
                    {facts.lunar.day}
                    <i>/</i>
                    {facts.lunar.month}
                    {facts.lunar.leap && <small>{copy('nhuận', 'leap')}</small>}
                  </strong>
                  <span>{facts.yearName}</span>
                </div>
                <div className={s.heroActions}>
                  <button
                    aria-label={copy('Ngày trước', 'Previous day')}
                    disabled={selected === `${MIN_YEAR}-01-01`}
                    onClick={() => choose(shiftDay(selected, -1))}
                  >
                    ‹
                  </button>
                  <button
                    aria-label={copy('Ngày sau', 'Next day')}
                    disabled={selected === `${MAX_YEAR}-12-31`}
                    onClick={() => choose(shiftDay(selected, 1))}
                  >
                    ›
                  </button>
                </div>
              </section>
              <div className={s.layout}>
                <section className={s.card} aria-label={copy('Lịch tháng', 'Month calendar')}>
                  {monthControls}
                  <div className={s.monthGrid}>
                    <div className={s.weekdays}>
                      {(en
                        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
                      ).map(d => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                    <div className={s.days}>
                      {Array.from(
                        {
                          length: (new Date(month + '-01T12:00:00Z').getUTCDay() + 6) % 7,
                        },
                        (_, i) => (
                          <span key={'blank' + i} />
                        ),
                      )}
                      {days.map(d => (
                        <button
                          id={`date-${d.date}`}
                          key={d.date}
                          className={s.day}
                          aria-label={`${dateLabel(d.date)}, ${copy('âm', 'lunar')} ${d.lunar.day}/${d.lunar.month}${d.lunar.leap ? copy(' nhuận', ' leap') : ''}${d.date === today ? copy(', hôm nay', ', today') : ''}${d.holidays.length ? ', ' + d.holidays.join(', ') : ''}`}
                          aria-pressed={selected === d.date}
                          aria-current={d.date === today ? 'date' : undefined}
                          tabIndex={selected === d.date ? 0 : -1}
                          data-weekend={[0, 6].includes(new Date(d.date + 'T12:00:00Z').getUTCDay())}
                          onClick={() => choose(d.date)}
                          onKeyDown={e => keyDay(e, d.date)}
                        >
                          <strong>{Number(d.date.slice(-2))}</strong>
                          <span>
                            {d.lunar.day === 1 ? `1/${d.lunar.month}${d.lunar.leap ? ' N' : ''}` : d.lunar.day}
                          </span>
                          <i data-holiday={d.holidays.length > 0} data-event={events.some(e => eventsOn(e, d.date))} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={s.legend}>
                    <span>
                      <i />
                      {copy('Ngày lễ', 'Holidays')}
                    </span>
                    <span>
                      <i />
                      {copy('Sự kiện', 'Events')}
                    </span>
                    <span>{copy('Âm lịch ở dòng dưới', 'Lunar dates on the second line')}</span>
                  </div>
                </section>
                <aside className={s.details} aria-live="polite">
                  <section className={s.card}>
                    <div className={s.sectionTitle}>
                      <h2>{dateLabel(selected)}</h2>
                      <span className={facts.good ? s.good : s.neutral}>
                        {facts.good ? copy('Hoàng đạo', 'Auspicious') : copy('Hắc đạo', 'Inauspicious')}
                      </span>
                    </div>
                    <dl className={s.canChi}>
                      <div>
                        <dt>{copy('Ngày', 'Day')}</dt>
                        <dd>{facts.dayName}</dd>
                      </div>
                      <div>
                        <dt>{copy('Tháng', 'Month')}</dt>
                        <dd>
                          {facts.monthName}
                          {facts.lunar.leap ? copy(' · nhuận', ' · leap') : ''}
                        </dd>
                      </div>
                      <div>
                        <dt>{copy('Năm', 'Year')}</dt>
                        <dd>{facts.yearName}</dd>
                      </div>
                    </dl>
                    <div className={s.tags}>
                      {facts.holidays.map(h => (
                        <span key={h}>{h}</span>
                      ))}
                      {currentEvents.map(e => (
                        <span key={e.id}>{e.title}</span>
                      ))}
                    </div>
                    <div className={s.astronomy}>
                      <div>
                        <span>{copy('Tiết khí', 'Solar term')}</span>
                        <strong>{facts.term}</strong>
                        {facts.termChange && (
                          <small>
                            {copy('Chuyển', 'Changes to')} {facts.termChange.name} {copy('lúc', 'at')}{' '}
                            {facts.termChange.time}
                          </small>
                        )}
                      </div>
                      <div>
                        <span>{copy('Mặt trăng', 'Moon')}</span>
                        <strong>{facts.phase}</strong>
                        <small>
                          {copy('Sáng', 'Illuminated')} {facts.illumination}% · 12:00 (UTC+7)
                        </small>
                      </div>
                    </div>
                    <button className={s.primary} onClick={addEvent}>
                      {copy('＋ Thêm sự kiện', '＋ Add event')}
                    </button>
                    <button
                      className={s.exportDay}
                      onClick={() =>
                        download(
                          eventIcs(
                            facts.holidays[0] ||
                              (en
                                ? `Lunar date ${facts.lunar.day}/${facts.lunar.month}`
                                : `Ngày ${lunarLabel(facts.lunar)} âm lịch`),
                            selected,
                          ),
                        )
                      }
                    >
                      {copy('Thêm ngày này vào lịch máy ↗', 'Add this date to your calendar ↗')}
                    </button>
                  </section>
                  <section className={s.card}>
                    <div className={s.sectionTitle}>
                      <h2>{copy('Giờ hoàng đạo', 'Auspicious hours')}</h2>
                      <small>UTC+7</small>
                    </div>
                    <div className={s.hours}>
                      {facts.hours
                        .filter(h => h.good)
                        .map(h => (
                          <div key={h.branch}>
                            <strong>{h.name}</strong>
                            <span>{h.range}</span>
                          </div>
                        ))}
                    </div>
                    <details className={s.disclosure}>
                      <summary>{copy('Tra cứu ngày', 'Day details')}</summary>
                      <p>
                        <Term termKey={facts.god}>{facts.god}</Term>
                        {facts.good ? ` (${copy('Hoàng đạo', 'Auspicious')})` : ` (${copy('Hắc đạo', 'Inauspicious')})`} ·{' '}
                        {facts.taboos.length
                          ? facts.taboos.map((t, idx) => (
                              <span key={t}>
                                {idx > 0 ? ' · ' : ''}
                                <Term termKey={t}>{t}</Term>
                              </span>
                            ))
                          : copy('Không trùng Tam nương, Nguyệt kỵ', 'No traditional taboo date applies')}
                      </p>
                      {(() => {
                        const guide = getDayGuideByName(facts.god);
                        const summary = formatDaySummary(guide, en ? 'en' : 'vi');
                        if (!summary.suitable && !summary.avoid) return null;
                        return (
                          <p style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.5 }}>
                            {summary.suitable && (
                              <span style={{ color: 'var(--color-accent)', fontWeight: 500, marginRight: '10px' }}>
                                <strong>{copy('Hợp: ', 'Good for: ')}</strong>{summary.suitable}
                              </span>
                            )}
                            {summary.avoid && (
                              <span style={{ color: 'var(--color-muc-2)' }}>
                                <strong>{copy('Tránh: ', 'Avoid: ')}</strong>{summary.avoid}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                      <p className={s.muted}>
                        {copy(
                          'Theo lịch truyền thống, không phải bảo đảm kết quả công việc.',
                          'Based on traditional calendar beliefs; it does not guarantee outcomes.',
                        )}
                      </p>
                    </details>
                  </section>
                </aside>
              </div>
            </>
          )}
          {tab === 'good' && (
            <section className={s.card}>
              {monthControls}
              <div className={s.filters}>
                {[
                  ['good', copy('Hoàng đạo', 'Auspicious')],
                  ['avoidTaboo', copy('Tránh Tam nương, Nguyệt kỵ', 'Avoid traditional taboo dates')],
                  ['weekend', copy('Cuối tuần', 'Weekends')],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={filters[key as keyof DayFilters]}
                      onChange={e => setFilters({ ...filters, [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className={s.sectionTitle}>
                <h2>
                  {matching.length} {copy('ngày phù hợp', 'matching dates')}
                </h2>
                <small>
                  {copy('Tháng', 'Month')} {Number(month.slice(5))}
                </small>
              </div>
              <div className={s.results}>
                {matching.map(d => {
                  const guide = getDayGuideByName(d.god);
                  const summary = formatDaySummary(guide, en ? 'en' : 'vi');
                  return (
                    <div
                      key={d.date}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        choose(d.date);
                        setTab('calendar');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          choose(d.date);
                          setTab('calendar');
                        }
                      }}
                    >
                      <span className={s.resultDate}>
                        {Number(d.date.slice(-2))}
                        <small>{weekday(d.date, en)}</small>
                      </span>
                      <span>
                        <strong>{d.dayName}</strong>
                        <small>
                          {copy('Âm', 'Lunar')} {d.lunar.day}/{d.lunar.month}
                          {d.lunar.leap ? copy(' nhuận', ' leap') : ''} · <Term termKey={d.god}>{d.god}</Term>
                        </small>
                        {summary.suitable && (
                          <span className={s.actionGuide}>
                            <span>{copy('Hợp:', 'Good for:')}</span> {summary.suitable}
                          </span>
                        )}
                      </span>
                      <span aria-hidden="true">↗</span>
                    </div>
                  );
                })}
              </div>
              {!matching.length && (
                <p className={s.empty}>{copy('Không có ngày khớp bộ lọc.', 'No dates match your filters.')}</p>
              )}
              <details className={s.disclosure}>
                <summary>{copy('Cách chọn ngày', 'How dates are selected')}</summary>
                <p>
                  {copy(
                    'Lọc theo ngày hoàng đạo của tháng âm; Tam nương: 3, 7, 13, 18, 22, 27; Nguyệt kỵ: 5, 14, 23 âm lịch. Tháng nhuận dùng quy tắc của tháng cùng số.',
                    'Filters use the lunar month’s traditional auspicious dates. Three Ladies taboo dates: 3, 7, 13, 18, 22, 27. Lunar taboo dates: 5, 14, 23. Leap months follow the rules of the same numbered month.',
                  )}
                </p>
                <p>
                  {copy(
                    'Chưa xét tuổi hoặc từng việc cụ thể. Các tiêu chí là quan niệm truyền thống.',
                    'Age and specific activities are not considered. These criteria reflect traditional beliefs.',
                  )}
                </p>
              </details>
            </section>
          )}
          {tab === 'convert' && (
            <section className={`${s.card} ${s.narrow}`}>
              <div className={s.switcher}>
                {[
                  ['solar', copy('Dương → Âm', 'Solar → Lunar')],
                  ['lunar', copy('Âm → Dương', 'Lunar → Solar')],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={direction === id}
                    onClick={() => {
                      setDirection(id);
                      setConversion('');
                      setError('');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <form
                key={direction + selected}
                className={s.form}
                onChange={() => {
                  setConversion('');
                  setError('');
                }}
                onSubmit={e => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  try {
                    let date;
                    if (direction === 'solar') date = String(data.get('solar'));
                    else
                      date = lunarToSolar({
                        day: Number(data.get('day')),
                        month: Number(data.get('month')),
                        year: Number(data.get('year')),
                        leap: data.get('leap') === 'on',
                      });
                    civilDay(date);
                    setConversion(date);
                    setError('');
                  } catch (e) {
                    setError(
                      en ? 'Invalid date. Check the lunar day, month and leap-month setting.' : (e as Error).message,
                    );
                    setConversion('');
                  }
                }}
              >
                {direction === 'solar' ? (
                  <label>
                    {copy('Ngày dương', 'Solar date')}
                    <input
                      name="solar"
                      type="date"
                      required
                      defaultValue={selected}
                      min={`${MIN_YEAR}-01-01`}
                      max={`${MAX_YEAR}-12-31`}
                    />
                  </label>
                ) : (
                  <>
                    <div className={s.threeFields}>
                      {[
                        ['day', copy('Ngày', 'Day'), facts.lunar.day, 1, 30],
                        ['month', copy('Tháng', 'Month'), facts.lunar.month, 1, 12],
                        ['year', copy('Năm', 'Year'), facts.lunar.year, MIN_YEAR - 1, MAX_YEAR],
                      ].map(([name, label, value, min, max]) => (
                        <label key={name}>
                          {label}
                          <input name={String(name)} type="number" required defaultValue={value} min={min} max={max} />
                        </label>
                      ))}
                    </div>
                    <label className={s.check}>
                      <input name="leap" type="checkbox" defaultChecked={facts.lunar.leap} />
                      {copy('Tháng nhuận', 'Leap month')}
                    </label>
                  </>
                )}
                <button className={s.primary}>{copy('Đổi ngày', 'Convert dates')}</button>
              </form>
              {conversion && (
                <div className={s.conversion} role="status">
                  <strong>{dateLabel(conversion)}</strong>
                  <span>
                    {copy('Âm lịch', 'Lunar date')} {lunarLabel(solarToLunar(conversion), en ? 'en' : 'vi')}
                  </span>
                  <button
                    className={s.secondary}
                    onClick={() => {
                      choose(conversion);
                      setTab('calendar');
                    }}
                  >
                    {copy('Xem trên lịch ↗', 'View on calendar ↗')}
                  </button>
                </div>
              )}
            </section>
          )}
          {tab === 'events' && (
            <div className={s.eventLayout}>
              <section className={s.card}>
                <div className={s.sectionTitle}>
                  <h2>{copy('Sắp tới', 'Upcoming')}</h2>
                  <button className={s.secondary} onClick={addEvent}>
                    {copy('＋ Thêm', '＋ Add')}
                  </button>
                </div>
                <p className={s.muted}>{copy('Lưu trên thiết bị này', 'Saved on this device')}</p>
                {!upcoming.length && <p className={s.empty}>{copy('Chưa có sự kiện.', 'No events yet.')}</p>}
                <div className={s.eventList}>
                  {upcoming.map(({ event: e, next }) => (
                    <article key={e.id}>
                      <div className={s.sectionTitle}>
                        <h3>{e.title}</h3>
                        {next && (
                          <span className={s.good}>
                            {civilDay(next) === civilDay(today)
                              ? copy('Hôm nay', 'Today')
                              : `${civilDay(next) - civilDay(today)} ${en ? 'days' : 'ngày'}`}
                          </span>
                        )}
                      </div>
                      <p>
                        {e.day}/{e.month} {e.calendar === 'lunar' ? copy('âm', 'lunar') : copy('dương', 'solar')}
                        {e.calendar === 'lunar' && e.leapPolicy !== 'regular'
                          ? e.leapPolicy === 'leap'
                            ? copy(' · tháng nhuận', ' · leap month')
                            : copy(' · cả tháng nhuận', ' · including leap months')
                          : ''}
                      </p>
                      <small>
                        {next
                          ? dateLabel(next)
                          : en
                            ? `No further dates through ${MAX_YEAR}`
                            : `Không còn ngày phù hợp đến ${MAX_YEAR}`}
                      </small>
                      <div className={s.eventActions}>
                        <button
                          onClick={() => {
                            setEditing(e);
                            setEventCalendar(e.calendar);
                            setEditor(true);
                          }}
                        >
                          {copy('Sửa', 'Edit')}
                        </button>
                        {next && (
                          <button
                            onClick={() => {
                              choose(next);
                              setTab('calendar');
                            }}
                          >
                            {copy('Xem ngày', 'View date')}
                          </button>
                        )}
                        {next && (
                          <button onClick={() => download(exportEvents([e], today))}>
                            {copy('Xuất lịch', 'Export calendar')}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (persist(events.filter(x => x.id !== e.id))) {
                              setDeleted(e);
                              setNotice(copy('Đã xóa sự kiện.', 'Event deleted.'));
                              if (editing?.id === e.id) setEditor(false);
                            }
                          }}
                        >
                          {copy('Xóa', 'Delete')}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {events.length > 0 && (
                  <>
                    <button className={s.secondary} onClick={() => download(exportEvents(events, today))}>
                      {copy('Xuất tất cả · 5 lần tới', 'Export all · next 5 occurrences')}
                    </button>
                    <p className={s.muted}>
                      {copy(
                        'Nhắc lịch do ứng dụng lịch trên máy xử lý.',
                        'Reminders are managed by your calendar app.',
                      )}
                    </p>
                  </>
                )}
              </section>
              {editor && (
                <form
                  key={editing?.id || 'new'}
                  className={`${s.card} ${s.form}`}
                  onSubmit={e => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    const item = {
                      id: editing?.id || crypto.randomUUID(),
                      title: String(data.get('title')),
                      day: Number(data.get('day')),
                      month: Number(data.get('month')),
                      calendar: eventCalendar,
                      leapPolicy: String(data.get('leapPolicy') || 'regular'),
                      reminderDays: Number(data.get('reminder')),
                    };
                    const valid = parseEvents([item]);
                    if (!valid.length) {
                      setError(copy('Ngày hoặc tên sự kiện không hợp lệ.', 'Invalid event name or date.'));
                      return;
                    }
                    if (!editing && events.length >= 100) {
                      setError(copy('Bạn đã lưu tối đa 100 sự kiện.', 'You have reached the limit of 100 events.'));
                      return;
                    }
                    if (
                      persist(editing ? events.map(x => (x.id === editing.id ? valid[0] : x)) : [...events, valid[0]])
                    ) {
                      setEditor(false);
                      setEditing(null);
                      setDeleted(null);
                      setNotice(copy('Đã lưu sự kiện.', 'Event saved.'));
                    }
                  }}
                >
                  <div className={s.sectionTitle}>
                    <h2>{editing ? copy('Sửa sự kiện', 'Edit event') : copy('Thêm sự kiện', 'Add event')}</h2>
                    <button type="button" className={s.secondary} onClick={() => setEditor(false)}>
                      {copy('Đóng', 'Close')}
                    </button>
                  </div>
                  <label>
                    {copy('Tên sự kiện', 'Event name')}
                    <input
                      name="title"
                      required
                      maxLength={80}
                      defaultValue={editing?.title || ''}
                      placeholder={copy('Sinh nhật, ngày giỗ…', 'Birthday, anniversary…')}
                    />
                  </label>
                  <label>
                    {copy('Loại lịch', 'Calendar type')}
                    <select value={eventCalendar} onChange={e => setEventCalendar(e.target.value as 'lunar' | 'solar')}>
                      <option value="lunar">{copy('Âm lịch', 'Lunar calendar')}</option>
                      <option value="solar">{copy('Dương lịch', 'Solar calendar')}</option>
                    </select>
                  </label>
                  <div className={s.twoFields} key={eventCalendar}>
                    <label>
                      {copy('Ngày', 'Day')}
                      <input
                        name="day"
                        type="number"
                        required
                        min={1}
                        max={eventCalendar === 'lunar' ? 30 : 31}
                        defaultValue={
                          editing?.calendar === eventCalendar
                            ? editing.day
                            : eventCalendar === 'lunar'
                              ? facts.lunar.day
                              : Number(selected.slice(8, 10))
                        }
                      />
                    </label>
                    <label>
                      {copy('Tháng', 'Month')}
                      <input
                        name="month"
                        type="number"
                        required
                        min={1}
                        max={12}
                        defaultValue={
                          editing?.calendar === eventCalendar
                            ? editing.month
                            : eventCalendar === 'lunar'
                              ? facts.lunar.month
                              : Number(selected.slice(5, 7))
                        }
                      />
                    </label>
                  </div>
                  {eventCalendar === 'lunar' && (
                    <label>
                      {copy('Tháng nhuận', 'Leap month')}
                      <select name="leapPolicy" defaultValue={editing?.leapPolicy || 'regular'}>
                        <option value="regular">{copy('Chỉ tháng thường', 'Regular months only')}</option>
                        <option value="leap">{copy('Chỉ tháng nhuận', 'Leap months only')}</option>
                        <option value="both">{copy('Cả hai', 'Both')}</option>
                      </select>
                    </label>
                  )}
                  <label>
                    {copy('Nhắc khi xuất lịch', 'Reminder for exported events')}
                    <select name="reminder" defaultValue={editing?.reminderDays || 0}>
                      <option value="0">{copy('Không nhắc', 'No reminder')}</option>
                      <option value="1">{copy('Trước 1 ngày', '1 day before')}</option>
                      <option value="3">{copy('Trước 3 ngày', '3 days before')}</option>
                      <option value="7">{copy('Trước 7 ngày', '7 days before')}</option>
                    </select>
                  </label>
                  <small className={s.muted}>
                    {copy('Năm không có ngày đã chọn sẽ được bỏ qua.', 'Years without the selected date are skipped.')}
                  </small>
                  <button className={s.primary}>{copy('Lưu sự kiện', 'Save event')}</button>
                </form>
              )}
            </div>
          )}
          <details className={s.sources}>
            <summary>{copy('Nguồn & quy ước', 'Sources & conventions')}</summary>
            <p>
              {en ? (
                `Vietnamese calendar, UTC+7 · ${MIN_YEAR}–${MAX_YEAR}. The day’s stem and branch change at midnight; the Rat hour is split at midnight. Solar terms and moon phases are shown for noon on the selected date.`
              ) : (
                <>
                  Lịch Việt UTC+7 · {MIN_YEAR}–{MAX_YEAR}. Can Chi ngày đổi lúc 00:00; giờ Tý được tách tại nửa đêm.
                  Tiết khí và pha trăng hiển thị tại 12:00 của ngày chọn.
                </>
              )}
            </p>
            <p>
              <a href="https://www.xemamlich.uhm.vn/calrules.html" target="_blank" rel="noreferrer">
                {copy('Quy tắc lịch Việt · Hồ Ngọc Đức', 'Vietnamese calendar rules · Ho Ngoc Duc')}
              </a>{' '}
              ·{' '}
              <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">
                Astronomy Engine
              </a>
            </p>
          </details>
        </>
      )}
    </div>
  );
}
