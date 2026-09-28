/** Read-only projections preserve the shared report UI without mixing wallets.
 * Amount fields retain the legacy schema; currency identifies USD cents vs VND.
 * Anonymous feature/AI telemetry remains explicitly global (no historical market tag).
 */
export async function reportingMarket(env, requested) {
  const market = requested || 'VN';
  if (!['VN', 'US'].includes(market)) throw Object.assign(new Error('invalid_market'), { status: 422 });
  const actual = new Set(
    (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(r => r.name),
  );
  const available = new Set(actual),
    projections = [];
  const alias = (name, source, sql) => {
    available.delete(name);
    if (actual.has(source)) {
      available.add(name);
      projections.push(`${name} AS (${sql})`);
    }
  };
  if (market === 'US') {
    alias(
      'zalo_point_ledger',
      'credits_ledger',
      `SELECT id,user_id,delta,created_at,
    CASE WHEN kind='purchase' THEN 'topup_payos' WHEN kind='bonus' THEN 'new_user' ELSE kind END reason
    FROM credits_ledger`,
    );
    alias(
      'topup_orders_zalo',
      'lemon_orders',
      `SELECT id,user_id,credits points,amount_usd_cents amount_vnd,created_at,
    CASE WHEN status IN ('paid','fulfilled','refunded') THEN 'paid' WHEN status='failed' THEN 'cancelled' ELSE status END status,
    ${actual.has('credits_ledger') ? "(SELECT MIN(c.created_at) FROM credits_ledger c WHERE c.source_order='lemon:'||o.id AND c.kind='purchase')" : 'NULL'} paid_at
    FROM lemon_orders o`,
    );
  }
  for (const name of ['reward_events', 'reward_ad_sessions', 'backend_ai_operations']) {
    if (!actual.has(name)) continue;
    const columns = new Set((await env.DB.prepare(`PRAGMA table_info(${name})`).all()).results.map(c => c.name));
    const predicate = columns.has('market')
      ? `market='${market}'`
      : name === 'reward_events' && columns.has('payload')
        ? `COALESCE(CASE WHEN json_valid(payload) THEN json_extract(payload,'$.market') ELSE NULL END,'VN')='${market}'`
        : market === 'US'
          ? '0'
          : '1';
    projections.push(`${name} AS (SELECT * FROM main.${name} WHERE ${predicate})`);
  }
  if (actual.has('user_referrals'))
    projections.push(
      `user_referrals AS (SELECT * FROM main.user_referrals r WHERE ${actual.has('market_preferences') ? `COALESCE((SELECT p.market FROM market_preferences p WHERE p.user_id=r.user_id),'VN')='${market}'` : market === 'US' ? '0' : '1'})`,
    );
  return {
    ...env,
    reportingTables: available,
    DB: {
      prepare(sql) {
        const used = projections.filter(p => new RegExp(`\\b${p.split(' ')[0]}\\b`).test(sql));
        return env.DB.prepare(used.length ? `WITH ${used.join(',')} ${sql}` : sql);
      },
      batch: (...args) => env.DB.batch(...args),
    },
  };
}
