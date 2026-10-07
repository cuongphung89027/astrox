# Reading UX Fixes Implementation Plan

**Goal:** Implement the six user-approved corrections to recent reading UX changes.
**Architecture:** Small pure date and export helpers; shared toolbar; portal tooltip; source-linked dashboard cards; common navigation treatment.
**Tech Stack:** Existing Next 16.3.5, React 19, CSS modules, SVG, Node tests and Playwright.

Owner root, base 6d6a1e9. Touched scope: web/src/lib/reading-day.ts, reading-text.ts, dashboard-reading.ts; kit Term/ReadingToolbar/StructuredReading/VisualReading; home Dashboard/DailyOverview CSS; LunarCalendar English UTC+7 labeling; shell NavGroupMenu/AppShell/globals; tests, QA script and docs. No release/deploy in this task.

1. Add red tests for date boundaries (independent agent), literal markup preservation, visual report export and dashboard evidence summaries. Run node --test web/tests/reading-*-fix*.test.mjs web/tests/reading-day-clock.test.mjs.
2. Implement the pure helpers and verify green; personal clock is explicit, Vietnamese almanac remains reference UTC+7. Preserve original forecast snapshots and paid scope keys.
3. Extract toolbar from StructuredReading, wire native VisualReading, validate full report text/export and lifecycle. Run relevant render tests.
4. Portal/clamp Term and fix stretched-link layering, reproduce mobile tap and keyboard on real UI.
5. Replace percentage bars with sourced qualitative cards and use correct date/reference labels. Test VI/EN midnight and supported US zones.
6. Share a 1.5px tapered underline style across desktop link/group labels; verify 1024/1280/1440px and reduced motion.
7. Run npm test, typecheck, lint, build, knip, diff checks; browser 320/375/1024/1280 with mocked APIs and synthetic profiles. Check source changes, CodeGraph sync, commit verified task branch and hand off with screenshots and evidence. Do not merge/deploy without a new request.
