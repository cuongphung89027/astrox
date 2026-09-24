-- Immutable economic receipts and retryable verified-registration work.
CREATE TABLE IF NOT EXISTS reward_events (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES app_users(id),
 kind TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 claim_token TEXT NOT NULL,
 config_revision INTEGER,
 payload TEXT NOT NULL,
 created_at TEXT NOT NULL,
 completed_at TEXT
);
CREATE INDEX IF NOT EXISTS reward_events_pending ON reward_events(status,kind,created_at);
CREATE TABLE IF NOT EXISTS reward_ad_sessions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES app_users(id),
 day TEXT NOT NULL,
 points INTEGER NOT NULL,
 config_revision INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'started',
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 ready_at INTEGER,
 granted_at INTEGER
);
CREATE INDEX IF NOT EXISTS reward_ads_user_day ON reward_ad_sessions(user_id,day,status,created_at);
