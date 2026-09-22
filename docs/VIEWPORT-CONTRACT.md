# AstroX Viewport Contract (redesign-v5)

**Scope:** every public route. **Gate:** `npm run qa:viewport` + `node scripts/home-visual-qa.mjs`
must report 0 issues. Always test via `http://localhost:3311` (not `127.0.0.1` —
Next 16 `allowedDevOrigins` blocks the other host and client hydration dies).

## Canonical 30 viewports

320×568, 360×640, 360×780, 360×800, 375×667, 375×812, 384×832, 385×854,
390×844, 393×852, 393×873, 412×915, 414×736, 414×896, 430×932, 600×960,
768×1024, 800×1280, 810×1080, 820×1180, 834×1194, 1024×1366, 1280×720,
1280×800, 1366×768, 1440×900, 1536×864, 1600×900, 1920×1080, 2560×1440.

## Failure modes (none allowed)

Horizontal overflow · clipped essential content · overlapping interactives ·
broken nav/dock · unreadable body type · floating UI off-canvas · broken
animation/CLS > 0.1 · hero/CTA stuck at opacity 0.

Every card, including rotated background cards, must remain fully inside the
stage at rest, during selection transitions, and while dragging. Clipping or
checking only document scrollWidth is not a valid substitute for fitting the fan.
On desktop the whole fan must cover at least 80% of the available stage width.

## Layout bands — change composition, never mechanical scale

The carousel picker has been removed. Navigation uses previous/next arrows,
keyboard arrows and swipe. Historical picker references below are superseded.
Mobile feature overview uses a full-width Tử Vi card, a tall Tarot tile beside
two smaller tiles, then two distinct horizontal tiles.

| Band | Width | Composition |
|------|-------|-------------|
| XS | ≤359 | One hero card (container-sized), micro-peeks, **2×3 short-name picker**, icon-tighter controls |
| S phone | 360–429 | Classic fan (container-sized), **3×2 short names** (Hoàng Đạo / Thần Số…) |
| M phablet | 430–599 | Roomier card (container-sized), 3×2 short names |
| Tablet | 600–1023 | Numbered **horizontal chip row** (scrollable), container-sized cards, bottom dock stays |
| Desktop | ≥1024 | Full labels + numbers, top nav, hero scroll cue only at scrollY &lt; 64 |

## Module typography and content height

All six cards use a 28px title, 13px description (line-height 1.8), and the
same category/button styles at every viewport. The section heading scales
smoothly from 24px to 42px without breakpoint-specific font overrides.
Cards reserve 390px for full descriptions and the CTA; stage height derives
from card height, top offset, and 48px clearance. Short screens scroll normally
instead of shrinking text or clipping descriptions. Illustration height scales
from 100px to 130px. Width bands control fan angles (2° / 5° / 7°) and the picker.
Card width and spread derive from container width with room reserved for rotation
and a 12px inset on each side. Desktop card widths grow up to 640px. Short screen
height never reduces width. Drag displacement is bounded to the same container.

**CSS gotcha:** never write `--stage-h: min(var(--stage-h), …)` — self-referential
custom properties compute to invalid → `height: 0` → cards clipped away.

## Shell rules

- Topbar fixed `h-16` (64px). `#modules` `scroll-margin-top: 72px`.
- Bottom dock `<lg`: main `pb-28`; deck controls need extra `padding-bottom` (88–96px) on phone bands.
- Hero scroll cue: desktop only, fades out when `scrollY >= 64` so it never sits on the topbar when jumping to `#modules`.
- `html, body { overflow-x: clip }`; `.ax-modules { overflow-x: clip }`.
- `useInView` has a 1.2s fail-safe so reveal text cannot stay invisible if IO/hydration fails.

## Scripts

```bash
cd web
npm run dev -- -p 3311
npm run qa:viewport                 # 30 vp × 11 routes → qa-report/viewport-report.json
node scripts/home-visual-qa.mjs     # home shots + metrics → qa-report/home-visual/
node scripts/deck-bounds-qa.mjs     # all cards + animation/drag bounds, 280–3440px
```

Artifacts: `web/qa-report/home-visual/<WxH>/{top,modules,bottom}.png`.

## Do / Don’t

**Do:** re-run both QA scripts after any home/shell/deck change; design per band;
short picker labels on phone; keep every card fully inside the stage.

**Don’t:** zoom the whole UI with `vw` type alone; leave hero text gated only on
IntersectionObserver; test only media queries without screenshots; QA on `127.0.0.1`.
