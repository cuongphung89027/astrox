# Palm Full Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the approved integrated palm capture, quality, reading, follow-up, history and comparison flow.

**Architecture:** Keep on-device image checks separate from AI interpretation and immutable saved snapshots. The root agent owns shared prompt integration and release. Preserve gateway pricing/auth/consent and cancellation.

**Tech Stack:** Next.js client components, React, CSS modules, MediaPipe, TypeScript, native node:test component harness.

---

### Task 1: On-device quality
Files: create web/src/lib/palm-quality.ts and web/tests/palm-quality.test.mjs; modify hand-tracker.ts, palm-photo.ts, PalmCamera.tsx and PalmReader.tsx.
1. Write pixel fixtures for sharp/dark/overexposed/flat and clipped/missing hand. Command: cd web && node --test tests/palm-quality.test.mjs (RED missing module).
2. Implement shared assessPalmPixels(pixels,width,height,hand?) returning structured checks; sample cropped palm region, qualitative severity not fake confidence.
3. Add local inspectPalmPhoto with abort-safe image/model cleanup. Reuse metrics in live camera every ~400ms; avoid state/CPU on every frame.
4. Check frame bounds and shape, maintain stale detection guard. Native/upload fallback always visible; live capture cleanup unchanged.
5. Run quality, hand tracker, photo and camera tests; commit feature slice.

### Task 2: Structured readings and runtime prompts
Files: palm.ts, services/admin/palm-guidance.ts, prompt-engine.ts, prompt-templates.ts, english-prompts.ts and tests.
1. Write RED cases for empty interpretation, unknown visibility, retake with summary, unsafe schema, old published palm templates and VI/EN followup.
2. Parse optional uncertainty/visibility, normalize old v1 defaults, enforce result bounds. Strip unsafe geometry; overlayVerified always false.
3. Append locale-aware runtime contract for read/follow-up; register palm.followup.v1 with JSON context/question as untrusted data. Do not mutate Admin DB.
4. Run node --test services/admin/palm-guidance.test.mjs web/tests/palm-reading.test.mjs and prompt runtime fixtures; commit.

### Task 3: Private device history
Files: palm-history.ts, palm-history.test.mjs, result/history components.
1. Write RED tests for whitelist serialization without images, locale/account separation, corrupt/quota storage, cap/reopen/delete, summary retake denial.
2. Implement read/save/delete with explicit storage parameter for pure testing; use accountStorageKey, locale and account epoch at UI boundary. Sanitize every read and write.
3. Verify storage failures do not show saved success and snapshots remain readable independently of prompt changes; commit.

### Task 4: Mobile capture/review/result UI
Files: PalmReader.tsx, PalmCamera.tsx, PalmResults.tsx, PalmHistory.tsx, Palm.module.css and palm-ui.test.mjs.
1. Add component cases for quality warnings, specific retake recovery, readable observations, cancellation and second hand preserving first reading.
2. Implement clear capture → review → reading states, sticky relevant CTA, accessible labels and native controls. Primary camera/upload action remains obvious; existing zoom focus handling preserved.
3. Results show summary and cards with observation/uncertainty/interpretation together, no unverified crease overlay. Busy state has real cancel, no invented progress.
4. Check desktop and 390/320px browser, EN/VI and reduced motion; commit.

### Task 5: Follow-up and two-hand comparison
Files: PalmResults.tsx, palm-prompts.ts, PalmReader.tsx and component tests.
1. Write RED tests for text-only follow-up, managed descriptor/price, no stale answer after cancellation/account change, compare distinct confirmed hand labels without extra AI call.
2. Follow-up call uses palm service with palm.followup.v1, sanitized reading context, user question; temperature 0.2 and existing price confirmation. Render reply through AiText. Preserve result while loading/error.
3. Save/reopen/delete manually; adding other hand preserves prior session reading; comparison displays two confirmed readings independently, no fake scientific inference.
4. Run focused tests then full npm test; commit.

### Task 6: Integration and release
1. Run npm run typecheck, npm run lint, npm run knip, npm run format:check, npm run build, git diff --check and CodeGraph sync.
2. Inspect diff/contracts and browser on generated build; document hardware/live AI quality limits accurately. Do not disable old gates.
3. Commit clean SHA, merge/push to both remotes; await CI. Inspect D1 without writing. Worker then Pages from same SHA, verify custom domain/resource/API and save release report/rollback IDs.
