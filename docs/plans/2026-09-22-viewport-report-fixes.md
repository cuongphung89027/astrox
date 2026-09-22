# Verify and fix viewport report

Scope: verify D2/D6 at the actual scroll endpoint, inspect the Mùi source asset and its rendered size, fix mobile title truncation, contain Tarot artwork by its container width, increase chart/eyebrow readability, remeasure seeded CLS. Keep development overlays and intentional desktop gutters unchanged.

Changes: shared safe-area spacing if needed; AppShell title; Dashboard zodiac presentation; Tarot container sizing and disabled navigation contrast; ChartBoard small-screen typography; four modules' reported eyebrow labels. Improve QA with seeded profile and /hoso coverage. Verify targeted boundaries, full viewport sweep, typecheck and loading regressions; record unverified findings rather than treating screenshots as proof of bottom clipping.
