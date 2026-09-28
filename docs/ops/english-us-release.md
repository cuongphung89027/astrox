# English/US release runbook (plan Task 23–24)

> Release owner only. Never deploy from a dirty tree; verify SHA on both
> remotes first (push origin + upstream per deploy topology note). Record
> everything in qa-report/english-us/.

## 0. Preconditions (all must be YES before production)

- [ ] RC green: `qa-report/english-us/release-candidate.md` at the release SHA.
- [ ] Google production OAuth client + redirect `https://api.theastrox.space/auth/google/callback`.
- [ ] Lemon approval (AI content + prepaid credits) + live store/variant ids.
- [ ] USD package prices + refund wording approved by Sơn (`docs/ops/english-us-pricing.md`).
- [ ] Secrets staged in Workers: `LEMON_API_KEY`, `LEMON_WEBHOOK_SECRET` (never in repo).
- [ ] VN snapshot: D1 backup (export via wrangler), `SELECT COUNT(*)` + balance sums recorded.

## 1. Database migrations (additive, ordered, one by one)

```
google-identities.sql      # nonce column + email index swap (drops unique email!)
us-credits.sql             # credits wallet tables
market-ai-operations.sql   # market columns, default VN
lemon-orders.sql           # order book
lemon-webhook.sql          # receipts
lemon-checkout-identity.sql # split checkout UUID from paid numeric order id
lemon-promos.sql           # checkout promo reservations and caps
reward-market.sql          # snapshot currency on rewarded-ad sessions (requires rewards.sql)
```

Apply via wrangler D1 migrations to **staging first**, verify invariants
(legacy VN counts unchanged; credits tables empty), then production. Never
re-run old migrations blindly; check `d1_migrations` history first.

Published legacy config hydrates `rewardsUs` disabled, `contentUs` empty, `usPromos` empty, and an independent `usUnlocks` copy. Review/publish US rewards, notices, prices, bundles and promotions separately in the shared Admin. A blank US notice does not fall back to Vietnamese copy.

## 2. Worker → Pages (same verified SHA)

1. `wrangler deploy` (Worker `astrox-api`) — includes Google auth, credits,
   market billing, Lemon webhook entrypoint, reconcile cron.
2. Pages deploy of the same SHA (upstream repo build).
3. Post-deploy smoke (production):
   - `GET /api/site-config` → `billing.usPackages` empty (US disabled by default).
   - `GET /en` 200 + `lang="en"`; `GET /` still Vietnamese.
   - `GET /en/experts` → 404. `GET /robots.txt` includes `/en/profile`.
   - VN smoke: `/tuvi`, `/tarot`, login popup, wallet history — all unchanged.

## 3. Flags (independent kill switches)

| Flag | Where | Effect |
|---|---|---|
| `AX_EN_ROUTING` | Pages env | `1` = `/` geo-redirects to `/en` for US visitors. Unset = current VN-only behavior. Keep OFF until G5. |
| `integrations.lemon.enabled` | Admin → US → Billing (D1) | Credits purchase surface. OFF by default. |
| `integrations.google.enabled` | Admin → Integrations (D1) | Google login button activity (server refuses when OFF). |
| `integrations.lemon.environment` | Admin | `test` until provider approval + operator confirmation. |

Turning a flag OFF never disables: Lemon webhook ingestion, refunds,
reconciliation, or reading order/ledger history (ROLLBACK-01).

## 4. Go-live sequence (only after provider approvals)

1. Admin → US → Billing: enter live store id + variants, set prices, `environment: live`.
2. Publish config; verify `/api/site-config` shows usPackages.
3. Operator makes ONE small real purchase + refund (explicitly authorized); verify:
   webhook receipt → order fulfilled → credits ledger 1 row → refund reverses → audit ok.
4. Enable `integrations.google.enabled`; one real Google login; `/api/me` shows `provider: "google"`.
5. Set Pages `AX_EN_ROUTING=1` LAST (this is what exposes geo routing at `/`).

## 5. Rollback rules (Task 24)

- **US checkout leak/double-credit**: turn off `lemon.enabled` (Admin). Webhooks
  and reconcile keep running for old orders. NEVER roll the Worker back to a
  build that predates the lemon_orders schema — deploy forward with the flag off.
- **Auth incident**: disable `google.enabled`; existing sessions stay valid
  (HMAC unchanged); users can be suspended via Admin users.
- **Geo routing loop**: unset `AX_EN_ROUTING` (instant, Pages env).
- **Bad migration**: migrations are additive-only; forward-fix with a new
  migration. Balance corrections go through compensating ledger entries with
  audit trail, never direct UPDATEs.
- Pages/Worker version pinning: keep the pre-release deployment IDs (from
  `wrangler deployments list` / Pages dashboard) recorded below at go-live.

## 6. Deployment record (filled 2026-09-28, see docs/releases/2026-09-28-english-us.md)

| item | value |
|---|---|
| Release SHA | _pending_ |
| Worker deployment id | _pending_ |
| Pages deployment id | _pending_ |
## 6. Deployment record (filled 2026-09-28, see docs/releases/2026-09-28-english-us.md)

| item | value |
|---|---|
| Release SHA | `422d4b6` + hotfix `7828c80` (live), both remotes fast-forwarded from `db614b2` |
| Worker deployment id | `4aa0b4e2-73cd-4a48-b138-52ee7f29613f` (supersedes `80d36f94-8d93-4631-a0b8-b81095ee39c8`) |
| Pages deployment id | `c7415b6c-8a96-44d9-844f-e346e397cc7e` (supersedes `a44c331d-9ba1-4c61-af32-e10799a9a66b`) |
| Migrations applied | All 8, manual `d1 execute` in runbook order; VN invariants unchanged; US tables empty; backup `~/astrox-backups/d1-pre-en-us-20260928.sql` |
| Flags state | AX_EN_ROUTING unset, lemon.enabled=false, google.enabled=false, lemon.environment=test |
| Rollback targets | Worker `56da6e6d` / Pages `6dfb9e6c` (both `db614b2`) — never roll Worker back past `lemon_orders` schema |
