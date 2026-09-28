/**
 * US Credits ledger (plan Task 13). One authoritative balance per user
 * (credits_accounts); every movement lands in credits_ledger exactly once via
 * UNIQUE(user_id, kind, operation_key). Spends reserve first, commit exactly
 * once after a valid result, and release on failure — the reserve/commit/release
 * lifecycle the AI billing (Task 14) and Lemon fulfillment (Task 16) build on.
 *
 * All mutations are single conditional UPDATEs (or one atomic batch), so
 * concurrent spend attempts cannot drive the balance negative; D1 batch is
 * transactional and the SQLite test harness executes statements synchronously.
 */
const nowIso = () => new Date().toISOString();

export async function ensureCreditAccount(env, userId) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO credits_accounts(user_id,balance,reserved,status,updated_at) VALUES(?,0,0,'active',?)",
  )
    .bind(userId, nowIso())
    .run();
}

export async function creditsBalance(env, userId) {
  const row = await env.DB.prepare('SELECT balance,reserved,status FROM credits_accounts WHERE user_id=?')
    .bind(userId)
    .first();
  return row
    ? { available: row.balance - row.reserved, balance: row.balance, reserved: row.reserved, status: row.status }
    : { available: 0, balance: 0, reserved: 0, status: 'active' };
}

/** Credits a purchase or bonus as a new lot + ledger row. Idempotent per order. */
export async function creditPurchase(env, { userId, amount, kind = 'purchase', orderId, lotId, note = '' }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('invalid_amount');
  const opKey = `credit:${orderId}`;
  const existing = await env.DB.prepare(
    "SELECT id FROM credits_ledger WHERE user_id=? AND kind IN ('purchase','bonus') AND operation_key=?",
  )
    .bind(userId, opKey)
    .first();
  if (existing) return { credited: false, ledgerId: existing.id };
  const lot = lotId || crypto.randomUUID();
  const ledgerId = crypto.randomUUID();
  const at = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO credits_accounts(user_id,balance,reserved,status,updated_at) VALUES(?,0,0,'active',?)",
    ).bind(userId, at),
    env.DB.prepare(
      'INSERT INTO credit_lots(id,user_id,source,remaining,expires_at,created_at) VALUES(?,?,?,?,NULL,?)',
    ).bind(lot, userId, kind === 'bonus' ? 'bonus' : 'purchase', amount, at),
    env.DB.prepare(
      "UPDATE credits_accounts SET balance=balance+?, updated_at=? WHERE user_id=? AND status='active'",
    ).bind(amount, at, userId),
    env.DB.prepare(
      'INSERT INTO credits_ledger(id,user_id,delta,balance_after,kind,operation_key,source_order,lot_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
    ).bind(ledgerId, userId, amount, null, kind, opKey, orderId, lot, at),
  ]);
  return { credited: true, ledgerId, lotId: lot };
}

/** Reserves credits for an operation. Returns false when insufficient — never negative. */
export async function reserveCredits(env, { userId, amount, operationKey }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('invalid_amount');
  await ensureCreditAccount(env, userId);
  const row = await env.DB.prepare(
    "UPDATE credits_accounts SET reserved=reserved+?, updated_at=? WHERE user_id=? AND status='active' AND balance-reserved>=? RETURNING balance,reserved",
  )
    .bind(amount, nowIso(), userId, amount)
    .first();
  return Boolean(row);
}

