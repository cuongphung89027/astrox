# Palm redesign implementation plan

**Goal:** Repair capture reliability and make palm reading consistent with AstroX without presenting unverified AI coordinates as detected creases.
**Architecture:** Isolated Palm CSS/art, capture engine with capability-aware controls and cancel-safe lifecycle, tolerant reading parser with conservative overlay policy. Keep pricing/prompt contracts intact.
**Tech Stack:** Next 16.3.5, React 19, MediaPipe 0.10.35, node:test.

1. Add failing tests for wide-label priority, unsupported camera controls, coordinates rejected independently of text, physical hand aspect and fatal detection loop errors. Run node --test web/tests/*palm*.test.mjs web/tests/hand-tracker.test.mjs.
2. Fix helpers: explicit wide wins over ambiguous digital zoom; camera controls inspect capabilities, checked settings, no fabricated success. Normalize image capture to 1200px. Keep AI annotations unverified until real-image benchmark exists.
3. Repair CSP specifically for /chitay WASM while retaining nonce/strict-dynamic and test response headers. Verify routes tests.
4. Replace camera component lifecycle: release-before-switch, rollback, cancellation, readiness, optional auto capture, tracker retry/timeout, torch/focus capability UI, reset stale landmarks.
5. Replace shared palm-specific styling with Palm.module.css and a natural five-finger illustration, compact guide, three-stage flow, bounded photo preview and zoom, result line tabs and honest unavailable-overlay state.
6. Verify relevant unit tests, frontend typecheck, scoped lint, build and browser responsive inspection. Run CodeGraph sync and git diff --check. Document physical-device/live-AI limits. No production release in this task.

Approved research: docs/superpowers/specs/2026-09-26-palm-redesign-research.md.
Owner: /root; tracker helper/tests delegated per TDD skill. Base e0c982ed91bc718fc58264f49a589b2a0eedd0cf.
