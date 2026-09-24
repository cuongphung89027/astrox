"use client";
import { useCallback, useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-client";
import {
  type BookingData,
  type Expert,
  BOOKING_STATUS,
  appointmentTime,
  appointmentPrice,
} from "@/lib/bookings";
import s from "../discovery/Discovery.module.css";
export function ExpertManager({ csrf }: { csrf: string }) {
  const [data, setData] = useState<BookingData>({
      experts: [],
      slots: [],
      bookings: [],
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState("");
  const [expert, setExpert] = useState({
      id: "",
      name: "",
      specialty: "",
      bio: "",
      active: false,
    }),
    [expertId, setExpertId] = useState(""),
    [starts, setStarts] = useState(""),
    [duration, setDuration] = useState(30),
    [price, setPrice] = useState(0),
    [links, setLinks] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      setData(await adminRequest<BookingData>("bookings"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function action(body: unknown) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminRequest("bookings", csrf, body);
      await load();
      setSuccess("Đã lưu thay đổi.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function edit(e: Expert) {
    setExpert({ ...e, active: !!e.active });
  }
  return (
    <div className={s.stack}>
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
      <div className={s.grid}>
        <form
          className={`${s.card} ${s.stack}`}
          onSubmit={async (e) => {
            e.preventDefault();
            if (await action({ action: "expert", ...expert }))
              setExpert({
                id: "",
                name: "",
                specialty: "",
                bio: "",
                active: false,
              });
          }}
        >
          <h2>{expert.id ? "Sửa chuyên gia" : "Thêm chuyên gia"}</h2>
          <label className={s.field}>
            Họ tên
            <input
              required
              maxLength={100}
              value={expert.name}
              onChange={(e) => setExpert({ ...expert, name: e.target.value })}
            />
          </label>
          <label className={s.field}>
            Chuyên môn
            <input
              required
              maxLength={160}
              value={expert.specialty}
              onChange={(e) =>
                setExpert({ ...expert, specialty: e.target.value })
              }
            />
          </label>
          <label className={s.field}>
            Giới thiệu
            <textarea
              required
              maxLength={2000}
              value={expert.bio}
              onChange={(e) => setExpert({ ...expert, bio: e.target.value })}
            />
          </label>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={expert.active}
              onChange={(e) =>
                setExpert({ ...expert, active: e.target.checked })
              }
            />
            Hiển thị công khai (đã được AstroX tuyển chọn)
          </label>
          <button className={s.button} disabled={busy}>
            Lưu chuyên gia
          </button>
          {expert.id && (
            <button
              type="button"
              className={s.secondary}
              onClick={() =>
                setExpert({
                  id: "",
                  name: "",
                  specialty: "",
                  bio: "",
                  active: false,
                })
              }
            >
              Thêm người mới
            </button>
          )}
        </form>
        <form
          className={`${s.card} ${s.stack}`}
          onSubmit={(e) => {
            e.preventDefault();
            void action({
              action: "slot",
              expertId,
              startsAt: new Date(starts + ":00+07:00").toISOString(),
              duration,
              price,
            });
          }}
        >
          <h2>Mở giờ tư vấn</h2>
          <label className={s.field}>
            Chuyên gia
            <select
              required
              value={expertId}
              onChange={(e) => setExpertId(e.target.value)}
            >
              <option value="">Chọn chuyên gia</option>
              {data.experts.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            Bắt đầu (giờ Việt Nam)
            <input
              required
              type="datetime-local"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
            />
          </label>
          <label className={s.field}>
            Thời lượng
            <select
              value={duration}
              onChange={(e) => setDuration(+e.target.value)}
            >
              {[30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} phút
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            Phí tư vấn (VND)
            <input
              required
              type="number"
              min={0}
              max={100000000}
              value={price}
              onChange={(e) => setPrice(+e.target.value)}
            />
          </label>
          <p className={s.muted}>
            Tự chừa 15 phút nghỉ giữa hai buổi. Bản hiện tại tiếp nhận yêu cầu
            và xác nhận thủ công, chưa thu tiền online.
          </p>
          <button className={s.button} disabled={busy || !data.experts.length}>
            Mở lịch
          </button>
        </form>
      </div>
      <section className={s.card}>
        <h2>Chuyên gia</h2>
        <ul className={s.list}>
          {data.experts.map((e) => (
            <li key={e.id} className={s.between}>
              <span>
                {e.name} · {e.specialty} · {e.active ? "Công khai" : "Ẩn"}
              </span>
              <button className={s.secondary} onClick={() => edit(e)}>
                Sửa
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className={s.card}>
        <h2>Lịch đã mở</h2>
        <ul className={s.list}>
          {data.slots.map((slot) => (
            <li className={s.between} key={slot.id}>
              <span>
                {data.experts.find((e) => e.id === slot.expert_id)?.name} ·{" "}
                {appointmentTime(slot.starts_at)} ·{" "}
                {appointmentPrice(slot.price)} ·{" "}
                {slot.active ? "Đang mở" : "Đã đóng"}
              </span>
              {!!slot.active && (
                <button
                  disabled={busy}
                  className={s.secondary}
                  onClick={() =>
                    void action({ action: "close-slot", id: slot.id })
                  }
                >
                  Đóng giờ
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className={s.card}>
        <h2>Yêu cầu & cuộc hẹn</h2>
        {!data.bookings.length && <p>Chưa có yêu cầu đặt lịch.</p>}
        <ul className={s.list}>
          {data.bookings.map((b) => (
            <li key={b.id}>
              <h3>
                {b.expert_name} · {BOOKING_STATUS[b.status]}
              </h3>
              <p>
                {appointmentTime(b.starts_at)} · {b.contact} ·{" "}
                {appointmentPrice(b.price)}
              </p>
              <p>{b.question}</p>
              {b.status === "pending" && (
                <label className={s.field}>
                  Link cuộc hẹn (HTTPS)
                  <input
                    type="url"
                    value={links[b.id] || ""}
                    onChange={(e) =>
                      setLinks({ ...links, [b.id]: e.target.value })
                    }
                  />
                </label>
              )}
              <div className={s.actions}>
                {(b.status === "pending"
                  ? ["confirmed", "cancelled"]
                  : b.status === "confirmed"
                    ? ["completed", "no_show", "cancelled"]
                    : []
                ).map((status) => (
                  <button
                    key={status}
                    disabled={busy}
                    className={s.secondary}
                    onClick={() =>
                      void action({
                        action: "status",
                        id: b.id,
                        status,
                        meetingUrl: links[b.id] || b.meeting_url,
                      })
                    }
                  >
                    {BOOKING_STATUS[status]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
