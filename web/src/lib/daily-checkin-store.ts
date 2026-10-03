import type { RewardsSummary } from './api';

type ClaimResult =
  { ok: boolean; day: string; streak: number; points: number; milestones: number[] } | { error: string };
type Status = 'idle' | 'loading' | 'ready' | 'error';
export interface DailyCheckinSnapshot {
  account: string | null;
  day: string;
  summary: RewardsSummary | null;
  status: Status;
  busy: boolean;
  reward: number | null;
}
export const vietnamRewardDay = (now = new Date()) => new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

/** Server-authoritative rewards shared by home and wallet; never retain another account's state. */
export function createDailyCheckinStore(api: {
  day: () => string;
  read: () => Promise<RewardsSummary>;
  claim: () => Promise<ClaimResult>;
  refreshBalance: () => unknown;
}) {
  const empty = (account: string | null): DailyCheckinSnapshot => ({
    account,
    day: api.day(),
    summary: null,
    status: 'idle',
    busy: false,
    reward: null,
  });
  let state = empty(null),
    epoch = 0;
  let reading: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const commit = (patch: Partial<DailyCheckinSnapshot>) => {
    state = { ...state, ...patch };
    listeners.forEach(fn => fn());
  };
  const usable = () => Boolean(state.account && state.account !== 'localhost-preview');
  const reset = (account: string | null) => {
    epoch++;
    reading = null;
    state = empty(account);
    listeners.forEach(fn => fn());
  };
  async function reload() {
    if (!usable()) return;
    if (state.day !== api.day()) reset(state.account);
    if (reading) return reading;
    const id = epoch;
    commit({ status: 'loading' });
    const request = api
      .read()
      .then(summary => {
        if (id === epoch) commit({ summary, status: 'ready' });
      })
      .catch(() => {
        if (id === epoch) commit({ summary: null, status: 'error' });
      })
      .finally(() => {
        if (id === epoch) reading = null;
      });
    reading = request;
    return request;
  }
  async function claim(): Promise<ClaimResult> {
    if (!usable()) return { error: 'unauthorized' };
    if (state.busy) return { error: 'checkin_busy' };
    if (state.day !== api.day()) {
      await reload();
      return { error: 'day_changed' };
    }
    const a = state.summary?.attendance;
    if (state.status !== 'ready' || !state.summary?.enabled || !a?.enabled) return { error: 'attendance_disabled' };
    if (a.today) return { error: 'already_checked_in' };
    const id = epoch;
    commit({ busy: true, reward: null });
    try {
      const result = await api.claim();
      if (id !== epoch) return { error: 'account_changed' };
      if ('error' in result) {
        if (result.error === 'already_checked_in')
          commit({ summary: { ...state.summary!, attendance: { ...a, today: true } } });
        else await reload();
      } else {
        commit({
          reward: result.points,
          summary: {
            ...state.summary!,
            attendance: {
              ...a,
              today: result.day === api.day(),
              lastDay: result.day,
              streak: result.streak,
              claimed: [...new Set([...a.claimed, ...result.milestones])],
            },
          },
        });
        void api.refreshBalance();
      }
      return result;
    } catch {
      if (id !== epoch) return { error: 'account_changed' };
      await reload(); // A lost response may already have credited the server ledger.
      void api.refreshBalance();
      return { error: 'unconfirmed' };
    } finally {
      if (id === epoch) commit({ busy: false });
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    setAccount: (account: string | null) => {
      if (state.account !== account) reset(account);
    },
    reload,
    claim,
  };
}
