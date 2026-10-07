# Reading UX correction verification — 07/10/2026

Owner root/integration. Base 6d6a1e96b10f72075ca55e6cb7528256fc70b361. Branch codex/reading-ux-fixes; isolated managed worktree. No backend, database, prompt, price, wallet or production changes.

## User scope completed

1. Arbitrary work/social/energy percentages replaced with qualitative guidance citing actual deity, lunar date and taboo facts. Taboo days do not recommend major starts. Saved visual previews extract the actual summary.
2. Personal dashboard day/greeting/date: VI uses Asia/Ho_Chi_Minh; EN uses the current device's IANA zone. Reference almanac, lunar dates and hour windows remain Vietnamese UTC+7 and explicitly labeled in English. Birth timezone is not used as the current timezone. Cached forecast snapshots retain their original anchors; a mismatched visual date is not presented as today's personal reading. Current/next reference hours never wrap back to a passed morning window.
3. Inline glossary trigger is above the calendar card's stretched link. Body portal avoids clipping and invalid nested markup, clamps within viewport, supports tap/focus/hover/Escape/outside/scroll and cleans up listeners/timers.
4. Shared toolbar appears on legacy and native visual readings. Complete report export covers all chapters, rationale, examples, cited facts, terms and actions without JSON/technical identifiers. Speech is chunked, stoppable and cancelled on unmount; clipboard/share failures are visible.
5. Syntax-aware legacy conversion retains C#, multiplication, underscores and fenced content; honors display term translations.
6. Desktop underline shared across direct/group links: centered under the label, 1.5px tapered forest/gold gradient, finite easing, reduced-motion support.

## Evidence

- RED: independent date tests 0/10 (missing helper); new export/dashboard/render tests 0/5; late-night reference-hour test failed before helper implementation.
- GREEN: 770/770 unit tests; 22/22 library tests; 79 full prompt round trips. No disabled/skipped tests.
- Final targeted suite 48/48 after the final text edit.
- Typecheck, Next static export 35 routes, knip and git diff --check pass.
- Lint 0 errors, 20 pre-existing warnings. No new warnings in Term/ReadingToolbar.
- Browser QA: 8 VI/EN cases across 320/375/1024/1280px. Real React/calculators; synthetic saved profiles/reports and mocked API responses/browser speech/share/clipboard. Tested UTC midnight mismatch, separated personal/reference date, tooltip tap/portal/clamping/Escape, nav rule dimensions, no overflow, full copy/share, speech stop/unmount/no restart, clipboard failure, reduced motion, keyboard dropdown and focus/hover tooltip dismissal. No JS/nested-HTML/hydration errors in those flows.
- Screenshots/results: /Users/Thsonjpg/Documents/Codex/qa/2026-10-07-reading-ux-fixes.
- This verifies local UI behavior; it does not verify real OS voice availability, installed Vietnamese voices, live customer accounts, CI or production deployment.

## Date policy research

[MDN Intl.DateTimeFormat constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat) documents explicit IANA timezone names and the runtime's default timezone. The existing Vietnamese lunar engine uses UTC+7 for new moons, solar terms and hour windows; translating its UI does not change its reference calendar. A US personal date must therefore be separate from that reference and use a current IANA zone, which handles DST without a hard-coded UTC offset.

Boundary tests cover New York and Los Angeles spring/fall DST, Phoenix/Honolulu non-DST boundaries, Vietnam 0–7am and New Year. Stored reading schemas, server validation anchors and paid scope keys remain intact.

## Reproduce

npm test --prefix web
npm run typecheck --prefix web
npm run lint --prefix web
npm run knip --prefix web
npm run build --prefix web

Start a local web dev server on 3188, then run:
node web/scripts/reading-ux-fixes-qa.mjs
