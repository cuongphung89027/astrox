-- Rewards engine (22/09/2026): mã giới thiệu, quan hệ inviter–invitee,
-- trạng thái điểm danh theo ngày Việt Nam (UTC+7) và ref code bám theo
-- phiên OAuth Zalo (state id / pending token id dùng chung một bảng phụ).
CREATE TABLE IF NOT EXISTS referral_codes (
 user_id TEXT PRIMARY KEY REFERENCES app_users(id),
 code TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_referrals (
 user_id TEXT PRIMARY KEY REFERENCES app_users(id),
 inviter_id TEXT NOT NULL REFERENCES app_users(id),
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_attendance (
 user_id TEXT PRIMARY KEY REFERENCES app_users(id),
 last_day TEXT NOT NULL,
 streak INTEGER NOT NULL DEFAULT 0,
 claimed_milestones TEXT NOT NULL DEFAULT '[]',
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_referrals (
 id TEXT PRIMARY KEY,
 ref TEXT NOT NULL,
 created_at TEXT NOT NULL
);
