-- Lemon Squeezy order book (plan Task 15/16). Every checkout the server
-- creates lands here BEFORE the provider is called, with the full immutable
-- commercial snapshot; the webhook may only mark rows paid/fulfilled, never
-- create or reprice them. Idempotency: one local order per (user, requestKey).

CREATE TABLE IF NOT EXISTS lemon_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  market TEXT NOT NULL DEFAULT 'US' CHECK (market = 'US'),
  package_id TEXT NOT NULL,
  package_revision INTEGER NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount_usd_cents INTEGER NOT NULL CHECK (amount_usd_cents > 0),
  variant_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('test','live')),
  status TEXT NOT NULL CHECK (status IN ('pending','failed','paid','fulfilled','refunded')),
  request_key TEXT NOT NULL,
  lemon_order_id TEXT,
  lemon_identifier TEXT,
  checkout_url TEXT,
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  refunded_credits INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS lemon_orders_provider ON lemon_orders(environment, lemon_order_id) WHERE lemon_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lemon_orders_user ON lemon_orders(user_id, created_at);
