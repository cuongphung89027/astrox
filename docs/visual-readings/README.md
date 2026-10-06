# Visual reading draft package

Status: design and prompt draft only. No runtime template registration, Admin publication or production deployment is included.

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

Before production integration, add real prompt round-trip, cached-reading retention, fact-snapshot provenance, locale and grant/quote/consent coverage. A valid fixture does not prove model output conformance; published revision and real requests need separate verification.
