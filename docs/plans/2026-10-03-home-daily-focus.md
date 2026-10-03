# Focused daily card hierarchy

Owner: Codex root. Branch codex/home-daily-focus. Base e0a534f7e580db64daa84884fe3ed3e90d996490. Dedicated owned worktree; no dirty shared checkout changes.

User wants less text and important information to be obvious while retaining compact squares and old cards. Lunar day/month becomes the large central value; solar date and short weekday occupy one bottom line. Remove redundant UTC/year/can-chi/term/moon-phase and open-calendar copy; full details remain on the existing calendar page. Leap-month marker and retry are preserved when applicable. Check-in removes promotional sentences, duplicated badges, circle and repeated journey text. Keep authoritative server reward large, streak as one short secondary line and one explicit claim action. Guest/preview/error/loading/paused states use relevant compact information; guests see no invented reward amount. The reward body links to the existing journey.

Scope: DailyOverview.tsx/CSS only, tests for informative loading/error/paused states, docs. Preserve rewards/auth/wallet/backend/nav and Dashboard sections. Existing 1:1 pair dimensions and finite motion/reduced-motion behavior remain.

Steps: update view hierarchy; verify existing reward/home tests and focused presentation-state assertions; typecheck/lint/build; browser VI/EN at 320/390/768/1024/1440 with profile and guests; verify count visibility and exact ratio. Sync index, commit, PR/CI/preview for review. User said wait on further release; do not deploy this revision without later instruction. The preceding e0a534f was pushed before that message and is recorded separately.
