# Yellow items after production critical release

Goal: finish the remaining recommended account synchronization, pricing/wallet feedback, performance/SEO and monitoring work, preserving the approved UI and original prompts.

1. Deploy critical commit, additive migration, private service bindings and recovery cron; verify live release and auth failures without payment.
2. Add session-scoped Zalo cloud data, optimistic version checks for both auth providers, per-account local storage and merged reading history. Download before first upload; prevent stale responses crossing accounts; expose sync errors. Regression tests for new devices, conflicts and isolation.
3. Use one account-scoped Point store; display public service/package prices, announce canceled/successful topup and refresh balance after AI. Show pending payment accurately.
4. Remove the blank auth prerender, add robots/sitemap and metadata; defer homepage chart computation/video. Keep requested design.
5. Add minimal sanitized first-party runtime error reporting and inspect remaining lint errors. No session replay, personal readings, or third-party tracking by default.
6. Run tests/build/browser QA, deploy updated migration/backend/frontend, verify public release and update the user's status table. Preserve paid/free configuration; no real payment without a separate purchase instruction.
