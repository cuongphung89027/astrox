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

for (const locale of ['vi', 'en'])
  test(`${locale}: shared wallet keeps signed history, filters and cursor pagination`, async () => {
    const runtime = hookRuntime(),
      requests = [];
    const user = { id: 'wallet-user' },
      refresh = async () => {};
    const summary = {
      enabled: false,
      attendance: { enabled: false, today: false, milestones: [] },
      ads: { enabled: false },
      referral: { enabled: false, code: '' },
    };
    const { PointsHome } = await load('components/points/PointsHome.tsx', {
      mocks: {
        react: runtime.react,
        '@/i18n/LocaleProvider': { useLocale: () => ({ locale }) },
        '@/lib/auth': { useAuth: () => ({ loggedIn: true, ready: true, astroxUser: user }) },
        '@/lib/use-daily-checkin': { useDailyCheckin: () => ({ summary, busy: false, status: 'ready', reload: async () => {}, claim: async () => ({error: 'attendance_disabled'}) }) },
        '@/lib/points': { usePointsBalance: () => ({ points: 2000, status: 'ready', refresh }) },
        '@/components/motion': { NumberPopIn: () => null, ShimmerText: () => null, useToast: () => ({ show() {} }) },
        '@/lib/api': {
          rewardedAdAction: async () => {},
          fetchRewardsSummary: async () => summary,
          rewardsCheckin: async () => {},
          loadTopupHistory: async () => [],
          loadPointsHistory: async cursor => {
            requests.push(cursor);
            return {
              transactions: cursor
                ? [{ id: 'old', delta: 5, reason: 'attendance', created_at: '2026-09-27' }]
                : [
                    { id: 'debit', delta: -1200, reason: 'ai_service', created_at: '2026-09-28T12:00:00Z' },
                    { id: 'credit', delta: 2000, reason: 'topup_payos', created_at: '2026-09-28T11:00:00Z' },
                  ],
              nextCursor: cursor ? null : 'next-page',
            };
          },
        },
        '@/components/topup/TopupPanel': { TopupPanel: () => null },
        '@/lib/rewarded-ad': { showRewardedAd: async () => {} },
      },
    });
    const render = () => {
      runtime.reset();
      return PointsHome({});
    };
    render();
    runtime.flushEffects();
    await new Promise(r => setImmediate(r));
    let tree = render();
    const delta = () =>
      nodes(tree)
        .filter(n => n.props?.className === 'rowDelta')
        .map(n => n.props.children);
    assert.deepEqual(delta(), locale === 'en' ? ['−1,200', '+2,000'] : ['−1.200', '+2.000']);
    const buttons = () => nodes(tree).filter(n => n.type === 'button');
    const more = buttons().find(
      n => n.props.children === (locale === 'en' ? 'Load more transactions' : 'Xem thêm giao dịch'),
    );
    assert.ok(more);
    await more.props.onClick();
    await new Promise(r => setImmediate(r));
    tree = render();
    assert.equal(requests[1], 'next-page');
    assert.equal(delta().length, 3);
    const spend = buttons().find(n => n.props.children === (locale === 'en' ? 'Credits spent' : 'Tiêu Point'));
    assert.ok(spend);
    spend.props.onClick();
    tree = render();
    assert.equal(delta().length, 1);
    assert.match(delta()[0], /^−1/);
    runtime.unmount();
  });
