# Connect existing AstroX backend

Goal: reuse the deployed astrox-api Worker and shared D1 without resetting users, balances, orders or provider secrets; make Admin control the actual runtime.

Architecture: retain the public API origin and legacy tables. Import the existing Worker into this repository, add versioned-config adapters, and expose a named internal WorkerEntrypoint exclusively to the Pages service binding. Published Admin configuration becomes authoritative; a guarded one-time import creates the initial draft from live legacy configuration. Credentials remain on the Worker, with encrypted Admin overrides supported. Frontend public settings and module availability consume the same version. Never advertise unsupported paid AI or automated rewards.

Implementation sequence:

1. Back up deployed Worker/settings/version IDs and D1 under ignored, private `.dev-admin/production` (complete before writes). Generate a schema-only fixture without production rows.
2. Add regression tests for legacy import, configuration precedence, secret readiness without disclosure, atomic/idempotent PayOS credit, persisted order snapshots, session expiry and server-verified Zalo identity. Run failing tests before implementing.
3. Import and adapt Worker in `services/backend/`: keep public API paths and database schema; bound bodies/timeouts; authenticated mutations; internal APIs only through a named entrypoint. PayOS orders keep original amounts/points/revisions and webhook handling remains active even when new sales are disabled.
4. Add Admin import/readiness and validation using granular capabilities. Import preserves existing edits by revision comparison, never copies balances or orders, and cannot silently overwrite a published config. Existing environment credentials are marked inherited.
5. Align Pages webhook alias and public module configuration consumers. Preserve existing frontend API contracts. Read Next local docs before changing React code.
6. Run `node --test services/backend/*.test.mjs services/admin/*.test.mjs services/rewards/rules.test.mjs`, TypeScript/build, Worker and Pages dry runs. No real payment transaction in tests.
7. Deploy Worker retaining bindings/vars/secrets, add named Pages service binding, apply additive migrations if needed, import safe initial configuration, deploy main via upstream. Verify public/internal access boundaries, same published revision/packages, unchanged user/balance/order totals, Admin checks and real-domain pages.

Risk boundaries: no fake capabilities, no public internal admin endpoint, no browser-trusted Zalo identity, no non-atomic money updates. Free AI remains independent from top-up enablement. Block paid AI/rewards activation until their actual runtime exists. Existing Cloudflare OAuth authority has been explicitly expanded by the user for Workers, logs and D1.
