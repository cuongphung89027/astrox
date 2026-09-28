import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';
test('home-page reading previews isolate languages and preserve topic/subtopic links', async () => {
  const { dashboardEntries } = await load('lib/dashboard-cache.ts');
  const cache = { 'personality::overview': { text: 'Vietnamese' }, 'en::personality::overview': { text: 'English' } };
  assert.deepEqual(dashboardEntries(cache, 'en'), [['personality::overview', { text: 'English' }]]);
  assert.deepEqual(dashboardEntries(cache, 'vi'), [['personality::overview', { text: 'Vietnamese' }]]);
  assert.deepEqual(dashboardEntries(undefined, 'en'), []);
});
