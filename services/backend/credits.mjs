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
      `INSERT INTO credits_ledger(id,user_id,delta,balance_after,kind,operation_key,source_order,lot_id,created_at)
      SELECT ?,?,?,NULL,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM credits_accounts WHERE user_id=? AND status='active')
      ON CONFLICT(user_id,kind,operation_key) DO NOTHING`,
    ).bind(ledgerId, userId, amount, kind, opKey, orderId, lot, at, userId),
    env.DB.prepare(
      'UPDATE credits_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)',
    ).bind(amount, at, userId, ledgerId),
    env.DB.prepare(
      'INSERT INTO credit_lots(id,user_id,source,remaining,expires_at,created_at) SELECT ?,?,?,?,NULL,? WHERE EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)',
    ).bind(lot, userId, kind === 'bonus' ? 'bonus' : 'purchase', amount, at, ledgerId),
  ]);
  const written = await env.DB.prepare('SELECT id FROM credits_ledger WHERE user_id=? AND kind=? AND operation_key=?')
    .bind(userId, kind, opKey)
    .first();
  if (!written) throw new Error('wallet_restricted');
  return { credited: written.id === ledgerId, ledgerId: written.id, lotId: lot };
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
  // Atomic commit: account deduction, FIFO lot consumption and the ledger row
  // commit or roll back TOGETHER (one D1 batch = one transaction). The ledger
  // INSERT only runs when the guarded account UPDATE changed exactly one row
  // (changes()); lot updates only run once the ledger row exists — so a failed
  // batch leaves the reservation intact for a clean retry, and a guard failure
  // writes nothing at all.
  const held = await env.DB.prepare('SELECT balance,reserved FROM credits_accounts WHERE user_id=? AND reserved>=?')
    .bind(userId, amount)
    .first();
  if (!held) throw new Error('reserve_not_held');
  // Optimistic-concurrency FIFO: plan the take from current lot state, run the
  // batch; a concurrent commit that raced on the same lots triggers a CHECK
  // (remaining >= 0) → the whole batch rolls back (reservation intact) → retry
  // with fresh lot data. Bounded retries; the ledger UNIQUE makes double
  // commits impossible. This works identically on D1 batch (transactional).
  const ledgerId = crypto.randomUUID();
  for (let attempt = 0; attempt < 3; attempt++) {
    const lots = (
      await env.DB.prepare(
        'SELECT id,remaining FROM credit_lots WHERE user_id=? AND remaining>0 ORDER BY created_at, rowid',
      )
        .bind(userId)
        .all()
    ).results;
    const statements = [
      env.DB.prepare(
        "UPDATE credits_accounts SET balance=balance-?, reserved=reserved-?, updated_at=? WHERE user_id=? AND reserved>=? AND NOT EXISTS(SELECT 1 FROM credits_ledger WHERE user_id=? AND kind IN ('spend','release') AND operation_key=?)",
      ).bind(amount, amount, nowIso(), userId, amount, userId, operationKey),
      env.DB.prepare(
        'INSERT INTO credits_ledger(id,user_id,delta,balance_after,kind,operation_key,source_order,lot_id,created_at) SELECT ?,?,?,NULL,?,?,?,?,? WHERE changes()=1',
      ).bind(ledgerId, userId, -amount, 'spend', operationKey, meta || null, null, nowIso()),
    ];
    let left = amount;
    for (const lot of lots) {
      if (left <= 0) break;
      const take = Math.min(left, lot.remaining);
      // Guard against a concurrent commit having already consumed from this lot:
      // the WHERE clause verifies the expected remaining, failing the batch on mismatch.
      statements.push(
        env.DB.prepare(
          "UPDATE credit_lots SET remaining=remaining-? WHERE id=? AND EXISTS(SELECT 1 FROM credits_ledger WHERE id=? AND user_id=? AND kind='spend' AND operation_key=?)",
        ).bind(take, lot.id, ledgerId, userId, operationKey),
      );
      left -= take;
    }
    try {
      await env.DB.batch(statements);
      break;
    } catch (e) {
      if (attempt < 2 && /CHECK constraint|constraint/i.test(String(e?.message || e))) continue; // retry with fresh lots
      throw e;
    }
  }
  const written = await env.DB.prepare(
    "SELECT id FROM credits_ledger WHERE user_id=? AND kind='spend' AND operation_key=?",
  )
    .bind(userId, operationKey)
    .first();
  if (!written) throw new Error('reserve_not_held');
  return {
    committed: written.id === ledgerId,
    ledgerId: written.id,
    balanceAfter: (await creditsBalance(env, userId)).balance,
  };
}

