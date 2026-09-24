import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMessages,
  providerMessages,
  withManagedText,
} from "./vision.mjs";
const image = {
    type: "image_url",
    image_url: { url: "data:image/png;base64,iVBORw0KGgoAAA==" },
  },
  messages = [
    { role: "user", content: [{ type: "text", text: "Đọc ảnh" }, image] },
  ];
test("images only allowed for explicitly image-enabled service", () => {
  assert.throws(() => normalizeMessages(messages, false));
  assert.deepEqual(normalizeMessages(messages, true), messages);
});
test("reject remote image URLs and multiple or oversized images", () => {
  assert.throws(() =>
    normalizeMessages(
      [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: "https://example.com/a.jpg" },
            },
          ],
        },
      ],
      true,
    ),
  );
  assert.throws(() =>
    normalizeMessages([{ role: "user", content: [image, image] }], true),
  );
  assert.throws(() =>
    normalizeMessages(
      [
        {
          role: "user",
          content: [
            {
              ...image,
              image_url: {
                url: "data:image/png;base64," + "A".repeat(1400000),
              },
            },
          ],
        },
      ],
      true,
    ),
  );
});
test("managed prompt preserves photo while replacing user text", () => {
  assert.deepEqual(withManagedText(messages, "Managed")[0].content, [
    { type: "text", text: "Managed" },
    image,
  ]);
});
test("translate image blocks for each configured protocol", () => {
  assert.equal(
    providerMessages(messages, "responses")[0].content[1].type,
    "input_image",
  );
  assert.equal(
    providerMessages(messages, "anthropic")[0].content[1].source.media_type,
    "image/png",
  );
  assert.deepEqual(providerMessages(messages, "openai"), messages);
});
test("text-only messages retain compatible representation", () => {
  assert.deepEqual(
    normalizeMessages(
      [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
      false,
    ),
    [{ role: "user", content: "Hello" }],
  );
});
import { testEnv } from "./test/sqlite.mjs";
import { defaultConfig } from "./config.ts";
import { state, publish, saveSecret } from "./store.mjs";
import { handleConfiguredAi } from "./integration-api.mjs";
test("configured palm request carries image through managed template and protocol without logging image", async () => {
  const env = testEnv();
  env.PROVIDER_ALLOWED_HOSTS = "api.example.com";
  await state(env);
  const c = defaultConfig();
  c.ai.enabled = true;
  c.ai.chain = ["vision"];
  c.billing.services.find((s) => s.id === "palm").status = "free";
  c.ai.providers = [
    {
      id: "vision",
      name: "Test",
      model: "test",
      protocol: "responses",
      baseUrl: "https://api.example.com/v1",
      enabled: true,
      timeoutMs: 1000,
      retries: 0,
      maxTokens: 1000,
      temperature: 0.2,
      secretRef: "provider:vision",
    },
  ];
  await saveSecret(env, "test", "provider:vision", "test-only");
  await publish(env, "test", c, 0, "test");
  const original = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, opts) => {
    sent = JSON.parse(opts.body);
    return Response.json({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: '{"quality":"retake","message":"Ảnh chưa rõ","summary":"","lines":[]}',
            },
          ],
        },
      ],
    });
  };
  try {
    const response = await handleConfiguredAi(
      new Request("https://theastrox.space/api/ai", {
        method: "POST",
        body: JSON.stringify({
          serviceId: "palm",
          messages,
          promptDescriptor: {
            id: "palm.read.v1",
            values: ["Tay trái", "Tay phải", "Câu hỏi"],
          },
        }),
      }),
      env,
    );
    assert.equal(response.status, 200);
    const user = sent.input.find((m) => m.role === "user");
    assert.equal(user.content[1].image_url, image.image_url.url);
    assert.ok(user.content[0].text.includes("Tay trái"));
    const logs = (await env.DB.prepare("SELECT * FROM admin_ai_requests").all())
      .results;
    assert.ok(!JSON.stringify(logs).includes("base64"));
    assert.ok(!JSON.stringify(logs).includes("Câu hỏi"));
  } finally {
    globalThis.fetch = original;
  }
});
