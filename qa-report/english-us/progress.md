# English/US execution progress

Branch `codex/english-us`, worktree `../astrox-english-us`. Base `db614b2` (= origin/main 28/09). Doc commits 80d3322 kept verbatim. All commits local/unpushed.

| Task | Commit | Status |
|---|---|---|
| 01 Inventory/baseline | 8a68b15 | DONE — G0 PASS (CSV 142 rows, baseline all exit 0, 383 tests) |
| 02 markets.ts contract | cae374d | DONE — 10+2 tests, route map/crossLocalePath |
| 03 i18n + dual root layouts | a97b54c | DONE — (vi)/ group + en/ wrappers (13), lang ok in export |
| 04 geo routing + SEO | 5c8d90e | DONE — [[path]].js AX_EN_ROUTING flag (kill switch), entryLocale, sitemap 25 urls, hreflang, robots /en/profile |
| 05 shell/UI localization | cadddd4 | DONE — nav.ts builders, dict ~170 keys, 13 components, LanguageSwitcher in topbar, dock/sheet/wizard/account localized |

## Verification state after Task 05
- `npm --prefix web run test:unit` → 418/418 pass.
- typecheck clean; lint 19 warnings = baseline set (format debt on services/ is PRE-EXISTING at db614b2 — 21 files, do not "fix" casually; plan Task 22 handles).
- Build exports 34 HTML routes (20 VI + 13 EN + _not-found).
- Key facts: web tests run from repo root via `web/package.json test:unit` glob; components localize via `useLocale()` from `@/i18n/LocaleProvider`; nav labels/routes ONLY via `web/src/lib/nav.ts` + `services/admin/markets.ts` (never hardcode hrefs).
- LoginPrompt on EN still shows Zalo primary + Google disabled ("Coming soon") — Google arrives Task 11–12.
- hourChi + VN_PROVINCES in ProfileModal still VI-only → Task 06 replaces birth place/hour input.

## Next up
Task 06 (birth location/timezone) → 07 (prompt locale) → 08–10 (module translations) → G2.