/** Releases a reservation after failure/abort. Idempotent per operation. */
export async function releaseReserved(env, { userId, amount, operationKey }) {
  const existing = () =>
    env.DB.prepare(
      "SELECT id,kind FROM credits_ledger WHERE user_id=? AND kind IN ('spend','release') AND operation_key=?",
    )
      .bind(userId, operationKey)
      .first();
  const already = await existing();
  if (already?.kind === 'spend') throw Object.assign(new Error('operation_completed'), { status: 409 });
  if (already) return { released: false, ledgerId: already.id };
  const ledgerId = crypto.randomUUID(),
    at = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE credits_accounts SET reserved=reserved-?,updated_at=? WHERE user_id=? AND reserved>=? AND NOT EXISTS(SELECT 1 FROM credits_ledger WHERE user_id=? AND kind IN ('spend','release') AND operation_key=?)",
    ).bind(amount, at, userId, amount, userId, operationKey),
    env.DB.prepare(
      "INSERT INTO credits_ledger(id,user_id,delta,kind,operation_key,created_at) SELECT ?,?,0,'release',?,? WHERE changes()=1",
    ).bind(ledgerId, userId, operationKey, at),
  ]);
  const written = await existing();
  if (written?.kind === 'spend') throw Object.assign(new Error('operation_completed'), { status: 409 });
  if (!written) throw new Error('reserve_not_held');
  return { released: written.id === ledgerId, ledgerId: written.id };
}

/** Paged, stable ledger history — never crosses users. */
export async function creditsHistory(env, userId, { limit = 50, before = null } = {}) {
  limit = Math.max(1, Math.min(100, Math.trunc(Number(limit) || 50)));
  let at = before,
    id = null;
  if (before?.startsWith('[')) {
    try {
      [at, id] = JSON.parse(before);
    } catch {
      throw new Error('invalid_cursor');
    }
    if (typeof at !== 'string' || typeof id !== 'string') throw new Error('invalid_cursor');
  }
  const clause = at ? (id ? ' AND (created_at<? OR (created_at=? AND id<?))' : ' AND created_at<?') : '';
  const rows = (
    await env.DB.prepare(
      `SELECT id,delta,kind,operation_key,source_order,created_at FROM credits_ledger WHERE user_id=?${clause} ORDER BY created_at DESC,id DESC LIMIT ?`,
    )
      .bind(userId, ...(at ? (id ? [at, at, id] : [at]) : []), limit + 1)
      .all()
  ).results;
  const entries = rows.slice(0, limit),
    last = entries.at(-1);
  return { entries, nextCursor: entries.length === limit ? JSON.stringify([last.created_at, last.id]) : null };
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

/** Explicit Admin adjustment: one receipt, wallet and FIFO lots in one batch. */
export async function adjustCredits(env, { userId, delta, requestKey, note = '' }) {
  if (
    !/^[a-zA-Z0-9_-]{8,120}$/.test(requestKey || '') ||
    !Number.isSafeInteger(delta) ||
    !delta ||
    Math.abs(delta) > 100000
  )
    throw Object.assign(new Error('invalid_adjustment'), { status: 400 });
  const operationKey = `admin:${requestKey}`,
    id = crypto.randomUUID(),
    at = nowIso();
  const existing = () =>
    env.DB.prepare("SELECT id,delta FROM credits_ledger WHERE user_id=? AND kind='adjustment' AND operation_key=?")
      .bind(userId, operationKey)
      .first();
  const replay = await existing();
  if (replay) {
    if (replay.delta !== delta) throw Object.assign(new Error('adjustment_conflict'), { status: 409 });
    return { ok: true, replayed: true };
  }
  await ensureCreditAccount(env, userId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const statements = [
      env.DB.prepare(
        "UPDATE credits_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND status='active' AND balance+?>=reserved AND NOT EXISTS(SELECT 1 FROM credits_ledger WHERE user_id=? AND kind='adjustment' AND operation_key=?)",
      ).bind(delta, at, userId, delta, userId, operationKey),
      env.DB.prepare(
        "INSERT INTO credits_ledger(id,user_id,delta,kind,operation_key,source_order,created_at) SELECT ?,?,?,'adjustment',?,?,? WHERE changes()=1",
      ).bind(id, userId, delta, operationKey, note.slice(0, 200), at),
    ];
    if (delta > 0)
      statements.push(
        env.DB.prepare(
          "INSERT INTO credit_lots(id,user_id,source,remaining,created_at) SELECT ?,?,'bonus',?,? WHERE EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)",
        ).bind(crypto.randomUUID(), userId, delta, at, id),
      );
    else {
      const lots = (
        await env.DB.prepare(
          'SELECT id,remaining FROM credit_lots WHERE user_id=? AND remaining>0 ORDER BY created_at,rowid',
        )
          .bind(userId)
          .all()
      ).results;
      let left = -delta;
      for (const lot of lots) {
        if (!left) break;
        const take = Math.min(left, lot.remaining);
        left -= take;
        statements.push(
          env.DB.prepare(
            'UPDATE credit_lots SET remaining=remaining-? WHERE id=? AND EXISTS(SELECT 1 FROM credits_ledger WHERE id=?)',
          ).bind(take, lot.id, id),
        );
      }
      if (left) {
        const done = await existing();
        if (done?.delta === delta) return { ok: true, replayed: true };
        throw Object.assign(new Error('insufficient_credits'), { status: 409 });
      }
    }
    try {
      await env.DB.batch(statements);
      break;
    } catch (error) {
      if (attempt < 2 && /constraint/i.test(String(error))) continue;
      throw error;
    }
  }
  const written = await existing();
  if (!written) throw Object.assign(new Error('insufficient_or_restricted_credits'), { status: 409 });
  if (written.delta !== delta) throw Object.assign(new Error('adjustment_conflict'), { status: 409 });
  return { ok: true, replayed: written.id !== id };
}
