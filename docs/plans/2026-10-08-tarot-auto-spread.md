# Tarot Auto Spread Implementation Plan

**Goal:** Ship the approved Tarot auto-selection flow using B.AI JEV, a restrained travelling light, and distinct phone/tablet/desktop layouts with keyboard, zoom, dock and error coverage.

**Architecture:** A same-origin Pages endpoint resolves a constrained JEV decision using the enabled, published B.AI credential. It does not charge a wallet or enter the reading provider chain. A client session controller freezes question, spread/frame and cards, supports cancellation and skip, and preserves the existing paid interpretation contract.

**Tech Stack:** Existing Next 16.3.5/React 19, CSS modules, Cloudflare Pages/D1, Node test runner and Playwright.

Owner/integration owner: Codex `/root`. Branch: `codex/tarot-auto-spread`. Base SHA: `2c02291c6159b63f0fe20793239ba7db73d07a59`. Existing research files belong to this task. No deployment or live configuration change is included in implementation verification.

Design scope corrected by the user: **“Giữ giao diện hiện tại, thêm tính năng mới.”** Preserve the original DeckPicker, videos, spread diagrams, form, green reading table, card layouts and interpretation. Add only the default Automatic option, a travelling gold highlight on the existing tiles, concise reason/error states and cancel/skip/reveal controls. Device adjustments must preserve this presentation. The earlier replacement setup/board components were removed before handoff.

## 1. Decision endpoint and bounded adapter

- Create `services/admin/tarot-selection.mjs`, `services/admin/tarot-selection.test.mjs`, `functions/api/tarot/select.js`.
- Modify `services/admin/ai-rate-limit.mjs`, `services/admin/integration-api.mjs`, `web/next.config.ts` for scoped limits and local routing.
- RED: `node --test services/admin/tarot-selection.test.mjs` must fail without the implementation. Cover manual-like invalid inputs, blank question, published availability/market, constrained choices, malformed probabilities, uncertainty, timeouts, disabled provider, origin, size, non-JSON 429, independent quota and no wallet writes.
- GREEN: build server-owned candidates; validate typed results; no retry after timeout; return only validated selection/reason or clarification. Reuse secret by exact B.AI host and enabled published provider, pin JEV version. Log metadata only. Verify endpoint through real handler with SQLite fixture and stub only external inference.

## 2. Session logic and stable identifiers

- Create `web/src/lib/tarot-selection.ts` and tests using existing TS test loader.
- Modify `TarotClient.tsx`, `InterpretationPanel.tsx`, `tarot-history.ts` within their existing directories.
- RED: test decision parsing, stable frame/service mapping and animation itinerary. GREEN: explicit auto/manual state; cancel stale requests, immutable per-draw snapshot, no reselect on resize, skip reveals identical cards. Pass frame ID explicitly, preserve old cache keys/history.

## 3. Adaptive UI and motion

- Create selection component and CSS beside `web/src/components/tarot/TarotClient.tsx`; reuse existing spread diagrams and card assets.
- Keep the setup hierarchy and deck controls; add Automatic alongside the existing spread choices, short reason, fallback/clarification and cancel/skip controls.
- Preserve existing draw animation; allow reveal-all; respect system and app reduced-motion modes. Verify the existing device layouts and fix narrow-width issues without replacing the visual design.
- Modify `web/src/components/shell/BottomDock.tsx` only as needed for keyboard overlap; retain navigation and discovery behavior.

## 4. Verify and hand off

- Targeted Node tests, existing Tarot/AI tests; `npm run typecheck`, lint affected files, `npm run build`, `git diff --check`.
- Browser QA on VI/EN phone/tablet/desktop: auto/manual, each layout, semantic decision fixture, real error, clarification, blank question, cancel/late response, skip, reduced motion, focus, 320px reflow, zoom, dock and tooltips.
- Record simulated vs actual device coverage, provider fixture vs live JEV evidence. Do not label physical-device or production checks passed without those checks.
- `codegraph sync`; review touched paths. Write implementation/QA handoff with remaining gates. Keep primary checkout untouched.
