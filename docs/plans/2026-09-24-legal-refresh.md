# AstroX legal refresh implementation plan

Approved design: ../superpowers/specs/2026-09-24-legal-design.md

1. Verify current law from official sources; inspect existing terms, consent and support links.
2. Rewrite three documents and identify operator; preserve two-business-day support commitment. Document unresolved disclosures/operational requirements.
3. Build responsive document layout, sticky contents, mobile selector, print CSS and subtle reduced-motion-safe transitions. Keep old anchors.
4. Update consent version, login description, SEO, support address and legacy privacy URL consistently.
5. Run build, lint, relevant existing tests; inspect desktop/mobile navigation and print structure in browser. Check no overflow and no console errors.
6. Publish verified frontend changes under existing production authorization; verify custom-domain content and headers. Report implementation versus remaining operational requirements separately.
