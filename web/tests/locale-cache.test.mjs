import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memoryStorage } from './support/load.mjs';

test('locale namespacing keeps vi and en readings apart (AI-03)', async () => {
  const { localeCacheKey } = await load('lib/state.ts', { globals: { window: {}, localStorage: memoryStorage() } });
  assert.equal(localeCacheKey('vi', 'tinh-cach'), 'tinh-cach');
  assert.equal(localeCacheKey('en', 'tinh-cach'), 'en::tinh-cach');
  assert.notEqual(localeCacheKey('vi', 'k'), localeCacheKey('en', 'k'));
});

test('same service key stores two independent readings under one bucket', async () => {
  const store = await load('lib/state.ts', { globals: { window: {}, localStorage: memoryStorage() } });
  store.getState();
  store.writeAiCache('tuviTopics', 'vi::x', 'Luận giải tiếng Việt');
  store.writeAiCache('tuviTopics', 'en::x', 'English reading');
  assert.equal(store.readAiCache('tuviTopics', 'vi::x'), 'Luận giải tiếng Việt');
  assert.equal(store.readAiCache('tuviTopics', 'en::x'), 'English reading');
});

test('aiServiceIdForPath maps English routes to the same service modules', async () => {
  const { aiServiceIdForPath } = await load('lib/api.ts', { globals: { window: {}, localStorage: memoryStorage() } });
  assert.equal(aiServiceIdForPath('/tuvi'), 'tuvi');
  assert.equal(aiServiceIdForPath('/en/zi-wei?topic=x'), 'tuvi');
  assert.equal(aiServiceIdForPath('/en/palm-reading'), 'palm');
  assert.equal(aiServiceIdForPath('/admin'), '');
});

test('real cache calls isolate English routes without changing existing Vietnamese keys', async () => {
  const location = { pathname: '/tuvi' };
  const store = await load('lib/state.ts', { globals: { window: { location }, localStorage: memoryStorage() } });
  store.getState();
  store.writeAiCache('tuviTopics', 'career', 'Vietnamese report');
  location.pathname = '/en/zi-wei';
  assert.equal(store.readAiCache('tuviTopics', 'career'), '');
  store.writeAiCache('tuviTopics', 'career', 'English report');
  assert.equal(store.readAiCache('tuviTopics', 'career'), 'English report');
  location.pathname = '/tuvi';
  assert.equal(store.readAiCache('tuviTopics', 'career'), 'Vietnamese report');
});

test('normal AI call on an English route sends English locale and system instruction', async () => {
  const requests = [];
  const api = await load('lib/api.ts', {
    mocks: {
      './feature-telemetry': { trackFeature() {} },
      './points': { refreshPoints: async () => {} },
      './ai-operation': {
        pendingAiOperation: async () => ({ id: 'operation-english', key: 'k' }),
        finishAiOperation() {},
      },
    },
    globals: {
      window: { location: { pathname: '/en/zi-wei' }, dispatchEvent() {} },
      localStorage: memoryStorage(),
      fetch: async (url, init) => {
        if (String(url).includes('/api/market')) return Response.json({ market: 'US' });
        if (String(url).includes('/api/site-config'))
          return Response.json({
            config: { billing: { services: [{ id: 'tuvi', status: 'free', points: 0, name: 'Zi Wei' }] } },
          });
        if (String(url).includes('/api/ai/session')) return Response.json({}, { status: 401 });
        requests.push(JSON.parse(init.body));
        return Response.json({ choices: [{ message: { content: 'English reading' }, finish_reason: 'stop' }] });
      },
    },
  });
  assert.equal(await api.callAiText({ parts: [{ text: 'Test reading' }] }), 'English reading');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].locale, 'en');
  assert.equal(requests[0].market, 'US');
  assert.match(requests[0].messages[0].content, /English/);
  assert.doesNotMatch(requests[0].messages[0].content, /tiếng Việt/);
});
