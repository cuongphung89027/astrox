# AI statistics

Record sanitized per-attempt model ID, protocol, duration and provider-reported token/cache usage in existing request attempts JSON. Do not store prompts, completions or secrets. Request outcome and upstream attempt outcome are distinct. Include local configured gateway requests and mark delegated calls separately; legacy calls before admin publication and browser cache reads are outside server visibility.

Authenticated metrics endpoint filters a bounded date range (maximum 90 days), provider, model and service. Aggregate request/attempt failure rates, retry/fallback, latency average/P95, token/cache coverage and daily/provider/model breakdown. Unknown usage remains null. Cap loaded samples explicitly and report truncation. Optional model price per million USD gives estimates only for complete priced usage, with coverage. UI has date filters, clear denominators, tables and empty/error states, under Cài đặt AI / Thống kê AI.

Verification: failing tests for usage normalization, aggregation/filters, missing vs zero, fallback error denominator and cost coverage; API authorization/DB tests; browser fixture tests; typecheck/lint/build and Workers compile. Never call paid providers for QA.

Implemented and verified: normalized provider usage/cost snapshots, authenticated metrics query, provider-model pricing controls, statistics page and filters. 81 Node tests passed; TypeScript/targeted lint, Next export and Worker compilation passed. Browser verified real endpoint access plus fixture-backed denominators/filtering and 1440/768/390/320px layouts. No paid provider calls. Browser result-cache telemetry is explicitly uncollected; external Worker usage is not inferred.
