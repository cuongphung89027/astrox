import { SERVICE_CATALOG } from '../admin/catalog.ts';
import { configForMarket } from '../admin/config.ts';
import { visualInput, readVisualReading } from '../admin/visual-reading.ts';
import { scopeForReading } from './service-unlocks.mjs';
import { encrypt, decrypt, b64 } from '../admin/crypto.mjs';

import { READING_UPGRADE_CAMPAIGN } from '../admin/reading-upgrade-policy.ts';
export { READING_UPGRADE_CAMPAIGN } from '../admin/reading-upgrade-policy.ts';
const LEASE_MS = 180000;
const fail = (code, status = 409) => {
  throw Object.assign(new Error(code), { status });
};
const hash = async value =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b =>
    b.toString(16).padStart(2, '0'),
  ).join('');
const resultKey = async env => ({
  ADMIN_ENCRYPTION_KEY: b64(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode('reading-upgrade:' + env.SESSION_SECRET)),
  ),
});
const marketName = market => (market === 'US' ? 'US' : 'VN');
const activeSource = `(
 (g.source_kind='legacy' AND EXISTS(SELECT 1 FROM backend_ai_operations o WHERE o.charge_id=g.source_id AND o.user_id=g.user_id AND o.market=g.market AND o.service_id=g.service_id AND o.status='succeeded'))
 OR (g.source_kind='unlock' AND EXISTS(SELECT 1 FROM service_unlock_operations o,json_each(o.members_json) j WHERE o.id=g.source_id AND o.user_id=g.user_id AND o.market=g.market AND o.status='succeeded' AND j.value=g.service_id))
 OR (g.source_kind='cache' AND EXISTS(SELECT 1 FROM reading_upgrade_cache_snapshots s WHERE s.user_id=g.user_id AND s.market=g.market AND s.campaign_id=g.campaign_id))
)`;
function cachedServices(entries) {
  const services = new Set();
  for (const e of Array.isArray(entries) ? entries.slice(0, 2000) : []) {
    if (!e || typeof e.key !== 'string' || typeof e.path !== 'string') continue;
    const key = e.key.replace(/^en::/, '').split('::history::')[0];
    const path = e.path,
      topic = typeof e.topic === 'string' ? e.topic : '',
      period = typeof e.period === 'string' ? e.period : '';
    let id;
    if (path.includes('tuviPeriod') || path.includes('zodiacPeriod')) {
      const module = path.includes('tuviPeriod') ? 'tuvi' : 'zodiac';
      const p = period || ['today', 'week', 'month'].find(p => path.includes('.' + p));
      if (p) id = module + '--period--' + p;
    } else if (path.includes('tuviTopics')) id = 'tuvi--' + key.replaceAll('::', '--');
    else if (path.includes('zodiacTopics'))
      id =
        'zodiac--' +
        key
          .replace(/^natal-v2::/, '')
          .split('::')
          .slice(0, 2)
          .join('--');
    else if (path.includes('numerologyTopics')) id = 'numerology--' + (topic || key.split('::')[0]);
    else if (path.includes('batuTopics')) id = 'batu--' + topic;
    else if (path.includes('compatibility'))
      id =
        topic.includes('tuvi') || key.includes('original-tuvi')
          ? 'compat--tuvi-pair'
          : topic.includes('batu')
            ? 'compat--batu-pair'
            : 'compat--pair';
    if (SERVICE_CATALOG.some(s => s.id === id && ['profile', 'period'].includes(s.policy))) services.add(id);
  }
  return services;
}
async function seedForReader(env, userId, serviceId, market, scopeKey) {
  // Late completion of an operation that began before the fixed release cutoff.
  await env.DB.prepare(
    `INSERT OR IGNORE INTO reading_upgrade_grants
    (id,campaign_id,user_id,market,service_id,source_kind,source_id,source_scope_key,created_at,updated_at)
    SELECT 'legacy:'||o.charge_id||':'||o.service_id,c.id,o.user_id,o.market,o.service_id,'legacy',o.charge_id,NULL,c.created_at,c.created_at
    FROM backend_ai_operations o CROSS JOIN reading_upgrade_campaigns c
    WHERE c.id=? AND o.user_id=? AND o.market=? AND o.service_id=? AND o.status='succeeded' AND o.created_at<=c.cutoff_at`,
  )
    .bind(READING_UPGRADE_CAMPAIGN, userId, market, serviceId)
    .run();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO reading_upgrade_grants
    (id,campaign_id,user_id,market,service_id,source_kind,source_id,source_scope_key,created_at,updated_at)
    SELECT 'unlock:'||o.id||':'||j.value,c.id,o.user_id,o.market,j.value,'unlock',o.id,
      CASE WHEN j.value LIKE '%--period--%' OR j.value='numerology--personal-year' THEN NULL ELSE o.scope_key END,c.created_at,c.created_at
    FROM service_unlock_operations o,json_each(o.members_json) j,reading_upgrade_campaigns c
    WHERE c.id=? AND o.user_id=? AND o.market=? AND j.value=? AND o.status='succeeded' AND o.created_at<=c.cutoff_at`,
  )
    .bind(READING_UPGRADE_CAMPAIGN, userId, market, serviceId)
    .run();
  const paid = await env.DB.prepare(
    "SELECT id FROM reading_upgrade_grants WHERE user_id=? AND market=? AND service_id=? AND campaign_id=? AND source_kind IN ('legacy','unlock') AND (source_scope_key IS NULL OR source_scope_key=?) LIMIT 1",
  )
    .bind(userId, market, serviceId, READING_UPGRADE_CAMPAIGN, scopeKey)
    .first();
  if (paid) return;
  const snapshot = await env.DB.prepare(
    'SELECT entries_json,created_at FROM reading_upgrade_cache_snapshots WHERE campaign_id=? AND user_id=? AND market=?',
  )
    .bind(READING_UPGRADE_CAMPAIGN, userId, market)
    .first();
  if (!snapshot || !cachedServices(JSON.parse(snapshot.entries_json)).has(serviceId)) return;
  const id = 'cache:' + (await hash(JSON.stringify([READING_UPGRADE_CAMPAIGN, userId, market, serviceId])));
  await env.DB.prepare(
    `INSERT OR IGNORE INTO reading_upgrade_grants
    (id,campaign_id,user_id,market,service_id,source_kind,source_id,source_scope_key,created_at,updated_at)
    VALUES(?,?,?,?,?,'cache',?,NULL,?,?)`,
  )
    .bind(id, READING_UPGRADE_CAMPAIGN, userId, market, serviceId, id, snapshot.created_at, snapshot.created_at)
    .run();
}
async function context(c, input, now, market) {
  if (input?.upgradeCampaign !== READING_UPGRADE_CAMPAIGN) fail('invalid_upgrade', 400);
  const definition = SERVICE_CATALOG.find(s => s.id === input.serviceId);
  if (!definition || !['profile', 'period'].includes(definition.policy)) fail('invalid_upgrade', 400);
  const config = configForMarket(c, market),
    service = config.billing.services.find(s => s.id === input.serviceId);
  const root = config.billing.services.find(s => s.id === definition.module);
  const engine = { tuvi: 'iztro', zodiac: 'astronomy', batu: 'lunar', numerology: 'numerology' }[definition.module];
  if (
    !config.ai.enabled ||
    !config.billing.enabled ||
    config.operations.maintenance ||
    !['free', 'paid'].includes(service?.status) ||
    (root && !['free', 'paid'].includes(root.status)) ||
    (engine && config.engines?.[engine]?.enabled === false)
  )
    fail('service_unavailable', 403);
  let snapshot;
  try {
    const locale = JSON.parse(input.promptDescriptor.values[0]).locale;
    snapshot = visualInput(input.promptDescriptor, input.serviceId, locale);
    if (!snapshot) fail('invalid_upgrade', 400);
  } catch {
    fail('invalid_upgrade', 400);
  }
  const scope = await scopeForReading(input.serviceId, input.promptDescriptor, now);
  return { scope, snapshot };
}
async function releaseExpired(env, userId, serviceId, market, now) {
  await env.DB.prepare(
    `UPDATE reading_upgrade_grants SET status='available',operation_id=NULL,charge_id=NULL,
    request_hash=NULL,claim_scope_key=NULL,claim_expires_at=NULL,snapshot_hash=NULL,response_json=NULL,version=version+1,updated_at=?
    WHERE user_id=? AND service_id=? AND market=? AND campaign_id=? AND status='running'
    AND (updated_at<=? OR (claim_expires_at IS NOT NULL AND claim_expires_at<=?))`,
  )
    .bind(now, userId, serviceId, market, READING_UPGRADE_CAMPAIGN, now - LEASE_MS, now)
    .run();
}
export async function quoteReadingUpgrade(env, userId, c, revision, input, now = Date.now(), market = 'VN') {
  const { scope } = await context(c, input, now, market);
  const name = marketName(market);
  await seedForReader(env, userId, input.serviceId, name, scope.scopeKey);
  await releaseExpired(env, userId, input.serviceId, name, now);
  const rows = (
    await env.DB.prepare(
      `SELECT g.* FROM reading_upgrade_grants g
    WHERE g.user_id=? AND g.market=? AND g.service_id=? AND g.campaign_id=?
    AND (g.source_scope_key IS NULL OR g.source_scope_key=?) AND ${activeSource}`,
    )
      .bind(userId, name, input.serviceId, READING_UPGRADE_CAMPAIGN, scope.scopeKey)
      .all()
  ).results;
  const remaining = rows.filter(r => r.status === 'available').length;
  const running = rows.some(r => r.status === 'running');
  const completed = rows
    .filter(
      r =>
        r.status === 'succeeded' &&
        r.claim_scope_key === scope.scopeKey &&
        (r.claim_expires_at === null || r.claim_expires_at > now) &&
        r.response_json,
    )
    .sort((a, b) => b.updated_at - a.updated_at)[0];
  const result = completed
    ? JSON.parse(await decrypt(await resultKey(env), completed.charge_id, completed.response_json))
    : undefined;
  return {
    campaignId: READING_UPGRADE_CAMPAIGN,
    available: remaining > 0 && !running,
    remaining,
    pending: running,
    points: 0,
    market: name,
    revision,
    scopeKey: scope.scopeKey,
    expiresAt: scope.expiresAt,
    ...(result ? { result } : {}),
  };
}
export async function replayReadingUpgrade(env, userId, input, market = 'VN') {
  const row = await env.DB.prepare('SELECT * FROM reading_upgrade_grants WHERE user_id=? AND operation_id=?')
    .bind(userId, input.operationId)
    .first();
  if (!row) return null;
  if (
    row.request_hash !== input.requestHash ||
    row.service_id !== input.serviceId ||
    row.market !== marketName(market) ||
    row.campaign_id !== input.upgradeCampaign
  )
    fail('operation_conflict');
  if (row.status === 'succeeded') {
    if (!row.response_json) fail('result_expired', 410);
    return {
      ok: true,
      points: 0,
      market: row.market,
      upgrade: true,
      replayed: true,
      response: JSON.parse(await decrypt(await resultKey(env), row.charge_id, row.response_json)),
    };
  }
  fail('upgrade_in_progress');
}
export async function reserveReadingUpgrade(env, userId, c, revision, input, market = 'VN') {
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(input.operationId || '') || !/^[a-f0-9]{64}$/.test(input.requestHash || ''))
    fail('invalid_operation', 400);
  await releaseExpired(env, userId, input.serviceId, marketName(market), Date.now());
  const replay = await replayReadingUpgrade(env, userId, input, market);
  if (replay) return replay;
  const now = Date.now(),
    { scope, snapshot } = await context(c, input, now, market);
  const quote = await quoteReadingUpgrade(env, userId, c, revision, input, now, market);
  if (quote.pending) fail('upgrade_in_progress');
  if (!quote.available) fail('upgrade_unavailable', 403);
  const chargeId = crypto.randomUUID(),
    snapshotHash = await hash(JSON.stringify(snapshot));
  await env.DB.prepare(
    `UPDATE reading_upgrade_grants SET status='running',operation_id=?,charge_id=?,request_hash=?,
    claim_scope_key=?,claim_expires_at=?,snapshot_hash=?,version=version+1,updated_at=?
    WHERE id=(SELECT g.id FROM reading_upgrade_grants g WHERE g.user_id=? AND g.market=? AND g.service_id=?
      AND g.campaign_id=? AND g.status='available' AND (g.source_scope_key IS NULL OR g.source_scope_key=?)
      AND ${activeSource} ORDER BY g.created_at,g.id LIMIT 1)
    AND NOT EXISTS(SELECT 1 FROM reading_upgrade_grants WHERE user_id=? AND market=? AND service_id=? AND campaign_id=? AND status='running')`,
  )
    .bind(
      input.operationId,
      chargeId,
      input.requestHash,
      scope.scopeKey,
      scope.expiresAt,
      snapshotHash,
      now,
      userId,
      quote.market,
      input.serviceId,
      READING_UPGRADE_CAMPAIGN,
      scope.scopeKey,
      userId,
      quote.market,
      input.serviceId,
      READING_UPGRADE_CAMPAIGN,
    )
    .run();
  const claimed = await env.DB.prepare(
    'SELECT charge_id FROM reading_upgrade_grants WHERE user_id=? AND operation_id=?',
  )
    .bind(userId, input.operationId)
    .first();
  if (!claimed) fail('upgrade_in_progress');
  if (claimed.charge_id !== chargeId) return replayReadingUpgrade(env, userId, input, market);
  return { ok: true, chargeId, points: 0, market: quote.market, upgrade: true };
}
export async function completeReadingUpgrade(env, userId, chargeId, response) {
  const row = await env.DB.prepare('SELECT * FROM reading_upgrade_grants WHERE user_id=? AND charge_id=?')
    .bind(userId, chargeId)
    .first();
  if (!row) fail('charge_not_found', 404);
  if (row.status === 'succeeded') return { ok: true };
  const saved = readVisualReading(response?.choices?.[0]?.message?.content || '');
  if (
    !saved ||
    saved.report.serviceId !== row.service_id ||
    (await hash(JSON.stringify(saved.snapshot))) !== row.snapshot_hash
  )
    fail('invalid_upgrade_result', 400);
  const now = Date.now(),
    encoded = await encrypt(await resultKey(env), chargeId, JSON.stringify(response));
  const r = await env.DB.prepare(
    `UPDATE reading_upgrade_grants SET status='succeeded',response_json=?,version=version+1,updated_at=?
    WHERE user_id=? AND charge_id=? AND status='running' AND updated_at>?
    AND (claim_expires_at IS NULL OR claim_expires_at>?)`,
  )
    .bind(encoded, now, userId, chargeId, now - LEASE_MS, now)
    .run();
  if (!r.meta.changes) fail('operation_not_running');
  return { ok: true };
}
export async function refundReadingUpgrade(env, userId, chargeId) {
  const row = await env.DB.prepare('SELECT status FROM reading_upgrade_grants WHERE user_id=? AND charge_id=?')
    .bind(userId, chargeId)
    .first();
  if (!row) return { ok: true, restored: false };
  if (row.status === 'succeeded') fail('operation_completed');
  const r = await env.DB.prepare(
    `UPDATE reading_upgrade_grants SET status='available',operation_id=NULL,charge_id=NULL,
    request_hash=NULL,claim_scope_key=NULL,claim_expires_at=NULL,snapshot_hash=NULL,response_json=NULL,version=version+1,updated_at=?
    WHERE user_id=? AND charge_id=? AND status='running'`,
  )
    .bind(Date.now(), userId, chargeId)
    .run();
  return { ok: true, restored: !!r.meta.changes };
}
