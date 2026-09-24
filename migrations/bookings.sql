CREATE TABLE IF NOT EXISTS experts(id TEXT PRIMARY KEY,name TEXT NOT NULL,specialty TEXT NOT NULL,bio TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 0 CHECK(active IN(0,1)),updated_at TEXT NOT NULL);
-- statement --
CREATE TABLE IF NOT EXISTS expert_slots(id TEXT PRIMARY KEY,expert_id TEXT NOT NULL REFERENCES experts(id),starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,blocked_until TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),CHECK(ends_at>starts_at),CHECK(blocked_until>=ends_at));
-- statement --
CREATE INDEX IF NOT EXISTS expert_slots_time ON expert_slots(expert_id,starts_at);
-- statement --
CREATE TRIGGER IF NOT EXISTS expert_slots_no_overlap BEFORE INSERT ON expert_slots WHEN NEW.active=1 BEGIN SELECT RAISE(ABORT,'slot_overlap') WHERE EXISTS(SELECT 1 FROM expert_slots WHERE expert_id=NEW.expert_id AND active=1 AND starts_at<NEW.blocked_until AND blocked_until>NEW.starts_at); END;
-- statement --
CREATE TABLE IF NOT EXISTS expert_bookings(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,slot_id TEXT NOT NULL REFERENCES expert_slots(id),expert_name TEXT NOT NULL,specialty TEXT NOT NULL,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,price INTEGER NOT NULL,question TEXT NOT NULL,contact TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN('pending','confirmed','cancelled','completed','no_show')),meeting_url TEXT NOT NULL DEFAULT '',idempotency_key TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,idempotency_key));
-- statement --
CREATE UNIQUE INDEX IF NOT EXISTS one_booking_per_slot ON expert_bookings(slot_id) WHERE status IN('pending','confirmed','completed','no_show');
-- statement --
CREATE INDEX IF NOT EXISTS expert_bookings_owner ON expert_bookings(user_id,created_at);
-- statement --
CREATE TABLE IF NOT EXISTS booking_events(id TEXT PRIMARY KEY,booking_id TEXT NOT NULL,actor TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);
