# AstroX Unified Release Implementation Plan

**Goal:** Integrate and publish the three new modules, UI/Kinh Dich polish and hierarchical service pricing from one traceable revision.

**Architecture:** Start from the committed pricing branch, port the uncommitted three-module work into a separate worktree, reconcile shared Admin/backend/web code and deploy one matching revision. Add durable agent ownership and release rules to prevent future branch drift.

**Tech Stack:** Next.js static export, Cloudflare Pages Functions, Worker, D1, CodeGraph, Node tests, Playwright.

1. Capture the source worktree's tracked diff and required untracked files without mutating it. Inventory conflicts with `4ed4a30` using CodeGraph and Git. Confirm no generated/secret files are copied.
2. Port calendar, palm, expert booking, navigation, Kinh Dich ritual and polish. Resolve shared files to retain pricing and Admin split. Add missing route/flow regression coverage and run focused tests.
3. Add root `AGENTS.md`, `docs/agent-workflow.md`, release record template and coordinated source-of-truth rules. Keep branch/worktree paths and deployment SHA explicit. Write a memory update note in the user-authorized ad-hoc notes folder.
4. Run `npm run test`, `npm run typecheck`, targeted ESLint, production build and browser desktop/mobile checks. Run CodeGraph sync and review the final diff. Commit and push the exact release revision to both Git remotes.
5. Inspect production D1 schema and apply only missing additive migrations (`bookings`, `service-unlocks`). Dry-run, then deploy Worker and Pages from the same clean revision. Verify custom-domain navigation/routes and read-only APIs; record deployment IDs and remaining activation limits.
