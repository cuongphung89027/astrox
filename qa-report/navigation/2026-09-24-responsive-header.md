# Responsive navigation — 2026-09-24

## Cause and fix
The desktop nav rendered at 1024px, but its icons used `hidden xl:block` (1280px). A second CSS rule compressed all links to 13.5px / 7px padding through 1365px. The result was a cramped, text-only laptop header.

- Below 1024px: existing mobile header and bottom dock retained.
- 1024–1279px: all 8 icons above labels, 56px hit areas, distributed spacing.
- 1280–1439px: inline icons/labels, 44px minimum hit height, 6px gaps plus link padding.
- 1440px and wider: wider 1440px rail, 15px labels, 10px gaps plus link padding.
- Existing active route underline retained; explicit 2px keyboard focus ring added.

## Browser evidence
Local Next development app, Chromium in-app browser, signed-in localhost preview with 1,000 Point chip. No production profile or balance mutations.

| Viewport | Expected navigation | Result |
|---|---|---|
| 320×740 | Mobile dock | PASS |
| 360×800 | Mobile dock | PASS |
| 390×844 | Mobile dock | PASS |
| 430×932 | Mobile dock | PASS |
| 600×900 | Mobile/tablet dock | PASS |
| 768×1024 | Tablet dock | PASS |
| 820×1180 | Tablet dock | PASS |
| 1023×768 | Tablet dock | PASS |
| 1024×768 | Icons above text | PASS |
| 1100×800 | Icons above text | PASS |
| 1242×800 | Icons above text | PASS |
| 1279×900 | Icons above text | PASS |
| 1280×800 | Inline icons | PASS |
| 1366×768 | Inline icons | PASS |
| 1440×900 | Wide desktop | PASS |
| 1536×960 | Wide desktop | PASS |
| 1920×1080 | Wide desktop | PASS |

Checks: full-page horizontal overflow absent at all 17 sizes; all eight desktop icons visible; link boxes stay within header; no collision with logo or wallet/account actions; exactly one current nav destination. Screenshots inspected at 1024, 1242, 1280, 1440 and 390 widths.

Additional Cung Hoàng Đạo long-title checks at 320, 360, 390, 768, 820, 1023 widths: rendered text does not overlap logo/actions or escape header. Mobile discovery opens and Escape closes it. Desktop Tab navigation reaches Cung Hoàng Đạo with visible solid 2px focus outline.

Scope: header/dock layout and navigation only; this does not certify every page's content or other browser engines. Dimensions are CSS viewport sizes, not physical device emulation. No CLS measurement taken.
