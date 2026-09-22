CREATE TABLE IF NOT EXISTS backend_order_snapshots (
 order_code INTEGER PRIMARY KEY,
 user_id TEXT NOT NULL,
 config_revision INTEGER,
 package_id TEXT NOT NULL,
 promo_id TEXT,
 promo_code TEXT,
 promo_bonus INTEGER NOT NULL DEFAULT 0,
 expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS backend_order_promos ON backend_order_snapshots(promo_id,user_id);
CREATE TABLE IF NOT EXISTS zalo_point_ledger (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES app_users(id),
 delta INTEGER NOT NULL,
 reason TEXT NOT NULL,
 reference_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(reason,reference_id,user_id)
);
CREATE TABLE IF NOT EXISTS login_diagnostics (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 stage TEXT NOT NULL,
 detail TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS login_diagnostics_created ON login_diagnostics(created_at);
