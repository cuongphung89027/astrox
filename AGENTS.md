# AstroX project instructions

<!-- CODEGRAPH_START -->
## CodeGraph

Use CodeGraph first when locating or understanding code in this repository.

- At the start of a coding task, run `codegraph sync` from the current checkout root. Run it again after source edits and before the final handoff.
- Use `codegraph explore "<symbols or question>"` for source and call paths; use `codegraph node <symbol-or-file>` for a symbol or file and its dependencies.
- Prefer MCP equivalents (`codegraph_explore`, `codegraph_node`) when available. The CLI works without restarting the agent.
- Use `codegraph callers`, `codegraph callees`, and `codegraph impact` to inspect relationships before changing shared code.
- Fall back to `rg` or direct file reads for text/assets the index does not cover or if CodeGraph fails; report a persistent indexing failure.
- Each checkout/worktree needs its own index. If `.codegraph/` is missing, run `codegraph init .` in that checkout, then `codegraph status`.
- Keep `.codegraph/` local and out of Git. Never copy an index between checkouts or assume the main checkout contains uncommitted work from another worktree.
<!-- CODEGRAPH_END -->

## Shared development contract

- Read `docs/agent-workflow.md` before editing. Work in a dedicated `codex/<task>` branch and worktree; never make speculative changes in another agent's checkout.
- Record your owner, scope, base commit, and touched paths in the active task or handoff. Read `git status --short` before and after edits. Existing dirty files belong to their current owner; do not reset, stash, checkout, or commit them.
- Shared contracts are `services/admin/modules.ts`, `catalog.ts`, `config.ts`, `service-tree.ts`, `services/backend/handler.mjs`, `services/admin/server.mjs`, and app navigation. Coordinate any change to these files through one integration owner. Other agents should provide a patch or branch and test evidence, not directly edit the integration worktree.
- Integrate one branch at a time; review the diff and resolve conflicts semantically. Keep pricing, wallet, auth, Admin and public routes aligned. Never copy `.codegraph/`, `.wrangler/`, credentials, local databases or generated builds between worktrees.
- Only the release owner merges/pushes to main, applies D1 migrations or deploys Worker/Pages. Deploy both from one verified commit, with database migrations first, then Worker, then Pages. Record SHA, deployment IDs, checks and rollback in a release note.
- A deployment is complete only after production route/API checks. CI/build success alone does not establish data parity or authenticated behavior.
