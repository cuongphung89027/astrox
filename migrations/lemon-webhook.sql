-- Durable webhook receipts (plan Task 16): the signature-verified event is
-- recorded BEFORE any processing, keyed by fulfillment identity so replays and
-- reordering can never double-credit. Fulfillment itself is additionally
-- guarded by lemon_orders UNIQUE(environment, lemon_order_id).

CREATE TABLE IF NOT EXISTS lemon_webhook_receipts (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  lemon_order_id TEXT,
  local_order_id TEXT,
  environment TEXT NOT NULL,
  store_id TEXT NOT NULL,
  payload_digest TEXT NOT NULL,
  payload_json TEXT,
  processed INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lemon_receipts_lookup
  ON lemon_webhook_receipts(environment, store_id, lemon_order_id, event_name);