/** Commits a reservation: consumes lots FIFO, deducts balance, writes one spend row. */
export async function commitReserved(env, { userId, amount, operationKey, meta = null }) {
  const already = await env.DB.prepare(
    "SELECT id FROM credits_ledger WHERE user_id=? AND kind='spend' AND operation_key=?",
  )
    .bind(userId, operationKey)
    .first();
  if (already) return { committed: false, ledgerId: already.id };
  const account = await env.DB.prepare(
    'UPDATE credits_accounts SET balance=balance-?, reserved=reserved-?, updated_at=? WHERE user_id=? AND reserved>=? RETURNING balance',
  )
    .bind(amount, amount, nowIso(), userId, amount)
    .first();
  if (!account) throw new Error('reserve_not_held');
  // FIFO lot consumption inside the same call; the account UPDATE above already won.
  const lots = (
    await env.DB.prepare(
      'SELECT id,remaining FROM credit_lots WHERE user_id=? AND remaining>0 ORDER BY created_at, rowid',
    )
      .bind(userId)
      .all()
  ).results;
  let left = amount;
  const statements = [];
  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(left, lot.remaining);
    statements.push(env.DB.prepare('UPDATE credit_lots SET remaining=remaining-? WHERE id=?').bind(take, lot.id));
    left -= take;
  }
  const ledgerId = crypto.randomUUID();
  statements.push(
    env.DB.prepare(
      "INSERT INTO credits_ledger(id,user_id,delta,balance_after,kind,operation_key,source_order,lot_id,created_at) VALUES(?,?,?,?,'spend',?,?,?,?)",
    ).bind(ledgerId, userId, -amount, account.balance, operationKey, meta || null, null, nowIso()),
  );
  await env.DB.batch(statements);
  return { committed: true, ledgerId, balanceAfter: account.balance };
}

/** Releases a reservation after failure/abort. Idempotent per operation. */
export async function releaseReserved(env, { userId, amount, operationKey }) {
  const already = await env.DB.prepare(
    "SELECT id FROM credits_ledger WHERE user_id=? AND kind='release' AND operation_key=?",
  )
    .bind(userId, operationKey)
    .first();
  if (already) return { released: false, ledgerId: already.id };
  const row = await env.DB.prepare(
    'UPDATE credits_accounts SET reserved=reserved-?, updated_at=? WHERE user_id=? AND reserved>=? RETURNING reserved',
  )
    .bind(amount, nowIso(), userId, amount)
    .first();
  if (!row) throw new Error('reserve_not_held');
  const ledgerId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO credits_ledger(id,user_id,delta,balance_after,kind,operation_key,created_at) VALUES(?,?,0,?,'release',?,?)",
  )
    .bind(ledgerId, userId, null, operationKey, nowIso())
    .run();
  return { released: true, ledgerId };
}

/** Paged, stable ledger history — never crosses users. */
export async function creditsHistory(env, userId, { limit = 50, before = null } = {}) {
  const rows = before
    ? (
        await env.DB.prepare(
          'SELECT id,delta,kind,operation_key,source_order,created_at FROM credits_ledger WHERE user_id=? AND created_at<? ORDER BY created_at DESC, id DESC LIMIT ?',
        )
          .bind(userId, before, limit)
          .all()
      ).results
    : (
        await env.DB.prepare(
          'SELECT id,delta,kind,operation_key,source_order,created_at FROM credits_ledger WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT ?',
        )
          .bind(userId, limit)
          .all()
      ).results;
  return { entries: rows, nextCursor: rows.length === limit ? rows[rows.length - 1].created_at : null };
}

/** Market preference: explicit, authenticated choice — never derived from IP/locale. */
export async function marketOf(env, userId) {
  try {
    const row = await env.DB.prepare('SELECT market FROM market_preferences WHERE user_id=?').bind(userId).first();
    return row?.market ?? null;
  } catch {
    // Table not migrated yet: every account is VN by definition in that window.
    return null;
  }
}

export async function setMarket(env, userId, market) {
  if (market !== 'VN' && market !== 'US') throw new Error('invalid_market');
  const busy = await env.DB.prepare('SELECT reserved FROM credits_accounts WHERE user_id=? AND reserved>0')
    .bind(userId)
    .first();
  if (busy) throw new Error('market_change_blocked_pending_operation');
  await env.DB.prepare(
    'INSERT INTO market_preferences(user_id,market,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET market=excluded.market, updated_at=excluded.updated_at',
  )
    .bind(userId, market, nowIso())
    .run();
  return { market };
}

/** Audit invariant: ledger sum equals the account balance. */
export async function auditCredits(env, userId) {
  const account = await env.DB.prepare('SELECT balance FROM credits_accounts WHERE user_id=?').bind(userId).first();
  const sum = await env.DB.prepare('SELECT COALESCE(SUM(delta),0) AS inflow FROM credits_ledger WHERE user_id=?')
    .bind(userId)
    .first();
  const balance = account?.balance ?? 0;
  return { ok: balance === sum.inflow, balance, inflow: sum.inflow };
}
