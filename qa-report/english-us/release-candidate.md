## Task 22 — Release Candidate regression 2026-09-28

SHA: 7bbf64d (final RC commit; regression first run at e4447f1)

test: ℹ tests 516
test: ℹ pass 516
test: ℹ fail 0
typecheck: exit 0
format: PASS after normalization (commit 7bbf64d) — pre-existing services/ debt now Prettier-clean too
lint: PASS (0 errors; warnings are the pre-existing baseline: img-element, exhaustive-deps notes)
build: exit 0 (35 routes)
export-qa: 38 PASS · 0 FAIL · 3 BLOCKED
git diff --check: clean


## RC verdict (G4)

- Unit/type/lint/format/build/export-QA: **ALL GREEN** (516/516 tests, 35 exported routes, 38/38 export certifications, 0 console/hydration errors in Chromium+WebKit at 390/1440).
- Baseline diff vs db614b2: no VN behavior regressions (legacy suites unchanged; Zalo login path untouched; VN wallet ledger identical).
- Known BLOCKED (G5-only, operator credentials): Google live login, Lemon live checkout/webhook, live AI English quality sampling.
- Remaining content debt (must finish before G2 sign-off): decorative panel copy on LunarCalendar/PalmReader/TopicsPanel hints still Vietnamese on EN tree — charts, prompts, tabs, terms, pricing and account surfaces are English.
- Per plan §E Task 22: CI now runs the export QA (chromium+webkit) so this surface cannot silently regress on merge.
