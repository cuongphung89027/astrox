# Wallet, Promo, and Admin UX Implementation Plan

> Implementation in the current Codex task. Use test-driven-development for behavior and verification-before-completion before each commit and handoff.

**Goal:** Show and refresh trustworthy Point balances and prices, improve promo policy and messages, and add Admin navigation search.

**Architecture:** The client keeps one account-scoped Point snapshot seeded from `/api/me`, refreshed after changes and while visible. Admin promo config is published through its existing revision flow; the backend validates and redeems codes with atomic D1 writes. Paid buttons obtain the same server quote used by confirmation.

**Tech Stack:** Next.js 16, React 19, TypeScript, Cloudflare Worker/D1, Node test runner.

---

### Task 1: Account-scoped balance

**Files:** `web/src/lib/api.ts`, `web/src/lib/auth.tsx`, `web/src/lib/points.ts`, `web/tests/points-balance.test.mjs`.

1. Write a failing test that proves account load seeds the Point store from one `/api/me` result and that an old request cannot replace a later account's balance.
2. Run `node --test web/tests/points-balance.test.mjs`; confirm the expected failure.
3. Replace the separate user/Point fetches with a shared result; seed the store when AuthProvider identifies the user. Keep module-access loading independent.
4. Add a single visible-tab refresh scheduler and a refresh on visibility return. Preserve the last known amount during a failed refresh and expose error status.
5. Rerun the focused test and commit only this task.

### Task 2: Point mutations and PayOS return

**Files:** `web/src/lib/api.ts`, `web/src/components/points/PointsHome.tsx`, `web/src/components/topup/TopupPanel.tsx`, `web/src/lib/points.ts`, related tests.

1. Write failing tests for immediate refresh after spend/reward and for the PayOS pending-to-paid return path. Assert no optimistic credit before payment confirmation.
2. Run focused tests and confirm failures.
3. Route each successful Point mutation through one `refreshPoints(true)` call. Refresh on topup return and poll only the pending order until paid/expired; use existing history/status API if it provides the authoritative state.
4. Run tests, check retry and account-switch behavior, commit.

### Task 3: Promo contract, validation, and API

**Files:** `services/admin/config.ts`, `services/admin/backend.mjs`, `services/backend/payments.mjs`, `services/backend/handler.mjs`, `migrations/backend.sql` or a new additive migration, `services/admin/*.test.mjs`, `services/backend/*.test.mjs`.

1. Write failing tests for legacy promo defaults, unique code/positive Point/minimum amount/date validation, minimum amount, expiry, total/per-user exhaustion, and concurrent redemption.
2. Run focused tests and confirm failures.
3. Add `kind: 'topup_bonus' | 'direct_points'` and `minAmountVnd`; normalize old promos on load. Return stable error codes plus the minimum required amount. Validate at promo check and create order; include pending order reservations in quota checks.
4. Add an authenticated direct-redemption endpoint. Atomically insert a uniquely identified ledger record, conditionally add the balance, and record promo redemption in D1; repeated requests must return `promo_already_used` and never credit twice. Use an additive migration if a redemption table/index is needed.
5. Rerun focused tests and commit.

### Task 4: Promo Admin and learner UI

**Files:** `web/src/components/admin/panels/BillingPanel.tsx`, `web/src/components/admin/ui.tsx`, `web/src/components/topup/TopupPanel.tsx`, `web/src/lib/api.ts`, related CSS/tests.

1. Add failing tests for the two promo kinds, local date-time to UTC conversion, and each user-facing error message.
2. Run focused tests and confirm failures.
3. Add type, Point, minimum VND, expiry picker, quotas, and validity help text in Admin. In the learner UI, check a topup code with the selected amount; give direct Point codes a redeem action and refresh the balance after success. Reset a checked promo when package/code changes.
4. Verify keyboard/phone layout, tests, typecheck, commit.

### Task 5: Admin navigation search

**Files:** `web/src/components/admin/AdminDashboard.tsx`, `web/src/components/admin/AdminDashboard.module.css`, `web/src/components/admin/navigation.ts`, related tests.

1. Write a failing test for accent-insensitive matching and correct navigation target.
2. Add one search input above navigation; filter groups/items and show an empty result. Preserve existing view permissions and URL navigation.
3. Run focused tests and commit.

### Task 6: Prices on paid buttons

**Files:** `web/src/lib/api.ts`, `web/src/lib/reading-consent.tsx`, paid-service components that call `runAiPrompt`, a small shared quote hook/component, related tests.

1. Inventory every paid CTA and write a failing test for a charged button showing the amount from the backend quote before confirmation, including prior-grant upgrade credit.
2. Add a reusable server-quote loader keyed by service, scope/profile, and revision. Show a loading price state until the quote arrives; avoid a guessed amount. Bind the same quote/version to confirmation, re-quote on `quote_changed`.
3. Apply it to every paid CTA in the inventory, then verify full and mobile flows and commit.

### Final verification and handoff

Run `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run build` from `web`; run `git diff --check`, `codegraph sync`, and `git status --short` from the worktree root. Review all five requested outcomes against the design. Record remaining production-only checks; do not deploy or migrate outside the release-owner workflow.
