# Palm compact UI — final verification 26/09/2026

Owner: controller. Worktree `/Users/Thsonjpg/.codex/worktrees/palm-redesign/astrox`, branch `codex/palm-redesign`, HEAD `12c4f2a`, base `e0c982e`. Local only — no commit, merge, push, migration or deploy.

## Scope delivered

- Entry: one `Chỉ tay` heading, monochrome SVG line-art hand (`PalmGuide.tsx`), two actions, folded `Hướng dẫn chụp`. Whole blocks deleted (slogans, intro copy, trial badge, stepper, captions, ordinal labels, duplicate notices) — not shortened.
- Results: one card with real AI summary + named line switcher + reading; observation folded; one honest uncertainty note; no unverified overlays.
- Contracts unchanged: `managedPrompt("palm.read.v1", …)`, `usePaidPrice("palm", …)`, `callAiText` serviceId `palm` + same normalized JPEG bytes, consent gate, zoom dialog, camera/lens/tracker logic.

## WebKit focus failure — root cause and resolution

Symptom: keyboard Tab focused the analyze CTA but it ended under the mobile dock (bottom 813 vs dock 768 at 390×844; bottom 779 outside viewport at 320×568).

Diagnosis (`compact-focus-probe.mjs`, scratch): the harness's numeric `window.scrollTo(0, 0)` inherits `html { scroll-behavior: smooth }` (`web/src/app/globals.css:52`). The smooth animation was still running when Tab landed; at focus time the CTA was already visible, then the ongoing animation dragged it behind the dock. Negative control: with an instant setup scroll and the production focus handler suppressed, native WebKit focus plus the existing `scroll-margin-block-end: calc(96px + env(safe-area-inset-bottom))` keeps the CTA above the dock at both sizes. Explicit smooth reset reproduces the original failure.

Resolution:
- Removed the interim `onFocusCapture` scroll workaround from `PalmReader.tsx` (not justified by evidence; native path works). The scoped CSS scroll-margin fix stays.
- Removed the mock-only focus-handler unit test.
- `palm-flow-qa.mjs`: setup scrolls now `behavior: "instant"` (keyboard and minimal-scroll modes); the WebKit keyboard skip branch is deleted — both engines run the same real assertions; summary now reports passed/failed/skipped separately instead of counting skips as passes.

## Final evidence (all on final source, synthetic fixtures, non-loopback network blocked)

| Gate | Result |
|---|---|
| `tests/palm-ui.test.mjs` | 4/4 pass |
| Full `npm test` | 382/382 pass, 0 fail |
| Prompt runtime QA | 79 rendered prompts verified; purchased-reading retention, tarot round trip pass |
| Palm flow Chromium | 46 passed, 0 failed, 0 skipped |
| Palm flow WebKit | 35 passed, 0 failed, 2 skipped (synthetic-camera pointer-event engine limit only; keyboard checks now real PASS: 320 bottom 257 vs dock 492; 390 bottom 748 vs dock 768) |
| Palm responsive 6 sizes × 2 engines | 48/48 pass |
| UI30 30 viewports × 2 engines | 518/518 pass |
| Typecheck | pass (web + backend) |
| Scoped ESLint | 0 errors, 2 known `no-img-element` warnings (private data-URL previews) |
| Build static export | 22/22 pages |
| Hygiene | CodeGraph synced, `git diff --check` clean, preview `http://127.0.0.1:3126/chitay` → 200 |

## Known limits

- No physical camera / real hand photograph used; camera paths run on synthetic streams.
- No live paid AI or checkout exercised.
- Remaining 2 WebKit skips are the documented engine limitation delivering no synthetic video pointer events — unrelated to this change.
- Human visual approval of the new hand illustration is still pending.
