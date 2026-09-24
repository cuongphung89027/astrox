CREATE TABLE IF NOT EXISTS user_data_revisions (
 user_id TEXT NOT NULL,
 revision INTEGER NOT NULL,
 payload TEXT NOT NULL,
 archived_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,revision)
);
CREATE TRIGGER IF NOT EXISTS user_data_keep_revisions
BEFORE UPDATE OF payload ON user_data
WHEN OLD.payload != NEW.payload
BEGIN
 INSERT OR IGNORE INTO user_data_revisions(user_id,revision,payload,archived_at)
 VALUES(OLD.user_id,OLD.updated_at,OLD.payload,NEW.updated_at);
 DELETE FROM user_data_revisions
 WHERE user_id=OLD.user_id AND revision NOT IN (
  SELECT revision FROM user_data_revisions WHERE user_id=OLD.user_id ORDER BY revision DESC LIMIT 5
 );
END;
