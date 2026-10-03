# AstroX UI Checklist Implementation Plan

**Goal:** Complete the eight reported tasks with fresh runtime and release evidence.

**Architecture:** Preserve existing components and data contracts. Enforce Tu Vi reading guidance after Admin overrides in the shared prompt engine, remove short AI question caps, and increase expert booking capacity without silent truncation.

**Tech Stack:** Next.js/React, TypeScript, Node tests, Cloudflare Worker/Pages/D1, CodeGraph and native browser control.

## Task 1: Reproduce and fix managed prompt gaps

Files: `services/admin/prompt-engine.test.mjs`, `services/admin/english-prompts.test.mjs`, `services/admin/prompt-engine.ts`, `services/admin/tuvi-guidance.ts`.

1. Add tests for pre-29/09 published overrides, period services, preserved chart/task text, locale propagation and missing nested EN templates.
2. Run `node --test services/admin/prompt-engine.test.mjs services/admin/english-prompts.test.mjs`; confirm the new cases fail for the intended reasons.
3. Propagate `locale` through recursive `renderPrompt` calls; append a locale-specific Tu Vi policy to the final managed service prompt after published settings have rendered.
4. Rerun focused tests and prompt runtime QA.

## Task 2: Long question entry and preservation

Files: `web/src/components/kinhdich/KinhDichClient.tsx`, `web/src/components/discovery/PalmReader.tsx`, `web/src/components/discovery/Experts.tsx`, `services/backend/bookings.mjs`, `services/backend/bookings.test.mjs`.

1. Reproduce the native short-cap behavior with a long synthetic question. Add DB integration tests preserving a 5,000-character booking question and rejecting 5,001 without a booking write.
2. Run `node --test services/backend/bookings.test.mjs` to confirm the failures.
3. Remove Kinh Dịch/Palm `maxLength` attributes. Raise booking UI/backend to 5,000, display its limit and reject overflow with status 422 before writes.
4. Test prompt construction using a 3,000-character question and browser typing/pasting without truncation.

## Task 3: System regression certification

1. Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` from `web`, and `git diff --check`.
2. Check VI/EN module routes, profile, numerology breaks, month labels, icons, bullet rendering, long question entry and browser errors at mobile/desktop widths.
3. Inspect any failures, distinguish tooling/fixture faults from product defects, and fix demonstrated in-scope regressions.
4. Exercise a real configured AI request with a synthetic adverse-star chart; save redacted request/output evidence and assess star/palace/effect/mitigation detail.

## Task 4: Release and close

1. Review the final diff, sync CodeGraph and commit only owned files. Verify both remote tips and push one verified SHA.
2. Inspect D1/config state read-only; deploy Worker before Pages from that SHA.
3. Verify deployed commit/assets, VI/EN public routes/API and relevant browser behaviors.
4. Write `qa-report/2026-10-03-checklist-closure/` evidence, deployment IDs, rollback and explicit per-item closure state. Do not infer authenticated-flow success from public route checks.
# Additional audit findings

During mobile QA, the absolute header title overlapped the language/wallet controls. Use the remaining flex width and truncate long titles; verify geometry at seven viewport widths.

CI reproduced the pre-existing unused-code inventory failure. Keep the gate enabled: expose real test dependencies using static imports, run the existing native library tests in `npm test`, and remove only definitions with no CodeGraph callers. Re-run the full suite, Knip, typecheck, lint and production build, then release Worker and Pages from the new clean SHA and verify both domains again.
