# Reward rules — integration status

Implemented: pure server-side calculations for the approved referral and check-in rules. No referral count cap. Test: `node --test services/rewards/rules.test.mjs` (Node 22.18+/24).

Not yet connected to production: authentication, durable transactions, referral attribution at registration, paid settlement hook, attendance API, admin configuration/UI, Google rewarded ads. The authoritative wallet backend is not in this repository. Do not import this module into frontend code and treat its output as wallet authority.

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
