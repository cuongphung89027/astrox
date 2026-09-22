# Asymmetric Feature Overview Implementation Plan

**Goal:** Replace everything below the homepage card carousel with six feature introductions in an asymmetric composition approved by the user.

**Architecture:** A presentational FeatureOverview component with a scoped CSS module, existing decorative ModuleIllustration artwork, and semantic links. The shared shell hides its old footer only on the homepage. Existing hero and carousel remain intact.

**Tech Stack:** Next.js 16.3.5, React, TypeScript, CSS Modules, Playwright.

## Approved design
- Cream, forest green and muted gold continue the first two sections, using the existing display and body fonts.
- Desktop: twelve-column mosaic. Tử Vi spans five columns and two rows; Tarot spans seven columns; Cung Hoàng Đạo/Kinh Dịch fill the middle-right row at four/three columns; Bát Tự and Thần Số Học finish at five/seven columns. Reading order: Tử Vi, Tarot, Cung Hoàng Đạo, Kinh Dịch, Bát Tự, Thần Số Học.
- Tablet: four-column composition with featured cards spanning the full width and small cards paired.
- Phone: a single reading column with different internal compositions and illustration sizes; no horizontal carousel or hidden descriptions.
- Each tile contains its tool name, a short useful description, decorative art and one keyboard-accessible navigation link.
- No new claims of predictive accuracy, fabricated personal results, or duplicated final CTA.

## Implementation
1. Create web/src/components/home/FeatureOverview.tsx and FeatureOverview.module.css. Use existing illustration artwork, custom layout, consistent type, visible focus styles and reduced-motion support.
2. Replace trailing sections in web/src/app/page.tsx; remove their now-unused imports and zodiac data.
3. Wrap the existing footer in web/src/components/shell/AppShell.tsx with !isHome; other routes retain their footer.
4. Check six destinations, old content removal, card/text bounds, keyboard navigation and mobile/tablet/desktop layouts in Playwright. Inspect rendered screenshots.
5. Run scoped ESLint, TypeScript/build checks as appropriate and the existing home visual and viewport QA suites. Preserve all unrelated working-tree changes.
