# Home daily cards and site motion implementation plan

**Owner:** Codex root, integration owner for this change.
**Base:** 6d2abd65990ad5686c224beb095f98f3071210ed. Branch: codex/home-daily-motion.
**Goal:** Place useful lunar-date and real daily check-in cards before profile prompts and discovery on both home locales, with a cohesive motion system.
**Architecture:** A daily overview reuses the existing Vietnam calendar engine with a lazy import. A shared, account-bound rewards store connects home and wallet to the existing server API. Shared route and button motion uses CSS and respects OS and profile reduced-motion preferences.
**Stack:** Existing Next 16.3.5, React 19, CSS modules, no new dependencies.

## Design

A compact greeting precedes a two-column daily desk. The calendar is a warm paper card with a large solar date, lunar date, moon illustration, solar term and a direct link to the full calendar. Check-in is a forest-green card with a streak ring, server-configured reward, milestone progress and an explicit claim button. On mobile both cards stack immediately at the top. They appear for guests and signed-in users; check-in guests open the existing login dialog, and localhost preview cannot claim.

Motion: finite 650ms scene entrance, staggered card entrance, 1200ms moon/line reveal, 240ms button response and a brief successful claim celebration. Persistent navigation stays stable. Preference reduced-motion disables these effects, including hover displacement. No scroll hijacking, new animation library or endlessly moving decoration.

## Tasks

1. Add failing reward-state tests in web/tests/daily-checkin.test.mjs: guest/preview gating, account isolation, double activation, already-claimed, paused service, successful balance refresh, lost response recovery, UTC+7 rollover.
2. Implement web/src/lib/daily-checkin-store.ts and web/src/lib/use-daily-checkin.ts. Reuse API types/endpoints; stale account responses must not overwrite current state. Server determines rewards. Share store with PointsHome without changing payment/ads behavior.
3. Create DailyOverview.tsx and its CSS module in components/home. Lazy-load dayFacts; refresh dates at midnight/focus, no build-time date frozen into static export. Loading/error states reserve layout. Keep both locales and correct wallet-market unit.
4. Place overview directly after Dashboard header, before onboarding/chart/tools. Compact the header. Keep square quick-tools navigation invariant.
5. Add shared motion tokens and route scene in AppShell. Update shared Btn motion using scoped classes; avoid blanket button transforms that would affect specialized card/camera controls.
6. Run focused tests then full tests, typecheck, lint, Knip, build and diff check. Sync CodeGraph. Verify screenshots at desktop/390/320, both locales, guest login, localhost preview, calendar link, route navigation and user-reduced motion. Test authenticated rewards with deterministic API doubles, never claim on the user's real account during QA.
7. Commit the reviewable change, push feature branches, attach PR, check CI and preview. Production publication requires approval for this new commit; the earlier approval was for 6d2abd6 only.

## Scope and evidence

Intended paths: new daily components/store/hook/test; Dashboard.tsx/CSS; PointsHome.tsx; AppShell.tsx; Btn.tsx; globals.css; this plan and QA report. No backend, database, pricing registry, navigation routes or reward amounts change.

Motion reference: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html — honor user motion preferences; this is design guidance, not a claim of whole-site WCAG certification.

Implementation finding: home does not need birth information for calendar or rewards. Defer automatic captive profile onboarding on home via an optional provider prop; retain explicit profile completion and automatic onboarding on other routes. Add the home exemption regression to profile-onboarding.test.mjs.
