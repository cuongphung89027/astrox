/** Preserve each exported Next route. Pages use per-response script nonces
 * so Google Publisher Tag can load its changing dependencies with strict CSP.
 * Locale entry routing (plan Task 04): only GET/HEAD `/` may redirect to /en —
 * deep links, API, webhooks and assets always pass through untouched. Gated by
 * AX_EN_ROUTING so the release owner keeps current behavior while the English
 * edition is not yet published (independent kill switch). */
import { entryLocale, cookieLocale } from './lib/locale-routing.js';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (env.AX_EN_ROUTING === '1' && url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
    const locale = entryLocale({
      saved: cookieLocale(request.headers.get('cookie')),
      country: request.cf?.country,
      acceptLanguage: request.headers.get('accept-language') || '',
    });
    if (locale === 'en') {
      return new Response(null, {
        status: 302,
        headers: { Location: `/en${url.search}`, 'Cache-Control': 'private, no-store' },
      });
    }
  }
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response;
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const headers = new Headers(response.headers);
  // Shared by client-side navigation: /tarot -> /chitay keeps this document CSP.
  // Permit WASM compilation only; JavaScript unsafe-eval remains blocked.
  headers.set(
    'Content-Security-Policy',
    `object-src 'none'; base-uri 'self'; script-src 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-src https:; media-src 'self' blob: https:;`,
  );
  headers.set('Cache-Control', 'private, no-store, no-transform');
  headers.delete('content-length');
  headers.delete('etag');
  const authorize = {
    element(el) {
      el.setAttribute('nonce', nonce);
    },
  };
  return new HTMLRewriter()
    .on('script', authorize)
    .on('link[as="script"]', authorize)
    .on('link[rel="modulepreload"]', authorize)
    .transform(new Response(response.body, { status: response.status, headers }));
}
