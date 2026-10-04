# Region selection locale fix implementation plan

> Execute task-by-task with systematic-debugging, test-driven-development and verification-before-completion.

**Goal:** Selecting Việt Nam or United States changes the whole site and sign-in dialog to the corresponding language in both directions, as requested by the user.

**Architecture:** Use the existing shared crossLocalePath route map and a full navigation between root layouts. Carry a one-use, validated target locale in sessionStorage so the destination resumes the correct provider step. Region selection does not authenticate, save terms consent, or modify account market/prices.

**Tech Stack:** Next.js static export, React, TypeScript, Node test harness, CUA browser verification.

**Owner:** Codex root, implementation/integration owner.
**Branch:** codex/region-locale-fix.
**Base:** 34084a4210e83d8c730fb8ee26cc0080178c4a55.
**Touched paths:** web/src/components/shell/LoginPrompt.tsx; web/src/lib/login-region.ts; web/tests/login-region.test.mjs; web/tests/market-bound.test.mjs; this plan.
**Observed bug:** chooseRegion updates local provider state only. LocaleProvider is fixed by the current root layout, so the selected country and UI language disagree. English legal links omit the existing locale argument.

### Task 1: Regression tests

1. Add component behavior tests using the existing load/hookRuntime harness: EN → VN and VI → US use mapped full-page routes, preserve query/hash, save the display preference and resume the matching provider on destination. Current country selection stays on the page; unsupported counterparts fall back to the target homepage.
2. Prove the tests fail on current code with `node --test web/tests/login-region.test.mjs`.
3. Cover locale-aware legal links, no OAuth/consent writes on country selection, unchecked consent blocking, provider dispatch only after consent, one-use and invalid/blocked-storage behavior.

### Task 2: Minimal fix

1. Add a one-use pending-locale helper in web/src/lib/login-region.ts with storage failure handling and strict locale validation.
2. In chooseRegion, set the provider step, and when locale differs mark the destination, set axlang and navigate to crossLocalePath or target home, retaining query/hash.
3. Consume the pending locale on destination to open the provider step directly; preserve the existing post-logout flow.
4. Pass current locale to all three termsHref calls. Keep styling, account/billing code and backend unchanged.
5. Update existing test mocks to expose the actual shared locale route mapping.

### Task 3: Verification and review

1. Run focused regression tests and full `npm --prefix web test`.
2. Run typecheck, lint, build, and git diff --check; sync CodeGraph after edits.
3. Browser-test built export on desktop/mobile: both country directions, destination provider, current country, change-region, localized legal URLs and unchecked consent; no real OAuth/terms acceptance.
4. Commit only scoped files, push feature branch to the established AstroX remotes, create/attach PR, wait for CI/preview and verify the exact preview SHA.
5. Present concrete preview for production release approval if required. Production completion requires both remotes and custom-domain verification.
