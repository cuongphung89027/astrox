# AstroX Admin full upgrade implementation plan

**Goal:** Implement all six areas approved from plans/003-admin-upgrade-research.md, with real data, safe permissions and thoroughly verified responsive UI.
**Architecture:** Extend current Admin instead of replacing its configuration editor. Add authenticated insights/support/issues endpoints, minimal privacy-preserving public behavioral events, SQL aggregation and paginated details. Reuse static Next frontend, Cloudflare Pages functions and D1/Worker boundaries.
**Tech Stack:** Next 16.3.5, React 19, CSS modules, TypeScript, Workers/D1, node:test.

## Task 1 — Accurate AI metrics
Files: services/admin/metrics.ts, integration-api.mjs, new ai-report.mjs and tests; replace only ai-metrics server route.
Write regression tests for replay success, blocked requests, >5000 records and service filtering. Run RED, correct taxonomy and full-period aggregates with bounded detail/options, then GREEN. Keep token/cost coverage honest; preserve request/provider denominators. No prompt or billing changes.

## Task 2 — Privacy-minimal feature events
Files: new migration and collector, API route, new client analytics helper/component, common AI/cache entry points.
Whitelist event/module/service/source fields; reject excess payloads, deduplicate event IDs, rate/size limit, keep session random and short-lived, respect DNT. Do not collect prompt/birth data/result text/credentials or infer user IDs from client. Server timestamps. Record views/starts/results/cache from actual flows; no synthetic completion. Tests for malformed input, duplicates, replay/rate bounds. Counts remain client-reported behavioral signals, not payment authority.

## Task 3 — Business insights, support and work queue
Files: new services/admin/insights.mjs, insights-types.ts, tests, additive migration, server route additions.
Provide VN-day period and previous-period summaries, feature/module funnel, daily series, reward/referral/ad participation, paid topups/Point flows, issues. Missing table/telemetry is unavailable, not zero. Query full selected periods and support server-side user search/pagination/timeline (redact raw profile/result/prompt).
Issue acknowledgments require server permission, CSRF and audit. No automatic wallet mutation/merges. Export guard. Tests against SQLite for permissions, date boundaries, >200 users, aggregates, status updates and missing data.

## Task 4 — Six-area UI
Files: new AdminInsights.tsx + module CSS; integrate into AdminDashboard.tsx and existing AiMetrics.
Design cream/forest editorial dashboard: dark green overview, interactive day bars, ranked feature table, conversion steps, reward/finance cards, issue queue, user detail drawer. Shared date presets, comparisons, saved URL filters, explicit refresh. Preserve old configuration sections under five sidebar groups; show draft save bar only for configuration or unsaved work.
Motion: entry stagger, 180–240ms view changes, 240–320ms drawer, 400–600ms charts; disable animations and transitions for reduced motion. Keep old data during refresh, never fake missing values, meaningful loading/error/empty states.

## Task 5 — Verification and release
Run focused tests then all admin/backend/rewards tests; scoped lint + production build. Browser via CUA only: local real dev API, non-sensitive fixtures and local admin auth, no production test mutations. Exercise all views, date/module filters, refresh/back/deep links, user pagination/search/drawer, issue status, error/empty states, keyboard/Escape and reduced motion. Verify 360/390/768/1024/1242/1280/1440/1920 layouts.
Deploy additive migrations before clients depend on them; deploy only scoped code with existing auth/provider/prompt settings retained. Build, stage explicit files, push upstream/main, deploy backend if changed and Pages; verify live release markers and unauthenticated admin denial. Report any live-data limitation honestly.

Authorization: User explicitly approved all proposed work and thorough UI/UX testing. Continue implementation in this task without an extra design or execution approval round. Independent implementation areas may run in parallel per planning workflow; review and integrate before release.
