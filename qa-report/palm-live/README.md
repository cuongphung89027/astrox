# Live palm camera — 2026-09-26

Owner: Codex root (feature and release). Base: 2fd3c1b. Branch: codex/palm-redesign.
Scope: PalmReader, PalmCamera, Palm.module.css, hand-tracker, palm UI/live tests. No backend contracts, prices, migrations or navigation changes.

## Implemented
- Camera detection is required before capture. Fresh ready observation expires after 500ms; missing, distant, tilted or interrupted detection blocks shutter.
- Real MediaPipe landmarks rendered in video pixel coordinates and matching aspect ratio; no stretched overlay across letterboxed preview.
- Live feedback for hand presence, framing and stability; optional stable-hand countdown and retry on detector failure.
- Scanner workspace using existing AstroX typography/cream/green shell, with clear camera controls and mobile capture flow.
- Retains wide-camera preference/manual lens selection, capability-based torch and focus, consent before AI upload.

## Verification
- 383 unit tests passed; 79 prompt render cases passed. Typecheck passed. Scoped lint: zero errors, two existing data-URL img warnings. Production static build: 22 routes.
- CUA Chromium real bundled MediaPipe model + actual PalmCamera fed a 720x1024 canvas MediaStream containing the user's hand screenshot locally. No detector mock. Recognition succeeds; landmarks visually align after aspect correction; removing hand disables capture/removes overlay; restoring hand reacquires; auto capture returns CAPTURED 720x1024.
- This is prerecorded-image video input, not physical camera hardware validation. Original screenshot's incorrect colored creases were baked into the fixture, not produced by this implementation.
- CUA entry inspection at 360x780, 390x844 and 1440x900; no horizontal overflow on mobile and visible primary camera CTA. Desktop split workspace inspected.
- Personal photo and temporary QA route removed before build. No personal photo committed or deployed. Build has no QA route.
- CodeGraph sync and git diff --check passed.

## Limits
Physical phone lens/torch/focus behavior and low-end-device performance need hardware acceptance. MediaPipe landmarks locate the hand; they do not detect palm creases. Unverified AI crease coordinates remain hidden rather than drawing misleading paths. No live paid AI/wallet transaction was made in this test.
