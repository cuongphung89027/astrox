# VN–US feature parity implementation plan

**Goal:** US exposes the same user capabilities, layouts and interactions as VN, excluding expert booking only. English copy, Google authentication, USD/Lemon/Credits remain the agreed market adaptations.
**Architecture:** Shared components and explicit market adapters; remove abbreviated US screens. Never copy VN wallet data into Credits. Published service configuration, quotes and charge must resolve the same server-verified market.
**Tech stack:** Next/React/TypeScript, Workers/D1, existing Node and Playwright harnesses.
**Owner:** Current Codex task, sole integration owner. Worktree `history-amount-sign/astrox`, branch `codex/history-amount-sign`; base `90d7eb3` plus sign fix `c07508a`. No edits to the other active checkouts. No production release in this task.

## 1. Billing and configuration contracts
Files: `services/backend/credits.mjs`, `service-unlocks.mjs`, `services/admin/config.ts`, `integration-api.mjs`, `web/src/lib/api.ts`.
- Add failing tests for simultaneous completion of one operation, editable/publishable US overrides, VN public projection stability, US runtime prices and account switching.
- Fix duplicate lot consumption, validation of sparse overrides, shared market resolution and client cache scope. Preserve VN defaults.
- Run affected Node tests, then commit.

## 2. One complete wallet and earnings experience
Files: `web/src/components/points/PointsHome.tsx`, `EarnPointsView.tsx`, `CreditsHistory.tsx`, `web/src/components/topup/TopupPanel.tsx`; backend Credits/rewards/order endpoints.
- Inventory VN balance, topup CTA, transaction filters, pagination, pending/canceled orders, earnings navigation, check-in, streak/milestones, referral/copy, ads, loading/errors and retry.
- Use the same layouts and interactions for US, with market-specific data adapters, units and English labels. No 50-row-only replacement for a paginated VN history.
- Add pagination/tied-timestamp and account-isolation tests, browser fixtures for both markets, commit.

## 3. Functional UI and English content audit
Files: `web/src/components/{profile,discovery,kinhdich,tarot,tuvi,zodiac,batu,numerology,compat,kit,shell}`, `web/src/i18n`.
- Build a route + state parity matrix from VN, including input, result, history, sharing/export, errors and consent.
- Translate remaining visible and accessible copy in source, retaining the shared feature implementations and calculations.
- Exercise upload/consent/camera error, I Ching methods/results/history, profile/preferences, each reading and persisted result in browser fixtures. Expert links/routes remain absent from EN.

## 4. Admin and certification
Files: `services/admin`, `web/src/components/admin`, `web/scripts`, `qa-report/english-us`.
- Verify Admin edit → validate → publish → public config → quote → charge for both markets.
- Run full unit tests, typecheck, lint, build; real interaction browser checks at mobile and desktop. Record evidence per feature, not merely route/lang checks.
- Record exact outstanding external credential/provider dependencies separately. Never mark full parity or release complete with missing features.

## Acceptance checklist (initial inventory; update with evidence)
- [x] Wallet balance/topup/earn navigation: same controls and layout
- [x] History: signed amounts, filters, load more, pending/canceled orders, errors/retry
- [x] Rewards: check-in/streak/milestones/referral/verified ads and market-isolated grants
- [x] Topup: packages, checkout, status/history, promotion behavior
- [x] Profile, birth inputs, account, preferences and saved data
- [x] Zi Wei, astrology, Ba Zi, numerology: inputs/chart/topics/periods/history
- [x] Tarot and I Ching: all methods, readings, history and repeat flows
- [x] Palm: capture/upload/guide/consent/errors/results
- [x] Lunar calendar: daily details/navigation
- [x] Shared loading/error/accessibility/mobile states
- [x] Admin isolation and complete publish/runtime path
- [x] Expert booking excluded only; no other feature removed
- [x] Money/concurrency/account isolation regression suite

## Final evidence

See `qa-report/english-us/feature-parity.md` for the feature matrix, exact checks and external limits. Checkboxes mean implementation and local verification, not production release or hardware certification. Admin reports/wallet adjustment and Terms navigation/print were also restored during the final comparison. All changes remain on this isolated branch.
