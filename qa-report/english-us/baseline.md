# English/US parity baseline — G0 evidence

## Handoff (owner, scope, base)

- **Owner:** ZCode session (execution agent), worktree `../astrox-english-us`, branch `codex/english-us`.
- **Task:** Task 01 — Inventory và baseline (plan `docs/plans/2026-09-28-english-us-implementation.md`).
- **Base:** `db614b23eb549efcc38b5117c15220e0faa14b4f` = `origin/main` verified 2026-09-28 after `git fetch origin --prune`. Diff base→origin/main: **empty** (no drift since planning).
- **Doc commits carried in, provenance preserved:** `dee64bd` → `4e1f4aa` → `80d3322` (branch `codex/english-market-design`) fast-forwarded into `codex/english-us` — identical SHAs, no rewrite. These three commits are **local-only, not pushed to any remote** (verified `git ls-remote origin 'refs/heads/*english*'` → empty). Local `main` in the shared repo is 3 commits behind `origin/main` and was intentionally **not** updated (checkout chính dirty; so sánh bằng refs).
- **Scope of this task:** docs + QA evidence only. No source, config, migration or deployment changes.
- **Touched paths:** `docs/plans/english-us-parity.csv`, `qa-report/english-us/baseline.md`.

## Baseline runs (Node v24.16.0, `npm --prefix web ci` exit 0)

All commands run from worktree root on clean tree at 80d3322.

| Command | Exit | Result |
|---|---|---|
| `npm --prefix web test` | 0 | 383 tests, 383 pass, 0 fail, 0 skipped; `test:prompts` verified 79 full rendered prompts, fixed-report retention + revision history |
| `npm --prefix web run typecheck` | 0 | clean (web + services/backend tsconfigs) |
| `npm --prefix web run lint` | 0 | 0 errors, **19 warnings (baseline, pre-existing)** — incl. `ChartBoard.tsx` no-img-element, `auth.tsx` no-location-assign |
| `npm --prefix web run build` | 0 | static export, 20 routes (incl. legacy `/trangchu`, `/hoangdao`, `/thanso`) |

**Conclusion:** baseline is green; any future failure in these commands on an execution branch is a regression introduced by English work, not inherited.

## Parity inventory (`docs/plans/english-us-parity.csv`)

- **142 rows**, columns per plan: `module,serviceId,action,viRoute,enRoute,scope,freePaid,input,expectedOutput,testId,status,evidence`.
- Sources: `services/admin/catalog.ts` (90 leaf/module entries), `services/admin/service-tree.ts` (bundles), `services/admin/modules.ts` (routes/policies), **prod pricing from `https://theastrox.space/api/site-config`** (97 billing rows: 79 paid / 18 free, `vndPerPoint=1000`, `unlocks.enabled=true`, 5 topup packages) — read-only fetch on 2026-09-28.
- Row mix: 90 catalog leaves (incl. `experts` marked `excluded-en`), 7 module-landing rows, 20 unlock bundles (`bundle:*`), 18 app-level action rows (auth, profile, wallet, rewards, unlock, history, terms).
- Status accounting: 138 `mapped-vi` · 1 `excluded-en` (experts) · 3 documented absences — `google-login` (planned T11–12), `language-switch` (planned T04), `account-deletion` (**absent in VI product — decision needed for US privacy story before policy task 20**).
- testId prefixes: TV/ZD/KD/BT/NS/TT/TH/LC/PL/EX (leaves), BND (bundles), AUTH/LNG/PROF/WAL/REW/UNL/HIS/TRM (app actions). Task 21 certification must reference these IDs; SKIP không được tính là PASS.
- Notable verified absences: **no follow-up/hỏi-thêm feature** and **no account-deletion endpoint** exist in the codebase at this SHA (rg sweeps over `web/src` + `services` returned 0 hits). The plan's "follow-up khi hiện có" therefore certifies nothing for follow-up; if the product adds it, refresh the CSV first.

## Facts captured for later gates

- Route inventory at base (from build): `/`, `/admin`, `/banggia`, `/battu`, `/chitay`, `/chuyengia`, `/cunghoangdao`, `/dieukhoan`, `/hoangdao`, `/hoso`, `/kinhdich`, `/licham`, `/tarot`, `/thanso`, `/thansohoc`, `/trangchu`, `/tuonghop`, `/tuvi`, `/robots.txt`, `/sitemap.xml`.
- `services/backend/wrangler.jsonc`: worker `astrox-api`, D1 `astrox-db` (id `bbefe032-7053-49cf-99f1-794d3fbc128e`), cron `* * * * *` (PayOS recovery), `ZALO_BROWSER_FALLBACK_ENABLED=true` (operator-approved 24/09).
- Pricing data lives in D1 published config (revision 8 per ops memory); CSV froze the 2026-09-28 snapshot — refresh before G2 pricing checks.
- Rewards amounts are config-driven (`services/backend/rewards.mjs` reads site-config rewards section), not hardcoded — US mirror needs config, not code forks.

## G0 verdict

**PASS.** Inventory covers every leaf service and cross-cutting action; every row states current behavior; baseline exits are green with evidence above. Blockers found: none for G0; one product decision flagged (account deletion) for Task 20.
