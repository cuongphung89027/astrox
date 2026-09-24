# Hierarchical Service Pricing Implementation Plan

**Goal:** Audit all AstroX features and implement functional pricing groups and durable partial-to-bundle upgrades.

**Architecture:** Shared catalog/tree and pure quote rules; new backward-compatible billing settings; durable backend operations with snapshotted grants and credits; existing AI flow and consent dialog select and execute a quote.

**Tech Stack:** Next.js/React/TypeScript, Cloudflare Pages and Worker, D1 SQLite, node:test, Playwright.

## 1. Catalog and quote rules
- Add `services/admin/service-tree.ts` and `services/admin/service-pricing.ts`.
- Audit all topic/spread arrays and serviceId call sites; add `services/admin/service-pricing.test.mjs` coverage asserting complete catalog coverage, max depth, two-level Tarot, profile/period separation, exact 2/3 arithmetic, ownership and spent-credit exclusions.
- Fix incorrect Zodiac catalog labels without changing IDs.
- Add config unlock defaults/hydration/validation/public projection, preserving old billing behavior.
- Run `node --test services/admin/service-pricing.test.mjs services/admin/catalog.test.mjs services/admin/config*.test.mjs` before/after implementation.

## 2. Durable backend
- Add `migrations/service-unlocks.sql`, `services/backend/service-unlocks.mjs`, and integration tests using real SQLite.
- Derive and hash scopes from prompt descriptors, calculate server period expiry, snapshot members and quote state.
- Reserve charges atomically; finish creates a grant and consumes eligible credits; refund cancels pending operation only. Verify retries, concurrency, rollback, isolation and zero-point reads.
- Integrate charge/complete/refund/reconciliation in `services/backend/ai-operations.mjs` and quote route in `handler.mjs`. Load migration in dev server and test fixture.

## 3. Pages + customer purchase flow
- Add same-origin quote route and integrate validated selection into `services/admin/integration-api.mjs`.
- Update `web/src/lib/api.ts`, `reading-consent.ts`, and `PaidReadingConsent.tsx` for server quotes and leaf/group/module choices with explicit scope, original price, credit, total, and included services.
- Keep session and legacy requests unchanged; price/scope changes demand a fresh quote. Exclude transient quote versions from request identity while preserving selected offer.

## 4. Admin and public price list
- Replace flat ServicesPanel with grouped tree, module/group bundle editors, variant rows and separate module availability controls, maintaining existing prompt/provider editors.
- Add exact fraction controls and an upgrade preview. Default new offers to disabled and require valid nonzero prices.
- Update public PricingContent to reflect hierarchy and price scope.

## 5. Verify and handoff
- Run `npm run typecheck`, `npm run test:unit`, relevant lint, `npm run build` in web.
- Browser-check search, grouped editors, save/publish/reload, responsive widths and real consent flow against SQLite-backed APIs (provider stub only).
- Record feature audit and verification in `docs/service-pricing-audit.md`.
- Run `codegraph sync`, review diff, commit scoped implementation. User approval already covers implementation; execute locally without further permission gates.
