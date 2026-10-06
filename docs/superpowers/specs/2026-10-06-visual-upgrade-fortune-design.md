# Free visual upgrades and visual forecasts

Owner and integration/release owner: Codex root.
Base: 693d09bef9bf8f83311ea7383bb54d6e45928587.
Branch/worktree: codex/visual-upgrade-fortune, /Users/Thsonjpg/.codex/worktrees/visual-upgrade-fortune/astrox.

The user approved AstroX's native visual-report direction and explicitly requested free conversion for existing readers and the same treatment for forecasts. Reuse that approved design and implement directly. No generated images, new model chain, global price changes or reset of saved results.

## Free conversion

Add a release campaign with a fixed database cutoff recorded on its first migration. Successful earlier paid operations and purchased unlock grants provide one conversion entitlement for each earlier reading/service, in the same account and market. Failed/refunded purchases and purchases after the cutoff do not qualify. Scope-bearing profile unlocks retain their scope binding; legacy per-request records without a scope give a single conversion for that earlier purchased service. Period grants can convert to the current valid period rather than requiring an expired forecast.

Conversion is a dedicated zero-price operation, independent of whether normal unlock pricing is enabled. The backend verifies eligibility and the new visual descriptor, claims atomically, saves a validated result and consumes the entitlement only on success. Idempotent replay must not invoke AI or touch the wallet. Errors, cancellation and expired processing leases release the entitlement. An explicit conversion request never falls back to charging money.

Show a concise “Nâng cấp miễn phí” / “Free visual upgrade” action beside an old reading only after its service is free or server entitlement is confirmed. Saved visual reports do not show a repeated conversion offer. On success, retain the original cached reading in history and make the new report active. Historical backend results remain untouched. Anonymous free readers can regenerate the currently free service without a purchased grant; a browser cache does not authorize conversion of a paid service.

## Forecast direction

Apply the existing four-chapter reader to catalogued period services, including Tu Vi, Zodiac and Numerology's Personal Year. Respect any other supported period service discovered in the catalog.

Use cream surfaces, forest green, muted gold, Beautique Display and Be Vietnam Pro. Lead with the selected period and a native SVG timeline of actual supplied calculation samples. Use the other chapters for opportunities/points to watch, underlying context and a practical plan. Expand evidence, everyday examples, glossary and actions from concise summaries. Finite transitions follow the existing reader and cancel for reduced motion, hidden views and unmount.

Do not fabricate probabilities, luck scores, event dates or intraday phases. A day's forecast may show one calculated date; longer periods use the available dated calculator samples. Distinguish the calendar period from samples that extend beyond it. Prompts must explicitly anchor to dated period evidence, explain mixed signals and unknowns in plain language, and keep technical fact IDs out of prose.

Keep date-based cache expiry, profile identity, locale, market, server price validation and original Admin prompt history. Period snapshots store their date/window and calculator evidence so reopening does not reinterpret a saved report using today's date.

## Validation and rollout

Use real SQLite/D1-compatible tests for entitlement seeding, scope/market isolation, atomic claims, replay, refund/lease recovery and unchanged balances. Add VI/EN prompt/schema tests for the actual period descriptors and legacy saved envelopes; preserve historical results even when the Admin revision is unchanged. Browser checks cover old-reading conversion, failed conversion retry, current/expired period cache, rapid period switches, mobile overflow and motion cancellation.

Root owns shared API/dispatcher/schema edits. Deploy only the clean verified SHA: inspect/back up D1, apply the additive campaign migration, then Worker and Pages; wait for final Pages deployment before actual AI canaries through the web. Verify campaign counts and wallet totals before/after, public route/API behavior and the resulting native UI. Record exact SHA, deployment IDs, evidence and rollback.
