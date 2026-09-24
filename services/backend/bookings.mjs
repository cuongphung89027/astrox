import { bodyJson, json, trustedOrigin } from "./http.mjs";
import { readSession } from "./auth.mjs";
const fail = (message, status = 422) => {
  throw Object.assign(new Error(message), { status });
};
const str = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const now = () => new Date().toISOString();
export async function bookingCatalog(env) {
  const experts = (
    await env.DB.prepare(
      "SELECT id,name,specialty,bio FROM experts WHERE active=1 ORDER BY name LIMIT 100",
    ).all()
  ).results;
  const slots = (
    await env.DB.prepare(
      "SELECT s.id,s.expert_id,s.starts_at,s.ends_at,s.price FROM expert_slots s JOIN experts e ON e.id=s.expert_id WHERE e.active=1 AND s.active=1 AND s.starts_at>? AND NOT EXISTS(SELECT 1 FROM expert_bookings b WHERE b.slot_id=s.id AND b.status!='cancelled') ORDER BY s.starts_at LIMIT 500",
    )
      .bind(now())
      .all()
  ).results;
  return { experts, slots };
}
export async function createBooking(env, userId, b) {
  const slotId = str(b?.slotId, 80),
    question = str(b?.question, 2000),
    contact = str(b?.contact, 200),
    key = str(b?.idempotencyKey, 100);
  if (
    !slotId ||
    question.length < 3 ||
    contact.length < 5 ||
    !/^[\w-]{12,100}$/.test(key)
  )
    fail("Điền câu hỏi, thông tin liên hệ và chọn giờ tư vấn.");
  const previous = await env.DB.prepare(
    "SELECT * FROM expert_bookings WHERE user_id=? AND idempotency_key=?",
  )
    .bind(userId, key)
    .first();
  if (previous) {
    if (
      previous.slot_id !== slotId ||
      previous.question !== question ||
      previous.contact !== contact
    )
      fail("Yêu cầu đã thay đổi. Vui lòng gửi lại.", 409);
    return previous;
  }
  const id = crypto.randomUUID(),
    time = now();
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO expert_bookings(id,user_id,slot_id,expert_name,specialty,starts_at,ends_at,price,question,contact,status,idempotency_key,created_at,updated_at) SELECT ?,?,s.id,e.name,e.specialty,s.starts_at,s.ends_at,s.price,?,?,'pending',?,?,? FROM expert_slots s JOIN experts e ON e.id=s.expert_id WHERE s.id=? AND s.active=1 AND e.active=1 AND s.starts_at>? AND (SELECT COUNT(*) FROM expert_bookings WHERE user_id=? AND status IN('pending','confirmed') AND starts_at>?)<5",
      ).bind(
        id,
        userId,
        question,
        contact,
        key,
        time,
        time,
        slotId,
        time,
        userId,
        time,
      ),
      env.DB.prepare(
        "INSERT INTO booking_events(id,booking_id,actor,status,created_at) SELECT ?,id,?,'pending',? FROM expert_bookings WHERE id=?",
      ).bind(crypto.randomUUID(), userId, time, id),
    ]);
  } catch (e) {
    if (/unique|constraint/i.test(e.message)) {
      const retry = await env.DB.prepare(
        "SELECT * FROM expert_bookings WHERE user_id=? AND idempotency_key=?",
      )
        .bind(userId, key)
        .first();
      if (
        retry &&
        retry.slot_id === slotId &&
        retry.question === question &&
        retry.contact === contact
      )
        return retry;
      fail("Giờ này vừa được đặt. Hãy chọn giờ khác.", 409);
    }
    throw e;
  }
  const booking = await env.DB.prepare(
    "SELECT * FROM expert_bookings WHERE id=?",
  )
    .bind(id)
    .first();
  if (!booking)
    fail("Giờ không còn trống hoặc bạn đã có 5 cuộc hẹn sắp tới.", 409);
  return booking;
}
async function transition(
  env,
  { id, actor, status, meeting = "", where, args = [] },
) {
  const time = now();
  const result = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO booking_events(id,booking_id,actor,status,created_at) SELECT ?,id,?,?,? FROM expert_bookings WHERE id=? AND ${where}`,
    ).bind(crypto.randomUUID(), actor, status, time, id, ...args),
    env.DB.prepare(
      `UPDATE expert_bookings SET status=?,meeting_url=CASE WHEN ?='' THEN meeting_url ELSE ? END,updated_at=? WHERE id=? AND ${where}`,
    ).bind(status, meeting, meeting, time, id, ...args),
  ]);
  if (result[1].meta.changes !== 1)
    fail("Cuộc hẹn đã thay đổi hoặc không thể cập nhật lúc này.", 409);
  return { ok: true };
}
export async function cancelBooking(env, userId, id) {
  return transition(env, {
    id,
    actor: userId,
    status: "cancelled",
    where: "user_id=? AND status IN('pending','confirmed') AND starts_at>?",
    args: [userId, now()],
  });
}
export async function adminBookingAction(env, b, actor = "admin") {
  if (b?.action === "expert") {
    const id = str(b.id, 80) || crypto.randomUUID(),
      name = str(b.name, 100),
      specialty = str(b.specialty, 160),
      bio = str(b.bio, 2000);
    if (!name || !specialty || !bio || typeof b.active !== "boolean")
      fail("Nhập tên, chuyên môn và giới thiệu chuyên gia.");
    await env.DB.prepare(
      "INSERT INTO experts VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,specialty=excluded.specialty,bio=excluded.bio,active=excluded.active,updated_at=excluded.updated_at",
    )
      .bind(id, name, specialty, bio, b.active ? 1 : 0, now())
      .run();
    return { id };
  }
  if (b?.action === "slot") {
    const stamp = Date.parse(b.startsAt),
      duration = Number(b.duration),
      price = Number(b.price);
    if (
      !Number.isFinite(stamp) ||
      stamp <= Date.now() ||
      stamp > Date.now() + 366 * 86400000 ||
      ![30, 60, 90].includes(duration) ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      price > 100000000
    )
      fail(
        "Chọn giờ trong 12 tháng tới, thời lượng 30/60/90 phút và giá hợp lệ.",
      );
    if (
      !(await env.DB.prepare("SELECT id FROM experts WHERE id=?")
        .bind(str(b.expertId, 80))
        .first())
    )
      fail("Không tìm thấy chuyên gia.");
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare("INSERT INTO expert_slots VALUES(?,?,?,?,?,?,1)")
        .bind(
          id,
          b.expertId,
          new Date(stamp).toISOString(),
          new Date(stamp + duration * 60000).toISOString(),
          new Date(stamp + (duration + 15) * 60000).toISOString(),
          price,
        )
        .run();
    } catch (e) {
      if (/slot_overlap/.test(e.message))
        fail("Lịch bị trùng hoặc chưa đủ 15 phút nghỉ giữa hai buổi.", 409);
      throw e;
    }
    return { id };
  }
  if (b?.action === "close-slot") {
    const r = await env.DB.prepare(
      "UPDATE expert_slots SET active=0 WHERE id=? AND NOT EXISTS(SELECT 1 FROM expert_bookings WHERE slot_id=? AND status IN('pending','confirmed')) RETURNING id",
    )
      .bind(str(b.id, 80), str(b.id, 80))
      .first();
    if (!r) fail("Hủy cuộc hẹn đang giữ giờ này trước khi đóng lịch.", 409);
    return { ok: true };
  }
  if (b?.action === "status") {
    const id = str(b.id, 80),
      status = str(b.status, 20),
      meeting = str(b.meetingUrl, 1000);
    if (meeting) {
      let u;
      try {
        u = new URL(meeting);
      } catch {
        fail("Link cuộc hẹn không hợp lệ.");
      }
      if (u.protocol !== "https:" || u.username || u.password)
        fail("Link cuộc hẹn phải dùng HTTPS.");
    }
    const transitions = {
      confirmed: ["pending"],
      cancelled: ["pending", "confirmed"],
      completed: ["confirmed"],
      no_show: ["confirmed"],
    };
    if (!transitions[status]) fail("Trạng thái không hợp lệ.");
    if (status === "confirmed" && !meeting)
      fail("Thêm link cuộc hẹn trước khi xác nhận.");
    return transition(env, {
      id,
      actor,
      status,
      meeting,
      where: `status IN(${transitions[status].map(() => "?").join(",")}) ${["completed", "no_show"].includes(status) ? "AND ends_at<=?" : ""}`,
      args: [
        ...transitions[status],
        ...(["completed", "no_show"].includes(status) ? [now()] : []),
      ],
    });
  }
  fail("Thao tác không hợp lệ.");
}
export async function adminBookings(env, request) {
  try {
    if (request.method === "GET")
      return Response.json({
        experts: (
          await env.DB.prepare(
            "SELECT * FROM experts ORDER BY name LIMIT 100",
          ).all()
        ).results,
        slots: (
          await env.DB.prepare(
            "SELECT * FROM expert_slots WHERE starts_at>? ORDER BY starts_at LIMIT 500",
          )
            .bind(new Date(Date.now() - 30 * 86400000).toISOString())
            .all()
        ).results,
        bookings: (
          await env.DB.prepare(
            "SELECT * FROM expert_bookings ORDER BY created_at DESC LIMIT 300",
          ).all()
        ).results,
      });
    if (request.method !== "POST")
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    return Response.json(
      await adminBookingAction(env, await bodyJson(request)),
    );
  } catch (e) {
    if (!e.status) throw e;
    return Response.json({ error: e.message }, { status: e.status });
  }
}
export async function publicBookings(env, request) {
  try {
    const path = new URL(request.url).pathname;
    if (path === "/api/experts" && request.method === "GET")
      return json(env, request, await bookingCatalog(env));
    const session = await readSession(env, request);
    if (!session)
      return json(
        env,
        request,
        { error: "Vui lòng đăng nhập để quản lý cuộc hẹn." },
        401,
      );
    if (request.method === "GET")
      return json(env, request, {
        bookings: (
          await env.DB.prepare(
            "SELECT * FROM expert_bookings WHERE user_id=? ORDER BY starts_at DESC LIMIT 100",
          )
            .bind(session.sub)
            .all()
        ).results,
      });
    if (request.method !== "POST")
      return json(env, request, { error: "method_not_allowed" }, 405);
    if (!trustedOrigin(env, request))
      return json(env, request, { error: "invalid_origin" }, 403);
    const b = await bodyJson(request);
    return json(
      env,
      request,
      path === "/api/bookings/cancel"
        ? await cancelBooking(env, session.sub, str(b?.id, 80))
        : await createBooking(env, session.sub, b),
    );
  } catch (e) {
    if (!e.status) throw e;
    return json(env, request, { error: e.message }, e.status);
  }
}
