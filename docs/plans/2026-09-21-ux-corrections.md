# AstroX UX corrections implementation plan

**Goal:** Address the 17 user-requested corrections on the existing Next.js app.
**Architecture:** Keep the existing pages and shared components. Restore source content from the legacy index.html. Use shared province and earthly-branch data; change only presentation and the requested ritual behavior.
**Tech Stack:** Next.js 16, React 19, CSS modules, Three.js, Playwright.

1. Restore the legacy Tử Vi icon in FeatureIcon and unify navigation accent green.
2. Fix ProfileModal field sizing, remove exact time input, use the legacy 63-province list in profile and chart forms. Retain existing saved place values for compatibility.
3. Make Tarot draw/reveal automatically after start; cancel timers on reset/unmount; preserve all spread positions. Show the original descriptions, remove Vajrayana, show English card names, and play Raccoon video with sound without controls (retry on user gesture if browser blocks autoplay).
4. Correct TubeModel trajectory: vertical extraction within mouth, then outward flight only after the entire stick clears the rim. Respect reduced motion.
5. Map animal labels to Vietnamese earthly branches, reuse zodiac assets in chart palaces and Bát Tự earthly-branch cells. Keep chart stars legible above low-opacity art.
6. Justify reading paragraphs centrally, replace user-facing AI copy with AstroX and bốn trụ with tứ trụ.
7. Verify behavior with Playwright regression tests (baseline before fixes), typecheck, lint, production build, and mobile/desktop screenshots. Preserve pre-existing work; no deployment requested.
