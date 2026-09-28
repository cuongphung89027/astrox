import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/[[path]].js';
import { entryLocale, cookieLocale } from '../../functions/lib/locale-routing.js';

const htmlAsset = '<!DOCTYPE html><html lang="vi"><head></head><body><script>1</script></body></html>';

/** node:test has no Workers runtime: mirror the routes.test.mjs HTMLRewriter stub. */
globalThis.HTMLRewriter = class {
  on() {
    return this;
  }
  transform(res) {
    const csp = res.headers.get('content-security-policy') || '';
    const nonce = (csp.match(/nonce-([A-Za-z0-9+/=]+)/) || [])[1];
    if (!nonce) return res;
    return res.text().then(
      t =>
        new Response(t.replace(/<script>/g, `<script nonce="${nonce}">`), {
          status: res.status,
          headers: res.headers,
        }),
    );
  }
};

function makeEnv({ routing = '1', html = htmlAsset } = {}) {
  return {
    AX_EN_ROUTING: routing,
    ASSETS: { fetch: async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }) },
  };
}
function req(path, { method = 'GET', country, cookie, acceptLanguage } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (acceptLanguage) headers['accept-language'] = acceptLanguage;
  const request = new Request(`https://theastrox.space${path}`, { method, headers });
  if (country) Object.defineProperty(request, 'cf', { value: { country } });
  return request;
}

test('saved choice wins over country', () => {
  assert.equal(entryLocale({ saved: 'vi', country: 'US', acceptLanguage: 'en-US' }), 'vi');
  assert.equal(entryLocale({ saved: 'en', country: 'VN', acceptLanguage: 'vi' }), 'en');
});

test('country maps VN to vi and US to en when nothing is saved', () => {
  assert.equal(entryLocale({ saved: '', country: 'VN' }), 'vi');
  assert.equal(entryLocale({ saved: '', country: 'US' }), 'en');
});

test('unknown country falls back to browser language, then English', () => {
  assert.equal(entryLocale({ saved: '', country: '', acceptLanguage: 'vi,en;q=0.8' }), 'vi');
  assert.equal(entryLocale({ saved: '', country: '', acceptLanguage: 'en-GB,en;q=0.9,vi;q=0.3' }), 'en');
  assert.equal(entryLocale({ saved: '', country: '', acceptLanguage: 'fr-FR,fr;q=0.9' }), 'en');
  assert.equal(entryLocale({ saved: '', country: '' }), 'en');
});

test('accept-language ranks by quality, not by position', () => {
  assert.equal(entryLocale({ saved: '', country: 'DE', acceptLanguage: 'de;q=0.9,en;q=0.4,vi;q=0.8' }), 'vi');
});

test('axlang cookie parser accepts only vi|en, ignores everything else', () => {
  assert.equal(cookieLocale('axlang=en'), 'en');
  assert.equal(cookieLocale('other=1; axlang=vi'), 'vi');
  assert.equal(cookieLocale('axlang=fr'), '');
  assert.equal(cookieLocale('axlang=EN'), '');
  assert.equal(cookieLocale(''), '');
  assert.equal(cookieLocale(undefined), '');
});

test('root redirect only fires for GET/HEAD / with routing enabled', async () => {
  const env = makeEnv();
  const redirect = await onRequest({ request: req('/', { country: 'US' }), env });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), '/en');
  assert.equal(redirect.headers.get('cache-control'), 'private, no-store');

  const head = await onRequest({ request: req('/', { method: 'HEAD', country: 'US' }), env });
  assert.equal(head.status, 302);

  const post = await onRequest({ request: req('/', { method: 'POST', country: 'US' }), env });
  assert.equal(post.status, 200);
});

test('root keeps query string when redirecting and never loops for vi', async () => {
  const env = makeEnv();
  const r = await onRequest({ request: req('/?utm=mail', { country: 'US' }), env });
  assert.equal(r.headers.get('location'), '/en?utm=mail');
  const vi = await onRequest({ request: req('/?utm=mail', { country: 'VN' }), env });
  assert.equal(vi.status, 200);
});

test('deep links, /en, assets and API paths are never redirected', async () => {
  const env = makeEnv();
  for (const path of [
    '/tuvi',
    '/tarot?x=1',
    '/en',
    '/en/zi-wei',
    '/hoso',
    '/_next/static/app.js',
    '/api/site-config',
    '/api/lemon/webhook',
  ]) {
    const res = await onRequest({ request: req(path, { country: 'US' }), env });
    assert.equal(res.status, 200, path);
  }
});

test('two visitors from different countries do not share redirect decisions', async () => {
  const env = makeEnv();
  const us = await onRequest({ request: req('/', { country: 'US' }), env });
  const vn = await onRequest({ request: req('/', { country: 'VN' }), env });
  assert.equal(us.status, 302);
  assert.equal(vn.status, 200);
  assert.equal(vn.headers.get('cache-control'), 'private, no-store, no-transform');
});

test('CSP nonce injection still works alongside locale routing', async () => {
  const env = makeEnv();
  const res = await onRequest({ request: req('/', { country: 'VN' }), env });
  const body = await res.text();
  assert.match(body, /<script nonce="[A-Za-z0-9+/=]{24,}">/);
  assert.match(res.headers.get('content-security-policy') || '', /^object-src 'none'/);
});

test('routing kill switch restores current behavior: US / serves Vietnamese home', async () => {
  const env = makeEnv({ routing: '0' });
  const res = await onRequest({ request: req('/', { country: 'US' }), env });
  assert.equal(res.status, 200);
});

test('non-HTML responses pass through untouched', async () => {
  const env = {
    AX_EN_ROUTING: '1',
    ASSETS: { fetch: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }) },
  };
  const res = await onRequest({ request: req('/', { country: 'US' }), env });
  assert.equal(res.status, 302); // root still redirects before asset fetch
  const deep = await onRequest({ request: req('/api/site-config', { country: 'US' }), env });
  assert.equal(deep.status, 200);
  assert.equal(deep.headers.get('content-security-policy'), null);
});
