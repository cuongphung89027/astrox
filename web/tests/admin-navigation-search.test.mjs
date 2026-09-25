import './support/register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as nav from '../src/components/admin/navigation.ts';

test('Admin navigation search matches Vietnamese without accents and preserves target', () => {
  const matches = nav.searchNavigation('goi nap');
  assert.ok(matches.some(([id]) => id === 'billing'));
  assert.ok(!matches.some(([id]) => id === 'overview'));
  assert.ok(nav.searchNavigation('khuyen mai').some(([id]) => id === 'billing'));
});
