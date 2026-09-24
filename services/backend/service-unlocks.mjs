import { SERVICE_CATALOG } from '../admin/catalog.ts';
import { bundleDefinitions } from '../admin/service-tree.ts';
import { upgradeQuote } from '../admin/service-pricing.ts';
import { renderServicePrompt } from '../admin/prompt-engine.ts';
import { encrypt, decrypt, b64 } from '../admin/crypto.mjs';
const LEASE_MS = 180000;
const fail = (code, status = 409) => {
  throw Object.assign(new Error(code), { status });
};
const hash = async value =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b =>
    b.toString(16).padStart(2, '0'),
  ).join('');
const key = async env => ({
  ADMIN_ENCRYPTION_KEY: b64(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ai-result:' + env.SESSION_SECRET)),
  ),
});
export const supportsUnlock = (c, id) =>
  Boolean(c.billing.unlocks?.enabled && SERVICE_CATALOG.some(s => s.id === id && s.policy !== 'session'));
function findNode(node, id, depth = 0) {
  if (depth > 12 || !node || typeof node !== 'object' || !Array.isArray(node.values) || node.values.length > 100)
    return null;
  if (node.id === id) return node;
  for (const child of node.values) {
    const match = findNode(child, id, depth + 1);
    if (match) return match;
  }
  return null;
}
/** Scope is bound to the same structured context rendered for AI, not a browser ownership flag. */
export async function scopeForReading(serviceId, descriptor, now = Date.now()) {
  const service = SERVICE_CATALOG.find(s => s.id === serviceId);
  if (!service || service.policy === 'session') fail('invalid_scope', 400);
  const module = service.module;
  let context;
  if (module === 'compat') {
    const id =
      serviceId === 'compat--pair'
        ? 'zodiac.compatPrompt.0'
        : `compat.${serviceId.includes('batu') ? 'batu' : 'tuvi'}Pair.v1`;
    if (descriptor?.id !== id || !Array.isArray(descriptor.values)) fail('invalid_scope', 400);
    context = descriptor.values;
  } else {
    const root = {
      tuvi: 'tuvi.tuviPromptBody.0',
      zodiac: 'zodiac.zodiacPromptBody.0',
      batu: 'batu.buildBatuPromptBody.2',
      numerology: 'numerology.numerologyPromptBody.0',
    }[module];
    const body = findNode(descriptor, root);
    if (!body || body.values.length !== 3) fail('invalid_scope', 400);
    const profile = body.values[0],
      chart = body.values[1];
    const profileId = module === 'batu' ? 'batu.buildBatuPromptBody.0' : `${module}.profileContextText.0`;
    const chartId = {
      tuvi: 'tuvi.ziweiContextText.0',
      zodiac: 'zodiac.natalContextText.0',
      batu: 'batu.buildBatuPromptBody.1',
      numerology: 'numerology.numerologyContextText.0',
    }[module];
    if (profile?.id !== profileId || profile.values?.length !== 5 || profile.values.some(v => typeof v !== 'string'))
      fail('invalid_scope', 400);
    const noNatalChart = module === 'zodiac' && chart === '';
    if (!noNatalChart && (chart?.id !== chartId || typeof chart.values?.[0] !== 'string')) fail('invalid_scope', 400);
    let chartData = null;
    if (!noNatalChart) {
      try {
        chartData = JSON.parse(chart.values[0]);
      } catch {
        fail('invalid_scope', 400);
      }
    }
    if (!noNatalChart && (!chartData || typeof chartData !== 'object' || Array.isArray(chartData)))
      fail('invalid_scope', 400);
    // Numerology's daily/year values change without changing the person's identity.
    if (module === 'numerology') {
      const { personalYear, personalMonth, personalDay, now, ...stable } = chartData;
      chartData = stable;
    }
    context = [profile.values.map(v => v.trim().normalize('NFC')), chartData];
  }
  const scopeKey = await hash(JSON.stringify([module, context]));
  let expiresAt = null;
  if (service.policy === 'period') {
    const local = new Date(now + 7 * 3600000),
      y = local.getUTCFullYear(),
      m = local.getUTCMonth(),
      d = local.getUTCDate();
    const period = serviceId.endsWith('--personal-year') ? 'year' : serviceId.split('--').at(-1);
    const next =
      period === 'year'
        ? Date.UTC(y + 1, 0, 1)
        : period === 'month'
          ? Date.UTC(y, m + 1, 1)
          : period === 'week'
            ? Date.UTC(y, m, d + (7 - ((local.getUTCDay() + 6) % 7)))
            : Date.UTC(y, m, d + 1);
    expiresAt = next - 7 * 3600000;
  }
  return { scopeKey, expiresAt, module };
}
function available(c, service) {
  if (
    !service ||
    !['free', 'paid'].includes(service.status) ||
    c.operations.maintenance ||
    !c.ai.enabled ||
    !c.billing.enabled
  )
    return false;
  const root = c.billing.services.find(s => s.id === service.module);
  if (root && !['free', 'paid'].includes(root.status)) return false;
  const engine =
    { 'compat--tuvi-pair': 'iztro', 'compat--batu-pair': 'lunar' }[service.id] ||
    {
      tuvi: 'iztro',
      zodiac: 'astronomy',
      batu: 'lunar',
      numerology: 'numerology',
      tarot: 'tarot',
      kinhdich: 'kinhdich',
    }[service.module];
  return !engine || c.engines?.[engine]?.enabled !== false;
}
export async function quoteUnlock(env, userId, c, revision, input, now = Date.now()) {
  if (!input || typeof input.serviceId !== 'string' || input.serviceId.length > 80) fail('invalid_scope', 400);
  const service = c.billing.services.find(s => s.id === input.serviceId);
  if (!supportsUnlock(c, input.serviceId) || !available(c, service) || service.status !== 'paid')
    fail('service_unavailable', 403);
  try {
    renderServicePrompt(input.promptDescriptor, input.serviceId, c.prompts);
  } catch {
    fail('invalid_scope', 400);
  }
  const scope = await scopeForReading(input.serviceId, input.promptDescriptor, now);
  const rows = (
    await env.DB.prepare('SELECT * FROM service_unlock_operations WHERE user_id=? AND module=? AND scope_key=?')
      .bind(userId, scope.module, scope.scopeKey)
      .all()
  ).results;
  const version = `${rows.length}:${rows.reduce((sum, r) => sum + r.version, 0)}`;
  const grants = rows.map(r => ({
    id: r.id,
    points: r.points,
    members: JSON.parse(r.members_json),
    status: r.status,
    consumedBy: r.consumed_by,
    expiresAt: r.expires_at,
  }));
  const options = [
    { id: service.id, name: service.name, points: service.points, members: [service.id], expiresAt: scope.expiresAt },
  ];
  if (scope.expiresAt === null)
    for (const def of bundleDefinitions().filter(d => d.members.includes(service.id))) {
      const price = c.billing.unlocks.bundles.find(p => p.id === def.id && p.enabled);
      // Never sell a bundle containing unavailable, omitted or differently scoped features.
      if (
        price &&
        def.members.every(id => {
          const s = c.billing.services.find(s => s.id === id);
          return available(c, s) && s.policy === 'profile';
        })
      )
        options.push({ ...def, points: price.points, expiresAt: null });
    }
  const offers = options.map(o => ({
    ...o,
    ...upgradeQuote(o.points, o.members, grants, c.billing.unlocks.credit, now),
  }));
  return {
    revision,
    version,
    scopeKey: scope.scopeKey,
    serviceId: service.id,
    offers,
    scopeLabel: scope.expiresAt === null ? 'Cho hồ sơ đang xem' : 'Cho kỳ hiện tại (giờ Việt Nam)',
  };
}
async function existingOperation(env, userId, operationId) {
  return env.DB.prepare('SELECT * FROM service_unlock_operations WHERE user_id=? AND operation_id=?')
    .bind(userId, operationId)
    .first();
}
export async function replayUnlock(env, userId, input) {
  const op = await existingOperation(env, userId, input.operationId);
  if (!op) return null;
  if (op.request_hash !== input.requestHash || op.service_id !== input.serviceId) fail('operation_conflict');
  if (op.status === 'succeeded') {
    if (!op.response_json) fail('result_expired', 410);
    return { ok: true, replayed: true, response: JSON.parse(await decrypt(await key(env), op.id, op.response_json)) };
  }
  fail(op.status === 'refunded' ? 'operation_refunded' : 'operation_in_progress');
}
export async function reserveUnlock(env, userId, c, revision, input) {
  const replay = await replayUnlock(env, userId, input);
  if (replay) return replay;
  const q = await quoteUnlock(env, userId, c, revision, input),
    sel = input.selection;
  if (!sel || sel.revision !== revision || sel.version !== q.version || sel.scopeKey !== q.scopeKey)
    fail('quote_changed');
  const offer = q.offers.find(o => o.id === sel.offerId);
  if (!offer || offer.points !== sel.points) fail('price_changed');
  if (sel.expiresAt !== offer.expiresAt) fail('quote_changed');
  const id = crypto.randomUUID(),
    now = Date.now(),
    iso = new Date(now).toISOString(),
    module = SERVICE_CATALOG.find(s => s.id === input.serviceId).module;
  const pending = await env.DB.prepare(
    "SELECT id FROM service_unlock_operations WHERE user_id=? AND module=? AND scope_key=? AND status='running'",
  )
    .bind(userId, module, q.scopeKey)
    .first();
  if (pending) fail('purchase_in_progress');
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(
      userId,
      iso,
    ),
    env.DB.prepare(
      `INSERT INTO service_unlock_operations(id,user_id,operation_id,request_hash,config_revision,module,service_id,offer_id,scope_key,members_json,credits_json,points,status,expires_at,created_at,updated_at)
   SELECT ?,?,?,?,?,?,?,?,?,?,?,?,'running',?,?,? WHERE EXISTS(SELECT 1 FROM zalo_point_accounts WHERE user_id=? AND balance>=?)
   AND NOT EXISTS(SELECT 1 FROM service_unlock_operations WHERE user_id=? AND module=? AND scope_key=? AND status='running')
   AND (SELECT COUNT(*) || ':' || COALESCE(SUM(version),0) FROM service_unlock_operations WHERE user_id=? AND module=? AND scope_key=?)=?
   ON CONFLICT(user_id,operation_id) DO NOTHING`,
    ).bind(
      id,
      userId,
      input.operationId,
      input.requestHash,
      revision,
      module,
      input.serviceId,
      offer.id,
      q.scopeKey,
      JSON.stringify(offer.owned ? [] : offer.members),
      JSON.stringify(offer.creditIds),
      offer.points,
      offer.expiresAt,
      now,
      now,
      userId,
      offer.points,
      userId,
      module,
      q.scopeKey,
      userId,
      module,
      q.scopeKey,
      q.version,
    ),
    env.DB.prepare(
      "INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT id,user_id,-points,'ai_service',id,? FROM service_unlock_operations WHERE id=? AND points>0",
    ).bind(iso, id),
    env.DB.prepare(
      'UPDATE zalo_point_accounts SET balance=balance-?,updated_at=? WHERE user_id=? AND changes()=1',
    ).bind(offer.points, iso, userId),
  ]);
  const op = await existingOperation(env, userId, input.operationId);
  if (!op) {
    const balance =
      (await env.DB.prepare('SELECT balance FROM zalo_point_accounts WHERE user_id=?').bind(userId).first())?.balance ||
      0;
    if (balance < offer.points) fail('insufficient_points', 402);
    fail('quote_changed');
  }
  if (op.id !== id) return replayUnlock(env, userId, input);
  return { ok: true, chargeId: id, points: offer.points };
}
export async function completeUnlock(env, userId, id, response) {
  const encoded = await encrypt(await key(env), id, JSON.stringify(response)),
    now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE service_unlock_operations SET status='succeeded',response_json=?,updated_at=?,version=version+1 WHERE id=? AND user_id=? AND status='running' AND created_at>?",
    ).bind(encoded, now, id, userId, now - LEASE_MS),
    env.DB.prepare(
      `UPDATE service_unlock_operations SET consumed_by=?,version=version+1 WHERE user_id=? AND consumed_by IS NULL AND id IN (SELECT value FROM json_each((SELECT credits_json FROM service_unlock_operations WHERE id=? AND user_id=? AND status='succeeded')))`,
    ).bind(id, userId, id, userId),
  ]);
  const op = await env.DB.prepare('SELECT status FROM service_unlock_operations WHERE id=? AND user_id=?')
    .bind(id, userId)
    .first();
  if (op?.status !== 'succeeded') fail('operation_not_running');
  return { ok: true };
}
export async function refundUnlock(env, userId, id, cutoff = Date.now()) {
  const op = await env.DB.prepare('SELECT status FROM service_unlock_operations WHERE id=? AND user_id=?')
    .bind(id, userId)
    .first();
  if (!op) fail('charge_not_found', 404);
  if (op.status === 'succeeded') fail('operation_completed');
  const iso = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,user_id,points,'ai_service_refund',id,? FROM service_unlock_operations WHERE id=? AND user_id=? AND status='running' AND created_at<=? AND points>0 ON CONFLICT(reason,reference_id,user_id) DO NOTHING",
    ).bind(crypto.randomUUID(), iso, id, userId, cutoff),
    env.DB.prepare(
      'UPDATE zalo_point_accounts SET balance=balance+(SELECT points FROM service_unlock_operations WHERE id=?),updated_at=? WHERE user_id=? AND changes()=1',
    ).bind(id, iso, userId),
    env.DB.prepare(
      "UPDATE service_unlock_operations SET status='refunded',updated_at=?,version=version+1 WHERE id=? AND user_id=? AND status='running' AND created_at<=? AND (points=0 OR EXISTS(SELECT 1 FROM zalo_point_ledger WHERE reason='ai_service_refund' AND reference_id=service_unlock_operations.id AND user_id=service_unlock_operations.user_id))",
    ).bind(Date.now(), id, userId, cutoff),
  ]);
  const after = await env.DB.prepare('SELECT status FROM service_unlock_operations WHERE id=? AND user_id=?')
    .bind(id, userId)
    .first();
  if (after.status !== 'refunded') fail('operation_completed');
  return { ok: true };
}
export async function reconcileUnlocks(env, now = Date.now()) {
  const rows = (
    await env.DB.prepare(
      "SELECT id,user_id FROM service_unlock_operations WHERE status='running' AND created_at<=? LIMIT 100",
    )
      .bind(now - LEASE_MS)
      .all()
  ).results;
  for (const r of rows) await refundUnlock(env, r.user_id, r.id, now - LEASE_MS);
  await env.DB.prepare(
    "UPDATE service_unlock_operations SET response_json=NULL WHERE status='succeeded' AND updated_at<? AND response_json IS NOT NULL",
  )
    .bind(now - 7 * 86400000)
    .run();
  return rows.length;
}
