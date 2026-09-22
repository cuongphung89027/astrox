# Interactive six-card collection

Goal: Present all six tools as a rotating, layered hand of cards with fine brass frames.
Architecture: Next.js client component with a selected index and pointer gesture tracking. Stable card keys animate between calculated fan positions. Native links open the selected tool; clicking a background card selects it. Previous/next buttons and six named selectors provide keyboard and touch alternatives.
Design: Raised central card, angled side cards, warm paper and jade, double brass outlines, elliptical background guide. Mobile compresses the fan spacing. Reduced motion disables transitions.
Implementation: Replace the static module grid with the interactive deck. Preserve illustrations, route destinations, and copy. Keep vertical touch scrolling and prevent navigation after horizontal drags. No automatic cycling.
Validation: Production build, component ESLint, browser checks at 320/390/768/1440 widths, rotation wrapping, selectors, drag suppression, keyboard navigation, reduced motion, and screenshots.
