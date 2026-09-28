-- US Credits wallet (plan Task 13). Completely isolated from the Vietnamese
-- Point system (zalo_point_accounts / zalo_point_ledger are untouched).
-- Concurrency invariants are enforced by conditional UPDATEs plus UNIQUE keys:
-- a spend can only win when sufficient available balance exists, and every
-- money movement maps to exactly one ledger row via a unique operation key.

CREATE TABLE IF NOT EXISTS credits_accounts (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= balance),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','restricted')),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS credit_lots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  source TEXT NOT NULL CHECK (source IN ('purchase','bonus')),
  remaining INTEGER NOT NULL CHECK (remaining >= 0),
  expires_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS credit_lots_user ON credit_lots(user_id, created_at);
CREATE TABLE IF NOT EXISTS credits_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  delta INTEGER NOT NULL,
  balance_after INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('purchase','bonus','spend','release','refund','adjustment')),
  operation_key TEXT NOT NULL,
  source_order TEXT,
  lot_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, kind, operation_key)
);
CREATE INDEX IF NOT EXISTS credits_ledger_user ON credits_ledger(user_id, created_at);
CREATE TABLE IF NOT EXISTS market_preferences (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id),
  market TEXT NOT NULL CHECK (market IN ('VN','US')),
  updated_at TEXT NOT NULL
);
