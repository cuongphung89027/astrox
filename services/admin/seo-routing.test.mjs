import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/[[path]].js';

globalThis.HTMLRewriter = class {
  on() {
    return this;
  }
  transform(response) {
    return response;
  }
};
const assets = () => ({
  AX_EN_ROUTING: '0',
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) },
});

test('legacy URLs permanently redirect on GET and HEAD while preserving encoded queries', async () => {
  for (const [from, to] of [
    ['/trangchu', '/'],
    ['/hoangdao', '/cunghoangdao'],
    ['/thanso', '/thansohoc'],
  ]) {
    for (const method of ['GET', 'HEAD']) {
      const response = await onRequest({
        request: new Request(`https://theastrox.space${from}?utm_source=mail&name=a%2Bb`, { method }),
        env: assets(),
      });
      assert.equal(response.status, 301, `${method} ${from}`);
      assert.equal(response.headers.get('location'), `${to}?utm_source=mail&name=a%2Bb`);
      assert.equal(await response.text(), '');
    }
  }
});

test('aliases never redirect writes, similar paths, API calls or canonical deep links', async () => {
  for (const [path, method] of [
    ['/thanso', 'POST'],
    ['/hoangdao', 'PUT'],
    ['/trangchu', 'DELETE'],
    ['/thanso/child', 'GET'],
    ['/api/thanso', 'GET'],
    ['/en/numerology', 'GET'],
    ['/thansohoc', 'GET'],
  ]) {
    const response = await onRequest({
      request: new Request(`https://theastrox.space${path}`, { method }),
      env: assets(),
    });
    assert.equal(response.status, 200, `${method} ${path}`);
    assert.equal(response.headers.get('location'), null);
  }
});

test('Pages HTML duplicates and previews are noindex; the custom production domain stays indexable', async () => {
  for (const host of ['preview.theastrox-a3l.pages.dev', 'theastrox-a3l.pages.dev', 'theastrox.space']) {
    const response = await onRequest({ request: new Request(`https://${host}/en/tarot`), env: assets() });
    assert.equal(response.headers.get('x-robots-tag'), host.endsWith('.pages.dev') ? 'noindex, nofollow' : null);
    assert.match(response.headers.get('content-security-policy'), /script-src 'nonce-/);
  }
});

test('non-HTML assets and missing URLs retain their response status and headers', async () => {
  for (const [status, contentType] of [
    [200, 'application/javascript'],
    [404, 'text/html'],
  ]) {
    const env = {
      ASSETS: { fetch: async () => new Response('asset', { status, headers: { 'content-type': contentType } }) },
    };
    const response = await onRequest({ request: new Request('https://preview.pages.dev/not-an-alias'), env });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('x-robots-tag'), null);
  }
});
