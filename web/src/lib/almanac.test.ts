import test from "node:test";
import assert from "node:assert/strict";
import {
  dayFacts,
  shiftMonth,
  parseEvents,
  occurrenceDates,
  exportEvents,
  matchesFilters,
} from "./almanac.ts";
test("Can Chi and auspicious hours use Vietnamese civil date", () => {
  const f = dayFacts("2000-01-07"); // Julian day 2451551 = Giap Ty
  assert.equal(f.dayName, "Giáp Tý");
  assert.deepEqual(
    f.hours.filter((h) => h.good).map((h) => h.branch),
    ["Tý", "Sửu", "Mão", "Ngọ", "Thân", "Dậu"],
  );
  assert.equal(f.hours[0].range, "00:00–01:00 · 23:00–24:00");
});
test("month navigation clamps selection and range", () => {
  assert.equal(shiftMonth("2024-01-31", 1), "2024-02-29");
  assert.equal(shiftMonth("2026-01-31", 1), "2026-02-28");
  assert.equal(shiftMonth("1976-01-01", -1), "1976-01-01");
});
test("legacy event migration and malformed stored input", () => {
  const [e] = parseEvents([
    { id: "1", title: "Giỗ", day: 10, month: 3, leap: false },
  ]);
  assert.equal(e.calendar, "lunar");
  assert.equal(e.leapPolicy, "regular");
  assert.equal(
    parseEvents([{ id: "x", title: "bad", day: 32, month: 1 }]).length,
    0,
  );
});
test("solar leap birthdays skip non-leap years; lunar dates follow UTC+7", () => {
  const [solar] = parseEvents([
    { id: "s", title: "Sinh nhật", day: 29, month: 2, calendar: "solar" },
  ]);
  assert.deepEqual(occurrenceDates(solar, "2026-01-01", 3), [
    "2028-02-29",
    "2032-02-29",
    "2036-02-29",
  ]);
  const [lunar] = parseEvents([
    { id: "l", title: "Tết", day: 1, month: 1, leap: false },
  ]);
  assert.equal(occurrenceDates(lunar, "2026-01-01", 1)[0], "2026-02-17");
});
test("leap-only events are distinct; combined calendar export has actual dates and alarm", () => {
  const [e] = parseEvents([
    {
      id: "l",
      title: "Giỗ, nhà; mình",
      day: 1,
      month: 2,
      calendar: "lunar",
      leapPolicy: "leap",
      reminderDays: 1,
    },
  ]);
  assert.equal(occurrenceDates(e, "2023-01-01", 1)[0], "2023-03-22");
  const ics = exportEvents([e], "2023-01-01", 1);
  assert.match(ics, /DTSTART;VALUE=DATE:20230322/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.doesNotMatch(ics, /RRULE/);
  assert.match(ics, /Giỗ\\, nhà\\; mình/);
});
test("traditional exclusions filter by lunar day, not solar day", () => {
  assert.equal(
    matchesFilters("2026-02-19", {
      good: false,
      avoidTaboo: true,
      weekend: false,
    }),
    false,
  ); // lunar 3
  assert.equal(
    matchesFilters("2026-02-17", {
      good: false,
      avoidTaboo: true,
      weekend: false,
    }),
    true,
  );
});
test("solar term transition includes time instead of assigning entire civil day", () => {
  const f = dayFacts("2026-09-23");
  assert.ok(f.termChange);
  assert.equal(f.termChange?.name, "Thu phân");
  assert.match(f.termChange!.time, /^\d{2}:\d{2}$/);
});

test('export folds long Vietnamese titles without splitting UTF-8 and uses stable occurrence IDs',()=>{
 const [e]=parseEvents([{id:'same',title:'Ngày giỗ gia đình '.repeat(4),calendar:'solar',day:1,month:1,reminderDays:7}]);
 const first=exportEvents([e],'2026-01-01',2),second=exportEvents([e],'2026-01-01',2);
 assert.ok(first.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
 assert.deepEqual(first.match(/UID:.+/g),second.match(/UID:.+/g));
 assert.equal((first.match(/BEGIN:VEVENT/g)||[]).length,2);
});
test('every day offers six distinct auspicious hours and validated event dates',()=>{
 for(let i=0;i<60;i++){
  const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);const f=dayFacts(date);
  assert.equal(f.hours.filter(h=>h.good).length,6);assert.equal(new Set(f.hours.map(h=>h.branch)).size,12);
 }
 assert.equal(parseEvents([{id:'x',title:'bad',calendar:'solar',day:31,month:4}]).length,0);
 assert.equal(parseEvents([{id:'x',title:'bad',calendar:'lunar',day:31,month:4}]).length,0);
});
