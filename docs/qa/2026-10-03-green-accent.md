# Green accent QA

Owner: Codex root. Branch: codex/green-accent. Base: 0788036e497a2f20b60254f772f48bf25ffe31a3.

## Change
Green #246b52 primary buttons, dark green #1d5642 section accents, mint #e1efe7 calendar and light #f4f7f2 global background/browser chrome. Focus, selection, header border and ambient decoration use the new accent. Existing semantic red error/quality-failure/toast/outgoing-wallet colors remain. Calendar and original Tarot surfaces are coordinated with the existing forest-green check-in card. No logic, pricing, route, auth, reward or motion change.

## Verified locally
- 19 focused home/dashboard/check-in tests passed.
- Full suite: 638 unit + 22 library tests; 79 prompt checks passed.
- Typecheck, scoped ESLint, services/functions format check, Knip and final static build passed.
- Actual VI/EN app at 320/390/1440px with existing fictional localhost profile: cards remain equal squares (138/173/225.98px), no tile/horizontal overflow, old fortune/chart/Tarot/tools remain. VI retains 9 tools, EN 8. Guest login button is computed rgb(36,107,82) with white text; keyboard focus is solid green. Guest login dialog/menu work. Final local console errors: none.
- Contrast of primary white text: 6.36:1. Body 10.82:1, secondary 5.54:1, calendar footer against darkest mint 4.77:1. Calculated from final colors, not a blanket site accessibility certification.

Screenshots/measurements/contrast are saved under Codex visualizations/green-accent. Fictional local account screenshots are separate from public guest evidence. No real claim, consent/OAuth, payment or paid AI call was made. PR CI/preview and release evidence will be recorded in the PR description and external release report.
