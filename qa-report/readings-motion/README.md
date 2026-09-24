# Motion polish — 24/09/2026

User direction: stronger, more visible motion; retain cream/green/gold identity.

- Three coins flip, bounce and glint on each real throw; six-line preview forms from bottom up. The throw button sits below the coins so the animation remains visible on mobile.
- Finite ring/hexagram entrance and sheen; result, details, fields and controls have staggered transitions.
- Couples have a decorative joining-orbits emblem, tab feedback, staggered forms/results and clearer full-width birth-hour selection. Form data survives method changes.
- No new dependencies or artificial calculation/AI delays. System reduced-motion and in-app reduced-motion disable these effects.

Validation: 24 domain tests; TypeScript; full lint (0 errors, 26 existing warnings), scoped lint (0 errors), static production build. Browser report alongside this file records final viewport and motion checks. APIs are mocked for UI contracts; no live AI quality or billing claims.

Preview only; this polish has not been deployed. The production reading upgrade remains at commit 8d02932.

## Review corrections

- Replaced six manual button presses with one automatic six-round sequence. Each round has a timed tossing/landing phase; the finished hexagram opens automatically. Stop cancels the outstanding timer and discards the pending sequence. Skip reveals the same precomputed sequence. Reduced-motion reveals immediately.
- Replaced the painted square with a centered transparent SVG aperture (evenodd path); coin labels moved below the discs.
- Restored explicit 30px spacing between method select and question label, independent of removed explanatory paragraphs.
- Checked in the user's in-app browser: measured 30px gap; actual nonidentity 3D transforms on all three coins while tossing; single click reached the final six-line result; Stop returned to 0/6 without an added result; manual six sevens produced Thuần Càn with no moving lines. No live AI calls.
- Domain tests: 15 PASS. TypeScript/scoped ESLint/static build PASS. Earlier 26-checkpoint report predates this automatic-flow change; its source was updated, but the automated browser suite was not rerun for this revision. Direct in-app browser checks above are the current evidence.
