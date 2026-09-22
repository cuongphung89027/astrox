# Tử Vi redesign implementation plan

Goal: Redesign the existing Tử Vi screen with the approved green/cream glass language and twelve Vietnamese zodiac animals.
Architecture: Preserve calculation, permissions and saved-profile logic. Scope presentation in a CSS module; reuse ChartBoard, TopicsPanel and PeriodPanel. Native dialog offers a wider chart view.
Tech stack: Next.js 16, React, CSS Modules.

1. Replace stacked headers with an editorial introduction and a twelve-animal artwork strip.
2. Create a desktop input sidebar and chart workspace; stack at tablet/mobile widths. Refine form styling with green selections.
3. Add wide chart dialog and a compact two-tab analysis section; preserve panel state and gates.
4. Verify TypeScript, responsive bounds, form-generated chart, tabs and dialog close behavior with Playwright.
