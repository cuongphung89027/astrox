-- Market-scoped AI operations and unlock grants (plan Task 14).
-- Additive only: every legacy row defaults to VN, so Vietnamese behavior and
-- history are untouched. US rows carry market='US' and bill against the
-- Credits ledger instead of the Point wallet.

ALTER TABLE backend_ai_operations ADD COLUMN market TEXT NOT NULL DEFAULT 'VN';
ALTER TABLE service_unlock_operations ADD COLUMN market TEXT NOT NULL DEFAULT 'VN';
