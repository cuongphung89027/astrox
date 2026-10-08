# Tarot Automatic selection — implementation handoff

Owner and integration owner: Codex `/root`. Branch: `codex/tarot-auto-spread`. Base: `2c02291c6159b63f0fe20793239ba7db73d07a59`. Isolated checkout: `/Users/Thsonjpg/.codex/worktrees/product-upgrade-research/astrox`. Primary checkout and its existing dirty files were not modified.

## Scope and user correction

The user explicitly chose **“Giữ giao diện hiện tại, thêm tính năng mới.”** The original deck carousel/video, cream/green styling, spread diagrams, reading table, card arrangement, journal and paid interpretation flow are retained. Replacement setup/board components from the initial attempt were removed. Product-wide design proposals remain research, not deployed changes.

Added Automatic as the default mode. A nonblank question goes to the pinned B.AI JEV Decisions adapter; the existing manual tiles override it. The server supplies seven legal spread/frame choices and asks JEV to weigh intent, complexity and supplied context. The travelling highlight reflects the selected result; it does not randomly choose a spread. An empty question opens one general card locally. No profile or previous reading is sent to JEV.

Clarification, unsupported A/B comparison, timeout, unavailable provider and quota limits preserve the question. The user can choose a spread or explicitly use three cards. Cancellation aborts the request and ignores late replies; React Strict Mode does not send a duplicate request. Skip bypasses selection/draw motion; Reveal all finishes the existing card pool. Reduced motion is supported.

Selection uses no wallet charge and does not enter the paid reading fallback chain. Interpretation retains its existing confirmation/price path. Explicit frame IDs preserve the service mapping regardless of translated labels; history gains optional provenance fields without changing old entries/cache keys.

## Changed areas

- `services/admin/tarot-selection.mjs`, its tests and `functions/api/tarot/select.js`: bounded same-origin utility, typed response validation, pinned `jev-1.13.0`, 4s inference deadline, published candidate/provider availability, metadata-only telemetry, no retries.
- `services/admin/ai-rate-limit.mjs`: separate selection quota buckets; existing reading quota keys unchanged. Defaults: 6/IP/minute, 60/IP/day, 2,000/global/day; overridable with `TAROT_SELECTION_*` environment variables.
- `services/admin/integration-api.mjs`, `web/next.config.ts`: local endpoint routing.
- Tarot client/AutoSelect/CSS/CardSlot, `tarot-selection.ts`, InterpretationPanel and history metadata: additive feature and motion changes.
- BottomDock and keyboard viewport helper: hide dock during editable keyboard occlusion; restore English discovery trigger using the locale-aware Tarot route. Navigation design retained.
- `web/scripts/tarot-auto-qa.mjs`: repeatable browser regression checks using a synthetic local profile and explicitly stubbed decision responses.

## Verification

- Full `npm test`: 790 unit/integration tests + 27 library tests passed, plus 79 rendered-prompt checks and cache/history/prompt round trips.
- `npm run typecheck`: passed.
- ESLint on changed TS/TSX and QA script: 0 errors, 4 pre-existing warnings (three native image warnings and the dock cleanup ref warning).
- `npm run build`: static export passed.
- `wrangler pages functions build functions --outdir /tmp/astrox-tarot-functions --compatibility-date 2026-09-15`: compiled successfully; no deployment.
- `git diff --check` and final `codegraph sync`: passed.
- Browser QA: VI/EN at 320, 390, 600, 768, 834, 1024 and 1440 CSS px; setup and all 5 manual layouts (70 draws), keyboard card details, no document/tile overflow. Existing phone stacking, tablet columns/mobile dock, desktop navigation and card sizes are preserved; narrow containers reflow the setup.
- Interaction QA: auto response, keyboard start, clarification/A-B/quota error focus, cancel/late reply/focus restoration, blank question, travelling highlight/skip, reveal without replacing the first card, discovery/Escape/focus in both locales, actual local unavailable endpoint, data-load error/retry, and simulated keyboard viewport shrink/recovery. No page JavaScript errors observed.
- Zoom: setup CSS zoom 200%/400% plus 320px reflow matrix. This is not native browser chrome zoom or physical-device evidence.
- Tooltip: VI/EN native sound tooltip title plus equivalent accessible label and keyboard toggle checked. Native browser tooltip pixels were not captured. Card information uses the existing keyboard/touch details disclosure.

Evidence: `qa-report/tarot-auto/results.json`; local screenshots `setup-{390,834,1440}-{vi,en}.png` and `board-{390,834,1440}-{vi,en}.png` in that directory. Screenshots remain local artifacts, not required release assets.

## Remaining release gates

No real B.AI decision was made: the isolated local configuration has no usable published B.AI credential. Adapter tests use SQLite + an external-inference stub; UI tests use deterministic decision fixtures. These prove integration behavior, not JEV Vietnamese semantic selection quality or live latency. Before release, run representative VI/EN questions through the actual provider, especially negation, ambiguous references, relationship versus work context, multi-factor complexity and A/B comparison.

Production prerequisites: existing Pages D1/encryption bindings, enabled published B.AI provider with base URL `https://api.b.ai/v1` (optional trailing slash), its stored credential, and `api.b.ai` in `PROVIDER_ALLOWED_HOSTS`. No migration is needed. Selection does not change that provider’s reading model.

Physical iOS/Android keyboard, Safari/WebKit, real browser zoom and native tooltip rendering still require device checks. No CI, merge, remote push, deployment, published Admin configuration change or production validation was performed. Release owner must deploy and verify the approved commit under the existing shared workflow.
