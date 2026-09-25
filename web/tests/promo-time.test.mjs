import './support/register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { promoExpiryIso, promoExpiryLocal } from '../src/components/admin/promo-time.ts';

test('Admin expiry picker round-trips Vietnam time without shifting its hour', () => {
  assert.equal(promoExpiryIso('2026-09-30T23:45'), '2026-09-30T16:45:00.000Z');
  assert.equal(promoExpiryLocal('2026-09-30T16:45:00.000Z'), '2026-09-30T23:45');
  assert.equal(promoExpiryIso(''), '');
});
