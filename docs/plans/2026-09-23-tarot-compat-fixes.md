# Tarot journal and inclusive compatibility implementation plan

**Goal:** Fix missing Tarot journal readings and restore a responsive compatibility form supporting same-gender couples equally.
**Architecture:** Reconcile current-profile AI cache with scoped Tarot journal entries in one shared read model. Preserve legacy text without inventing card metadata, preserve other profiles, and record dismissals so deleted readings do not reappear. Reuse existing compatibility visual tokens and reading renderer. Add inclusive guidance at server prompt rendering so published templates also receive it.
**Tech Stack:** Next.js 16.3.5, React, CSS modules, localStorage, node:test, Playwright.

User approved the recommendations in the preceding investigation. Implement in current checkout, preserving existing work. No production publish requested.

1. Add failing tests for new Tarot readings, legacy cache recovery, profile isolation, deletion, and repeated saves. Add prompt tests for all gender pairs and published overrides.
2. Update `web/src/lib/tarot-history.ts`, shared count hook, Dashboard, TarotClient and TarotHistory. Ensure successful AI calls save the journal, capture originating profile, and recovered text can be read without provider calls.
3. Style CompatClient mode selector and original form in Compat.module.css. Add neutral partner placeholder, inclusive copy, required inputs, mobile layout, loader/error/result states; prevent stale async results after inputs change.
4. Add inclusive compatibility instruction in `services/admin/prompt-engine.ts` for configured prompts, plus client prompt composition for fallback. Keep existing cache readable.
5. Run regression tests, relevant lint, build and browser checks at 360/390/1440 widths. Mock all provider/network responses; never charge real points. Record residual pre-existing errors and deployment status.

## Approved visual iteration: two meeting orbits
User approved the proposed direction after reviewing the initial form. Replace the default Tử Vi form with an emerald celestial stage containing two equally weighted, gender-neutral identity buttons side by side at mobile sizes. Edit partner information in an accessible modal/bottom sheet, using saved drafts so cancel preserves previous information. Show restrained orbit convergence during loading, honoring reduced motion. Keep same-gender support, existing cache keys and profile association. Present reading in three clear parts. Verify editing/cancel/reopen, all gender pairs, loading/error/retry/cache-hit, guest profile entry, keyboard Escape and mobile overflow. Preserve Tarot fixes and western method.

## Approved iteration: minimalist, refined, motion-rich
User rejected the heavy emerald/orbit concept. Replace it with an unboxed cream composition: quiet heading, large paired names, restrained copper connecting line, minimal method tabs. Add staggered entrances, name transitions on save, responsive hover/press, animated dialog entrance/exit and backdrop, loading-line animation, and staggered result reveal. Respect OS/app reduced-motion settings; preserve keyboard focus, cancellation, cache and same-gender behavior. No new dependencies or production deployment.
