# Free Point implementation plan

Goal: Add registration referral, first paid topup referral and daily attendance rewards to the authoritative wallet, with admin configuration. User approved no trial/referral-count cap.
Architecture: Server-owned eligibility and atomic ledger writes in the existing wallet backend; pure reward calculations shared with tests. Never credit localStorage or build a second wallet in the frontend D1 database.
Tech: TypeScript domain rules, Node tests; backend integration stack pending source discovery.

## Approved defaults
- Registration completed and identity verified: +5 inviter / +5 invitee, once per new identity.
- First successfully settled paid topup: inviter +10 once, independently of order retries.
- Explicit daily check-in: +2, Asia/Ho_Chi_Minh calendar day.
- Consecutive streak milestones 3/7/10: additional +3/+5/+10 to user and +2/+3/+5 to inviter. Each milestone once per account lifetime; missing a day resets streak, not earned milestones.
- No referral count cap or trial rollout limit. Ads retains expressly specified 5 Point × 5/day limit.
- Ads needs actual Google inventory config; no simulated production rewards.

## Tasks
1. Pure rule engine and tests: registration, topup, check-in, skipped days, timezone midnight, duplicate events, lifetime milestones, strict config validation. services/rewards/*.
2. Locate authoritative wallet/backend source; integrate transaction, verified identity creation, settled payment hook, check-in and referral attribution. Unique ledger keys and concurrency tests are required beyond pure unit tests.
3. Add admin versioned configuration with authorization/audit, ledger and referral lists. Rules apply prospectively; no arbitrary client amounts.
4. Wire wallet UI, referral capture across login, status/history and check-in action to real endpoints. No mock success if backend unavailable.
5. Add Google Rewarded session flow after real ad unit credentials and eligibility verified; retry-safe credit, server cap and documented absence of web SSV.
6. Typecheck/build and browser checks, server race/replay/auth checks. Do not claim production ready until actual backend integrated.
