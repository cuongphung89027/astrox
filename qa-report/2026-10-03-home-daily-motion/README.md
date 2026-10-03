# Home daily cards and shared motion

Owner: Codex root (integration owner). Branch: `codex/home-daily-motion`.
Base: `6d2abd65990ad5686c224beb095f98f3071210ed`.

## Result

Vietnamese and English home show a lunar-calendar card and a server-authoritative check-in card immediately after the compact greeting, before birth-profile prompts. Calendar uses the existing UTC+7 engine; guest check-in opens login; localhost preview cannot claim. Home no longer automatically locks these utilities behind birth onboarding, while other modules retain onboarding.

Home and wallet share the same account-bound reward store. Duplicate activation, account changes, navigation during a claim, account changes during recovery, paused rewards, already-claimed responses, network-response loss and Vietnam-midnight reset have regression coverage. Reward amounts and milestones come from the existing server API; no backend, schema, price, payment or reward-configuration changes.

Shared route entry and common Btn motion use CSS with finite animation and respect both OS and AstroX reduced-motion preferences. Persistent navigation stays outside the route animation. The new daily cards have staggered entry, moon illustration reveal, streak progress and brief claim feedback. Existing module interfaces are preserved.

## Verification — 2026-10-03

- Full `npm test`: 636 unit/integration tests, 22 library tests, 79 rendered prompts; all pass.
- After the final lint-only correction: 15 focused reward/wallet tests pass; typecheck and build pass again.
- `npm run lint`: 0 errors, 20 existing warnings outside the changed code.
- Knip, backend/functions formatting and `git diff --check`: pass.
- English export certification: 55 pass, 0 fail; 3 existing live dependencies remain blocked (Google OAuth, payment provider, live AI samples).
- Local browser inspection: desktop, 390px and 320px layouts; both locales; correct calendar navigation; preview claim does not call the real claim API. Reduced-motion preference was switched through the local fixture UI, then both card animations and route animation reported `none`, opacity 1.
- CodeGraph synced for this checkout after implementation.

## Limits and release

Authenticated reward scenarios use deterministic API doubles. No real user check-in, OAuth consent, payment, AI charge or physical-device frame-rate certification was performed. Localhost API was not running; local fixture UI does not prove live authenticated behavior. Final public preview screenshots and deployment/CI identifiers are recorded in the PR handoff after the source commit.

A local QA logout native-confirm dialog stalled its tab; a separate QA tab was opened and the viewport reset. This browser-control limitation is not evidence of a product failure.

This change is prepared for review on a feature branch. Production has not been published. The earlier production approval applies only to commit `6d2abd6`; this new feature needs its own release authorization.

Touched scope: DailyOverview and CSS, daily store/hook, Dashboard, PointsHome, ProfileModal, AppShell, shared Btn/globals, reward/home/onboarding/wallet tests, implementation plan, this QA report and regenerated English export report. Rollback is the base commit above.
