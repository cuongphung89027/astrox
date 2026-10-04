# AstroX sharing artwork v2

27 static PNGs, 1200 × 630: 14 Vietnamese and 13 English cards. Expert booking remains Vietnamese-only. `catalog.json` maps all 31 page routes, including the three aliases and generic Admin card. Profile/Admin cards are static and their existing noindex rules remain intact.

## Source and brand

- `art/`: selected original, text-free illustrations made using OpenAI built-in ImageGen and the user-approved homepage concept as style reference.
- `prompts.json`: exact prompts and the six-line I Ching correction. Source PNGs are kept unchanged.
- Headlines: the original `web/src/app/fonts/BeautiqueDisplay-Regular.woff2`.
- Supporting type: Be Vietnam Pro Regular, from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/bevietnampro); the accompanying `fonts/OFL.txt` is retained.
- Logo: original `web/public/assets/logo.png`.
- Composition: cream `#fbf6ec`, jade `#244d40`, original warm gold `#c7860a` with bright gold in the illustrations. No website CSS, module-card artwork or business content is changed.

## Rebuild

Install frontend dependencies with `npm --prefix web ci`. The optional artwork compiler also requires Python 3 with `fontTools`, `brotli` and `Pillow` (`python3 -m pip install fonttools brotli pillow`). Set `ASTROX_OG_PYTHON` if a specific Python environment is needed.

```sh
npm --prefix web run build:og
# Focused export while working on an individual layout:
node web/scripts/build-og-images.mjs home palm
```

`text-outline.py` measures and outlines the original font glyphs into SVG geometry. It fails on missing characters and does not use OS font matching/fallback. The Node script composes native vector layout, original logo and unmodified raster art, then uses Sharp to export PNGs. Font paths ensure the serif display font and Vietnamese accents are reproduced regardless of host font configuration. Headline fitting and copy-height checks stop overflow.

Full rebuild also writes `render-metrics.json`, both contact sheets and `/assets/og/v2/gallery.html` (noindex). Focused rebuilds write only selected cards and temporary `partial-render-metrics.json`; remove that temporary report before committing. Website builds consume committed PNGs and do not need Python or call ImageGen.

## Verification

```sh
node --test web/tests/og-metadata.test.mjs
npm --prefix web run build
npm --prefix web run qa:og
node web/scripts/qa-og-export.mjs --base-url=https://YOUR-PREVIEW.pages.dev --report=/tmp/og-preview.json
```

The export verifier checks the actual rendered HTML, OG/Twitter parity, localized titles/alt/locale, canonical/hreflang preservation, profile/Admin noindex, all PNG dimensions and exact file hashes. Optional remote mode checks route responses and deployed asset hashes against the local export. Old `/assets/og/*.png` files stay available for existing share caches and module-card tooling; `crop-og-cards.mjs` is not rerun.
