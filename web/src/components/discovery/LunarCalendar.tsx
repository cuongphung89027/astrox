"use client";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  solarToLunar,
  lunarToSolar,
  vietnamToday,
  lunarLabel,
  civilDay,
  eventIcs,
  MIN_YEAR,
  MAX_YEAR,
} from "@/lib/calendar-vn";
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
} from "@/lib/almanac";
import s from "./LunarCalendar.module.css";
const STORE = "astrox-lunar-events-v1";
const weekday = (date: string) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("vi-VN", {
    weekday: "long",
    timeZone: "UTC",
  });
function download(text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "astrox-lich-am.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function LunarCalendar() {
  const [today, setToday] = useState(""),
    [selected, setSelected] = useState(""),
    [tab, setTab] = useState("calendar");
  const [events, setEvents] = useState<CalendarEvent[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [filters, setFilters] = useState<DayFilters>({
    good: true,
    avoidTaboo: true,
    weekend: false,
  });
  const [deleted, setDeleted] = useState<CalendarEvent | null>(null);
  const [direction, setDirection] = useState("solar"),
    [conversion, setConversion] = useState("");
  const [editing, setEditing] = useState<CalendarEvent | null>(null),
    [editor, setEditor] = useState(false),
    [eventCalendar, setEventCalendar] = useState<"lunar" | "solar">("lunar");
  useEffect(() => {
    const now = vietnamToday();
    // Initialize browser-only date, URL and storage after static-export hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(now);
    let date = now;
    const query = new URLSearchParams(location.search).get("date");
    if (query)
      try {
        civilDay(query);
        date = query;
      } catch {}
    setSelected(date);
    try {
      setEvents(parseEvents(JSON.parse(localStorage.getItem(STORE) || "[]")));
    } catch {
      setError("Không đọc được ngày đã lưu trên thiết bị.");
    }
    const refresh = () => setToday(vietnamToday());
    const interval = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    const sync = (e: StorageEvent) => {
      if (e.key === STORE)
        try {
          setEvents(parseEvents(JSON.parse(e.newValue || "[]")));
        } catch {}
    };
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const month = selected.slice(0, 7);
  const facts = useMemo(
    () => (selected ? dayFacts(selected) : null),
    [selected],
  );
  const days = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split("-").map(Number);
    return Array.from(
      { length: new Date(Date.UTC(y, m, 0)).getUTCDate() },
      (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, "0")}`;
        return { date, ...tradition(date), holidays: holidays(date) };
      },
    );
  }, [month]);
  const upcoming = useMemo(
    () =>
      today
        ? events
            .map((event) => ({
              event,
              next: occurrenceDates(event, today, 1)[0],
            }))
            .sort((a, b) => (a.next || "9999").localeCompare(b.next || "9999"))
        : [],
    [events, today],
  );
  const matching = useMemo(
    () => days.filter((d) => matchesFilters(d.date, filters)),
    [days, filters],
  );
  const currentEvents = selected
    ? events.filter((e) => eventsOn(e, selected))
    : [];
  function choose(date: string) {
    setSelected(date);
    setError("");
    setNotice("");
  }
  function persist(next: CalendarEvent[]) {
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
      setEvents(next);
      setError("");
      return true;
    } catch {
      setError("Không lưu được trên thiết bị này.");
      return false;
    }
  }
  function addEvent() {
    setEditing(null);
    setEventCalendar("lunar");
    setEditor(true);
    setTab("events");
    setError("");
  }
  function keyDay(e: KeyboardEvent<HTMLButtonElement>, date: string) {
    const delta = (
      { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<
        string,
        number
      >
    )[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = shiftDay(date, delta);
    choose(next);
    requestAnimationFrame(() =>
      document.getElementById(`date-${next}`)?.focus(),
    );
  }
  const monthControls = (
    <div className={s.monthControls}>
      <button
        type="button"
        aria-label="Tháng trước"
        disabled={!selected || month === `${MIN_YEAR}-01`}
        onClick={() => choose(shiftMonth(selected, -1))}
      >
        ‹
      </button>
      <label>
        <span className={s.sr}>Chọn tháng</span>
        <input
          aria-label="Chọn tháng"
          type="month"
          value={month}
          min={`${MIN_YEAR}-01`}
          max={`${MAX_YEAR}-12`}
          onChange={(e) => {
            if (!e.target.value) return;
            try {
              civilDay(e.target.value + "-01");
              choose(e.target.value + "-01");
            } catch {}
          }}
        />
      </label>
      <button
        type="button"
        aria-label="Tháng sau"
        disabled={!selected || month === `${MAX_YEAR}-12`}
        onClick={() => choose(shiftMonth(selected, 1))}
      >
        ›
      </button>
      <button
        type="button"
        className={s.todayButton}
        onClick={() => choose(today)}
        disabled={!today}
      >
        Hôm nay
      </button>
    </div>
  );
  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1>Lịch âm</h1>
        <label className={s.jump}>
          <span>Đến ngày</span>
          <input
            aria-label="Đến ngày"
            type="date"
            min={`${MIN_YEAR}-01-01`}
            max={`${MAX_YEAR}-12-31`}
            value={selected}
            onChange={(e) => {
              try {
                civilDay(e.target.value);
                choose(e.target.value);
              } catch {}
            }}
          />
        </label>
      </header>
      <nav className={s.tabs} aria-label="Chức năng lịch">
        {[
          ["calendar", "Lịch"],
          ["good", "Ngày tốt"],
          ["convert", "Đổi ngày"],
          ["events", "Sự kiện"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
          >
            {label}
            {id === "events" && events.length > 0 && (
              <small>{events.length}</small>
            )}
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
                if (
                  events.length < 100 &&
                  !events.some((e) => e.id === deleted.id) &&
                  persist([...events, deleted])
                ) {
                  setDeleted(null);
                  setNotice("Đã khôi phục sự kiện.");
                }
              }}
            >
              {" "}
              Hoàn tác
            </button>
          )}
        </p>
      )}
      {!facts ? (
        <div className={s.skeleton} role="status">
          Đang mở lịch…
        </div>
      ) : (
        <>
          {tab === "calendar" && (
            <>
              <section className={s.dayHero} aria-label="Ngày đang chọn">
                <div>
                  <span className={s.eyebrow}>{weekday(selected)}</span>
                  <div className={s.heroDate}>
                    <strong>{Number(selected.slice(-2))}</strong>
                    <span>
                      Tháng {Number(selected.slice(5, 7))}
                      <br />
                      {selected.slice(0, 4)}
                    </span>
                  </div>
                </div>
                <div className={s.lunarHero}>
                  <span>Âm lịch</span>
                  <strong>
                    {facts.lunar.day}
                    <i>/</i>
                    {facts.lunar.month}
                    {facts.lunar.leap && <small>nhuận</small>}
                  </strong>
                  <span>{facts.yearName}</span>
                </div>
                <div className={s.heroActions}>
                  <button
                    aria-label="Ngày trước"
                    disabled={selected === `${MIN_YEAR}-01-01`}
                    onClick={() => choose(shiftDay(selected, -1))}
                  >
                    ‹
                  </button>
                  <button
                    aria-label="Ngày sau"
                    disabled={selected === `${MAX_YEAR}-12-31`}
                    onClick={() => choose(shiftDay(selected, 1))}
                  >
                    ›
                  </button>
                </div>
              </section>
              <div className={s.layout}>
                <section className={s.card} aria-label="Lịch tháng">
                  {monthControls}
                  <div className={s.monthGrid}>
                    <div className={s.weekdays}>
                      {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                    <div className={s.days}>
                      {Array.from(
                        {
                          length:
                            (new Date(month + "-01T12:00:00Z").getUTCDay() +
                              6) %
                            7,
                        },
                        (_, i) => (
                          <span key={"blank" + i} />
                        ),
                      )}
                      {days.map((d) => (
                        <button
                          id={`date-${d.date}`}
                          key={d.date}
                          className={s.day}
                          aria-label={`${dateLabel(d.date)}, âm ${lunarLabel(d.lunar)}${d.date === today ? ", hôm nay" : ""}${d.holidays.length ? ", " + d.holidays.join(", ") : ""}`}
                          aria-pressed={selected === d.date}
                          aria-current={d.date === today ? "date" : undefined}
                          tabIndex={selected === d.date ? 0 : -1}
                          data-weekend={[0, 6].includes(
                            new Date(d.date + "T12:00:00Z").getUTCDay(),
                          )}
                          onClick={() => choose(d.date)}
                          onKeyDown={(e) => keyDay(e, d.date)}
                        >
                          <strong>{Number(d.date.slice(-2))}</strong>
                          <span>
                            {d.lunar.day === 1
                              ? `1/${d.lunar.month}${d.lunar.leap ? " N" : ""}`
                              : d.lunar.day}
                          </span>
                          <i
                            data-holiday={d.holidays.length > 0}
                            data-event={events.some((e) => eventsOn(e, d.date))}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={s.legend}>
                    <span>
                      <i />
                      Ngày lễ
                    </span>
                    <span>
                      <i />
                      Sự kiện
                    </span>
                    <span>Âm lịch ở dòng dưới</span>
                  </div>
                </section>
                <aside className={s.details} aria-live="polite">
                  <section className={s.card}>
                    <div className={s.sectionTitle}>
                      <h2>{dateLabel(selected)}</h2>
                      <span className={facts.good ? s.good : s.neutral}>
                        {facts.good ? "Hoàng đạo" : "Hắc đạo"}
                      </span>
                    </div>
                    <dl className={s.canChi}>
                      <div>
                        <dt>Ngày</dt>
                        <dd>{facts.dayName}</dd>
                      </div>
                      <div>
                        <dt>Tháng</dt>
                        <dd>
                          {facts.monthName}
                          {facts.lunar.leap ? " · nhuận" : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Năm</dt>
                        <dd>{facts.yearName}</dd>
                      </div>
                    </dl>
                    <div className={s.tags}>
                      {facts.holidays.map((h) => (
                        <span key={h}>{h}</span>
                      ))}
                      {currentEvents.map((e) => (
                        <span key={e.id}>{e.title}</span>
                      ))}
                    </div>
                    <div className={s.astronomy}>
                      <div>
                        <span>Tiết khí</span>
                        <strong>{facts.term}</strong>
                        {facts.termChange && (
                          <small>
                            Chuyển {facts.termChange.name} lúc{" "}
                            {facts.termChange.time}
                          </small>
                        )}
                      </div>
                      <div>
                        <span>Mặt trăng</span>
                        <strong>{facts.phase}</strong>
                        <small>Sáng {facts.illumination}% · lúc 12:00</small>
                      </div>
                    </div>
                    <button className={s.primary} onClick={addEvent}>
                      ＋ Thêm sự kiện
                    </button>
                    <button
                      className={s.exportDay}
                      onClick={() =>
                        download(
                          eventIcs(
                            facts.holidays[0] ||
                              `Ngày ${lunarLabel(facts.lunar)} âm lịch`,
                            selected,
                          ),
                        )
                      }
                    >
                      Thêm ngày này vào lịch máy ↗
                    </button>
                  </section>
                  <section className={s.card}>
                    <div className={s.sectionTitle}>
                      <h2>Giờ hoàng đạo</h2>
                      <small>UTC+7</small>
                    </div>
                    <div className={s.hours}>
                      {facts.hours
                        .filter((h) => h.good)
                        .map((h) => (
                          <div key={h.branch}>
                            <strong>{h.name}</strong>
                            <span>{h.range}</span>
                          </div>
                        ))}
                    </div>
                    <details className={s.disclosure}>
                      <summary>Tra cứu ngày</summary>
                      <p>
                        {facts.god} ·{" "}
                        {facts.taboos.length
                          ? facts.taboos.join(" · ")
                          : "Không trùng Tam nương, Nguyệt kỵ"}
                      </p>
                      <p className={s.muted}>
                        Theo lịch truyền thống, không phải bảo đảm kết quả công
                        việc.
                      </p>
                    </details>
                  </section>
                </aside>
              </div>
            </>
          )}
          {tab === "good" && (
            <section className={s.card}>
              {monthControls}
              <div className={s.filters}>
                {[
                  ["good", "Hoàng đạo"],
                  ["avoidTaboo", "Tránh Tam nương, Nguyệt kỵ"],
                  ["weekend", "Cuối tuần"],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={filters[key as keyof DayFilters]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className={s.sectionTitle}>
                <h2>{matching.length} ngày phù hợp</h2>
                <small>Tháng {Number(month.slice(5))}</small>
              </div>
              <div className={s.results}>
                {matching.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => {
                      choose(d.date);
                      setTab("calendar");
                    }}
                  >
                    <span className={s.resultDate}>
                      {Number(d.date.slice(-2))}
                      <small>{weekday(d.date)}</small>
                    </span>
                    <span>
                      <strong>{d.dayName}</strong>
                      <small>
                        Âm {d.lunar.day}/{d.lunar.month}
                        {d.lunar.leap ? " nhuận" : ""} · {d.god}
                      </small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
              {!matching.length && (
                <p className={s.empty}>Không có ngày khớp bộ lọc.</p>
              )}
              <details className={s.disclosure}>
                <summary>Cách chọn ngày</summary>
                <p>
                  Lọc theo ngày hoàng đạo của tháng âm; Tam nương: 3, 7, 13, 18,
                  22, 27; Nguyệt kỵ: 5, 14, 23 âm lịch. Tháng nhuận dùng quy tắc
                  của tháng cùng số.
                </p>
                <p>
                  Chưa xét tuổi hoặc từng việc cụ thể. Các tiêu chí là quan niệm
                  truyền thống.
                </p>
              </details>
            </section>
          )}
          {tab === "convert" && (
            <section className={`${s.card} ${s.narrow}`}>
              <div className={s.switcher}>
                {[
                  ["solar", "Dương → Âm"],
                  ["lunar", "Âm → Dương"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={direction === id}
                    onClick={() => {
                      setDirection(id);
                      setConversion("");
                      setError("");
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
                  setConversion("");
                  setError("");
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  try {
                    let date;
                    if (direction === "solar") date = String(data.get("solar"));
                    else
                      date = lunarToSolar({
                        day: Number(data.get("day")),
                        month: Number(data.get("month")),
                        year: Number(data.get("year")),
                        leap: data.get("leap") === "on",
                      });
                    civilDay(date);
                    setConversion(date);
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                    setConversion("");
                  }
                }}
              >
                {direction === "solar" ? (
                  <label>
                    Ngày dương
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
                        ["day", "Ngày", facts.lunar.day, 1, 30],
                        ["month", "Tháng", facts.lunar.month, 1, 12],
                        [
                          "year",
                          "Năm",
                          facts.lunar.year,
                          MIN_YEAR - 1,
                          MAX_YEAR,
                        ],
                      ].map(([name, label, value, min, max]) => (
                        <label key={name}>
                          {label}
                          <input
                            name={String(name)}
                            type="number"
                            required
                            defaultValue={value}
                            min={min}
                            max={max}
                          />
                        </label>
                      ))}
                    </div>
                    <label className={s.check}>
                      <input
                        name="leap"
                        type="checkbox"
                        defaultChecked={facts.lunar.leap}
                      />
                      Tháng nhuận
                    </label>
                  </>
                )}
                <button className={s.primary}>Đổi ngày</button>
              </form>
              {conversion && (
                <div className={s.conversion} role="status">
                  <strong>{dateLabel(conversion)}</strong>
                  <span>Âm lịch {lunarLabel(solarToLunar(conversion))}</span>
                  <button
                    className={s.secondary}
                    onClick={() => {
                      choose(conversion);
                      setTab("calendar");
                    }}
                  >
                    Xem trên lịch ↗
                  </button>
                </div>
              )}
            </section>
          )}
          {tab === "events" && (
            <div className={s.eventLayout}>
              <section className={s.card}>
                <div className={s.sectionTitle}>
                  <h2>Sắp tới</h2>
                  <button className={s.secondary} onClick={addEvent}>
                    ＋ Thêm
                  </button>
                </div>
                <p className={s.muted}>Lưu trên thiết bị này</p>
                {!upcoming.length && (
                  <p className={s.empty}>Chưa có sự kiện.</p>
                )}
                <div className={s.eventList}>
                  {upcoming.map(({ event: e, next }) => (
                    <article key={e.id}>
                      <div className={s.sectionTitle}>
                        <h3>{e.title}</h3>
                        {next && (
                          <span className={s.good}>
                            {civilDay(next) === civilDay(today)
                              ? "Hôm nay"
                              : `${civilDay(next) - civilDay(today)} ngày`}
                          </span>
                        )}
                      </div>
                      <p>
                        {e.day}/{e.month}{" "}
                        {e.calendar === "lunar" ? "âm" : "dương"}
                        {e.calendar === "lunar" && e.leapPolicy !== "regular"
                          ? e.leapPolicy === "leap"
                            ? " · tháng nhuận"
                            : " · cả tháng nhuận"
                          : ""}
                      </p>
                      <small>
                        {next
                          ? dateLabel(next)
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
                          Sửa
                        </button>
                        {next && (
                          <button
                            onClick={() => {
                              choose(next);
                              setTab("calendar");
                            }}
                          >
                            Xem ngày
                          </button>
                        )}
                        {next && (
                          <button
                            onClick={() => download(exportEvents([e], today))}
                          >
                            Xuất lịch
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (persist(events.filter((x) => x.id !== e.id))) {
                              setDeleted(e);
                              setNotice("Đã xóa sự kiện.");
                              if (editing?.id === e.id) setEditor(false);
                            }
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {events.length > 0 && (
                  <>
                    <button
                      className={s.secondary}
                      onClick={() => download(exportEvents(events, today))}
                    >
                      Xuất tất cả · 5 lần tới
                    </button>
                    <p className={s.muted}>
                      Nhắc lịch do ứng dụng lịch trên máy xử lý.
                    </p>
                  </>
                )}
              </section>
              {editor && (
                <form
                  key={editing?.id || "new"}
                  className={`${s.card} ${s.form}`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    const item = {
                      id: editing?.id || crypto.randomUUID(),
                      title: String(data.get("title")),
                      day: Number(data.get("day")),
                      month: Number(data.get("month")),
                      calendar: eventCalendar,
                      leapPolicy: String(data.get("leapPolicy") || "regular"),
                      reminderDays: Number(data.get("reminder")),
                    };
                    const valid = parseEvents([item]);
                    if (!valid.length) {
                      setError("Ngày hoặc tên sự kiện không hợp lệ.");
                      return;
                    }
                    if (!editing && events.length >= 100) {
                      setError("Bạn đã lưu tối đa 100 sự kiện.");
                      return;
                    }
                    if (
                      persist(
                        editing
                          ? events.map((x) =>
                              x.id === editing.id ? valid[0] : x,
                            )
                          : [...events, valid[0]],
                      )
                    ) {
                      setEditor(false);
                      setEditing(null);
                      setDeleted(null);
                      setNotice("Đã lưu sự kiện.");
                    }
                  }}
                >
                  <div className={s.sectionTitle}>
                    <h2>{editing ? "Sửa sự kiện" : "Thêm sự kiện"}</h2>
                    <button
                      type="button"
                      className={s.secondary}
                      onClick={() => setEditor(false)}
                    >
                      Đóng
                    </button>
                  </div>
                  <label>
                    Tên sự kiện
                    <input
                      name="title"
                      required
                      maxLength={80}
                      defaultValue={editing?.title || ""}
                      placeholder="Sinh nhật, ngày giỗ…"
                    />
                  </label>
                  <label>
                    Loại lịch
                    <select
                      value={eventCalendar}
                      onChange={(e) =>
                        setEventCalendar(e.target.value as "lunar" | "solar")
                      }
                    >
                      <option value="lunar">Âm lịch</option>
                      <option value="solar">Dương lịch</option>
                    </select>
                  </label>
                  <div className={s.twoFields} key={eventCalendar}>
                    <label>
                      Ngày
                      <input
                        name="day"
                        type="number"
                        required
                        min={1}
                        max={eventCalendar === "lunar" ? 30 : 31}
                        defaultValue={
                          editing?.calendar === eventCalendar
                            ? editing.day
                            : eventCalendar === "lunar"
                              ? facts.lunar.day
                              : Number(selected.slice(8, 10))
                        }
                      />
                    </label>
                    <label>
                      Tháng
                      <input
                        name="month"
                        type="number"
                        required
                        min={1}
                        max={12}
                        defaultValue={
                          editing?.calendar === eventCalendar
                            ? editing.month
                            : eventCalendar === "lunar"
                              ? facts.lunar.month
                              : Number(selected.slice(5, 7))
                        }
                      />
                    </label>
                  </div>
                  {eventCalendar === "lunar" && (
                    <label>
                      Tháng nhuận
                      <select
                        name="leapPolicy"
                        defaultValue={editing?.leapPolicy || "regular"}
                      >
                        <option value="regular">Chỉ tháng thường</option>
                        <option value="leap">Chỉ tháng nhuận</option>
                        <option value="both">Cả hai</option>
                      </select>
                    </label>
                  )}
                  <label>
                    Nhắc khi xuất lịch
                    <select
                      name="reminder"
                      defaultValue={editing?.reminderDays || 0}
                    >
                      <option value="0">Không nhắc</option>
                      <option value="1">Trước 1 ngày</option>
                      <option value="3">Trước 3 ngày</option>
                      <option value="7">Trước 7 ngày</option>
                    </select>
                  </label>
                  <small className={s.muted}>
                    Năm không có ngày đã chọn sẽ được bỏ qua.
                  </small>
                  <button className={s.primary}>Lưu sự kiện</button>
                </form>
              )}
            </div>
          )}
          <details className={s.sources}>
            <summary>Nguồn & quy ước</summary>
            <p>
              Lịch Việt UTC+7 · {MIN_YEAR}–{MAX_YEAR}. Can Chi ngày đổi lúc
              00:00; giờ Tý được tách tại nửa đêm. Tiết khí và pha trăng hiển
              thị tại 12:00 của ngày chọn.
            </p>
            <p>
              <a
                href="https://www.xemamlich.uhm.vn/calrules.html"
                target="_blank"
                rel="noreferrer"
              >
                Quy tắc lịch Việt · Hồ Ngọc Đức
              </a>{" "}
              ·{" "}
              <a
                href="https://github.com/cosinekitty/astronomy"
                target="_blank"
                rel="noreferrer"
              >
                Astronomy Engine
              </a>
            </p>
          </details>
        </>
      )}
    </div>
  );
}
