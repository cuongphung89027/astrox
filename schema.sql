-- Schema cho Cloudflare D1 — thay thế Netlify Blobs.
-- Chạy: npx wrangler d1 execute astrox-db --remote --file=./schema.sql
-- (bỏ --remote nếu chỉ muốn tạo trong DB local để `wrangler pages dev` dùng)

CREATE TABLE IF NOT EXISTS user_data (
  user_id    TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Bảng phân quyền module theo tài khoản, dùng cho trang quản trị
-- (dashboard.theastrox.space). Không có dòng nào cho (user_id, module) nghĩa
-- là module đó đang được PHÉP theo mặc định — chỉ cần ghi dòng khi admin
-- tắt quyền, hoặc bật lại sau khi đã từng tắt.
CREATE TABLE IF NOT EXISTS user_module_access (
  user_id    TEXT NOT NULL,
  module     TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, module)
);

-- Danh sách tài khoản đã từng đăng nhập (ghi bởi chính user-data.js mỗi khi
-- xác thực thành công bằng token của họ — KHÔNG cần Supabase Service Role
-- Key). Dùng cho trang quản trị để hiển thị email/tên thật, kể cả khi user
-- chưa lưu hồ sơ (chưa có dòng trong user_data).
CREATE TABLE IF NOT EXISTS users (
  user_id     TEXT PRIMARY KEY,
  email       TEXT,
  name        TEXT,
  first_seen  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL
);
