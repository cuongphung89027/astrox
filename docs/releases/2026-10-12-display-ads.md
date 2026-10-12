# AstroX display ad integration

Owner: Codex root (integration/release). Base f4f4e0e38f6bcc813d67d719ebd00497813619f6.
Paths: display component/CSS, display policy and test, home Dashboard, VI/EN calendar routes, browser QA and design plan.

Created real AdSense display unit 8989714444. One explicit slot follows homepage discovery and one follows calendar content. Cream surface, quiet border, label, 100px mobile/90px desktop reserved creative height. SDK lazy loads near viewport; single request per element; unfilled/blocked units collapse. No auto placement or ad refresh. No rewarded-flow changes.

Serving defaults OFF (NEXT_PUBLIC_DISPLAY_ADS_ENABLED absent). Activation requires Google approval and consent messaging, then build with NEXT_PUBLIC_DISPLAY_ADS_ENABLED=true. Google site currently Getting ready; ads.txt Authorized. Rewarded public config currently disabled with no adUnit, 5 Point and 5/day; an approved Ad Manager unit is still needed.

Validation: eligible-route test red then green; typecheck and build pass; scoped lint 0 errors; mocked provider browser 13 checks including four routes at 390/1440 widths, single SDK request, no overflow, unfilled/blocked collapse and excluded profiles/admin/readings. QA creatives are synthetic, never production ads. Current build verified no ads when disabled.

Rollback: revert display-integration commit or keep serving flag off. No D1/config changes. Worker/Pages release evidence is appended after deployment. Revenue and real inventory fill remain unverified pending provider approval.
