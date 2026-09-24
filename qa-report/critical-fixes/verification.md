# C1–C4 verification — 2026-09-23

> Cập nhật 24/09/2026: bản sửa đã lên production. Tài liệu này giữ bằng chứng của đợt trước triển khai; xem bảng mới tại [bảng production](../2026-09-24-production-status.md).
## Implemented

- C2: retired `/auth/zalo/finish` with HTTP 410. Callback verifies identity with the provider on the server; failure returns 502 and never escrows/exposes tokens or accepts client `me`. Normal verified callback is regression-tested.
- C1: `/api/ai/session` POST checks trusted Origin and host-only session, issues a 5-minute AI-audience HMAC credential. Pages forwards it only via the existing internal service binding. Tokens cannot authenticate normal account APIs. Frontend keeps tokens in memory only.
- C3: shared D1 atomic counters protect both configured and unpublished legacy AI. Daily HMAC IP keys avoid storing raw IP addresses. Defaults: 6/IP/minute, 60/IP/day, 2000/global/day. Overrides: `AI_IP_PER_MINUTE`, `AI_IP_PER_DAY`, `AI_GLOBAL_PER_DAY`. Missing DB/key/schema fails closed with 503. Quota errors return 429/Retry-After. This is an application quota, not proof of comprehensive bot protection.
- C4: `backend_ai_operations` binds user/operation ID to the request hash. Charge reservation and wallet/ledger writes are one transaction. Repeated/concurrent operations cannot run another paid provider call. Successful responses are encrypted and retained for retry for 7 days, then response content is purged while idempotency tombstones remain. Frontend retains unresolved IDs across reload in sessionStorage (only hashes/IDs, no prompts or credentials).
- C4 recovery: two immediate confirmed refund attempts; failures remain running in durable storage and are reported as pending, never falsely logged as refunded. Cron runs every 5 minutes, recovering operations older than the 3-minute lease (provider runtime is capped at 2 minutes). Completion and refund are mutually exclusive. Cleanup also removes expired quota/OAuth rows and obsolete insecure pending tokens.
- Cache: saved readings stay readable after config failure, reload, or revision change; profile isolation, periodic expiry and explicit force semantics remain.

D1 batch atomicity follows the [D1 database API documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/). The recovery entrypoint follows the [Workers scheduled handler documentation](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/).

## Verification

- 146 tests pass: `node --test services/admin/*.test.mjs services/backend/*.test.mjs services/rewards/rules.test.mjs web/tests/*.test.mjs`.
- Failing reproductions observed before fixes: forged valid-escrow victim login; server verification fallback; missing ticket endpoint; concurrent requests debiting 4 times; no response replay; missing durable refund recovery; saved reading disappears on config outage; large response encryption overflowing argument size.
- Browser test uses real Chromium cookie/CORS behavior with actual local application handlers and SQLite; only external provider response is mocked. Cookie reaches `api.theastrox.space` but not the Pages origin. AI bearer reaches Pages, response replay calls provider once and wallet changes 100 → 90 once.
- Full UI regression: Tarot recovery/read/delete/count and compatibility 4 gender pairings at 360/390/1440px, loading/error/retry/cache; no page errors. External APIs mocked.
- Next production build passed (16 routes).
- Targeted ESLint passed for `api.ts`, `state.ts`, `ai-operation.ts`.
- Worker dry-run bundle passed: `wrangler deploy --dry-run --config services/backend/wrangler.jsonc --outdir /tmp/astrox-critical-worker`.
- Pages Functions compilation passed: `wrangler pages functions build functions --outdir /tmp/astrox-critical-pages`.
- `git diff --check` passed.

## Deployment prerequisites — not performed

1. Keep paid AI disabled while rolling out. Back up and apply `migrations/ai-safety.sql` to the shared D1 used by Pages and the backend; existing migrations remain prerequisites. No remote migration ran here.
2. Deploy backend with `/api/ai/session`, internal charge/complete/refund, and the 5-minute scheduled trigger. Deploy Pages Functions and the frontend together after the backend. Old clients cannot invoke paid operations without valid operation IDs.
3. Verify Pages `DB`, `ADMIN_ENCRYPTION_KEY`, and `ASTROX_BACKEND` → the private `AdminBackend` entrypoint; backend `SESSION_SECRET` and DB must be available. No need to widen cookie Domain. The limiter fails closed if the Pages key/database is absent.
4. Confirm scheduled invocations execute and pending operations are resolved. A configured cron is not evidence it ran in production. Reconciliation retries DB outages; no immediate refund guarantee during a database outage. Batch size is 100 per scheduled run.
5. Test Zalo login from the deployed Worker. If Zalo still returns -501 for server verification, sign-in will fail safely; resolve server/provider connectivity before commercial launch. Do not restore the insecure client-identity fallback. Existing sessions are not automatically revoked by this patch; consider invalidating old sessions during the initial security rollout. The response-encryption key is derived from SESSION_SECRET, so later secret rotations require a retention/key-rotation plan for pending replay content.
6. Test a controlled real transaction and authorized provider call; verify account, price, balance, retry, and refund. No real login, payment, paid provider call, or deployment was performed in this task.

## Scope remaining

Cloud synchronization, visible prices, shared balance/logout state, canceled topup feedback, SEO/performance, analytics and project-wide lint remain outside these four fixes. Existing Tarot/inclusive compatibility edits were preserved. Terms content was inspected for existence, not legally assessed.
