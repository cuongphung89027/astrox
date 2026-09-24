-- One-time owner-authorized activation. Expected state: draft revision 2,
-- published version 1. Publish only rewards.enabled; preserve every other
-- published field and every unrelated draft edit. The trigger makes version,
-- state and audit one atomic statement even in a multi-statement CLI import.
CREATE TRIGGER IF NOT EXISTS astrox_rewards_launch_20260924
AFTER INSERT ON admin_versions
WHEN NEW.note = 'rewards-launch-20260924: check-in and referrals; ads remain disabled'
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM admin_state WHERE id=1 AND revision=2 AND published_id=1) THEN RAISE(ABORT,'rewards launch state changed') END;
 UPDATE admin_state SET draft=json_set(draft,'$.rewards.enabled',json('true')),revision=revision+1,published_id=NEW.id WHERE id=1 AND revision=2 AND published_id=1;
 INSERT INTO admin_audit(actor,action,target,created_at,detail) VALUES(NEW.actor,'config.publish',CAST(NEW.id AS TEXT),NEW.created_at,'{"scope":"rewards.enabled only","previousPublished":1,"adsEnabled":false,"authorizedBy":"owner request in Codex"}');
END;
INSERT INTO admin_versions(config,created_at,actor,note)
SELECT json_set(v.config,'$.rewards.enabled',json('true')),strftime('%Y-%m-%dT%H:%M:%fZ','now'),'codex:owner-authorized-rewards-launch','rewards-launch-20260924: check-in and referrals; ads remain disabled'
FROM admin_state s JOIN admin_versions v ON v.id=s.published_id
WHERE s.id=1 AND s.revision=2 AND s.published_id=1
 AND json_extract(v.config,'$.rewards.enabled')=0
 AND json_extract(v.config,'$.rewards.ads.enabled')=0;
DROP TRIGGER IF EXISTS astrox_rewards_launch_20260924;
