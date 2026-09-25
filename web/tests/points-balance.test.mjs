import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';

test('auth response seeds balance without a second /api/me request and account switch clears it', async () => {
  let calls = 0;
  const points = await load('lib/points.ts', { mocks: {
    react: { useCallback: fn => fn, useEffect: () => {}, useSyncExternalStore: (_subscribe, get) => get() },
    './api': { fetchMeWithPoints: async () => { calls++; return { user: { id: 'alice' }, points: 99 }; } },
  } });
  points.setPointsAccount('alice');
  points.seedPointsBalance('alice', 25);
  assert.equal(points.usePointsBalance().points, 25);
  assert.equal(calls, 0);
  points.setPointsAccount('bob');
  assert.equal(points.usePointsBalance().points, null);
});
test('forced refresh after a mutation waits for an older request then fetches fresh balance', async () => {
  const resolves = [];
  const points = await load('lib/points.ts', { mocks: {
    react: { useCallback: fn => fn, useEffect: () => {}, useSyncExternalStore: (_subscribe, get) => get() },
    './api': { fetchMeWithPoints: () => new Promise(resolve => resolves.push(resolve)) },
  } });
  points.setPointsAccount('alice');
  const old = points.refreshPoints();
  const afterSpend = points.refreshPoints(true);
  const duplicateRefresh = points.refreshPoints(true);
  assert.equal(afterSpend, duplicateRefresh);
  resolves.shift()({ user: { id: 'alice' }, points: 100 });
  await old;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(resolves.length, 1);
  resolves.shift()({ user: { id: 'alice' }, points: 75 });
  await afterSpend;
  assert.equal(resolves.length, 0);
  assert.equal(points.usePointsBalance().points, 75);
});
