# AstroX OG refresh — approved design

Owner: Codex root. Verified remote main and owned audit checkout base: 7f61e55fc8a10da890316a4cfbd14a290a61a3dd. User approved this design and sample on 2026-10-04. Implementation checkout: /Users/Thsonjpg/.codex/worktrees/og-images/astrox; branch codex/og-images.

## Direction

Recommended: editorial celestial sculptures, rich dark jade #244d40, warm cream #fbf6ec, strong restrained gold #f2a912; large Beautique Display titles, actual AstroX logo, minimal wording. One sculptural illustration per subject with orbit/engraving motif tying the collection together. Clear contrast at small link-preview sizes. The sample home-concept.png is generated using built-in ImageGen with current website and original logo as reference. Its typography/logo treatment is conceptual; the final collection must use the actual project logo and font files.

Alternative 1: mostly flat cream and fine gold engraved diagrams — quieter and easier to keep very sparse, less sculptural impact.
Alternative 2: mostly dark jade with gold illustrations — stronger dark visual, less of the website’s cream surface identity.

## Coverage

Rebuild all 7 existing families: home, Zi Wei, astrology, I Ching, Ba Zi, numerology, Tarot. Add compatibility, lunar calendar, palm reading, expert booking, pricing, terms/privacy, and generic profile/wallet. 14 families; 14 Vietnamese and 13 English images = 27, covering 25 canonical public routes plus 2 private profile routes. Expert booking remains Vietnamese-only. Three Vietnamese alias routes use their canonical topic art. Admin uses generic brand art. Profile/Admin retain existing noindex and contain static generic brand content.

## Composition and assets

Final PNG dimensions 1200×630. Cream headline area and jade visual area with generous safe margins. Short localized title and at most one brief supporting line; domain and original logo. No dated lunar-day number or fixed price that will become stale. Each topic gets semantically relevant illustration. Share the illustration between VI/EN while rendering exact localized typography. Persist source art, prompt set and reproducible assembly recipe. Generated concept or final art may be used as source; preserve the original project logo and typography.

Versioned asset paths make new previews distinguishable from the previous cached OG URLs. Existing module-card assets and website styles stay untouched; the old crop-og-cards utility is not rerun.

## Metadata and QA

Update image mapping consistently for Open Graph and Twitter; set absolute image URL, 1200×630 dimensions, localized alt/title/description, locale and canonical page URL. Preserve route/canonical/hreflang/robots behavior and current business content. Verify all 31 rendered page routes plus image requests, test metadata mapping/fallback and ensure no missing local asset. Review every thumbnail/contact sheet, full-size VI/EN typography, logo fidelity, legibility, cropping and byte sizes. Run build/typecheck/lint and relevant tests, verify an exact-commit preview before release.

## Review gate

Approved: user replied “đồng ý” after the sample and linked proposal were presented. Production authorization for this new OG redesign will be resolved after the complete preview is reviewable.
