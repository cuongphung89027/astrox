# AstroX motion refinement

Implement the six requested revisions in the existing Next.js interface.

- Shared Tử Vi icon: crescent and small guiding star, consistent line weight.
- Header: 80% background alpha at every scroll position, existing blur retained.
- Kinh Dịch: layered SVG lacquer vessel, gold collars, bamboo sticks, soft shadow and halo. Drawn stick lifts vertically through the mouth before travelling outward. Avoid WebGL dependency for this illustration.
- Tarot: measure the fan and each destination slot; animate lift, mid-air turn, fall and settling over 1300ms. Stagger the deal, preserve caption space, clean up animation and timers on reset/unmount. Keep reduced-motion behavior.
- Shared loading captions: per-module Vietnamese action phrases cycling every 2800ms, soft fade/blur/vertical transition, subtle glimmer. AstroX branding. Stable screen-reader status and reduced-motion support.
- Standardize all module names to Cung Hoàng Đạo.

Validation: TypeScript, build, existing 14 UX regressions; motion QA for header alpha, flight keyframes, rotating copy, SVG tube and cancellation; inspect mobile and desktop screenshots.
