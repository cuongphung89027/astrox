/*
 * Cloudflare Pages Function — lưu/khôi phục hồ sơ + cache AI theo tài khoản.
 * Thay thế netlify/functions/user-data.mjs.
 *
 *  - Netlify Identity (GoTrue) -> Supabase Auth (cũng nền GoTrue, cùng cơ chế
 *    JWT/OAuth Google, nên hành vi đăng nhập gần tương đương bản cũ).
 *  - Netlify Blobs -> Cloudflare D1 (SQL). Bảng `user_data` được tạo bằng
 *    schema.sql (xem hướng dẫn triển khai).
 *
 * Xác thực: Netlify tự động điền context.clientContext.user từ cookie/JWT do
 * Netlify Identity widget quản lý — Cloudflare không có cơ chế tương đương,
 * nên client PHẢI tự gửi header `Authorization: Bearer <access_token>` lấy
 * từ Supabase (xem index.html, hàm syncUserData). Function này xác thực token
 * đó bằng cách gọi thẳng endpoint /auth/v1/user của chính dự án Supabase —
 * cách này không cần thư viện xác minh JWT/JWKS nào, tương tự cách
 * @netlify/identity's getUser(request) xác thực hộ trước đây.
 *
 * Biến môi trường / secret cần đặt:
 *   SUPABASE_URL       - vd: https://xxxxx.supabase.co
 *   SUPABASE_ANON_KEY  - anon public key của dự án Supabase (không phải service key)
 * Binding cần đặt trong wrangler.toml (hoặc Dashboard > Settings > Bindings):
 *   DB (D1 database binding)
 */

// D1: giá trị 1 cột/1 hàng tối đa 2.000.000 byte (giới hạn nền tảng D1).
// Đặt biên an toàn thấp hơn để còn khoảng đệm, thấp hơn mức 4.5MB cũ của
// Netlify Blobs — đây là khác biệt thật giữa hai nền tảng lưu trữ, không phải lỗi.
const MAX_BYTES = 1_800_000;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store"
    }
  });
}

function validPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const allowed = ["profile", "chartImageBase64", "chartImageMime", "ziweiChart", "natalChart", "aiCache", "lastAiModel"];
  return Object.keys(value).every((key) => allowed.includes(key));
}

async function resolveUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;

  let res;
  try {
    res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY
      }
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let user;
  try { user = await res.json(); } catch { return null; }
  return user && user.id ? user : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await resolveUser(request, env);
  if (!user) return json(401, { error: "Bạn cần đăng nhập." });
  if (!env.DB) return json(500, { error: "Máy chủ chưa cấu hình D1 database (binding DB)." });

  try {
    const row = await env.DB.prepare("SELECT payload FROM user_data WHERE user_id = ?1")
      .bind(user.id)
      .first();
    if (!row) return json(200, {});
    let data;
    try { data = JSON.parse(row.payload); } catch { return json(200, {}); }
    return json(200, data || {});
  } catch {
    return json(500, { error: "Không truy cập được dữ liệu tài khoản." });
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const user = await resolveUser(request, env);
  if (!user) return json(401, { error: "Bạn cần đăng nhập." });
  if (!env.DB) return json(500, { error: "Máy chủ chưa cấu hình D1 database (binding DB)." });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES)
    return json(413, { error: "Dữ liệu quá lớn." });

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { error: "JSON không hợp lệ." });
  }
  if (!validPayload(payload)) return json(400, { error: "Cấu trúc dữ liệu không hợp lệ." });

  try {
    await env.DB.prepare(
      `INSERT INTO user_data (user_id, payload, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
    ).bind(user.id, JSON.stringify(payload), Date.now()).run();
    return json(200, { ok: true });
  } catch {
    return json(500, { error: "Không truy cập được dữ liệu tài khoản." });
  }
}

export async function onRequestDelete() { return json(405, { error: "Phương thức không được hỗ trợ." }); }
export async function onRequestPost() { return json(405, { error: "Phương thức không được hỗ trợ." }); }
