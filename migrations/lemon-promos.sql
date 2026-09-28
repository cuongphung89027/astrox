-- US promotion reservations are separate from PayOS snapshots.
-- The order and reservation are created in the same transaction.
CREATE TABLE IF NOT EXISTS lemon_order_promos (
 order_id TEXT PRIMARY KEY REFERENCES lemon_orders(id),
 user_id TEXT NOT NULL REFERENCES app_users(id),
 promo_id TEXT NOT NULL,
 bonus INTEGER NOT NULL CHECK(bonus > 0),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lemon_order_promos_usage ON lemon_order_promos(promo_id,user_id);
