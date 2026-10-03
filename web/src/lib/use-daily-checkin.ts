'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchRewardsSummary, rewardsCheckin } from '@/lib/api';
import { refreshPoints } from '@/lib/points';
import { createDailyCheckinStore, vietnamRewardDay, type DailyCheckinSnapshot } from './daily-checkin-store';

const store = createDailyCheckinStore({
  day: vietnamRewardDay,
  read: fetchRewardsSummary,
  claim: rewardsCheckin,
  refreshBalance: () => refreshPoints(true),
});
const server: DailyCheckinSnapshot = {
  account: null,
  day: '',
  summary: null,
  status: 'idle',
  busy: false,
  reward: null,
};
let consumers = 0;
export function useDailyCheckin() {
  const { ready, loggedIn, astroxUser } = useAuth();
  const account = ready && loggedIn && astroxUser?.id != null ? String(astroxUser.id) : null;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, () => server);
  useEffect(() => {
    consumers++;
    store.setAccount(account);
    void store.reload();
    const update = () => {
      if (document.visibilityState !== 'hidden') void store.reload();
    };
    // Both rewards and lunar dates reset at midnight Vietnam time.
    const timer = setInterval(() => {
      if (store.getSnapshot().day !== vietnamRewardDay()) update();
    }, 15000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
      if (--consumers === 0) store.setAccount(null);
    };
  }, [account]);
  return { ...(snapshot.account === account ? snapshot : server), reload: store.reload, claim: store.claim };
}
