# Visual Readings Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the approved native report reader and give profile-module readings deeper, evidence-linked, everyday explanations without leaking Markdown.

**Architecture:** A versioned descriptor wraps the original prompt tree. The server derives a chapter recipe and immutable evidence snapshot from that original tree, validates provider JSON, and saves a self-contained envelope. React renders native diagrams and accessible chapter/detail controls; older purchased text keeps its legacy renderer with improved formatting.

**Tech Stack:** Next.js 16, React 19, TypeScript, native SVG/CSS, Node test runner, Playwright.

---

Owner/integration owner: Codex root. Branch `codex/visual-reading-report`; base `bc7efe3e6a2a90854903e7b6125cf41f851837a7`. The user approved the design and implementation in this session; execute here without another approval checkpoint. Source changes stay in this worktree. No image generation, model/pricing changes, D1 migration or production deployment.

### Task 1: Evidence and versioned report protocol

Files: create `services/admin/visual-reading.ts`, `services/admin/visual-reading.test.mjs`.

1. Add tests for deterministic wrapper input, exact service/locale binding, chart-derived facts, duplicate/foreign evidence rejection, immutable saved snapshots, and legacy scope parity.
2. Run `node --import ./web/tests/support/register.mjs --test services/admin/visual-reading.test.mjs`; confirm failures before implementation.
3. Implement `wrapVisualPrompt(node,serviceId,locale)`, `visualInput(node,serviceId,locale)`, and `saveVisualReading(raw,input)`. Keep the original node intact. Derive facts and fixed four-chapter recipes locally, reject AI coordinates/scores/foreign fact IDs, and store only validated JSON plus snapshot.
4. Run the same targeted test after source changes and inspect actual output.

### Task 2: Prompt and runtime integration

Files: modify `services/admin/prompt-engine.ts`, `prompt-templates.ts`, `english-prompts.ts`, `runtime.mjs`, `integration-api.mjs`, `services/backend/service-unlocks.mjs`; create runtime tests.

1. Write tests using real prompt rendering and stubbed provider HTTP: legacy output unchanged, new adapter last, deep explanation fields required, configured token limit preserved, invalid/truncated output rejected before completion, old/new unlock scope identical.
2. Run tests and confirm red.
3. Register five versioned VI/EN templates. Recursively render original settings/tasks, then append evidence/chapter/JSON contract. Append the system format adapter only for validated versioned descriptors. Validate the result after the existing language policy, save the envelope, and use existing refund/error paths.
4. Run new tests plus prompt/runtime/unlock regression tests.

### Task 3: One descriptor for quote, consent and inference

Files: modify `web/src/lib/managed-prompts.ts`, `api.ts`, `use-paid-price.ts`; relevant API tests.

1. Add a deterministic `readingPromptDescriptor(text,serviceId,locale)` helper, leaving `promptDescriptor` and legacy roundtrip semantics intact.
2. Use that helper for both quote/displayed-price and AI requests. Keep service IDs, markets, profile cancellation and cache keys unchanged.
3. Verify request/quote parity and existing cancellation/paid tests.

### Task 4: Native reader and old-format fix

Files: create `web/src/components/kit/VisualReading.tsx`, `VisualReading.module.css`; modify `SavedReading.tsx`, `AiText.tsx`, `StructuredReading.tsx`, compatibility readers. Test `web/tests/legacy-reading-format.test.mjs` is supplied by an isolated test agent.

1. Confirm the old renderer reproduction test fails. Render new envelopes through React SSR and browser fixtures.
2. Implement chapter covers, qualitative spectrum, balance/factor/action diagrams, evidence cards, expandable detail/example/terms and keyboard navigation. Use existing fonts/colors; SVG paths are code-defined, never AI-generated.
3. Add finite entrance/selection/height transitions, cancel prior animations on rapid selection/unmount/hidden/reduced motion. No idle animation. At least 44px interactive targets and visible focus.
4. Implement safe semantic Markdown for old reports without `innerHTML`, preserving identifiers/arithmetic/code and escaping HTML.
5. Check mobile 320/375/800px, all chapters, rapid switching, keyboard, reduced motion, hidden state and console. Capture review screenshots.

### Task 5: Verification and handoff

1. Run relevant Node suites, `npm --prefix web run typecheck`, `lint`, `build`, `git diff --check`; fix new failures with reproduction evidence.
2. Run `codegraph sync` and `git status --short`; inspect the complete diff for prompt history, pricing/auth/market invariants and snapshot compatibility.
3. Commit reviewed feature changes on this branch. Report exact local checks and remaining provider/production verification separately; no claim of deployed behavior.
