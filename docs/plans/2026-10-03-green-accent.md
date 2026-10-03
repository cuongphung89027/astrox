# Green accent implementation plan

Owner: Codex root. Branch codex/green-accent. Base 0788036e497a2f20b60254f772f48bf25ffe31a3. User requests replacing the orange cast with green after the homepage release.

Goal: green primary actions and a light mint background coordinated with the existing forest-green check-in card. Existing Next.js 16.3.5, typography, 1:1 card sizes, copy and motion remain. No new assets or inspiration required.

Architecture: add semantic accent/deep/tint theme tokens (#244d40 / #193e33 / #e1efe7). Use these for primary buttons, section eyebrows, focus and ambient background; retain the existing son colors for error alerts and outgoing wallet entries. Cool the shared surface/ink tokens, browser theme metadata and homepage calendar/Tarot surfaces. Preserve the original gold header border, moon artwork, reward coin, navigation focus, Tarot decoration and all --color-kim tokens, as clarified by the user. Navigation contracts and routes stay unchanged.

Touched paths: web/src/app/globals.css, both root locale layouts, kit/Btn.tsx, kit/SectionTitle.tsx, shell/AuthMenu.tsx, tuvi/LockPanel.tsx, home/DailyOverview.module.css and home/Dashboard.module.css, this plan and QA note.

1. Add semantic green tokens and update decorative consumers/surfaces only. Review the complete diff, including semantic red usages.
2. Run focused home/dashboard/reward tests, typecheck, scoped ESLint and static build. Calculate foreground/background contrast and inspect VI/EN actual guest UI at 320/390/1440, primary/focus/dialog states, calendar and tools. No new implementation-mirroring tests for this reversible style change.
3. CodeGraph sync, clean commit, push feature branch to both remotes, create/attach PR and verify CI/public preview. Record screenshots and limits. Continue the established production release workflow when release authorization applies; if automatic review blocks deployment, stop that action and explain the specific reason with the completed preview ready.
