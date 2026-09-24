# Yellow release verification — 2026-09-24

Production release: `2026-09-24-yellow-1`, source commit `0ee6f9a`.

## Checks passed

- `node --test services/admin/*.test.mjs services/backend/*.test.mjs services/rewards/rules.test.mjs web/tests/*.test.mjs`: **158 passed, 0 failed**.
- `npm run build` in `web`: static export and TypeScript passed.
- `npm run lint` in `web`: **0 errors, 28 warnings**. CommonJS QA scripts have a narrowly scoped `no-require-imports` override; React rules remain enabled. Hook/ref bugs fixed, reset state is guarded by changed identity during render, effects retain cancellation and external subscriptions.
- `node web/scripts/yellow-items-qa.mjs`: Chromium validates public guest pricing, download-before-upload, a second independent browser context restoring saved AI content, account isolation, cancel/accept paid confirmation, `expectedPoints`, PayOS cancellation notice, route smoke checks and mobile width; no page errors. External APIs mocked, no real purchase.
- `node web/scripts/tarot-compat-qa.mjs`: recovered journal, delete/count, four gender pairings, loading/error/retry/cache, reduced motion, 360/390/1440 widths; no page errors. APIs mocked.
- `node web/scripts/yellow-production-smoke.mjs`: real canonical domain, live public config/prices, support SLA, no forced login on prices/terms, 390px overflow check, unauthenticated cloud/AI 401, retired login 410; no browser errors. No authenticated financial operation.
- Worker dry-run and Pages Functions compilation passed. `git diff --check` passed.
- Static HTML has body content; sitemap contains pricing; terms HTML contains approved response window.

## Data behavior

- Authenticated Zalo data uses `zalo:<internal user ID>`. Supabase retains its prior UUID storage key on the server for compatibility.
- Optimistic revision check rejects stale PUT (409) and unversioned old-client PUT (428); no blind overwrite.
- Client stores per account, merges cached readings/history/deletion markers and preserves locally edited profile fields against a persisted baseline. First legacy local data adoption occurs once. Failed downloads never trigger upload. Late stopped-sync, balance and AI responses cannot populate a new account.
- Data size cap is 1.7 MB for the saved JSON. Failed sync remains visible and local data is retained; large legacy chart images may require follow-up migration rather than silently truncating history.
- A device must sync before its locally stored historical readings can appear on another device. Already lost data cannot be reconstructed.

## Price and monitoring behavior

- Every fresh AI request fetches current price. Paid use opens a cancelable native dialog; requests carry expected Point price including zero for free use. Server rejects a changed paid price before charging. Existing cached readings do not create requests.
- Runtime telemetry accepts only known route paths and event enums, rejects arbitrary data and foreign origins, has daily HMAC-IP/global caps and 30-day retention via the scheduled Worker. Admin read requires `audit.read`.
- It does not capture prompts, reading text, raw errors, email, query strings or session replay. It is a best-effort browser counter, not comprehensive availability or crash monitoring, and has no external notification channel.
- Existing AI metrics/ledger remain the source for AI/payment diagnostics.

## Deployment and live checks

- D1 backup made privately before migrations; additive schema applied successfully to shared `astrox-db`.
- Worker deployed with `--keep-vars`; service binding entrypoints preserved. Worker version `bc12437b-4960-490b-84b0-37a5f570cbc2`.
- Pages deployed from `web/out` with `_headers` and `privacy.html`: https://01fa54f1.theastrox-a3l.pages.dev.
- Canonical `/release.json` and API `/api/health` agree on `2026-09-24-yellow-1`.
- Live config revision remains **1**, public service status counts **77 free**. No paid service activated and no real transaction created.
- `production-smoke.json`, `production-browser.json`, `initial-js.json` contain sanitized evidence.

## Performance scope

Initial script tags in homepage HTML: 12 → 11 files, raw 1,434,509 → 954,766 bytes, gzip 432,145 → 284,734 bytes. This compares the critical production page before deployment with the yellow export using the same gzip method. It excludes later prefetches and lazy chunks and is **not** a 4G/Core Web Vitals measurement. Old HeroVideo is not used by the current homepage.

## Outstanding operational validation

Real-user Zalo login; live PayOS → wallet → paid AI → refund; provider output quality and LGBTQ+ wording; observation of an actual production recovery cron; real-device Core Web Vitals. Cron schedule is deployed, but one actual live execution was not observed here. These are not marked as passed.
