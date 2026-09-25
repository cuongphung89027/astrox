import test from 'node:test';
import assert from 'node:assert/strict';
import { load, hookRuntime } from './support/load.mjs';

test('paid CTA displays the scoped server quote including prior-purchase credit', async () => {
  const runtime = hookRuntime();
  const requests = [];
  const { usePaidPrice } = await load('lib/use-paid-price.ts', { mocks: {
    react: runtime.react,
    './api': { servicePrices: async () => ({ leaf: { status: 'paid', points: 100, policy: 'profile', unlocks: true } }), rememberDisplayedPrice: () => {} },
    './managed-prompts': { promptDescriptor: () => ({ id: 'template', values: [] }) },
    './auth': { useAuth: () => ({ astroxUser: { id: 'alice' } }) },
    './points': { usePointsBalance: () => ({ points: 80 }) },
    './config': { AUTH_API_BASE: 'https://api.example.com' },
  }, globals: { window: { addEventListener(){}, removeEventListener(){} }, fetch: async (url, options) => { requests.push([url, options]); return Response.json(String(url).endsWith('/api/ai/session') ? { token: 'session' } : { offers: [{ id: 'leaf', points: 40 }] }); } } });
  runtime.reset();
  assert.equal(usePaidPrice('leaf', 'prompt').pending, true);
  runtime.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  runtime.reset();
  assert.equal(usePaidPrice('leaf', 'prompt').text, '40 Point');
  assert.ok(requests.some(([url]) => url === '/api/ai/quote'));
});
