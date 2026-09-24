# Reward rules — integration status

Implemented: server-side rules connected to verified Zalo identity, D1 wallet ledger, PayOS settlement, attendance API, Admin configuration and wallet UI. Current approved referral mode is unlimited. Test: `node --test services/backend/*.test.mjs services/rewards/rules.test.mjs web/tests/*.test.mjs` (Node 24).

Rewarded web ads use the Google Publisher Tag opt-in flow and server-owned sessions, caps and idempotent wallet credits. Delivery remains disabled until genuine Google Ad Manager network/ad-unit settings are provided and a real-provider check passes. Google rewarded web has no server-side verification: the granted event is client-reported and can be spoofed by a determined authenticated client. Do not describe this as proof of viewing. See `qa-report/rewards/verification.md` for current evidence.

Deployment requires `migrations/reward-events.sql` before the Worker. Registration has a durable event inside identity creation and a five-minute recovery cron. Attendance stores its config snapshot in the atomic receipt. Ad sessions freeze their amount/version at start. First-topup uses the current published rules and authoritative settled-payment history.

Backend integration requirements:

- All inputs come from authenticated session, stored referral identity and verified payment facts. Never accept inviter, amount, settlement status or attendance date from a claim request.
- Store first referral attribution at verified new-user creation; a stable identity survives account recreation. Enforce no self-referral or cycles. Existing users cannot attach a new referral retroactively.
- Transactionally write reward keys and wallet ledger credit for both beneficiaries. Unique keys in returned rewards are hints for DB constraints, not an in-memory protection mechanism.
- For attendance: lock/read persisted row, calculate, write updated state and credits atomically. Daily key `attendance:<user>:<day>`, milestone keys `attendance:<user>:milestone:<day-count>:<beneficiary>`. A milestone's lifetime uniqueness is independent of campaign version.
- Store rule version snapshots on events. Admin config mutations need strict runtime parsing, validation, role authorization, CSRF protection if cookie auth, optimistic version checks and immutable audit records. Do not expose an unauthenticated config endpoint.
- First topup key is per referred user, not per order. Process only verified real-money settlements, within the existing payment reconciliation workflow. Existing paid-user history determines eligibility when launching.
- Cross-service writes require a durable outbox and idempotent ledger consumer, never two independent writes that can partially succeed.
- Unlimited referrals does not remove replay prevention, authentication, rate limits or fraud review. Do not introduce a hidden referral cap.

Required integration tests beyond existing pure tests: concurrent same-day requests, duplicated signup/payment callbacks, crash/retry during credit, unauthorized/admin calls, link persistence across OAuth, config changes during an event, account recreation, wallet balance reconciliation and actual UI refresh.
