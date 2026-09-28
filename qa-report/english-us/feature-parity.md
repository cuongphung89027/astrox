# VN / US feature parity — local implementation evidence

Date: 2026-09-28. Owner: current Codex task, sole integration owner.
Branch: `codex/history-amount-sign`; isolated checkout `~/.codex/worktrees/history-amount-sign/astrox`.
Base: `90d7eb39b549ee6e65a100c5682a8c1daf354886`, followed by history amount fix `c07508a`.
Scope: all VN user capabilities in the US edition except expert booking. Approved adaptations: English, Google login, USD/Credits/Lemon. Shared Admin with country selection, independent published market settings.

This report supersedes earlier claims that route checks alone established full parity. No push, production migration, deployment, real charge or real ad impression was performed.

## Feature matrix

| VN capability | US implementation and evidence |
| --- | --- |
| Home / navigation | Same tools, birth-chart summary, daily preview, recent saved readings, journal shortcut; English routes and labels. Home previews filter the saved language and preserve topic/subtopic deep links. Expert tile excluded. |
| Profile / account / preferences | Shared screens and saved-data sync; English fields, international birthplace/timezone input retained, Google identity. Unit tests cover account/cloud-data isolation and verified Google referral registration. |
| Wallet | Shared `PointsHome`, not the former abbreviated `CreditsHistory`: balance, topup, earn navigation, signed ledger, added/spent filters, load more, pending/closed orders, loading/error/retry. Both VN and US debit signs covered by tests. |
| Earnings | Shared complete check-in, streak, milestones, invitation/copy, ad consent/reward flow, rules and retry. Same UTC+7 reward-day boundary is disclosed. Separate `rewardsUs`; reward events and ad sessions pin currency. |
| Topup / promotions | US packages, balance, promo validation, direct redemption, explicit purchase confirmation, checkout/history/retry. Stable checkout/redemption keys survive ambiguous responses; changing promo invalidates stale approval. VN PayOS flow retained. |
| Zi Wei | Same chart, palace selection, expand view, reading topics, periods, paid-consent and saved readings. English engine labels retain palace positions, star element colors and life-palace lookup. |
| Western astrology | Same signs, natal chart, planets/houses/aspects, forecasts and topics. English labels retain computed positions and aspect classifications. No fabricated coordinates for unknown birthplaces. |
| Ba Zi | Same four pillars, element selection, relations, topic readings and luck cycles. Rules operate on canonical terms; English display does not alter calculations. Cross-language chart tests cover three birth dates. |
| Numerology | Same numbers, grids, pinnacles/challenges, topics and extra interpretations; English labels/descriptions. |
| Compatibility | Same astrology, Zi Wei and Ba Zi modes, partner inputs, evidence and AI interpretation; no gender combination removed. Interactive browser exercises Zi Wei and Ba Zi input/results/AI. |
| Tarot | All five spreads, three-card perspectives, card details/reversal meanings, interpretation/regeneration, journal/open/delete and locale-isolated persisted readings. English asset contains all 78 cards and upright/reversed meanings. Browser exercises all five spreads and a saved journal entry. |
| I Ching | All seven methods, ritual, inputs, result diagrams/details, interpretation, history and repeat. English NANP phone normalization accepts `+1`; VN normalization retained. Browser exercises all seven methods and paid consent/cancel/confirm. |
| Palm | Same capture/upload, guide, zoom, dominant hand, consent, loading/error/result flows; expert CTA absent in US. Local browser exercises upload, disabled consent gate, zoom, remove. Physical hand detection/camera hardware is not certified by these fixtures. |
| Lunar calendar | Same calendar/navigation, conversion, details, event add/edit/delete/undo and ICS export. English labels including leap month. Browser verifies conversion and event export/delete/undo. |
| Pricing | Same complete service tree, individual and bundle prices, upgrade deduction rule. USD packages or explicit unavailable state; never falls back to the VN sales catalog. |
| Terms / support | Restored shared page layout, desktop/mobile section navigation, print/save PDF action, contact and back link. English market text retained; this is UI verification, not legal approval. |
| Shared interaction | English loading messages, errors, accessible names, account menu, mobile navigation, header wallet link and confirmation dialogs. Reported wallet/price unit follows account market. |
| Admin editing | One dashboard and country gate. Same full Services editor (including bundles, unlocks and prompts), Rewards editor, promos and content/notices. US overlays publish independently; tests verify VN configuration remains unchanged after US edits. |
| Admin operations | US wallet list, adjustment, transaction/reward tables, financial report and support wallet timeline use Credits/Lemon. Adjustment is idempotent, respects reservations, updates FIFO lots and writes audit metadata. Permissions preserved. Historical anonymous behavior/AI diagnostics and customer identity list remain explicitly labeled as shared, because old telemetry has no market field. |
| Expert booking | Sole omitted user feature. EN route remains absent and US module access denies experts. VN booking remains available according to its existing configuration. |

