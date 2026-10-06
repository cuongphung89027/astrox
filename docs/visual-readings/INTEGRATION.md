# Visual reading integration

Owner and integration owner: Codex root. Branch: `codex/visual-reading-report`. Base: `bc7efe3e6a2a90854903e7b6125cf41f851837a7` from current remote main. Design/protocol drafts were committed separately at `ce6aed1e53ce697b8aafce7d3fdfba42c8722363`.

The user approved the reader and native diagrams, requested smooth motion, then authorized integration and deeper, clearer prompts. No image generation is used. Existing Beautique Display/Be Vietnam Pro fonts and AstroX cream, forest-green and gold styling are retained.

## Scope

New profile-policy leaf requests in Tu Vi, Zodiac (with chart evidence), Ba Zi, Numerology and Compatibility use a versioned visual-report descriptor. Session readings, date forecasts and missing-chart requests retain their existing flow. Purchased/cached text remains readable and is never automatically regenerated or recharged.

The reader has four chapters, chapter covers, qualitative spectrum, native SVG maps/element counts/paths, insight selection, evidence disclosure, hypothetical examples, plain-language terms and a concrete next step. It supports keyboard navigation, at least 44px HTML controls, small screens and finite selection/height/path transitions. Animations and CSS transitions stop on rapid replacement, reduced-motion preference, document hiding, leaving the view and React unmount.

## Runtime and prompts

`services/admin/visual-reading.ts` owns the canonical recipe, chart-derived evidence projection, response validation and immutable saved envelope. Original prompt descriptors stay nested and unchanged. Quotes, displayed-price/consent and inference use the same deterministic `readingPromptDescriptor`. Server rendering binds the exact service and locale; client-supplied display facts are ignored. Existing chart values are preserved; AI supplies prose and references, never visual coordinates or fabricated chart scores.

Five additive VI/EN template versions are registered. Original Admin prompts and overrides remain available. The new content contract and final server format adapter override old Markdown/short-length instructions only. They request roughly 900–1500 substantive words and require detail, evidence rationale, a clearly hypothetical everyday example, concrete action and simple term definitions. A 600-word minimum excludes shallow outputs; it is a structural depth floor, not an automatic judgment of interpretive quality. Provider/model chains, configured token caps, prices, markets, authentication and grants are unchanged.

Malformed, foreign-scope or truncated results fail before completion and follow the existing refund/reconciliation flow. The saved envelope contains report, evidence/chapter snapshot and creation time. Opening a report uses that snapshot without recalculation. Legacy Markdown now supports headings, emphasis, unordered/ordered lists and literal code through escaped React nodes. Identifiers, arithmetic and all old paragraphs remain intact.

## Changed paths

- Protocol/templates/runtime: `services/admin/visual-*.ts`, prompt registries/engine, runtime and configured AI dispatcher.
- Purchase-scope compatibility: `services/backend/service-unlocks.mjs`.
- Request/quote parity: `web/src/lib/managed-prompts.ts`, `api.ts`, `use-paid-price.ts`.
- Native reader and legacy formatting: `web/src/components/kit/{VisualReading,SavedReading,AiText,StructuredReading}`, compatibility readers.
- Tests: visual protocol/runtime/paid integration, legacy formatting, native rendering, paid quote and every real persistent-feature scope; reproducible browser scripts and manual fixtures.
- `services/admin/config.ts` and `config.test.mjs`: Prettier-only cleanup of pre-existing formatting violations required by CI; no configuration behavior changes.

The pre-existing edit in `docs/visual-readings/prompts/numerology.visual-report.v1.txt` was preserved and excluded from the implementation commit. Main-checkout dirty files were not changed.

## Verification

- `npm --prefix web test`: 707 unit/integration tests, 22 library tests, 79 original full prompt roundtrips, cache retention/history and long-question checks passed.
- Typecheck, formatting check, Knip and production Next build passed. ESLint passed with 20 existing warnings outside this feature.
- `wrangler deploy --dry-run --outdir /tmp/astrox-visual-worker-bundle` and Pages Functions build compiled successfully; neither command deploys.
- Browser QA: 320/375/800px, all four chapters/details, no horizontal overflow or clipped controls, keyboard, rapid choices, idle animation cleanup, reduced motion, document-hide event, leaving the view, React unmount and reopening the cache without another AI request. No page errors. Evidence: `/tmp/astrox-visual-integration-qa/result.json` and screenshots.
- The old-format reproduction suite was independently authored in an isolated test worktree, failed before implementation (20 failures), then passed after the safe-renderer fix. That test worktree was archived after integration.
- `git diff --check` and per-worktree CodeGraph sync passed.

Run browser QA with a local server:

```bash
npm --prefix web run dev -- --port 3167
node web/scripts/visual-reading-qa.mjs
```

It uses installed Chrome by default and accepts `PLAYWRIGHT_MODULE`, `BASE_URL` and `QA_OUT` overrides. APIs/provider responses are stubbed and manually authored; calculators, request descriptors, cache and React reader are real. This proves local wiring and interaction, not actual-provider output quality, physical-device frame rate, Admin publication or deployed behavior.

## Release boundary

No production deployment, D1 migration, Admin publication or main merge is included. A release owner must deploy Worker and Pages from the same verified commit, then check published settings, provider token budgets/real output conformance, authenticated quotes and production API/routes. Existing code and prompt versions provide the rollback boundary. Keep original purchased results on their legacy renderer.
