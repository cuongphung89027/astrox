# Palm temporary development lock Implementation Plan

**Goal:** Temporarily lock palm reading and display Đang phát triển / Under development, as directly requested by the user.

**Architecture:** One development flag in the shared module registry. Market projections force flagged services to draft; the public shell blocks them before mounting children. Native entry points keep their identity with a disabled state and localized development label. Existing stored configuration, prompts, wallets and palm history remain intact.

**Tech Stack:** TypeScript, React, Next static export, Cloudflare Worker/Pages.

Owner root, integration/release. Base `fa7d74905064710b927e3f5c2f7c6e79093021f6`; branch `codex/palm-development`, isolated worktree. Shared contracts owned by root.

1. Write/run RED tests in `web/tests/palm-development.test.mjs` for both market projections, no input mutation, navigation labels and pre-config route blocking; extend configured AI test to prove no provider call.
2. Add registry flag/helper in `services/admin/modules.ts`; apply effective status after market overrides in `services/admin/config.ts`. Static guard in `PublishedNotice.tsx` renders a localized development notice without mounting palm inputs/camera. Preserve existing gates for all other modules.
3. Add disabled development labels to `web/src/lib/nav.ts`, home grid, desktop dropdown and mobile discovery. Keep cream/forest/gold styles, readable small badges and keyboard semantics.
4. Run GREEN targeted/full tests, typecheck, lint, knip, format, build, CodeGraph sync and diff check. Browser-check VI/EN desktop/mobile, direct routes and no palm camera/model/AI requests.
5. Commit/push the verified branch, deploy Worker then Pages from one SHA under the existing production authorization. Verify live routes, projected palm=draft in VN/US, module access false and API rejection. Record deployment IDs and rollback.

Re-enable by removing the registry development flag and releasing; original saved service status resumes. No database migration/config publication is needed.
