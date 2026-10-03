import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load.mjs';
const summary = (extra = {}) => ({
  enabled: true,
  attendance: {
    enabled: true,
    daily: 2,
    lastDay: null,
    streak: 2,
    claimed: [],
    today: false,
    milestones: [{ day: 3, points: 5 }],
  },
  referral: {
    enabled: false,
    code: '',
    invited: 0,
    earned: 0,
    registrationInviter: 0,
    firstTopupEnabled: false,
    firstTopupInviter: 0,
  },
  ...extra,
});
async function fixture(overrides = {}) {
  const { createDailyCheckinStore, vietnamRewardDay } = await load('lib/daily-checkin-store.ts');
  let calls = 0,
    refreshes = 0,
    reads = 0,
    day = '2026-10-03';
  const store = createDailyCheckinStore({
    day: () => day,
    read: async () => {
      reads++;
      return summary();
    },
    claim: async () => {
      calls++;
      return { ok: true, day, streak: 3, points: 7, milestones: [3] };
    },
    refreshBalance: () => {
      refreshes++;
    },
    ...overrides,
  });
  return {
    store,
    vietnamRewardDay,
    counters: () => ({ calls, refreshes, reads }),
    nextDay: () => {
      day = '2026-10-04';
    },
  };
}
test('guests and local preview cannot request or claim real rewards', async () => {
  const f = await fixture();
  await f.store.reload();
  await f.store.claim();
  f.store.setAccount('localhost-preview');
  await f.store.reload();
  await f.store.claim();
  assert.deepEqual(f.counters(), { calls: 0, refreshes: 0, reads: 0 });
});
test('one activation records server reward and updates the shared wallet once', async () => {
  const f = await fixture();
  f.store.setAccount('a');
  await f.store.reload();
  const r = await f.store.claim();
  assert.equal(r.points, 7);
  assert.equal(f.store.getSnapshot().summary.attendance.streak, 3);
  assert.equal(f.store.getSnapshot().summary.attendance.today, true);
  assert.deepEqual(f.store.getSnapshot().summary.attendance.claimed, [3]);
  assert.equal(f.counters().refreshes, 1);
  await f.store.claim();
  assert.equal(f.counters().calls, 1);
});
test('rapid duplicate activation cannot create two submissions', async () => {
  let resolve,
    calls = 0;
  const f = await fixture({
    claim: () => {
      calls++;
      return new Promise(r => (resolve = r));
    },
  });
  f.store.setAccount('a');
  await f.store.reload();
  const pending = f.store.claim();
  await f.store.claim();
  assert.equal(calls, 1);
  resolve({ ok: true, day: '2026-10-03', streak: 3, points: 7, milestones: [] });
  await pending;
});
test('old summary and claim responses never populate another account', async () => {
  let resolve;
  const f = await fixture({ read: () => new Promise(r => (resolve = r)) });
  f.store.setAccount('a');
  const pending = f.store.reload();
  f.store.setAccount('b');
  resolve(summary());
  await pending;
  assert.equal(f.store.getSnapshot().summary, null);
  let claimResolve;
  const g = await fixture({ claim: () => new Promise(r => (claimResolve = r)) });
  g.store.setAccount('a');
  await g.store.reload();
  const claim = g.store.claim();
  g.store.setAccount('b');
  claimResolve({ ok: true, day: '2026-10-03', streak: 8, points: 99, milestones: [] });
  await claim;
  assert.equal(g.store.getSnapshot().summary, null);
  assert.equal(g.counters().refreshes, 0);
});
test('disabled rewards and loading states cannot submit a check-in', async () => {
  const f = await fixture({ read: async () => summary({ enabled: false }) });
  f.store.setAccount('a');
  await f.store.claim();
  await f.store.reload();
  await f.store.claim();
  assert.equal(f.counters().calls, 0);
});
test('already claimed response marks today without inventing a reward', async () => {
  const f = await fixture({ claim: async () => ({ error: 'already_checked_in' }) });
  f.store.setAccount('a');
  await f.store.reload();
  await f.store.claim();
  assert.equal(f.store.getSnapshot().summary.attendance.today, true);
  assert.equal(f.store.getSnapshot().reward, null);
});
test('lost claim response re-reads server state before enabling another claim', async () => {
  let reads = 0;
  const f = await fixture({
    read: async () => {
      reads++;
      const s = summary();
      s.attendance.today = reads > 1;
      return s;
    },
    claim: async () => {
      throw Error('network');
    },
  });
  f.store.setAccount('a');
  await f.store.reload();
  const r = await f.store.claim();
  assert.equal(r.error, 'unconfirmed');
  assert.equal(f.store.getSnapshot().summary.attendance.today, true);
  assert.equal(f.store.getSnapshot().busy, false);
});
test('Vietnam midnight refresh removes yesterday claimed state and ignores its late read', async () => {
  const f = await fixture();
  f.store.setAccount('a');
  await f.store.reload();
  await f.store.claim();
  f.nextDay();
  await f.store.reload();
  assert.equal(f.store.getSnapshot().day, '2026-10-04');
  assert.equal(f.store.getSnapshot().summary.attendance.today, false);
  assert.equal(f.vietnamRewardDay(new Date('2026-10-03T16:59:59Z')), '2026-10-03');
  assert.equal(f.vietnamRewardDay(new Date('2026-10-03T17:00:00Z')), '2026-10-04');
});

test('navigation away invalidates a pending claim before another account can see it', async () => {
  const { hookRuntime } = await import('./support/load.mjs');
  const rt = hookRuntime();
  let resolve;
  const { useDailyCheckin } = await load('lib/use-daily-checkin.ts', {
    mocks: {
      react: rt.react,
      '@/lib/auth': { useAuth: () => ({ ready: true, loggedIn: true, astroxUser: { id: 42 } }) },
      '@/lib/api': {
        fetchRewardsSummary: async () => summary(),
        rewardsCheckin: () => new Promise(r => (resolve = r)),
      },
      '@/lib/points': { refreshPoints: async () => {} },
    },
    globals: {
      window: { addEventListener() {}, removeEventListener() {} },
      document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    },
  });
  const RenderHarness = () => {
    rt.reset();
    return useDailyCheckin();
  };
  RenderHarness();
  rt.flushEffects();
  await new Promise(r => setImmediate(r));
  const pending = RenderHarness().claim();
  rt.unmount();
  resolve({ ok: true, day: '2026-10-03', streak: 3, points: 7, milestones: [] });
  const result = await pending;
  assert.equal(result.error, 'account_changed');
  assert.equal(RenderHarness().summary, null);
});

for (const lostResponse of [false, true]) {
  test(`account change during claim recovery suppresses stale feedback (${lostResponse ? 'lost response' : 'server error'})`, async () => {
    let reads = 0,
      resolveRead;
    const f = await fixture({
      read: () =>
        ++reads === 1
          ? Promise.resolve(summary())
          : new Promise(r => {
              resolveRead = r;
            }),
      claim: async () => {
        if (lostResponse) throw Error('network');
        return { error: 'temporarily_unavailable' };
      },
    });
    f.store.setAccount('a');
    await f.store.reload();
    const pending = f.store.claim();
    await new Promise(r => setImmediate(r));
    f.store.setAccount('b');
    resolveRead(summary());
    assert.equal((await pending).error, 'account_changed');
    assert.equal(f.store.getSnapshot().summary, null);
    assert.equal(f.counters().refreshes, 0);
  });
}
