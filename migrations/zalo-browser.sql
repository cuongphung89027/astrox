CREATE TABLE IF NOT EXISTS zalo_browser_pending (
 id TEXT PRIMARY KEY,
 cookie_hash TEXT NOT NULL,
 proof_hash TEXT NOT NULL,
 payload TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS zalo_browser_pending_expiry ON zalo_browser_pending(expires_at);
