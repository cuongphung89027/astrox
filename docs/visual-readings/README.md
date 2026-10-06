# Visual reading draft package

Status: the approved design is integrated locally on `codex/visual-reading-report`. Admin publication, real-provider conformance and production deployment are separate release checks. The files in this directory preserve the earlier design draft; they are not the production validator.

The design spec is `../superpowers/specs/2026-10-06-visual-readings-design.md`.

## Files

- `report.schema.json`: schema of AI content, not a source of chart numbers.
- `example-input.json`: synthetic request, fixed chapter recipe, calculator-derived facts.
- `example-report.json`: manually authored content to evaluate the layout; not an AI/provider benchmark.
- `prompts/common-contract.txt`: common content and evidence rules.
- `prompts/system-format.v1.txt`: server-selected format adapter; the default system currently asks for Markdown.
- `prompts/module-guidance.json`: module-specific scope and rules.
- `prompts/template-drafts.json`: five proposed template descriptors.
- `prompts/*.visual-report.v1.txt`: readable prompt drafts.
- `check-drafts.cjs`: schema, evidence, scope, budget and template-variable checks.

Template variables follow the existing indexed syntax: `v0=requestAndChapterPlan`, `v1=trustedFacts`, `v2=taskText`. Register versioned descriptors through the existing engine after design approval; do not replace the immutable original prompt registry.

Run checks in a checkout with web dependencies installed:

```bash
node docs/visual-readings/check-drafts.cjs
```

For this isolated documentation checkout, use the existing dependency installation without copying builds or credentials:

```bash
ASTROX_DEPS_ROOT='/Users/Thsonjpg/Documents/PROJECT VUI VUI/astrox/web' node docs/visual-readings/check-drafts.cjs
```

The fixture passes the JSON schema and a 430–650-word budget. Negative cases cover unknown visual types, AI chart percentages, numeric/foreign/repeated qualitative axes, foreign facts, another leaf service, wrong locale and markup.

The runtime contract is `services/admin/visual-reading.ts`, with registered versions in `services/admin/visual-prompts.ts`. New requests target 900–1500 substantive words and require detail, evidence rationale, hypothetical example, concrete action and plain-language terms. The saved envelope also includes an immutable evidence/chapter snapshot. Legacy reads stay readable without regeneration. Real prompt round-trip, scope/locale/snapshot/paid completion-refund and safe Markdown tests are included in the integration branch. A valid fixture does not prove model output conformance; published revision and real requests need separate verification.
