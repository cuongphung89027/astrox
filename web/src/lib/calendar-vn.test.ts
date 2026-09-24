import { test } from "node:test";
import assert from "node:assert/strict";
import { solarToLunar, lunarToSolar } from "./calendar-vn.ts";
for (const [date, day, month, year, leap] of [
  ["2026-02-17", 1, 1, 2026, false],
  ["2025-01-29", 1, 1, 2025, false],
  ["2024-02-10", 1, 1, 2024, false],
  ["2023-03-22", 1, 2, 2023, true],
  ["2007-02-17", 1, 1, 2007, false],
  ["1985-01-21", 1, 1, 1985, false],
] as const) {
  test(`Vietnam calendar ${date}`, () => {
    assert.deepEqual(solarToLunar(date), { day, month, year, leap });
    assert.equal(lunarToSolar({ day, month, year, leap }), date);
  });
}
test("reject nonexistent civil and lunar dates", () => {
  assert.throws(() => solarToLunar("2026-02-30"));
  assert.throws(() =>
    lunarToSolar({ day: 1, month: 4, year: 2026, leap: true }),
  );
  assert.throws(() =>
    lunarToSolar({ day: 31, month: 1, year: 2026, leap: false }),
  );
});
test("round trips every civil day from 1976 through 2100, independently of process timezone", () => {
  for (let t = Date.UTC(1976, 0, 1); t < Date.UTC(2101, 0, 1); t += 86400000) {
    const iso = new Date(t).toISOString().slice(0, 10);
    assert.equal(lunarToSolar(solarToLunar(iso)), iso);
  }
});
