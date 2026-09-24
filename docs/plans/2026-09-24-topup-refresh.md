# Top-up popup implementation plan

1. Replace popup presentation with dark wallet hero and cream package selector, native dialog and fixed action area.
2. Keep packages/prices server-owned; selected package is local until explicit Continue. Apply only verified unchanged promo; lock requests, recover from network failures; clear state on close/account changes.
3. Verify meaningful selection/promo/duplicate-submit behavior plus build/lint, mobile/desktop visual states. Use disposable local harness for visual checks; never create a real payment.
4. Publish frontend and verify deployed bundle/guest visual route as available; record verification limits.
