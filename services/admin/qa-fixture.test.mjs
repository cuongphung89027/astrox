import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { seedUpgradeQa } from './test/seed-upgrade-qa.mjs';
test('QA seed uses real schemas and supplies synthetic paginated users and 14 daily signals', () => {
  const db = new DatabaseSync(':memory:');
  const summary = seedUpgradeQa(db, Date.parse('2026-09-24T12:00:00Z'));
  assert.equal(summary.users, 60);
  assert.equal(summary.days, 14);
  assert.equal(db.prepare('SELECT COUNT(DISTINCT date(created_at)) n FROM feature_events').get().n, 14);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM app_users WHERE email NOT LIKE ?').get('%@example.invalid').n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM admin_ai_requests WHERE status='replayed'").get().n > 0, true);
  assert.equal(summary.referrals, 24);
  db.close();
});
