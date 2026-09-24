# AstroX agent workflow

This document is the shared contract for all agents editing AstroX.

## Ownership and isolation

Each task starts from the current remote main in its own `codex/<task>` branch and worktree. State the task owner, base SHA, intended paths and dependencies in the task handoff. Check Git status before writing. Do not edit, reset, stash, or commit another agent's dirty files. Keep CodeGraph indexed per checkout (`codegraph sync` at start and after edits); never copy its database.

The integration owner owns shared files: module registry/catalog/config and pricing contracts, backend and Admin dispatchers, app navigation, schemas and migrations. Feature agents own their isolated components, tests and documentation. If a feature needs a shared file, provide an explicit patch plus required invariants to the integration owner. The integration owner applies branches serially and reviews each conflict against the current architecture; an old feature branch is never treated as the final source for a recently refactored shared file.

## Product invariants

The module registry, catalog, route mapping, Admin configuration, public projection, AI authorization and prices must agree. Hierarchy has at most three levels. Pricing quotes and upgrade credits are computed server-side from persisted paid grants; the client never chooses the charge. Booking writes require verified user/admin identity, origin and idempotency; public listings must not expose private contact or question data. AI image requests are allowed only for explicitly image-enabled services, with bounded size and no image content in logs. Preserve all original Admin prompts and version history. New quick links belong to the same square-tile grid on home and the mobile discovery menu.

## Integration and release gate

Before merge, run relevant unit tests, typecheck, lint/build and `git diff --check`; include failures and known limits in the handoff. For release, the owner checks clean Git state, verifies both remotes and the exact release SHA, backs up or inspects D1, applies only additive migrations, deploys Worker and Pages from that SHA, then checks custom domains, navigation, API behavior, booking access, pricing quotes and Admin. Save deployment IDs and rollback revision. A preview or green build is evidence for that stage only; it is not proof of production behavior.

During a shared release, other agents stop changes to shared contracts until the owner announces the integrated SHA. Any urgent fix starts from that SHA as a new isolated task. No agent silently cherry-picks another agent's uncommitted work or force-pushes shared branches.
