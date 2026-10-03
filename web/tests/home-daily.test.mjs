import test from 'node:test';
import assert from 'node:assert/strict';
import { load, hookRuntime, nodes } from './support/load.mjs';
async function screen({
  locale = 'vi',
  account = null,
  ready = true,
  market = 'VN',
  today = false,
  enabled = true,
  status = 'ready',
} = {}) {
  const runtime = hookRuntime();
  let logins = 0,
    claims = 0;
  const messages = [];
  const daily = {
    status,
    busy: false,
    reward: null,
    day: '2026-10-03',
    summary: account
      ? {
          enabled,
          attendance: { enabled, today, daily: 2, streak: 3, claimed: [], milestones: [{ day: 7, points: 5 }] },
        }
      : null,
    reload: async () => {},
    claim: async () => {
      claims++;
      return { ok: true, day: '2026-10-03', streak: 4, points: 2, milestones: [] };
    },
  };
  const { DailyOverview } = await load('components/home/DailyOverview.tsx', {
    mocks: {
      react: runtime.react,
      '@/i18n/LocaleProvider': { useLocale: () => ({ locale }) },
      '@/lib/auth': { useAuth: () => ({ ready, loggedIn: !!account, astroxUser: account ? { id: account } : null }) },
      '@/lib/points': { usePointsBalance: () => ({ market }) },
      '@/lib/use-daily-checkin': { useDailyCheckin: () => daily },
      '@/lib/login-dialog': { openLoginDialog: () => logins++ },
      '@/components/motion': { useToast: () => ({ show: (...a) => messages.push(a) }) },
    },
  });
  const tree = DailyOverview({ now: new Date('2026-10-03T17:00:00Z') });
  const button = nodes(tree).find(n => n.type === 'button' && n.props.className === 'claimButton');
  return { tree, button, counters: () => ({ logins, claims }), messages };
}
for (const locale of ['vi', 'en'])
  test(`${locale}: guest daily action opens login and uses the correct calendar route`, async () => {
    const s = await screen({ locale });
    assert.equal(s.button.props.disabled, false);
    s.button.props.onClick();
    await new Promise(r => setImmediate(r));
    assert.deepEqual(s.counters(), { logins: 1, claims: 0 });
    assert.ok(nodes(s.tree).some(n => n.props?.href === (locale === 'vi' ? '/licham' : '/en/lunar-calendar')));
  });
test('claimed, paused and unresolved states do not expose an enabled claim action', async () => {
  for (const options of [{ today: true }, { enabled: false }, { status: 'loading' }, { ready: false }]) {
    const s = await screen({ account: 'user', ...options });
    assert.equal(s.button.props.disabled, true);
  }
});
test('preview activation never sends a reward request', async () => {
  const s = await screen({ account: 'localhost-preview' });
  s.button.props.onClick();
  await new Promise(r => setImmediate(r));
  assert.equal(s.counters().claims, 0);
  assert.equal(s.messages[0][1], 'info');
});
test('real claim confirmation displays wallet market unit even on another UI locale', async () => {
  const s = await screen({ account: 'user', locale: 'en', market: 'VN' });
  s.button.props.onClick();
  await new Promise(r => setImmediate(r));
  assert.equal(s.counters().claims, 1);
  assert.equal(s.messages[0][0], 'Checked in +2 Point');
});
