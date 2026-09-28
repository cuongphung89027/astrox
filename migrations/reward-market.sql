-- Preserve the currency of sessions created before the market switch.
ALTER TABLE reward_ad_sessions ADD COLUMN market TEXT NOT NULL DEFAULT 'VN' CHECK(market IN ('VN','US'));
