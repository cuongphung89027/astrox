# Rewards launch implementation plan

Goal: complete the already specified reward rules using the authoritative wallet, preserve existing reward amounts, and connect rewarded ads only with an actual configured provider.
Architecture: Cloudflare Worker owns authenticated claims, D1 stores atomic event receipts and wallet credits; the Next client reads server summaries. Keep existing green/cream wallet design. No client-submitted point amounts or identities determine credits.

1. Reproduce concurrent daily claims, changed referrer replay, foreign-origin claims, historical topup replay and failed payment eligibility in backend integration tests.
2. Add immutable reward events/claims with configuration snapshots. Make attribution/credits atomic and first-payment eligibility based on verified settled ledger rows. Recover interrupted new-account attribution through a durable pending event.
3. Update wallet UI: accurate milestone progress and rules, safe copy/share link, refresh balance/history only after confirmed credits; distinguish unavailable/error/claimed states.
4. Ads: inspect provider availability. Google rewarded web uses GPT callbacks, not SSV; never label its callback cryptographically verified. Keep delivery off without genuine publisher configuration. Implement sessions, one-time credit, per-user/day quota, cooldown, expiry and explicit opt-in; document residual browser callback spoofing risk and setup prerequisites.
5. Test tampering/replay/concurrency, browser wallet interactions, cancellation/no-fill/network failure and configuration switches. Run full suite, lint/build and bundle checks.
6. Deploy additive schema and code, then activate only the verified available features by publishing a narrowly scoped config revision that preserves unrelated draft edits. Verify live release/config/guest guards. Report real-provider gaps honestly.

Existing approved amounts: 2 daily; milestones day 3/7/10 user 3/5/10 and inviter 2/3/5, each milestone once lifetime; registration 5 each; first paid topup inviter 10, user 0; referrals unlimited. Ads proposal follows saved config: 5 points, 5/day, 90-second cooldown, 10-minute session. Network/ad unit currently absent; user asked which provider is available.
