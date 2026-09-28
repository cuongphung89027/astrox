import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

test('US wallet summary formatting: available/reserved split and USD cents display', async () => {
  const { usd } = await load('lib/format-usd.ts');
  assert.equal(usd(499), '$4.99');
  assert.equal(usd(1799), '$17.99');
  assert.equal(usd(0), '$0.00');
  assert.equal(usd(123456), '$1,234.56');
});

test('US wallet view shows unknown balance as pending, never a fake zero (Task 05 rule)', async () => {
  const { creditsDisplay } = await load('lib/format-usd.ts');
  assert.deepEqual(creditsDisplay(null), { text: '…', pending: true });
  assert.deepEqual(creditsDisplay({ available: 9, reserved: 4, status: 'active' }), {
    text: '9 available · 4 reserved',
    pending: false,
  });
  assert.deepEqual(creditsDisplay({ available: 0, reserved: 0, status: 'restricted' }), {
    text: 'Restricted — contact support',
    pending: false,
  });
});
