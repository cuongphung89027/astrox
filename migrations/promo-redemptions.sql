CREATE TABLE IF NOT EXISTS backend_promo_redemptions (
 id TEXT PRIMARY KEY,
 promo_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 request_key TEXT NOT NULL,
 points INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(user_id,request_key)
);
CREATE INDEX IF NOT EXISTS backend_promo_redemptions_quota ON backend_promo_redemptions(promo_id,user_id);
