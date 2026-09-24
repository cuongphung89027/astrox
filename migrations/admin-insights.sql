CREATE TABLE IF NOT EXISTS admin_issue_states (
 id TEXT PRIMARY KEY,
 status TEXT NOT NULL CHECK(status IN ('new','acknowledged','in_progress','resolved')),
 updated_at TEXT NOT NULL,
 actor TEXT NOT NULL
);
