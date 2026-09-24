"use client";
import { useEffect, useRef, useState } from "react";
import { AUTH_API_BASE } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { openLoginDialog } from "@/lib/login-dialog";
import {
  type Expert,
  type ExpertSlot,
  type Booking,
  BOOKING_STATUS,
  appointmentTime,
  appointmentPrice,
} from "@/lib/bookings";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import s from "./Discovery.module.css";
async function api(path: string, body?: unknown) {
  const r = await fetch(`${AUTH_API_BASE}/api/${path}`, {
    credentials: "include",
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  }).catch(() => {
    throw new Error("Không kết nối được lịch hẹn. Vui lòng thử lại.");
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      r.status >= 500 || r.status === 404
        ? "Lịch chuyên gia chưa sẵn sàng. Bạn vui lòng quay lại sau."
        : data.error || "Chưa kết nối được lịch hẹn.",
    );
  return data;
}
export function Experts() {
  const { loggedIn, astroxUser } = useAuth();
  const account = astroxUser?.id || null;
  const [experts, setExperts] = useState<Expert[]>([]),
    [slots, setSlots] = useState<ExpertSlot[]>([]),
    [bookings, setBookings] = useState<Booking[]>([]),
    [chosen, setChosen] = useState<Expert | null>(null),
    [slot, setSlot] = useState(""),
    [question, setQuestion] = useState(""),
    [contact, setContact] = useState(""),
    [consent, setConsent] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [filter, setFilter] = useState("");
  const operation = useRef({ body: "", key: "" }),
    owner = useRef(account);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const timer = setTimeout(() => setNow(Date.now()), 0); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    owner.current = account;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setLoading(true);
      setError("");
      setBookings([]);
      setChosen(null);
      setContact("");
      setQuestion("");
      setConsent(false);
      operation.current = { body: "", key: "" };
    });
    Promise.all([
      api("experts"),
      loggedIn ? api("bookings") : Promise.resolve({ bookings: [] }),
    ])
      .then(([data, mine]) => {
        if (alive) {
          setExperts(data.experts);
          setSlots(data.slots);
          setBookings(mine.bookings);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loggedIn, account]);
  const current = slots.find((x) => x.id === slot);
  async function submit() {
    if (!loggedIn) {
      openLoginDialog();
      return;
    }
    if (!current || !consent) return;
    setBusy(true);
    setError("");
    setSuccess("");
    const payload = { slotId: slot, question, contact };
    const serialized = JSON.stringify(payload);
    if (operation.current.body !== serialized)
      operation.current = { body: serialized, key: crypto.randomUUID() };
    try {
      const booking = await api("bookings", {
        ...payload,
        idempotencyKey: operation.current.key,
      });
      if (owner.current !== account) return;
      setBookings((old) => [
        booking,
        ...old.filter((b) => b.id !== booking.id),
      ]);
      setSlots((old) => old.filter((s) => s.id !== slot));
      setSuccess(
        "Đã gửi yêu cầu. AstroX sẽ xác nhận thời gian và cách gặp trong mục Cuộc hẹn của bạn.",
      );
      setSlot("");
      setChosen(null);
      operation.current = { body: "", key: "" };
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("bookings/cancel", { id });
      if (owner.current !== account) return;
      setBookings((old) =>
        old.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
      );
      const data = await api("experts");
      setSlots(data.slots);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <div>
          <h1>Đặt lịch chuyên gia</h1>
        </div>
      </header>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className={s.success} role="status">
          {success}
        </p>
      )}
      {loading ? (
        <p role="status" className={s.card}>
          Đang mở lịch chuyên gia…
        </p>
      ) : (
        <>
          {experts.length > 0 && (
            <label
              className={s.field}
              style={{ maxWidth: 440, marginBottom: 24 }}
            >
              Bạn muốn trao đổi về điều gì?
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Tử Vi, Bát Tự, tình cảm…"
              />
            </label>
          )}
          <div className={s.expertGrid}>
            {experts
              .filter((e) =>
                `${e.name} ${e.specialty} ${e.bio}`
                  .toLocaleLowerCase("vi")
                  .includes(filter.toLocaleLowerCase("vi")),
              )
              .map((expert) => {
                const free = slots.filter((x) => x.expert_id === expert.id);
                return (
                  <article className={s.card} key={expert.id}>
                    <div className={s.row}>
                      <div className={s.avatar}>{expert.name.slice(0, 1)}</div>
                      <div>
                        <h2 style={{ marginBottom: 6 }}>{expert.name}</h2>
                        <span className={s.pill}>{expert.specialty}</span>
                      </div>
                    </div>
                    <p style={{ marginTop: 22 }}>{expert.bio}</p>
                    <p className={s.muted}>
                      {free.length
                        ? `Lịch gần nhất: ${appointmentTime(free[0].starts_at)}`
                        : "Chưa mở lịch mới"}
                    </p>
                    <div className={s.actions}>
                      <button
                        className={s.button}
                        disabled={!free.length || busy}
                        onClick={() => {
                          setChosen(expert);
                          setSlot("");
                          setSuccess("");
                        }}
                      >
                        Chọn lịch tư vấn ↗
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
          {!error && !experts.length && (
            <section className={`${s.card} ${s.empty}`}>
              <FeatureIcon name="calendar" size={56} />
              <h2>Chưa có lịch tư vấn</h2>
            </section>
          )}
          {experts.length > 0 &&
            !experts.some((e) =>
              `${e.name} ${e.specialty} ${e.bio}`
                .toLowerCase()
                .includes(filter.toLowerCase()),
            ) && (
              <p className={s.notice}>
                Chưa có chuyên gia phù hợp với từ khóa này.
              </p>
            )}
        </>
      )}
      {chosen && (
        <form
          className={`${s.card} ${s.stack} ${s.reveal}`}
          style={{ marginTop: 28 }}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className={s.between}>
            <h2>Lịch của {chosen.name}</h2>
            <button
              type="button"
              className={s.secondary}
              onClick={() => setChosen(null)}
              disabled={busy}
            >
              Đóng
            </button>
          </div>
          <p className={s.muted}>
            Giờ Việt Nam (UTC+7) · Phí được thống nhất khi AstroX xác nhận, chưa
            thu tiền trên trang này.
          </p>
          <div className={s.row}>
            {slots
              .filter((x) => x.expert_id === chosen.id)
              .map((x) => (
                <button
                  disabled={busy}
                  type="button"
                  key={x.id}
                  className={slot === x.id ? s.button : s.secondary}
                  aria-pressed={slot === x.id}
                  onClick={() => setSlot(x.id)}
                >
                  {appointmentTime(x.starts_at)} ·{" "}
                  {Math.round(
                    (Date.parse(x.ends_at) - Date.parse(x.starts_at)) / 60000,
                  )}{" "}
                  phút · {appointmentPrice(x.price)}
                </button>
              ))}
          </div>
          <label className={s.field}>
            Điều bạn muốn trao đổi
            <textarea
              required
              minLength={3}
              maxLength={2000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <label className={s.field}>
            Email hoặc số điện thoại liên hệ
            <input
              required
              minLength={5}
              maxLength={200}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </label>
          <label className={s.check}>
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Tôi đồng ý chia sẻ câu hỏi và thông tin liên hệ trên với AstroX để
            sắp xếp buổi tư vấn. Tôi có thể hủy trước giờ hẹn.
          </label>
          <button className={s.button} disabled={!slot || busy || !consent}>
            {busy
              ? "Đang gửi…"
              : loggedIn
                ? "Gửi yêu cầu đặt lịch"
                : "Đăng nhập để đặt lịch"}
          </button>
        </form>
      )}
      <section style={{ marginTop: 40 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            marginBottom: 20,
          }}
        >
          Cuộc hẹn của bạn
        </h2>
        {!loggedIn ? (
          <button className={s.secondary} onClick={openLoginDialog}>
            Đăng nhập để xem cuộc hẹn
          </button>
        ) : !bookings.length ? (
          <p className={s.muted}>Bạn chưa có cuộc hẹn.</p>
        ) : (
          <ul className={s.list}>
            {bookings.map((b) => (
              <li className={s.card} key={b.id}>
                <div className={s.between}>
                  <h3>{b.expert_name}</h3>
                  <span className={s.pill}>
                    {BOOKING_STATUS[b.status] || b.status}
                  </span>
                </div>
                <p>
                  {appointmentTime(b.starts_at)} · Giờ Việt Nam ·{" "}
                  {appointmentPrice(b.price)}
                </p>
                <p className={s.muted}>{b.question}</p>
                <div className={s.actions}>
                  {b.status === "confirmed" && b.meeting_url && (
                    <a
                      className={s.button}
                      href={b.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mở cuộc hẹn ↗
                    </a>
                  )}
                  {["pending", "confirmed"].includes(b.status) &&
                    now !== null && Date.parse(b.starts_at) > now && (
                      <button
                        className={s.secondary}
                        disabled={busy}
                        onClick={() => void cancel(b.id)}
                      >
                        Hủy yêu cầu
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
