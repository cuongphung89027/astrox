# Free Visual Upgrade and Forecast Implementation Plan

**Goal:** Give existing readers a free conversion of their old readings and present period forecasts in the approved native visual reader.

**Architecture:** Add a server-owned entitlement campaign and zero-cost operation path alongside existing AI purchase operations. Extend the versioned visual descriptor/report adapter to period readings and render a calculator-backed timeline in the shared React reader. A generic conversion action delegates to each module's existing request/cache owner.

**Tech Stack:** Next.js/React, TypeScript, native SVG/CSS/Web Animations, Cloudflare Pages Functions/Worker, D1/SQLite, Node tests and Playwright.

---

## Task 1: Server-owned conversion

Files: create migrations/reading-format-upgrades.sql, services/backend/reading-upgrades.mjs and services/backend/reading-upgrades.test.mjs; modify services/backend/ai-operations.mjs and handler.mjs, services/admin/integration-api.mjs, add functions/api/ai/upgrade.js.

1. Write failing real-SQLite tests: seed successful old per-request and bundle readings; exclude refunded/new purchases; isolate users, markets and scopes; reserve/replay/complete/release without a wallet mutation; recover an expired claim.
2. Run `node --test services/backend/reading-upgrades.test.mjs` and confirm the intended missing behavior fails.
3. Implement quoteReadingUpgrade, reserveReadingUpgrade, completeReadingUpgrade and refundReadingUpgrade with atomic conditional updates and encrypted saved responses. Keep existing charge/complete/refund paths intact for normal requests.
4. Add public-to-internal upgrade quoting and normalized explicit campaign input. The paid AI pipeline uses the zero-price claim and its own failure messaging, never a paid fallback.
5. Run backend/integration tests and verify unchanged VN/US balances and original purchase rows.

## Task 2: Period report contract

Files: services/admin/visual-reading.ts, new services/admin/visual-period.ts, visual-prompts.ts, visual-runtime.test.mjs, visual-reading.test.mjs; web/src/lib/managed-prompts.ts if needed.

1. Add failing tests using the real Tu Vi/Zodiac/Personal Year descriptors; assert bound service/locale/window, actual period facts, correct native visual kind and immutable reopened date.
2. Add a recognized versioned period wrapper; extract dated calculator samples from the original descriptor and retain the existing profile projection as supporting context.
3. Add period chapter plans, additive VI/EN templates and deep everyday forecast instructions. Enforce strict report shape on compatible providers, semantic refs and plain prose on all providers.
4. Validate historical profile envelopes and legacy forecasts still read unchanged; unavailable calculator data must not turn into fabricated facts.

## Task 3: Native forecast timeline

Files: web/src/components/kit/VisualReading.tsx, VisualReading.module.css and new PeriodTimeline.tsx; existing forecast components only where needed.

1. Add a render/interaction test for dated and single-date inputs, then implement the timeline as accessible SVG/HTML with focusable evidence selection.
2. Reuse the existing chapter navigation, details and motion cleanup. Use finite path/marker reveals; no continuous visual drift.
3. Verify 320/375/800px, keyboard selection, reduced motion and rapid period switches. Keep the snapshot's period visible independently of the current clock.

## Task 4: Conversion action and preserved history

Files: new web/src/components/kit/ReadingUpgrade.tsx and styles, web/src/lib/api.ts, state.ts, SavedReading.tsx, module reading components/hooks.

1. Add failing API/cache tests: eligible old content bypasses paid consent only for the explicit server-validated campaign; ineligible/guest paid requests fail without a charge; old content remains on failure.
2. Pass an explicit upgrade request through the existing account/locale guards and idempotency owner. Recheck the server entitlement before the request.
3. Wire the conversion action to each module's existing request setter and preserve the previous cache entry on every explicit format upgrade, even at the same config revision.
4. Verify success, failed retry, cache reopen and account/profile changes; do not allow a late result to overwrite another scope.

## Task 5: Verification and release

1. Run relevant tests, then `npm --prefix web test`, typecheck, lint, format check, build and `git diff --check`; sync CodeGraph after edits.
2. Run browser scenarios with real calculator outputs and stubbed deterministic AI replies; inspect screenshots, logs, overflow and animation completion.
3. Commit/push the verified source, inspect and back up production D1, apply only the additive campaign migration, deploy Worker then Pages from the same SHA.
4. Wait for Pages success; run actual VI/EN forecast canaries, verify grant counts and unchanged wallets, and record limitations and rollback in a release note.
