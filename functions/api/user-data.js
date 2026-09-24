import {accountData} from '../../services/backend/user-data.mjs';
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

/*
 * Ghi nhận tài khoản đã đăng nhập vào bảng `users` (D1) — KHÔNG cần Supabase
 * Service Role Key, vì `user` ở đây đã được xác thực bằng chính token của
 * người dùng (xem resolveUser ở trên). Dùng cho trang quản trị
 * (dashboard.theastrox.space) để hiển thị danh sách kèm email thật, kể cả
 * trước khi user lưu hồ sơ. Best-effort — không được làm hỏng request chính.
 */
async function recordUserSeen(env, user) {
  if (!env.DB || !user || !user.id) return;
  const now = Date.now();
  const name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || "";
  try {
    await env.DB.prepare(
      `INSERT INTO users (user_id, email, name, first_seen, last_seen) VALUES (?1,?2,?3,?4,?4)
       ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, name = CASE WHEN excluded.name != '' THEN excluded.name ELSE users.name END, last_seen = excluded.last_seen`
    ).bind(user.id, user.email || "", name, now).run();
  } catch { /* best-effort, bo qua loi */ }
}

async function handle(context){
 const {request,env}=context;const user=await resolveUser(request,env);
 if(!user)return json(401,{error:"Bạn cần đăng nhập."});
 context.waitUntil(recordUserSeen(env,user));
 try{return await accountData(env,request,user.id);}catch{return json(503,{error:"Chưa đồng bộ được dữ liệu tài khoản."});}
}
export const onRequestGet=handle;
export const onRequestPut=handle;
export async function onRequestDelete(){return json(405,{error:"Phương thức không được hỗ trợ."});}
export async function onRequestPost(){return json(405,{error:"Phương thức không được hỗ trợ."});}
