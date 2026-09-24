import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { testEnv } from "../admin/test/sqlite.mjs";
import {
  createBooking,
  adminBookingAction,
  cancelBooking,
} from "./bookings.mjs";
async function fixture() {
  const env = testEnv();
  const sql = readFileSync(
    new URL("../../migrations/bookings.sql", import.meta.url),
    "utf8",
  );
  for (const q of sql.split("-- statement --").filter((s) => s.trim()))
    await env.DB.prepare(q).run();
  await adminBookingAction(env, {
    action: "expert",
    name: "Chuyên gia thử",
    specialty: "Tử Vi",
    bio: "Tư vấn",
    active: true,
  });
  const e = await env.DB.prepare("SELECT id FROM experts").first();
  const start = new Date(Date.now() + 86400000).toISOString();
  await adminBookingAction(env, {
    action: "slot",
    expertId: e.id,
    startsAt: start,
    duration: 30,
    price: 200000,
  });
  const slot = await env.DB.prepare("SELECT id FROM expert_slots").first();
  return { env, slot: slot.id, expert: e.id, start };
}
const input = (slot) => ({
  slotId: slot,
  question: "Muốn hiểu bản thân",
  contact: "test@example.com",
  idempotencyKey: "test-booking-1234",
});
test("same slot can only have one active booking and retries are stable", async () => {
  const { env, slot } = await fixture();
  const result = await Promise.allSettled([
    createBooking(env, "u1", input(slot)),
    createBooking(env, "u2", input(slot)),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  const row = await env.DB.prepare("SELECT * FROM expert_bookings").first();
  assert.equal((await createBooking(env, row.user_id, input(slot))).id, row.id);
  assert.equal(row.price, 200000);
});
test("reject overlapping slot including buffer", async () => {
  const { env, expert, start } = await fixture();
  await assert.rejects(() =>
    adminBookingAction(env, {
      action: "slot",
      expertId: expert,
      startsAt: new Date(Date.parse(start) + 35 * 60000).toISOString(),
      duration: 30,
      price: 0,
    }),
  );
});
test("cancellation checks owner and makes slot available", async () => {
  const { env, slot } = await fixture();
  const row = await createBooking(env, "u1", input(slot));
  await assert.rejects(() => cancelBooking(env, "u2", row.id));
  await cancelBooking(env, "u1", row.id);
  assert.ok((await createBooking(env, "u2", input(slot))).id);
});
test("idempotency key may not be reused with different content", async () => {
  const { env, slot } = await fixture();
  await createBooking(env, "u1", input(slot));
  await assert.rejects(() =>
    createBooking(env, "u1", { ...input(slot), question: "Changed" }),
  );
});
test("admin validates status transitions and safe meeting URL", async () => {
  const { env, slot } = await fixture();
  const row = await createBooking(env, "u1", input(slot));
  await assert.rejects(() =>
    adminBookingAction(env, {
      action: "status",
      id: row.id,
      status: "completed",
    }),
  );
  await assert.rejects(() =>
    adminBookingAction(env, {
      action: "status",
      id: row.id,
      status: "confirmed",
      meetingUrl: "javascript:alert(1)",
    }),
  );
  await adminBookingAction(env, {
    action: "status",
    id: row.id,
    status: "confirmed",
    meetingUrl: "https://meet.google.com/test",
  });
  assert.equal(
    (await env.DB.prepare("SELECT status FROM expert_bookings").first()).status,
    "confirmed",
  );
});
import { publicBookings, adminBookings } from "./bookings.mjs";
import { sessionCookie } from "./auth.mjs";
import { publicFetch } from "./handler.mjs";
test("public API requires session and trusted origin; internal admin route is not public", async () => {
  const { env, slot } = await fixture();
  await env.DB.prepare(
    "CREATE TABLE app_users(id TEXT PRIMARY KEY,status TEXT)",
  ).run();
  await env.DB.prepare("INSERT INTO app_users VALUES('u1','active')").run();
  env.SESSION_SECRET = "test-only-session";
  const request = (headers = {}) =>
    new Request("https://api.theastrox.space/api/bookings", {
      method: "POST",
      headers,
      body: JSON.stringify(input(slot)),
    });
  assert.equal((await publicBookings(env, request())).status, 401);
  const cookie = (await sessionCookie(env, "u1")).split(";")[0];
  assert.equal(
    (
      await publicBookings(
        env,
        request({ cookie, origin: "https://wrong.example" }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await publicBookings(
        env,
        request({ cookie, origin: "https://theastrox.space" }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await publicFetch(
        new Request("https://api.theastrox.space/internal/admin/bookings"),
        env,
      )
    ).status,
    404,
  );
});
test("private meeting/contact never appears in public catalog", async () => {
  const { env, slot } = await fixture();
  await createBooking(env, "u1", input(slot));
  const response = await publicBookings(
    env,
    new Request("https://api.theastrox.space/api/experts"),
  );
  const text = await response.text();
  assert.ok(!text.includes("test@example.com"));
  assert.ok(!text.includes("Muốn hiểu"));
  assert.equal(JSON.parse(text).slots.length, 0);
});
test("cancelled and hidden slots do not accept new requests", async () => {
  const { env, slot, expert } = await fixture();
  await env.DB.prepare("UPDATE experts SET active=0 WHERE id=?")
    .bind(expert)
    .run();
  await assert.rejects(() => createBooking(env, "u1", input(slot)));
  await env.DB.prepare("UPDATE experts SET active=1 WHERE id=?")
    .bind(expert)
    .run();
  await adminBookingAction(env, { action: "close-slot", id: slot });
  await assert.rejects(() => createBooking(env, "u1", input(slot)));
});
test("cancel audit failure must roll back status change", async () => {
  const { env, slot } = await fixture();
  const row = await createBooking(env, "u1", input(slot));
  await env.DB.prepare(
    "CREATE TRIGGER reject_event BEFORE INSERT ON booking_events BEGIN SELECT RAISE(ABORT,'audit unavailable'); END",
  ).run();
  await assert.rejects(() => cancelBooking(env, "u1", row.id));
  assert.equal(
    (
      await env.DB.prepare("SELECT status FROM expert_bookings WHERE id=?")
        .bind(row.id)
        .first()
    ).status,
    "pending",
  );
});
