# Temporary full-access browser fallback

Operator explicitly requested browser verification with no feature restrictions after being informed that browser-supplied IDs can be forged. This supersedes the previous recommendation to keep fallback disabled. This is a temporary security exception, NOT verified server identity.

## Behavior
- Server still exchanges OAuth code with PKCE and checks state/cookie first.
- Server profile verification is attempted first. Only provider error -501 enables the alternate flow, and only when ZALO_BROWSER_FALLBACK_ENABLED=true.
- Browser fetches Zalo profile, then submits its ID/profile to the API. Normal account mapping, session, history, rewards and Point access follow.
- Existing retired /complete route and old pending-token IDs remain unsupported.

## Mitigations and limits
- Independent random HttpOnly/Secure/SameSite=Lax cookie binds the finish page and POST to the initiating browser.
- Pending credential payload encrypted with AES-GCM under a purpose-separated key derived from SESSION_SECRET. Token is never in an AstroX URL or localStorage; it must be visible to the initiating browser to call Zalo. Zalo request uses query token as the prior working browser flow did; no-referrer, no-store and no third-party scripts reduce unintended disclosure.
- 3-minute expiry, atomic consume, random proof, strict same-origin POST, bounded request size, numeric ID validation, nonce CSP, no framing, no-referrer.
- Cleanup on creation and five-minute cron removes expired pending credentials.
- These measures do NOT stop a malicious owner of a legitimate OAuth/browser flow from submitting another Zalo ID. Existing account/history/wallet impersonation remains possible. Do not describe this release as secure identity verification.

## Validation
- 192 backend/admin/reward/frontend tests pass; Worker dry run succeeds.
- Initial 4 new cases failed on old implementation (fallback absent), then passed.
- Coverage: full session creation, existing-account/wallet continuity, missing/wrong cookie, cross-origin POST, wrong proof, expired session, malformed ID, replay, concurrent double-submit, encrypted storage and -501/feature-flag gating.
- Production OAuth success still requires real user sign-in. No real payment or user consent submitted by agent.

## Disable / permanent repair
Deploy with ZALO_BROWSER_FALLBACK_ENABLED=false to immediately disable the alternate flow. A Vietnam-hosted trusted verifier can replace browser identity trust. Disabling alone does not revoke sessions previously issued using this fallback.
