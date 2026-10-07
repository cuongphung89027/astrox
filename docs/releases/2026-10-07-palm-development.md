# Temporary palm reading lock — 07/10/2026

Owner: root, integration/release. Base `fa7d74905064710b927e3f5c2f7c6e79093021f6`; isolated branch `codex/palm-development`. Scope: shared module/effective market status, shell gate, navigation labels, native development notice and tests. Existing main checkout changes untouched.

- Release SHA: `dd06b0ca5803a7500641ac2c408de33c798c9ac8`, clean and pushed to both remote main branches.
- Worker: `82347f70-904e-44b8-a088-3cd2f84fb2c6`, 100% traffic, deployed with `--keep-vars` before Pages. Deployment message contains the release SHA.
- Pages production: `85f837ab-5473-4ead-8237-1ea748524041`, main, source `dd06b0c`, https://theastrox.space.
- [CI](https://github.com/cuongphung89027/astrox/actions/runs/37650774572): success at the exact release SHA.
- D1 inspected: Admin revision 23, published ID 15; one upgrade campaign and 68 grants. No migrations, configuration publication or other database writes were performed by this task.

## Behavior

Palm reading remains identifiable with Đang phát triển / Under development in the home grid, desktop Ask dropdown and mobile discovery entries. These entries are disabled text rather than actionable links. Direct VI/EN routes render the matching development notice before the public config loads, without mounting camera/file-upload children.

The shared registry marks palm as in development. The effective VN/US config forces palm services to draft after saved market overrides; APIs reject the service and it is removed from the active price listing. Persisted prices/statuses, prompts, wallets and palm history are unchanged. Re-enable by removing the registry flag and releasing; saved settings resume.

## Evidence

- RED: new lock tests failed before implementation. GREEN: 14 targeted tests, 775 unit tests, 22 library tests and 79 rendered prompt round trips.
- Typecheck, formatting, knip, static build and diff checks pass. Lint: zero errors, 20 pre-existing warnings. CodeGraph synced per checkout.
- Four local and four unmocked production browser cases, VI/EN at 375/1280px: localized direct-route notice, no camera/file controls or palm model/AI requests, disabled home/desktop labels, VI mobile discovery badge, no page errors. The existing EN mobile dock does not expose the discovery trigger; English home and desktop entries were verified and its shared discovery data is covered by unit tests.
- Live VN/US public config revision 15: palm=draft, palm absent from active billing services, module access=false. Two synthetic no-image AI requests each returned 403 before provider execution. Other public config and prices are deeply equal to the pre-release snapshot after excluding palm.
- Home, palm and pricing routes in VI/EN return 200. No real login, payment, provider generation or wallet debit was exercised.
- Evidence and reproduction scripts: `/Users/Thsonjpg/Documents/Codex/qa/2026-10-07-palm-development-prod/`.

## Rollback

Prior Worker: `ca61b23c-6720-4fb2-b853-7ca4c6b29288`; prior Pages: `a85a295c-4294-4a85-8618-47da21b13170`; application source `fa7d749`. No D1 rollback is needed. This post-release record is committed on the feature branch separately; production/main remains `dd06b0c`.
