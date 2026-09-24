import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePalmReading } from "./palm.ts";
test("unclear image cannot acquire fabricated annotations", () => {
  assert.throws(() =>
    parsePalmReading(
      JSON.stringify({
        quality: "retake",
        message: "Mờ",
        summary: "",
        lines: [
          {
            name: "A",
            observation: "A",
            reading: "A",
            points: [
              [0.2, 0.3],
              [0.4, 0.5],
            ],
          },
        ],
      }),
    ),
  );
});
test("only bounded image coordinates are accepted", () => {
  assert.throws(() =>
    parsePalmReading(
      JSON.stringify({
        quality: "ok",
        message: "",
        summary: "Tổng quan",
        lines: [
          {
            name: "Tâm đạo",
            observation: "Nếp rõ",
            reading: "Đọc",
            points: [
              [20, 30],
              [40, 50],
            ],
          },
        ],
      }),
    ),
  );
});
test("accept explicit retake and visible-line reading", () => {
  assert.equal(
    parsePalmReading(
      '{"quality":"retake","message":"Chụp sáng hơn","summary":"","lines":[]}',
    ).quality,
    "retake",
  );
  assert.equal(
    parsePalmReading(
      '{"quality":"ok","message":"","summary":"Quan sát","lines":[]}',
    ).summary,
    "Quan sát",
  );
});
