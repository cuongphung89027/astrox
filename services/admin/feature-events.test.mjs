import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnv } from './test/sqlite.mjs';
import { featureEvent } from './feature-events.mjs';
const now = Date.UTC(2026, 8, 24);
const event = () => ({
  id: crypto.randomUUID(),
  event: 'feature_view',
  module: 'tarot',
  service_id: 'tarot',
  source: 'navigation',
  session_id: crypto.randomUUID(),
  device: 'mobile',
});
const req = (body, headers = {}) =>
  new Request('https://theastrox.space/api/feature-events', {
    method: 'POST',
    headers: { origin: 'https://theastrox.space', 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
async function fixture() {
  const env = testEnv();
  for (const sql of readFileSync(new URL('../../migrations/feature-events.sql', import.meta.url), 'utf8')
    .split(';')
    .filter(s => s.trim()))
    await env.DB.prepare(sql).run();
  return env;
}
test('rejects untrusted origins, private extra fields, unknown services and inconsistent module', async () => {
  const env = await fixture();
  for (const b of [
    { ...event(), prompt: 'secret' },
    { ...event(), user_id: 'user' },
    { ...event(), service_id: 'private question' },
    { ...event(), service_id: 'tuvi' },
    [],
    null,
  ])
    assert.equal((await featureEvent(req(b), env, now)).status, 400);
  assert.equal((await featureEvent(req(event(), { origin: 'https://evil.test' }), env, now)).status, 403);
  assert.equal((await featureEvent(req('{'), env, now)).status, 400);
  assert.equal((await featureEvent(req('x'.repeat(2049)), env, now)).status, 413);
});
test('deduplicates IDs and uses server time without identity data', async () => {
  const env = await fixture(),
    b = event();
  assert.equal((await featureEvent(req(b), env, now)).status, 204);
  assert.equal((await featureEvent(req(b), env, now + 100)).status, 204);
  const rows = await env.DB.prepare('SELECT * FROM feature_events').all();
  assert.equal(rows.results.length, 1);
  assert.equal(rows.results[0].created_at, new Date(now).toISOString());
  assert.deepEqual(Object.keys(rows.results[0]).sort(), [...Object.keys(b), 'created_at'].sort());
});
test('respects DNT and rate limits persisted across collector calls', async () => {
  const env = await fixture();
  assert.equal((await featureEvent(req(event(), { dnt: '1' }), env, now)).status, 204);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM feature_events').first()).n, 0);
  for (let i = 0; i < 120; i++) assert.equal((await featureEvent(req(event()), env, now)).status, 204);
  assert.equal((await featureEvent(req(event()), env, now)).status, 429);
  assert.equal((await featureEvent(req(event()), env, now + 3600000)).status, 204);
});
test('prunes events beyond retention on collection and fails closed without database', async () => {
  const env = await fixture();
  await featureEvent(req(event()), env, now - 91 * 86400000);
  await featureEvent(req(event()), env, now);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM feature_events').first()).n, 1);
  assert.equal((await featureEvent(req(event()), {}, now)).status, 503);
});
