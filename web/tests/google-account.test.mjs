import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memoryStorage } from './support/load.mjs';

test('account owner namespace: google users never read zalo storage', async () => {
  const { accountOwner } = await load('lib/auth.tsx', { globals: { window: {}, localStorage: memoryStorage() } });
  assert.equal(accountOwner({ id: 'u1', provider: 'zalo' }), 'zalo:u1');
  assert.equal(accountOwner({ id: 'u1', provider: 'google' }), 'google:u1');
  assert.equal(accountOwner({ id: 'u1' }), 'zalo:u1'); // legacy payloads default to zalo
  assert.equal(accountOwner(null), null);
});

test('state keeps zalo and google namespaces fully isolated', async () => {
  const store = await load('lib/state.ts', { globals: { window: {}, localStorage: memoryStorage() } });
  store.getState();
  store.activateAccount('zalo:a');
  store.setState({ profile: { name: 'Việt' } });
  store.writeAiCache('tuviTopics', 'vi-key', 'Luận giải VI');
  store.activateAccount('google:b');
  assert.equal(store.getState().profile, null);
  store.writeAiCache('tuviTopics', 'vi-key', 'EN reading');
  store.activateAccount('zalo:a');
  assert.equal(store.readAiCache('tuviTopics', 'vi-key'), 'Luận giải VI');
});

test('dictionary keeps login labels for both providers in both locales', async () => {
  const { vi } = await load('i18n/vi.ts');
  const { en } = await load('i18n/en.ts');
  assert.equal(vi['login.continueGoogle'], 'Tiếp tục với Google');
  assert.equal(en['login.continueGoogle'], 'Continue with Google');
  assert.equal(vi['login.continueZola'] ?? vi['login.continueZalo'], 'Tiếp tục với Zalo');
});
