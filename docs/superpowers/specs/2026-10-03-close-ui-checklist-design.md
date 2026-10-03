# AstroX checklist closure design

Owner: Codex, integration and release owner for this task. Base: `fb8d1475a0c9898a8f5823f338226a3ab4d48ac1`. Branch: `codex/close-ui-checklist`. User requested a system review and completion of the eight screenshot tasks on 03/10/2026.

## Scope

Audit the eight requirements across Vietnamese/English routes, renderers, profile forms, managed prompts and question entry/submission. Run the repository-wide unit/integration, prompt, typecheck, lint and export build gates, followed by responsive browser and production checks. Preserve current prices, wallet/auth and existing user/configuration data. Additional fixes must correspond to demonstrated regressions.

## Implementation

1. Remove short AI-question caps in Kinh Dịch (200) and Palm (600), matching Tarot's existing unrestricted entry. The AI transport's existing 100,000-character message and 200,000-character total bounds remain authoritative. Verify a 3,000-character question reaches prompt construction intact. Expert booking questions increase from 2,000 to 5,000 characters with an explicit form hint; backend rejects overflow instead of silently truncating it.
2. Apply balanced Tu Vi interpretation guidance in `renderServicePrompt` for every Tu Vi service and both locales, after applying published Admin template/task overrides. Guidance asks for the actual adverse stars present in the supplied chart, palace, concrete effects and practical mitigation, without inventing absent stars. This also covers period services. Preserve custom templates, source data and unlock scope identity. Reproduce the old-published-template failure with tests first.
3. Audit nested prompt rendering: locale must propagate to joined/nested nodes and missing English templates must fail closed. Fix only if reproduced by regression tests.
4. Confirm the existing bullet, line break, profile, month and icon fixes through source/runtime evidence. Add relevant renderer/API regression tests if a gap is reproduced.

## Verification and release

Focused failing/passing tests before full suite. Native browser checks at desktop/mobile widths with synthetic inputs; live AI verification using synthetic chart data through configured provider, without charging or altering a user's wallet. No secrets in reports. Clean committed branch on both remotes, database read-only inspection (no migrations planned), Worker then Pages from one SHA, public routes/API and deployed asset checks. Checklist entries close only when the corresponding evidence exists; any unavailable authenticated production flow is recorded explicitly.

## Ownership and touched paths

Expected: `services/admin/prompt-engine.ts`, new Tu Vi policy module and tests; `services/backend/bookings.mjs` and tests; Kinh Dịch/Palm/Experts components; documentation and QA evidence. Sole integration owner is Codex. No other worktree's dirty files or generated builds are used.
