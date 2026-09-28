import test from 'node:test';
import assert from 'node:assert/strict';
import { load, hookRuntime, nodes } from './support/load.mjs';

for (const [locale, debit, credit] of [
  ['vi-VN', '−1.200', '+1.200'],
  ['en-US', '−1,200', '+1,200'],
]) {
  test(`${locale}: wallet history renders one sign for debits, refunds and zero`, async () => {
    const { formatHistoryDelta } = await load('lib/format-history-delta.ts');
    assert.equal(formatHistoryDelta(-1200, locale), debit);
    assert.equal(formatHistoryDelta(1200, locale), credit);
    assert.equal(formatHistoryDelta(-30, locale), '−30');
    assert.equal(formatHistoryDelta(0, locale), '+0');
    assert.equal(formatHistoryDelta(-0, locale), '+0');
  });
}

test('Credits history renders signed API deltas without a second minus', async () => {
  const runtime = hookRuntime();
  const requests = [];
  const { CreditsHistory } = await load('components/points/CreditsHistory.tsx', {
    mocks: {
      react: runtime.react,
      '@/i18n/LocaleProvider': { useLocale: () => ({ locale: 'en' }) },
    },
    globals: {
      fetch: async (url, init) => {
        requests.push({ url, init });
        return Response.json({
          entries: [
            { id: 'spend', delta: -1200, kind: 'spend', created_at: '2026-09-28T00:00:00Z' },
            { id: 'purchase', delta: 2000, kind: 'purchase', created_at: '2026-09-28T00:00:00Z' },
            { id: 'refund', delta: -5, kind: 'refund', created_at: '2026-09-28T00:00:00Z' },
            { id: 'release', delta: 0, kind: 'release', created_at: '2026-09-28T00:00:00Z' },
          ],
        });
      },
    },
  });
  CreditsHistory({ userId: 'us-user' });
  runtime.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  runtime.reset();
  const tree = CreditsHistory({ userId: 'us-user' });
  const amounts = nodes(tree)
    .filter(n => n.props?.className === 'rowDelta')
    .map(n => n.props.children);
  assert.deepEqual(amounts, ['−1,200', '+2,000', '−5', '+0']);
  assert.ok(requests[0].url.endsWith('/api/credits/history?limit=50'));
  assert.equal(requests[0].init.credentials, 'include');
  runtime.reset();
  const switched = CreditsHistory({ userId: 'another-user' });
  assert.equal(nodes(switched).filter(n => n.props?.className === 'rowDelta').length, 0);
  assert.ok(nodes(switched).some(n => n.props?.role === 'status'));
  runtime.unmount();
});

test('Credits history shows a retry on API failure instead of an empty ledger', async () => {
  const runtime = hookRuntime();
  const { CreditsHistory } = await load('components/points/CreditsHistory.tsx', {
    mocks: {
      react: runtime.react,
      '@/i18n/LocaleProvider': { useLocale: () => ({ locale: 'en' }) },
    },
    globals: { fetch: async () => new Response(null, { status: 503 }) },
  });
  CreditsHistory({ userId: 'us-user' });
  runtime.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  runtime.reset();
  const tree = CreditsHistory({ userId: 'us-user' });
  assert.ok(nodes(tree).some(n => n.props?.role === 'alert'));
  assert.ok(nodes(tree).some(n => n.type === 'button' && n.props.children === 'Try again'));
  runtime.unmount();
});
