import { marketOf } from './credits.mjs';

/** Both markets use the same reward rules; recipient market selects the ledger.
 * Every statement runs in the caller's event transaction. A fresh ledger id
 * guards both balance and lot writes, so a replay cannot issue a second bonus. */
export async function rewardCreditStatements(
  env,
  { userId, points, reason, referenceId, market },
  now,
  guard = { sql: '1', args: [] },
) {
  if (!Number.isSafeInteger(points) || points <= 0) return [];
  if ((market ?? (await marketOf(env, userId))) !== 'US')
    return [
      env.DB.prepare('INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) VALUES(?,0,?)').bind(
        userId,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO zalo_point_ledger(id,user_id,delta,reason,reference_id,created_at) SELECT ?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT(reason,reference_id,user_id) DO NOTHING`,
      ).bind(crypto.randomUUID(), userId, points, reason, referenceId, now, ...guard.args),
      env.DB.prepare(
        'UPDATE zalo_point_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND changes()=1',
      ).bind(points, now, userId),
    ];
  const account = await env.DB.prepare('SELECT status FROM credits_accounts WHERE user_id=?').bind(userId).first();
  if (account?.status === 'restricted') throw new Error('wallet_restricted');
  const id = crypto.randomUUID(),
    lot = crypto.randomUUID(),
    key = `reward:${reason}:${referenceId}`;
  return [
    env.DB.prepare(
      "INSERT OR IGNORE INTO credits_accounts(user_id,balance,reserved,status,updated_at) VALUES(?,0,0,'active',?)",
    ).bind(userId, now),
    env.DB.prepare(
      `INSERT INTO credits_ledger(id,user_id,delta,kind,operation_key,source_order,lot_id,created_at) SELECT ?,?,?,'bonus',?,?,?,? WHERE ${guard.sql} AND EXISTS(SELECT 1 FROM credits_accounts WHERE user_id=? AND status='active') ON CONFLICT(user_id,kind,operation_key) DO NOTHING`,
    ).bind(id, userId, points, key, key, lot, now, ...guard.args, userId),
    env.DB.prepare(
      'UPDATE credits_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)',
    ).bind(points, now, userId, id),
    env.DB.prepare(
      "INSERT INTO credit_lots(id,user_id,source,remaining,created_at) SELECT ?,?,'bonus',?,? WHERE EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)",
    ).bind(lot, userId, points, now, id),
  ];
}
