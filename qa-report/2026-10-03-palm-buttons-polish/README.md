# Palm action icons and site polish research

Owner: Codex root. Branch: codex/palm-buttons-polish. Base: 1f007487c3a0d82e813dd405cffa48a00847b286.

Palm action labels use decorative AstroX-style SVG, 18px icons, 12px text and 44–48px targets. Capture, photo consent, history, follow-up, cancellation and prices retain existing handlers. Shared Btn/navigation, backend and D1 are unchanged. The test formerly rejecting every SVG now permits only decorative icons inside PalmActionLabel; speculative photo overlays remain prohibited.

Fresh verification: 619 unit/integration + 22 library tests, 0 failures; 79 rendered prompt roundtrips; frontend/backend typecheck; full lint (0 errors, 20 existing warnings); Knip; backend/Admin format; touched UI/test Prettier; production build and diff check all passed.

Browser: VI/EN entry and result at desktop/390px, decorative icons and 12px labels visible. Primary/save/new-photo/other-hand/follow-up measured 48px, suggestions 44px; no horizontal overflow in measured result. Result/history used explicitly fictional local readings and a fictional local preview account. No real photo, AI request, payment or charge. Temporary QA route removed before build.

Website audit covers public module/price/profile families in VI/EN mobile and representative desktop, with source review for shared/gated components. See docs/design/2026-10-03-website-polish-audit.md. This is research; broader polish has not been implemented. Pricing leaf services excluded by child-node filtering are recorded for a later change.

Limits: authenticated wallet/payment/Admin, live AI and physical cameras remain unverified. Production release requires approval after review; the automated approval reviewer rejected pushing main because current request did not explicitly authorize publishing.

Evidence folder: /Users/Thsonjpg/.codex/visualizations/2026/10/03/01a0ff65-7874-7550-abcb-1239895f6211/palm-buttons-polish/. Review receipt records commit, CI and screenshots.
