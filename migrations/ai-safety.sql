CREATE TABLE IF NOT EXISTS ai_rate_limits (
 bucket TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_rate_limits_expiry ON ai_rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS backend_ai_operations (
 user_id TEXT NOT NULL REFERENCES app_users(id),
 operation_id TEXT NOT NULL,
 charge_id TEXT NOT NULL UNIQUE,
 service_id TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 config_revision INTEGER NOT NULL,
 points INTEGER NOT NULL CHECK(points > 0),
 status TEXT NOT NULL CHECK(status IN ('running','succeeded','refunded')),
 response_json TEXT,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,operation_id)
);
CREATE INDEX IF NOT EXISTS backend_ai_operations_pending ON backend_ai_operations(status,created_at);
