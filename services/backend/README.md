# AstroX production backend

This Worker replaces the dashboard-only source of `astrox-api` while retaining its API domain, D1 database, user IDs, balances, order records and environment credentials. The original deployed source and full D1 backup are stored privately outside Git under `.dev-admin/production`.

## Deployment

Apply `migrations/backend.sql` once (additive tables only). Configure `ADMIN_ENCRYPTION_KEY` with the same value as Pages; preserve existing `SESSION_SECRET`, Zalo and PayOS variables/secrets. Deploy with:

```sh
wrangler deploy --config services/backend/wrangler.jsonc --keep-vars
```

Pages production service bindings:

| Binding | Worker | Named entrypoint |
| --- | --- | --- |
| ASTROX_BACKEND | astrox-api | AdminBackend |
| ASTROX_PAYMENTS | astrox-api | PaymentWebhook |

The default public handler never routes `/internal/*`, including requests spoofing its hostname or headers. Only the named AdminBackend entrypoint provides configuration import, readiness and read-only business records. No shared bearer token is placed in the browser.

In the new Admin, use **Nhập cấu hình backend hiện tại** on an untouched draft, inspect the imported packages/settings, verify provider connectivity, then publish. Import is guarded by revision and unavailable after an edited or published draft. Existing credentials are reported as inherited without revealing their values; encrypted overrides may be entered in Admin.

## Runtime behavior

- Packages, module availability and integration settings use the published Admin revision. Before first publication, existing legacy tables/settings remain authoritative.
- Payment orders persist amount, points, package, config revision and promo reservation before contacting PayOS. Webhooks use the persisted order, not current pricing, and remain enabled when new sales are disabled.
- Signed matching payments credit `zalo_point_accounts`, append `zalo_point_ledger`, and settle the order in one D1 transaction. The old `point_ledger` references a different legacy users table and is preserved untouched.
- The supported webhook remains `https://api.theastrox.space/api/webhooks/payos`; Pages also exposes `/api/payos/webhook` through PaymentWebhook.
- Existing 30-day session signatures continue to validate with the same secret; expiry and active-user checks now apply.
- Zalo uses PKCE and a browser-bound state cookie. Identity is verified against Zalo on the server. The previous browser-supplied identity completion endpoint is retired; in-progress old logins must restart. Provider identity failures fail closed, with no insecure fallback.
- Paid AI and automated rewards are explicitly unsupported and cannot be enabled via Admin. Free AI is not routed through a billing backend merely because top-ups are enabled.

Tests use a schema-only fixture and isolated SQLite; no production rows or secrets. PayOS/Zalo responses are simulated at the external boundary. A real OAuth completion and real payment settlement still require user/provider-side testing.

References: [Cloudflare named entrypoints](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/), [Pages binding configuration](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/edit/), [PayOS webhook contract](https://payos.vn/docs/du-lieu-tra-ve/webhook/).
