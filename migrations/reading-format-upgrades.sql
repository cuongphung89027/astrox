CREATE TABLE IF NOT EXISTS reading_upgrade_campaigns (
 id TEXT PRIMARY KEY,
 cutoff_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO reading_upgrade_campaigns(id,cutoff_at,created_at)
 VALUES('visual-readings-2026-10',CAST((julianday('now')-2440587.5)*86400000 AS INTEGER),CAST((julianday('now')-2440587.5)*86400000 AS INTEGER));

CREATE TABLE IF NOT EXISTS reading_upgrade_grants (
 id TEXT PRIMARY KEY,
 campaign_id TEXT NOT NULL REFERENCES reading_upgrade_campaigns(id),
 user_id TEXT NOT NULL,
 market TEXT NOT NULL CHECK(market IN ('VN','US')),
 service_id TEXT NOT NULL,
 source_kind TEXT NOT NULL CHECK(source_kind IN ('legacy','unlock','cache')),
 source_id TEXT NOT NULL,
 source_scope_key TEXT,
 status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','running','succeeded')),
 operation_id TEXT,
 charge_id TEXT UNIQUE,
 request_hash TEXT,
 claim_scope_key TEXT,
 claim_expires_at INTEGER,
 snapshot_hash TEXT,
 response_json TEXT,
 version INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(campaign_id,user_id,market,source_kind,source_id,service_id),
 UNIQUE(user_id,operation_id)
);
CREATE INDEX IF NOT EXISTS reading_upgrade_available ON reading_upgrade_grants(user_id,market,service_id,status);

CREATE TABLE IF NOT EXISTS reading_upgrade_cache_snapshots (
 campaign_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 market TEXT NOT NULL,
 entries_json TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(campaign_id,user_id)
);
CREATE TABLE IF NOT EXISTS user_data_revisions (
 user_id TEXT NOT NULL,
 revision INTEGER NOT NULL,
 payload TEXT NOT NULL,
 archived_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,revision)
);
INSERT OR IGNORE INTO reading_upgrade_cache_snapshots(campaign_id,user_id,market,entries_json,created_at)
 WITH versions AS (
   SELECT user_id,payload,updated_at AS revision FROM user_data
   UNION ALL SELECT user_id,payload,revision FROM user_data_revisions
 ), chosen AS (
   SELECT v.* FROM versions v
   WHERE v.revision=(SELECT MAX(other.revision) FROM versions other,reading_upgrade_campaigns c
     WHERE c.id='visual-readings-2026-10' AND other.user_id=v.user_id AND other.revision<=c.cutoff_at)
 )
 SELECT c.id,u.user_id,COALESCE((SELECT market FROM market_preferences WHERE user_id=u.user_id),'VN'),
   json_group_array(json_object('key',CAST(j.key AS TEXT),'path',j.path,
     'module',json_extract(j.value,'$.module'),'topic',json_extract(j.value,'$.topic'),'period',json_extract(j.value,'$.period'))),c.created_at
 FROM chosen u,json_tree(u.payload,'$.aiCache') j,reading_upgrade_campaigns c
 WHERE c.id='visual-readings-2026-10' AND j.type='object' AND json_type(j.value,'$.text')='text'
   AND length(json_extract(j.value,'$.text'))>0
 GROUP BY c.id,u.user_id;

INSERT OR IGNORE INTO reading_upgrade_grants
 (id,campaign_id,user_id,market,service_id,source_kind,source_id,source_scope_key,created_at,updated_at)
 SELECT 'legacy:'||o.charge_id||':'||o.service_id,c.id,o.user_id,o.market,o.service_id,'legacy',o.charge_id,NULL,c.created_at,c.created_at
 FROM backend_ai_operations o CROSS JOIN reading_upgrade_campaigns c
 WHERE c.id='visual-readings-2026-10' AND o.status='succeeded' AND o.created_at<=c.cutoff_at
 AND (o.service_id LIKE 'tuvi--%' OR o.service_id LIKE 'zodiac--%' OR o.service_id LIKE 'batu--%' OR o.service_id LIKE 'numerology--%' OR o.service_id LIKE 'compat--%');

INSERT OR IGNORE INTO reading_upgrade_grants
 (id,campaign_id,user_id,market,service_id,source_kind,source_id,source_scope_key,created_at,updated_at)
 SELECT 'unlock:'||o.id||':'||j.value,c.id,o.user_id,o.market,j.value,'unlock',o.id,
 CASE WHEN j.value LIKE '%--period--%' OR j.value='numerology--personal-year' THEN NULL ELSE o.scope_key END,c.created_at,c.created_at
 FROM service_unlock_operations o,json_each(o.members_json) j,reading_upgrade_campaigns c
 WHERE c.id='visual-readings-2026-10' AND o.status='succeeded' AND o.created_at<=c.cutoff_at
 AND (j.value LIKE 'tuvi--%' OR j.value LIKE 'zodiac--%' OR j.value LIKE 'batu--%' OR j.value LIKE 'numerology--%' OR j.value LIKE 'compat--%');
