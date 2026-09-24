-- Anonymous client signals, never payment or identity authority. Retention: 90 days.
CREATE TABLE IF NOT EXISTS feature_events (
 id TEXT PRIMARY KEY,
 event TEXT NOT NULL,
 module TEXT NOT NULL,
 service_id TEXT NOT NULL,
 source TEXT NOT NULL,
 session_id TEXT NOT NULL,
 device TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS feature_events_created ON feature_events(created_at);
CREATE INDEX IF NOT EXISTS feature_events_module_created ON feature_events(module,created_at);
CREATE TABLE IF NOT EXISTS feature_event_limits(bucket TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
