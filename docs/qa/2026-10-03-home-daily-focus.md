# Daily card information hierarchy QA

Owner: Codex root. Branch codex/home-daily-focus. Base e0a534f7e580db64daa84884fe3ed3e90d996490.
Touched paths: DailyOverview.tsx, DailyOverview.module.css, home-daily.test.mjs, task plan and this report. No Dashboard, auth, points, rewards store, backend, pricing or navigation changes.

## Result
Lunar day/month is the central large value; solar date/short weekday occupy one line. Removed UTC, duplicate year/can-chi, term/phase and redundant calendar-link copy. Leap month and error retry remain conditional. Check-in shows authoritative reward and streak or a relevant guest/error state; one explicit button carries loading/claimed/paused state. Removed decorative sentences, duplicated badges, circle and repeated journey/milestone copy. The main reward body links to the existing journey, with a small arrow. Full accessible names and card descriptions remain. Claim/auth behavior and 44px primary action are preserved.

## Verification
- Focused reward/home/dashboard suite: 19 passed.
- Two added regressions fail against the previous component and pass against the final component: no stale reward value during loading/error; disabled buttons describe loading/paused status.
- Full suite: 638 unit and 22 library tests passed; 79 rendered prompt checks passed.
- Typecheck passed; lint has 0 errors and 20 existing warnings; Knip passed; component/test formatting and services/functions formatting passed; static build passed.
- Actual localhost app with a fictional saved profile: VI and EN at 320/390/768/1024/1440px. Viewport width explicitly confirmed for every measurement. Equal square dimensions 138/173/234/186.81/225.98px; no horizontal or tile scroll overflow. Existing fortune/chart/Tarot/quick-access content remains visible. English solar date uses Oct 3 instead of ambiguous 3/10.
- Separate isolated server-rendered visual fixtures use the actual component and CSS with mocked reward hooks. VI/EN ready, claimed, paused, error, loading and guest = 12 cases at 320px. Fictional reward 10 and streak 12 remain readable in 138px cards. No scroll overflow; loading copy appears once. Fixture claim is blocked and never uses real API/account data.
- Console errors in final actual app tab: none.

Screenshots and measurements: Codex visualizations/home-daily-focus. Local fake-profile screenshots and isolated fixture screenshots are explicitly separate from guest public preview evidence.

## Release state and limits
The preceding square-layout e0a534f was pushed before the user's wait message and automatically reached Pages production. This new text-reduction revision is prepared for preview only until the user requests further release. No migration, real check-in, purchase or paid AI call was made. Preview/CI IDs will be recorded in PR after push; neither fixtures nor local profile prove authenticated production rewards.
