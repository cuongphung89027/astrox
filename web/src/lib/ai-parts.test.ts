import { test } from "node:test";
import assert from "node:assert/strict";
import { aiParts } from "./ai-parts.ts";
test("palm images reach gateway without being replaced by text", () => {
  assert.deepEqual(
    aiParts(
      [
        { text: "Ảnh" },
        { inline_data: { mime_type: "image/jpeg", data: "/9j/AA==" } },
      ],
      true,
    ),
    [
      { type: "text", text: "Ảnh" },
      {
        type: "image_url",
        image_url: { url: "data:image/jpeg;base64,/9j/AA==" },
      },
    ],
  );
});
test("existing chart readings retain their text-only contract", () => {
  assert.equal(
    aiParts([{ inline_data: { data: "/9j/AA==" } }])[0].type,
    "text",
  );
});
