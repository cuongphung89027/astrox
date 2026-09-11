/*
 * Cloudflare Pages Function — proxy AI request tới nhà cung cấp DevQuote.
 * Thay thế netlify/functions/ai.mjs (Netlify Functions -> Cloudflare Pages Functions).
 *
 * File này tự động được route tới đường dẫn /api/ai theo quy ước file-based
 * routing của Cloudflare Pages Functions (functions/api/ai.js -> /api/ai).
 * Không cần khai báo redirect nào thêm (khác với netlify.toml trước đây).
 *
 * Biến môi trường cần đặt (Cloudflare Pages → Settings → Environment variables,
 * hoặc qua `wrangler pages secret put DEVQUOTE_API_KEY`):
 *   DEVQUOTE_API_KEY
 */
const ENDPOINT = "https://opencode.ai/zen/go/v1/responses";
const DEFAULT_MODEL = "muse-spark-1.3-contributor";
const SESSION_ID = "astrox-web";
const MAX_BYTES = 900_000;
const TIMEOUT_MS = 100_000;
const MAX_ATTEMPTS = 2;
const RETRYABLE_STATUS = new Set([429, 500, 501, 502, 503, 504]);

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const key = env.DEVQUOTE_API_KEY;
  if (!key) return json(500, { error: "Máy chủ chưa cấu hình DEVQUOTE_API_KEY trong Environment Variables." });

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json(400, { error: "Không đọc được yêu cầu." });
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES)
    return json(413, { error: "Yêu cầu quá lớn." });

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { error: "JSON không hợp lệ." });
  }
  if (!payload || !Array.isArray(payload.messages) || !payload.messages.length)
    return json(400, { error: "Thiếu messages." });

  const input = payload.messages
    .map(m => {
      const role = m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user";
      let text = "";
      if (typeof m.content === "string") text = m.content;
      else if (Array.isArray(m.content)) {
        text = m.content.map(part => {
          if (typeof part === "string") return part;
          if (part && typeof part.text === "string") return part.text;
          if (part && part.type === "text" && typeof part.text === "string") return part.text;
          if (part && part.type === "input_text" && typeof part.text === "string") return part.text;
          return "";
        }).filter(Boolean).join("\n");
      } else if (m.content != null) text = String(m.content);
      return { role, content: text };
    });

  const upstreamBody = {
    model: DEFAULT_MODEL,
    input,
    max_output_tokens: Math.min(Number(payload.max_tokens) || 4000, 16000)
  };
  if (typeof payload.temperature === "number") upstreamBody.temperature = payload.temperature;
  upstreamBody.reasoning = { effort: "low" };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const upstream = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "x-opencode-session": SESSION_ID
        },
        body: JSON.stringify(upstreamBody),
        signal: controller.signal
      });
      const text = await upstream.text();
      if (RETRYABLE_STATUS.has(upstream.status) && attempt + 1 < MAX_ATTEMPTS) {
        const retryAfter = Number(upstream.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 10 ? retryAfter * 1000 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (!upstream.ok) {
        let detail = "";
        try { const j = JSON.parse(text); detail = j?.error?.message || j?.message || ""; } catch { detail = text.slice(0, 300); }
        return json(upstream.status, { error: detail || "Nhà cung cấp AI trả về lỗi." });
      }
      let data;
      try { data = JSON.parse(text); } catch { return json(502, { error: "Phản hồi AI không hợp lệ." }); }
      if (data?.error) return json(502, { error: data.error.message || "Nhà cung cấp AI trả về lỗi." });
      const message = (data?.output || []).find(item => item.type === "message");
      const content = (message?.content || []).map(c => c?.text || "").join("").trim();
      if (!content) {
        const reason = data?.incomplete_details?.reason || "empty";
        return json(502, { error: `AI không trả về nội dung (${reason}). Vui lòng thử lại.` });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
        model: data.model || DEFAULT_MODEL
      }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
      });
    } catch (error) {
      if (attempt + 1 >= MAX_ATTEMPTS) {
        if (error?.name === "AbortError") return json(504, { error: "Nhà cung cấp AI phản hồi quá lâu sau khi thử lại." });
        return json(502, { error: "Không kết nối được nhà cung cấp AI sau khi thử lại." });
      }
      await new Promise(resolve => setTimeout(resolve, 800));
    } finally {
      clearTimeout(timeout);
    }
  }
  return json(502, { error: "Không nhận được phản hồi từ nhà cung cấp AI." });
}

// Mọi phương thức khác /api/ai đều không được hỗ trợ (giữ đúng hành vi bản Netlify).
export async function onRequestGet() { return json(405, { error: "Phương thức không được hỗ trợ." }); }
export async function onRequestPut() { return json(405, { error: "Phương thức không được hỗ trợ." }); }
export async function onRequestDelete() { return json(405, { error: "Phương thức không được hỗ trợ." }); }
