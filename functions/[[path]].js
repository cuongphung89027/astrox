/** Preserve each exported Next route. Pages use per-response script nonces
 * so Google Publisher Tag can load its changing dependencies with strict CSP. */
export async function onRequest({ request, env }) {
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
