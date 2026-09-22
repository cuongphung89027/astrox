# AstroX Admin Implementation Plan

**Goal:** Build the approved AstroX admin UI and a secure configuration backend, with tested AI routing and explicit external wallet integration boundaries.
**Architecture:** Existing Next static frontend with isolated admin shell; Cloudflare Pages API backed by D1 versioned configuration and encrypted secrets. Existing wallet remains authoritative; no duplicate wallet database. Development uses a local SQLite adapter for the same backend handler, bound to localhost only.
**Tech Stack:** Next 16.3.5, React 19, CSS Modules, Web Crypto, Cloudflare D1, node:test, Playwright.

1. Shared config contract: services/admin/config.ts and config.test.mjs. Write failing tests for prices, referral mode, provider chain, config validation and package quotation. Implement strict validation and safe defaults (billing disabled, no invented prices).
2. Admin API: services/admin/server.mjs, migrations/admin.sql, functions/api/admin/[[path]].js. Test authentication, origin checks, revision conflicts, publish/rollback, audit, encrypted secrets and public redaction against real local SQLite adapter. Never authorize with preview user or expose secret values.
3. Admin UI: web/src/components/admin/* and app/admin routes. Implement overview, providers/fallback, packages/rate, services, integrations, rewards/Ads, content, users/transactions/reports, audit/version history and access settings. All config changes save drafts and explicitly publish. Unconnected remote data is shown as unavailable, not fabricated.
4. Runtime integration: services/admin/runtime.mjs, runtime tests, AI handler and public config endpoint. Resolve published provider chains and per-service overrides with bounded retries; payment credentials remain server-only. Expose a documented service-binding contract for external wallet/Zalo.
5. Shell isolation: root layout uses route-aware boundary so public auth/dock never wrap admin. Keep public URLs and redesign intact. Fix static asset fallback for new admin routes without serving home HTML.
6. Local verification: local API on 8789; Next on localhost:3311 with local admin rewrite only. Test login, edit/save/reload/publish, provider reorder, milestone CRUD, mobile navigation, conflict/errors. Screenshot desktop/mobile and compare actual public UI.
7. Gates: node --test services/admin/*.test.mjs; npm run lint (report pre-existing issues separately); npx tsc --noEmit; npm run build; admin Playwright flow. Document setup, integration blockers and exact verified scope. Do not deploy or touch production wallets.

Do not commit unrelated working-tree changes. No production credentials are requested in chat. The live wallet/backend source is absent: use the documented binding integration, reject unsupported writes, and report that live end-to-end payment/login requires that backend and credentials.

## Implementation status — 2026-09-22

Integrated into `redesign-v5` per user's direction to connect the new frontend first and merge main later. Steps 1–7 implemented for the local configuration/Admin scope. Setup and external backend contract: `services/admin/README.md`.

Verified on the final source:

- 62/62 Node tests passed across admin and reward rules.
- TypeScript and targeted ESLint for Admin/new shell files passed.
- Next production static export includes `/admin`; Cloudflare Pages Functions compilation passed.
- Playwright: save/reload/publish/public notice, provider CRUD/reorder, reward milestone/referral, rate/package edits, dialog/mobile keyboard behavior; 13 Admin views at 320/390/768/1440px without horizontal overflow or uncaught browser errors.
- Public home visual check passed at 30 viewports.
- Full-repo lint remains failing in public redesign files (30 errors, 26 warnings in the run). Broad public viewport audit flags profile modal occlusion, small labels and one CLS finding; this is not a clean all-site QA result and is outside the verified Admin scope.

Pending external integration: real PayOS settlement/webhook, Zalo OAuth, wallet writes, server-verified Ads/rewards, reconciliation/scheduled operations and live operational reports. UI/configuration exists; these require the absent authoritative Worker. No production transaction, deployment, commit or merge was performed.
