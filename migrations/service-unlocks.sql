CREATE TABLE IF NOT EXISTS service_unlock_operations (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES app_users(id),
 operation_id TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 config_revision INTEGER NOT NULL,
 module TEXT NOT NULL,
 service_id TEXT NOT NULL,
 offer_id TEXT NOT NULL,
 scope_key TEXT NOT NULL,
 members_json TEXT NOT NULL,
 credits_json TEXT NOT NULL,
 points INTEGER NOT NULL CHECK(points >= 0),
 status TEXT NOT NULL CHECK(status IN ('running','succeeded','refunded')),
 consumed_by TEXT,
 expires_at INTEGER,
 response_json TEXT,
 version INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(user_id,operation_id)
);
CREATE INDEX IF NOT EXISTS service_unlock_scope ON service_unlock_operations(user_id,module,scope_key);
CREATE INDEX IF NOT EXISTS service_unlock_pending ON service_unlock_operations(status,created_at);
