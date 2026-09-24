# Readings Upgrade Implementation Plan

**Goal:** Ship the approved Vietnamese output guard, multiple Kinh Dich methods and grounded Tu Vi/Bat Tu couples locally, with verifiable tests and no automatic production deployment.
**Architecture:** Shared server output policy guards all AI protocols before billing completion; versioned domain results keep existing history readable. Deterministic calculation precedes AI interpretation, with managed templates and service catalog entries for every new service.
**Tech Stack:** Next.js static export, React, TypeScript, Node tests, iztro, lunar-typescript, Cloudflare Pages Functions.
**Baseline:** 37e48ab. Isolated worktree, existing source preserved. Approved research: plans/004-readings-kinhdich-couples-research.md.

## Task 1 — Vietnamese result policy (main)
- Add failing tests in services/admin/reading-language.test.mjs for Unicode Han, prose/JSON, schema/key preservation, facts and bounded repair; extend runtime/integration tests for one-operation billing.
- Add services/admin/reading-language.ts, integrate runtime.mjs and legacy functions/api/ai.js; annotate attempt language status for Admin metrics. Policy applies for service requests, never changes original-prompts.ts.
- Repair only a JSON map of exact Han spans, replacing spans in place, preserving all other source content and JSON keys/shape/numbers. Reject unexpected replacements and any residual Han. One repair request within original timeout, operation and attempts accounting; fail closed/refund on failure. Preserve refusals.
- Add language policy provenance to cache entries and reject raw Han at client result boundary; old stored prose gets a deterministic display translation for known terminology without destroying original records.
- Verify node --test services/admin/*.test.mjs, prompt roundtrips, typecheck.

## Task 2 — Kinh Dich domain and UI (isolated executor)
- Tests first: The/Dung regression, 4096 coin line patterns, known 64-hexagram fixtures, serial/phone deterministic inputs, time/lunar boundaries and legacy history replay.
- Implement versioned results, fixed 64-name table, three coins six throws / manual lines, Mai Hoa time/three numbers, banknote serial/phone/custom digits. Plain-language rules displayed before input submission.
- Number convention v1: normalize digits preserving leading zeros; serial allows only letter prefix plus digits; VN phone normalizes +84/0084 to 0 and validates length/prefix; split digits at floor(length/2), sum each half for upper/lower, sum all for moving line. This is labeled a product variant, not a universal traditional formula.
- Time convention v1: Asia/Ho_Chi_Minh civil time, lunar month absolute value (leap month same ordinal, explicit label), civil midnight rollover, branch index year/hour 1–12; upper=(yearBranch+month+day)%8, lower=(sum+hour)%8, moving=(sum+hour)%6. Explicit rule display; deterministic timestamp saved. The existing lunar-typescript calendar uses Chinese-standard UTC+8 lunar dates, distinct from the UTC+7 civil time; disclose this convention in UI and saved metadata.
- Persist full snapshots and method/version; legacy three-number records use legacy rules. Give each reading an ID; preserve distinct questions. Phone metadata masked and omitted from AI payload.
- Integrate method-specific managed template; request shared template/catalog edits from main to avoid conflicts.
- Run domain tests, typecheck and browser flow inspection later with main.

## Task 3 — Couples (isolated executor)
- Tests first: two real charts, absent/invalid birth hours rejected for chart-specific interpretation, pair cache invalidation, cross-person relations only, inclusive same-sex pairs.
- Add web/src/lib/couples.ts and shared pair form under components/compat. Use a shared pair editor and three modes (Tu Vi, Bat Tu, existing Western). Direct links from Tu Vi/Bat Tu select mode.
- Both participants have Gregorian DOB, valid engine gender, hour or explicit unknown, place when needed. Unknown hour never silently maps to Ty; explain required data and do not fabricate a full chart.
- Serialize Vietnamese chart DTOs; prompt has two computed charts, evidence, inclusion rules and no generated percent. Names and context are untrusted data.
- Add services compat--tuvi-pair and compat--batu-pair via main; inherit existing pair availability/pricing during config hydration for saved configurations. Preserve old prompt corpus/restore.
- Verify tests, typecheck, form accessibility/mobile and real chart output.

## Task 4 — Integrate, verify and deliver (main)
- Review executor diffs against approved scope, merge shared template/catalog changes deliberately.
- Run admin/backend targeted tests, prompt-runtime-qa, domain tests, eslint, TypeScript and static build.
- Browser tests at mobile/desktop: six throws, manual coin input, serial/phone, time, history replay, two-person data and mode switching, absence of horizontal overflow. Mock transport only for UI contracts, label this explicitly; do not claim live AI accuracy from mocks.
- Verify language policy status and cost tracking, refunds and one charge across repair. Preserve historical text and existing original prompt corpus.
- Record findings and exact gates. No production publish or claim of real-model quality unless actually tested.

## Completion — 2026-09-24
All four implementation tasks are complete locally. Verification, boundaries and release requirements are recorded in `qa-report/readings-upgrade/README.md`. No production deployment or live AI quality claim.
