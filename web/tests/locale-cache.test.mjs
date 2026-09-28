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
