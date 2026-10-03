# Checklist closure verification — 2026-10-03

Owner/integration/release: Codex. Base: `fb8d1475a0c9898a8f5823f338226a3ab4d48ac1`.
Branch: `codex/close-ui-checklist`. Scope: eight screenshot tasks, prompt locale recursion, complete question preservation, and the mobile header overlap discovered during QA.

| Task | Evidence |
| --- | --- |
| 1. Detailed adverse stars | Existing published Admin revision 8 still has the old template. A runtime policy now supplements published/custom Tu Vi prompts without rewriting Admin history. Real provider output in VI and EN with synthetic chart data names adverse stars, their palaces, concrete effects and practical mitigation. See `live-ai.json`. |
| 2. Bullet rendering | Actual `AiText` SSR tests cover VI/EN, mixed prose/lists, four semantic list items, `list-disc`, emphasis and no literal Markdown bullets. |
| 3. Numerology `<br/>` | Browser shows one real `br` and no literal HTML in “Nhịp riêng của bạn.”; mobile/desktop screenshots attached. |
| 4. Optional exact time | Browser profile modal has date, traditional birth-hour choice and birthplace, with no optional exact-time input. Synthetic profile saves and computes numerology. |
| 5. Vietnamese calendar month | Mobile September navigation displays “Tháng 9”, not an English native month header. EN counterpart displays October; no horizontal overflow. Calendar library tests independently round-trip every day in 1976–2100. |
| 6. Palm icon | Existing weight-400 five-finger glyph confirmed in desktop navigation and the palm screen. |
| 7. Globe icon | Existing outlined SVG globe confirmed in mobile/desktop header. Additional header correction avoids title/button overlap. |
| 8. Question length | Kinh Dịch and Palm Reader no longer cap at 200/600. Browser keeps all 3,248 Vietnamese characters, including the final marker, in Kinh Dịch, Tarot and Palm Reader. Server prompt roundtrips preserve long questions. Expert booking supports 5,000 and rejects 5,001 explicitly instead of silently truncating. |

## Checks

- 591 unit/integration tests and 79 full prompt roundtrips passed.
- 22 additional calendar/almanac/image library tests passed.
- Typecheck, formatting, lint (20 existing warnings), static production build and `git diff --check` passed before release; these are rerun after the header correction.
- Header regression reproduced at 390px (74.83px overlap); after correction, 320, 360, 390, 440, 768, 1024 and 1440px have no title/control overlap or document overflow. See `header-viewports.json`.
- Local browser console has no error/warning in the exercised routes.
- D1 was inspected read-only; no schema migration or published Admin configuration write is required.

## Known limits

The first CI run reproduced the baseline `knip` failure. Static imports now expose the actual test dependencies to Knip, and the existing native TypeScript library tests are included in the normal test command and Knip entries. Two unreachable components, 12 unused runtime declarations, one unused type and unused locale-wrapper re-exports were removed after CodeGraph confirmed no callers. No inventory check was suppressed. `npm run knip` now passes. The three pre-existing backend test formatting failures were corrected with formatting-only changes.

Live AI evidence uses the configured production provider and published settings with synthetic chart data; it does not claim a paid authenticated production wallet flow. Booking permissions/idempotency/wallet regressions are verified by the full integration suite. Physical-device camera/permissions, real payments and authenticated production bookings were not exercised.

Production deployment IDs, route/API checks, exact SHA and rollback are recorded in the final release handoff after deployment.

The export UI harness still searched for literal button text `EN`, which was replaced by the accessible Globe button in the earlier icon change. Its visibility check now uses the actual Vietnamese accessible name. The switch action itself was manually verified in the production browser. CI exercised Chromium and WebKit at 390/1440px; the final rerun confirms the corrected harness.
