# Home square card QA

Owner: Codex root. Branch: codex/home-square-layout. Base: 689ad8783df42d4e8ba841c04fd9e60603a663e7.

## Change
Two daily utilities use equal border-box 1:1 tiles, capped to a 480px pair. Desktop groups these and Tarot on the left, original fortune/chart on the right. Mobile stacks the original cards below the pair. Guest quick tools and profile prompt remain present. Original recent-reading conditional and every quick-tool entry are preserved. Compact visible labels retain complete accessible names; reward/auth/API semantics are unchanged.

## Verification
- Focused home/reward/dashboard: 17/17 passed.
- Full suite: 636 unit and 22 library tests passed; 79 rendered prompt checks passed.
- TypeScript passed. ESLint: zero errors, 20 existing warnings. Knip and service/function format checks passed.
- Browser, localhost fictional profile: Vietnamese and English at 320, 390, 768, 1024, 1440px. Both tiles have equal width/height: 138, 173, 234, 186.81 and 225.98px. No horizontal or tile scroll overflow. Calendar solar/lunar date and compact actions remain visible at 320px; secondary metadata is hidden there to avoid overlapping text.
- Original personal fortune, chart facts, Tarot journal and quick tools verified with a fictional local profile. The existing source preserves recent readings; no real purchased reading was created.
- Browser console: no errors in final local tab.
- Screenshots: local visualizations/home-square-layout/vi-profile-* and en-profile-*; no real personal data or account changes.

## Limits
Local profile is a fictional preview fixture, not authenticated production evidence. Server reward and failure states are covered by existing tests; no real reward was claimed, payment performed or paid AI reading created. Actual guest preview and production route checks are recorded separately with release IDs after CI/deploy.
