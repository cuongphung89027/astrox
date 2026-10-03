# Compact square home cards implementation plan

Owner: Codex root. Base: 689ad8783df42d4e8ba841c04fd9e60603a663e7.
Branch: codex/home-square-layout. Reuse the clean root-owned home-daily-motion worktree; no shared dirty checkout changes.

Goal: make the two daily cards smaller, strictly 1:1 and adjacent on mobile/desktop; preserve all existing personal/chart/Tarot/quick-tool/recent-reading cards.

Design: retain warm paper and forest green, serif date/reward accents and finite shared motion. Compact calendar keeps solar/lunar dates; check-in keeps live reward/streak and a clear action. Short visible labels retain full accessible names. Both daily cards are in a two-column grid capped at 480px; at 320px they still fit side by side. Desktop places the daily pair on the left, existing today/chart panels on the right and Tarot below the daily pair. Guest layout places original quick tools alongside the daily pair and profile prompt; smaller screens stack original sections below the square pair.

Files: Dashboard.tsx/CSS for section placement; DailyOverview.tsx/CSS for density and responsive names. Do not touch rewards API/store, auth, prices, navigation definitions or shared motion.

Steps:
1. Regroup the existing JSX, preserving conditional personal widgets, links, recent readings and every quick-tool entry.
2. Add compact visible calendar/action labels with full aria labels; keep pending/claimed/paused/error/guest/preview behavior.
3. Replace daily CSS with border-box aspect-ratio 1, fixed grid tracks and compact typography. Use container-relative sizes. Calendar card has a stretched footer link for an easy tap target; error retry remains above that link. Keep check-in a distinct explicit action.
4. Run existing home/reward/dashboard tests, typecheck, lint, Knip and build. Use actual browser UI at 320/390/768/1024/1440, both locales, guest and localhost fixture. Assert exact width/height and absence of inner clipping/overflow; verify all old card content remains.
5. Sync CodeGraph, save screenshots and QA limits, commit/push feature branch, attach PR and verify CI/preview. Continue the authorized release workflow once the concrete layout is verified; no database/schema/reward changes.
