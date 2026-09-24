import test from 'node:test';
import assert from 'node:assert/strict';
import { previewOrigin, rewriteLocalOrigin } from './preview-origin.mjs';
test('preview only accepts one explicitly trusted HTTPS tunnel origin', () => {
  const trusted = previewOrigin('https://astrox-preview.trycloudflare.com');
  assert.equal(rewriteLocalOrigin(trusted, '127.0.0.1:8789', trusted), 'http://127.0.0.1:8789');
  for (const origin of [
    'https://evil.trycloudflare.com',
    'https://astrox-preview.trycloudflare.com.evil.com',
    'null',
    null,
  ])
    assert.equal(rewriteLocalOrigin(origin, '127.0.0.1:8789', trusted), origin);
  for (const value of [
    'https://*.trycloudflare.com',
    'http://astrox-preview.trycloudflare.com',
    'https://astrox-preview.trycloudflare.com/path',
  ])
    assert.throws(() => previewOrigin(value));
});
test('preview is off by default while existing loopback rewrites continue', () => {
  assert.equal(previewOrigin(), '');
  assert.equal(
    rewriteLocalOrigin('https://astrox-preview.trycloudflare.com', 'localhost:8789'),
    'https://astrox-preview.trycloudflare.com',
  );
  assert.equal(rewriteLocalOrigin('http://localhost:3311', 'localhost:8789'), 'http://localhost:8789');
});
