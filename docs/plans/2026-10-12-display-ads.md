# Display advertising design and implementation

Owner: Codex root, integration/release owner. Base f4f4e0e. Scope: isolated display component, home Dashboard and VI/EN calendar pages. Rewarded flow unchanged.

Direction: AstroX cream surfaces, quiet brown border, existing typography, rounded frame, no motion. One horizontal responsive slot after home discovery; one after calendar content. Label always identifies advertising. No ads on paid reading surfaces, profile, admin, payment or terms. No automatic placement, overlays, refresh or sticky ads. Real advertiser creative stays untouched.

Publisher ca-pub-5916355239247970; display unit 8989714444 created in Google AdSense. Existing Ad Manager rewarded flow is independent.

1. Test eligible paths before implementation.
2. Implement lazy single SDK, explicit slots, unfilled/error collapse and stable reserved size. Keep serving disabled until approval and CMP configuration.
3. Verify desktop/mobile with mocked provider, blocked SDK and unfilled inventory; check no placement on private routes.
4. Run typecheck/lint/build, sync CodeGraph and release. Production activation needs NEXT_PUBLIC_DISPLAY_ADS_ENABLED=true at build time after Google approval and consent setup.

Revenue: prioritize viewable intentional placements; no guaranteed earnings. Measure page RPM, filled impressions and engagement before adding density. Rewarded points remain configured through existing Admin settings; do not invent an Ad Manager network or unit ID.
