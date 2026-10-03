# Palm buttons and website polish plan

Owner: Codex root. Branch: codex/palm-buttons-polish. Base: 1f007487c3a0d82e813dd405cffa48a00847b286.

## Authorized design

User requests icon-led compact labels in the just-released Palm flow, followed by research into polishing the entire website. Use the existing AstroX line style: 18px SVG, 1.55px stroke, 12px labels. Retain action names, 44–48px tap areas, prices, disabled/pressed states, focus outlines and VI/EN. Preserve capture, consent, AI, history, cancellation, auth and pricing behavior. Localize icons to Palm; do not modify shared Btn or navigation.

## Steps

1. Create PalmActionLabel with decorative SVG and visible wrapped labels. Update PalmReader/PalmCamera capture, upload, retake, change, remove, zoom, save, other-hand, follow-up, cancel, retry, torch, close and expert actions. Add compact alignment styles in Palm.module.css.
2. Run existing Palm UI/camera regressions, typecheck, targeted lint, build and diff checks. Inspect desktop/mobile VI/EN, result actions and focus. Cosmetic changes need rendered checks, not implementation-mirroring tests.
3. Audit representative public VI/EN routes plus shared source styles and gated screen source. Save observations/screenshots. Write docs/design/2026-10-03-website-polish-audit.md with prioritized batches and acceptance criteria. Research does not imply implementing a broad redesign.
4. Sync CodeGraph, commit verified changes and record handoff/release evidence. Release only verified SHA; record CI, both remotes, Worker/Pages and custom-domain checks. Guest evidence does not certify authenticated, paid or physical-device flows.

Scope: PalmReader.tsx, PalmCamera.tsx, Palm.module.css, new PalmActionLabel.tsx, this plan, audit and QA report. Integration/release owner: Codex root. No backend, pricing, database or navigation changes.
