# AstroX unified release design

The user approved production integration of all already-built Lunar Calendar, Palm Reading, Expert Booking, Kinh Dich/UI polish, and hierarchical service pricing on 2026-09-24. The three-module work remains uncommitted in `codex/readings-kinhdich-couples`; pricing is committed at `4ed4a30`. Current `main` is `c038ba7`, an ancestor of the pricing branch, and must not be used directly for a production build.

## Integration contract

- Build in one isolated `codex/unified-release` worktree starting at `4ed4a30`. Treat both source worktrees and dirty `main` as read-only inputs. Preserve all source, tests, docs and migrations needed for the three modules; do not copy `.wrangler`, local credentials, generated output or stale `.codegraph` indexes.
- Resolve shared Admin, AI and routing files against the latest split Admin architecture. Keep the pricing quote/charge/entitlement path, current paid-AI safeguards, managed prompts, image-only palm input and booking authorization intact. Restore the nine square homepage links, desktop navigation, mobile discovery menu and both Kinh Dich coin/tube methods.
- Commit a root `AGENTS.md` and an agent workflow document. Every agent uses its own worktree and branch, declares owned files, coordinates shared-file edits, imports only committed changes into the integration branch, and does not deploy from dirty worktrees. A release manifest records exact Git SHA, migrations, Worker and Pages deployments, verification and rollback pointers.
- Add a small regression check that fails when any of the three routes, homepage links, desktop/mobile navigation entries, palm image transport, booking endpoints, pricing quote path or Kinh Dich ritual disappears.
- Verify full unit/integration suite, typecheck, lint, prompt tests, production build and browser behavior before production writes. Apply only additive missing D1 migrations, deploy matching Worker and Pages artifacts, then verify custom-domain routes, navigation, quote endpoint and booking catalog. Keep existing published prices/provider secrets and do not fabricate expert records or AI quality evidence.
- Record the current source/production discrepancy and final release evidence in project documentation. Add a memory update note only in `/Users/Thsonjpg/.codex/memories/extensions/ad_hoc/notes/` as the user explicitly requested.

## Failure and rollback

Stop deployment if any shared-flow check fails. Keep the previous Worker version and Pages deployment URLs in the release manifest. D1 migrations are additive; rollback means redeploying prior Worker/Pages artifacts, not dropping new tables. Preserve customer data and all uncommitted worktrees.
