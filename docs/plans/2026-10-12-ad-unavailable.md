# Ad unavailable implementation plan

Owner: root. Base 918a83d61302ca7106aabb25edf448e36348629c. Reuse attached clean worktree.
Approved scope: collapse failed ads and show one optional dismissible support note per browser session, never infer ad blocking from no-fill. No payment packages or backend reward changes.

1. Add browser checks: blocked SDK shows note once, dismiss survives reload/navigation, unfilled shows no note, inaccessible storage does not break content. Verify failure before implementation.
2. Extend DisplayAd with SDK-error-only support note. Store session seen marker safely. Keep no-fill collapsed. Add quiet responsive CSS and VI/EN wording.
3. Improve rewarded SDK-error copy with retry/check-in alternatives; retain grant and cancellation logic.
4. Run ad browser QA, typecheck, scoped lint, build, diff check and CodeGraph sync. Commit ready-to-release change; display serving remains gated pending approval.
