# English/US operations handoff (plan Task 24)

Owner: Sơn (operator). Everything below runs on the production D1 database
(`astrox-db`, binding `DB`) unless noted. Use `wrangler d1 execute astrox-db
--remote --command "..."` or the Admin data panels.

## Dashboard queries

**Pending/failed Lemon fulfillment (needs attention when > 0):**
```sql
SELECT id, user_id, status, package_id, credits, checkout_url, created_at
FROM lemon_orders
WHERE status IN ('pending','failed')
  AND created_at > datetime('now','-2 days')
ORDER BY created_at DESC;
```

**Stale reservations (credits stuck in reserved > 30 min):**
```sql
SELECT user_id, reserved, updated_at FROM credits_accounts
WHERE reserved > 0 AND updated_at < datetime('now','-30 minutes');
```
Expected: none — the cron releases them via `reconcileAi`/`reconcileLemon`
(every 5 min). If rows persist, run a Worker cron trigger manually.

**Refunds & debts awaiting manual resolution:**
```sql
SELECT user_id, operation_key, created_at FROM credits_ledger
WHERE operation_key LIKE 'debt:%' ORDER BY created_at DESC;
SELECT id, user_id, refunded_cents, refunded_credits, status
FROM lemon_orders WHERE refunded_cents > 0 ORDER BY updated_at DESC;
```

**Balance audit (must always match):**
```sql
SELECT c.user_id, c.balance, COALESCE(SUM(l.delta),0) AS ledger_sum
FROM credits_accounts c LEFT JOIN credits_ledger l ON l.user_id=c.user_id
GROUP BY c.user_id HAVING c.balance != ledger_sum;
```
Empty result = healthy. Non-empty = stop and reconcile before selling.

**OAuth failures (Google login triage, mirrors login_diagnostics):**
```sql
SELECT stage, COUNT(*) n FROM login_diagnostics
WHERE detail LIKE '%google%' AND created_at > datetime('now','-1 day')
GROUP BY stage;
```

**Per-market cost snapshot (AI spend by market, last 7 days):**
```sql
SELECT market, COUNT(*) ops, SUM(points) units FROM backend_ai_operations
WHERE created_at > (strftime('%s','now')-604800)*1000 GROUP BY market;
```

## Kill-switch matrix (independent)

| Symptom | Switch off | Still works |
|---|---|---|
| Checkout incident | Admin → US → Billing → disable lemon | webhook, refunds, history |
| Google auth incident | Admin → Integrations → google off | Zalo VN + existing sessions |
| Geo routing loop | Pages env `AX_EN_ROUTING` unset | everything (VN `/` behavior) |
| AI EN quality incident | unpublish EN services in Admin | VN services unaffected |

## Monitoring cadence (suggested, no automation until requested)

- **24h** post-go-live: pending orders, stale reservations, OAuth failures, webhook 4xx/5xx.
- **72h**: refund queue, debts, Lemon payout dashboard cross-check.
- **7d**: balance audit, per-market cost vs pricing sheet, first support tickets.

## Alerts → owner actions

| Alert | Action |
|---|---|
| `ai.refund_reconciliation_failed` in Worker logs | Inspect the charge row; forward-fix; never re-run destructive SQL |
| Balance audit mismatch | Freeze US sales (lemon off), export both tables, reconcile manually |
| Lemon webhook 401 spike | Secret rotation happened → update `LEMON_WEBHOOK_SECRET`, verify receipt flow |
| Google 401 on `/api/me` | Check JWT clock skew / client secret; sessions survive |

## Honest status at handoff

- "Released" ≠ "profitable/market-validated" (plan §E Task 24).
- G4 certified at `ccf5d47`; G5 intentionally BLOCKED on: Lemon approval,
  Google production client, approved USD pricing, one authorized live
  purchase+refund test (see docs/ops/english-us-release.md §4).