## Billing and persistence fixes required by parity

- Published US service configuration drives public prices, module access, quote and charge. Server-authenticated market is authoritative; account changes invalidate client caches.
- Concurrent AI retries create one operation/reservation. Commit and release receipts are transactional and cannot consume/release another reservation. Duplicate commit consumes lots once.
- Restricted wallets cannot receive an orphan purchase ledger/lot without its balance increment. Five concurrent copies of the same purchase create one receipt/lot.
- Lemon checkout UUID is stored separately from the paid numeric order id. Custom price and test mode come from the server snapshot; payload locale is English and provider discount codes are hidden in favor of validated AstroX promos.
- Webhook identity checks, unique provider binding, snapshot amount/store/variant/environment/currency checks, tax-inclusive refund denominator and cumulative refund monotonicity are covered. Refund before fulfillment stays pending and is applied after fulfillment.
- First-purchase, registration, attendance, milestone, referral and ad grants use the correct market ledger. Promo caps are reserved transactionally; VN promo usage does not consume an identically named US promo.
- Persisted reading caches and journals are language-scoped. Existing purchased readings are retained across prompt revisions.

## Verification

| Check | Result |
| --- | --- |
| `npm --prefix web test` | **568/568 unit/integration tests pass**, 0 failures, plus **79 full rendered prompt checks** |
| `npm --prefix web run typecheck` | Pass: web and backend |
| `npm --prefix web run lint` | 0 errors, 20 warnings (image optimization, existing hooks/QA/auth navigation advisories); not described as warning-free |
| `npm --prefix web run build` | Successful static production export |
| `npm --prefix web run qa:english-export` | **55 pass, 0 fail, 3 external checks blocked** |
| Interactive parity: Chromium 1280 px | **62/62**, no recorded JS error or overflow |
| Interactive parity: Chromium 390 px | **62/62**, no recorded JS error or overflow |
| Interactive parity: WebKit 1280 px | **62/62**, no recorded JS error or overflow |
| Interactive parity: WebKit 390 px | **62/62**, no recorded JS error or overflow on isolated rerun |
| `git diff --check` / CodeGraph | Clean diff whitespace; checkout index synchronized after source changes |

The four machine-readable reports are in `parity/<engine>-<width>/report.json`. Reproduce with:

```sh
ENGINE=chromium WIDTH=1280 PORT=3999 node web/scripts/parity-audit.mjs
ENGINE=chromium WIDTH=390 PORT=4000 node web/scripts/parity-audit.mjs
ENGINE=webkit WIDTH=1280 PORT=4001 node web/scripts/parity-audit.mjs
ENGINE=webkit WIDTH=390 PORT=4002 node web/scripts/parity-audit.mjs
```

The browser harness uses the real exported UI and computation engines with explicit local auth, wallet, config and AI response fixtures. It verifies visible and accessible English text (including uppercase), interaction, request language/market and page overflow. It does not certify live AI prose quality or provider availability. One WebKit mobile run alongside three other browser runs reported transient access-control errors for canceled Next prefetch requests; an isolated complete rerun passed without suppressing errors. Keep this observation visible if the environment reproduces it.

Screenshots/ICS files are reproducible local artifacts and ignored by Git; JSON evidence and the harness are committed. Desktop terms and mobile wallet screenshots were visually inspected. The wallet's number animation may be captured before all digits appear; ledger values are asserted in unit tests.

## Release dependencies and operational notes

- New migrations: `lemon-checkout-identity.sql`, `lemon-promos.sql`, `reward-market.sql`, after their existing order/rewards tables. Full sequence is in `docs/ops/english-us-release.md`.
- No real Google production sign-in, live Lemon checkout/webhook, live AI English quality sample or physical-camera test is represented as passed.
- Go-live still needs the approved Lemon store/catalog, production Google client, approved USD pricing and authorized real purchase/refund acceptance. Rewards/ads also require operator configuration and real inventory.
- An ambiguous Lemon create request stays pending with its original intent key; do not issue another checkout blindly. Investigate pending orders before manually releasing promo usage. Restricted refund debt requires explicit reconciliation; ordinary Admin adjustment does not unlock a restricted wallet.
- This is a locally verified implementation candidate. The release owner must integrate the complete branch, review the final SHA, migrate and deploy Worker/Pages together, then verify the custom domain and authenticated production flows.
