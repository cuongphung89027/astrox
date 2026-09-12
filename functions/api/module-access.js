/*
 * Cloudflare Pages Function — trả về quyền truy cập module của tài khoản
 * hiện tại (đọc bảng user_module_access do trang quản trị dashboard ghi).
 * Không có endpoint ghi ở đây — CHỈ trang quản trị (functions/api/admin/access.js,
 * xác thực bằng mật khẩu admin riêng) mới được phép thay đổi quyền, để người
 * dùng thường không thể tự mở khoá module cho chính mình.
 *
 * Biến môi trường cần có (giống user-data.js):
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 * Binding: DB (D1 database binding), cùng database với user-data.js.
 */

const ALL_MODULES = ["tuvi", "zodiac", "kinhdich", "batu", "numerology"];

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store"
    }
  });
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

  // Mặc định TẤT CẢ module đều được phép; chỉ ghi đè khi có dòng rõ ràng
  // trong user_module_access (admin đã tắt/bật thủ công cho tài khoản này).
  const access = Object.fromEntries(ALL_MODULES.map((m) => [m, true]));
  try {
    const { results } = await env.DB.prepare(
      "SELECT module, enabled FROM user_module_access WHERE user_id = ?1"
    ).bind(user.id).all();
    (results || []).forEach((row) => {
      if (ALL_MODULES.includes(row.module)) access[row.module] = !!row.enabled;
    });
    return json(200, { access });
  } catch {
    return json(500, { error: "Không đọc được quyền truy cập module." });
  }
}

export async function onRequestPost() { return json(405, { error: "Phương thức không được hỗ trợ." }); }
export async function onRequestPut() { return json(405, { error: "Phương thức không được hỗ trợ." }); }
export async function onRequestDelete() { return json(405, { error: "Phương thức không được hỗ trợ." }); }
