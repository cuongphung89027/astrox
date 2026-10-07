# Reading UX fixes — production release 07/10/2026

Owner: root, integration and release. Base `6d6a1e96b10f72075ca55e6cb7528256fc70b361`; implementation branch `codex/reading-ux-fixes`. Shared navigation changes integrated by this owner. Scope: the 27 paths in `6d6a1e9..fa7d749`, frontend helpers/components/styles, tests and documentation. Main checkout's existing changes were untouched.

## Deployment

- Verified clean release SHA: `fa7d74905064710b927e3f5c2f7c6e79093021f6`, fast-forwarded to both `origin/main` and `upstream/main`.
- D1 inspected first; no migrations or data writes required. Admin revision 21 / published ID 14, one upgrade campaign, 68 grants and existing upgrade/booking tables match before/after.
- Worker deployed before Pages, with `--keep-vars`: `ca61b23c-6720-4fb2-b853-7ca4c6b29288`, 100% traffic, deployment message contains the full release SHA. D1 binding and cron retained.
- Pages production deployment: `a85a295c-4294-4a85-8618-47da21b13170`, source `fa7d749`, branch main. Custom domain: https://theastrox.space.
- [GitHub CI](https://github.com/cuongphung89027/astrox/actions/runs/37644772666): success for the exact release SHA.
- This post-release record is committed on the feature branch separately; production/main remains the verified release SHA above.

## Result

Evidence-based day guidance replaces arbitrary percentages; Vietnamese personal dates use UTC+7, English personal dates use the device's IANA zone. The Vietnamese reference calendar is labeled separately. Glossary tooltips work through a viewport-clamped body portal. Native and legacy reports share complete readable copy/share/speech output; literal C#, multiplication and underscores survive cleanup. Desktop navigation uses a centered 1.5px gradient underline with reduced-motion support.

No backend, prompt, pricing, wallet, auth or upgrade-entitlement behavior changed.

## Verification

- Fresh local checks: 770 unit tests, 22 library tests, 79 prompt round trips; typecheck, knip, formatting, static build, SEO and diff checks pass. Lint: zero errors, 20 existing warnings.
- Export QA retry: 56 pass, zero fail. The first attempt hit a transient local navigation/network-idle timeout; an isolated reproduction and the unchanged complete rerun passed. Live Google login, payment and AI quality remain outside this frontend release verification.
- Public custom-domain routes: home, lunar calendar, Zi Wei/Tu Vi, numerology and pricing in VI/EN, expert booking and Admin return 200. Worker health/me/experts return 200; guest bookings/user-data and AI quote/upgrade return 401. Admin config redirects to the Cloudflare Access sign-in page; its final HTML response is 200, not an authenticated config response.
- Published public config revision 14 is byte-identical by JSON SHA-256 before/after: `b65d9b024a2dfabdc1dff452324d49743757598fd12aae8a1419c64718ba1d79`.
- Native report QA on the production deployment hostname: 8 VI/EN cases at 320/375/1024/1280px plus legacy export and reduced-motion/keyboard checks. Synthetic local profiles/reports, mocked API/speech/clipboard/share. The QA harness dismisses the production-only guest login dialog using its visible close button. No page/hydration errors.
- Unmocked custom-domain browser QA: 4 VI/EN cases at 375/1280px, live config, navigation underline, calendar disclosure/tooltip, viewport clamping, Escape dismissal and no overflow. No page errors.
- Evidence: `/Users/Thsonjpg/Documents/Codex/qa/2026-10-07-reading-ux-prod/`.
- No real customer login, payment, wallet debit, provider generation or installed OS voice was exercised.

## Rollback

Previous Worker: `de8e1f6e-61b3-4ef2-a3e8-2eb065df1127` (runtime source `f0e123a`). Previous Pages production: `a0056d55-94a3-4b99-b004-6ddf7ee102c5` (source `6d6a1e9`). Restore these deployment versions if required; no D1 rollback is needed. For a Git rollback, revert the frontend fix on a clean branch and verify/deploy Worker and Pages together.
