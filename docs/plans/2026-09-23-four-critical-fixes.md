# Four critical fixes implementation plan

**Goal:** Fix C1–C4 from the verified audit without enabling billing or deploying.
**Architecture:** Server-only Zalo identity; short-lived AI-only bearer issued using the existing host-only cookie; persistent IP quotas on both AI paths; transactional paid-operation records with replay, confirmed refunds, and scheduled recovery. Keep existing Tarot/inclusive UI changes.
**Tech stack:** Pages Functions, Workers, D1/SQLite, Web Crypto, Next static client.

1. Reproduce forged Zalo finish and config-outage cache loss with failing regression tests. Remove unverified identity fallback; verify normal server callback remains working. A failed provider verification must never issue a session.
2. Add `/api/ai/session` issuing a five-minute, audience-scoped credential after checking the cookie and trusted Origin. Client sends this with same-origin AI requests; internal paid endpoints verify it. Test expiry, audience, suspension, Origin, and browser cookie boundary.
3. Add atomic persistent quotas for both configured and legacy AI. Use trusted Cloudflare client IP, hashed before storage; return 429/Retry-After and fail closed if quota storage unavailable. Test concurrent quota exhaustion and both paths.
4. Add D1 paid-operation migration. Charge once per user/operation, bind request hash, save success for replay, confirm refunds and recover abandoned charges via a 5-minute cron. Test duplicate/concurrent requests, rollback, failed refund retry, response replay, stale completion, and another user.
5. Preserve saved readings during configuration outages/upgrades; periodic expiry still applies. Test reload with an unavailable config and legacy entries.
6. Run backend/admin/rewards/client tests, production build, browser Tarot/Compatibility regressions, Worker bundling, and diff check. Update a simple Vietnamese status table with local-vs-live limits and deployment prerequisites.
