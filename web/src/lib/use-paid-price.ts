'use client';

import { useLocale } from '@/i18n/LocaleProvider';
import { useEffect, useState } from 'react';
import { servicePrices, rememberDisplayedPrice } from './api';
import { promptDescriptor } from './managed-prompts';
import { AUTH_API_BASE } from './config';
import { useAuth } from './auth';
import { usePointsBalance } from './points';

type PriceState = {
  unit?: string;
  text: string;
  pending: boolean;
  paid: boolean;
  free?: boolean;
  points?: number;
  key?: string;
};

/** Price for the exact service/scope shown on a paid CTA before consent opens. */
export function usePaidPrice(serviceId: string, prompt?: string): PriceState {
  const { locale } = useLocale();
  const en = locale === 'en';
  const loading: PriceState = { text: en ? 'Loading price…' : 'Đang tải giá…', pending: true, paid: true };
  const { astroxUser } = useAuth();
  const { points } = usePointsBalance(!!astroxUser && astroxUser.id !== 'localhost-preview');
  const [price, setPrice] = useState<PriceState>(loading);
  const [revision, setRevision] = useState(0);
  const key = `${revision}:${astroxUser?.id ?? 'guest'}:${points ?? 'unknown'}:${serviceId}:${prompt ?? ''}`;
  useEffect(() => {
    const changed = () => setRevision(value => value + 1);
    window.addEventListener('astrox:price-changed', changed);
    return () => window.removeEventListener('astrox:price-changed', changed);
  }, []);
  useEffect(() => {
    let alive = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const update = (next: PriceState) => setPrice({ ...next, key });
    const run = async () => {
      if (!serviceId) {
        update({ text: '', pending: false, paid: false });
        return;
      }
      try {
        const info = (await servicePrices(revision > 0))[serviceId];
        if (!alive) return;
        if (!info) throw new Error('price');
        if (info.status === 'free') {
          update({ text: '', pending: false, paid: false, free: true });
          return;
        }
        if (info.status !== 'paid') {
          update({ text: en ? 'Service unavailable' : 'Dịch vụ tạm ngưng', pending: true, paid: true });
          return;
        }
        const base = info.points;
        const unit = info.market ? (info.market === 'US' ? 'Credits' : 'Point') : en ? 'Credits' : 'Point';
        const descriptor = prompt ? promptDescriptor(prompt) : undefined;
        if (!info.unlocks || info.policy === 'session' || !astroxUser || astroxUser.id === 'localhost-preview') {
          rememberDisplayedPrice(serviceId, descriptor, base);
          update({
            text: `${base.toLocaleString(en ? 'en-US' : 'vi-VN')} ${unit}`,
            unit,
            points: base,
            pending: false,
            paid: true,
          });
          return;
        }
        if (!descriptor) {
          update({ text: en ? 'Price unavailable' : 'Chưa xác định được giá', pending: true, paid: true });
          return;
        }
        const auth = await fetch(`${AUTH_API_BASE}/api/ai/session`, { method: 'POST', credentials: 'include' });
        if (!auth.ok) throw new Error('session');
        const session = await auth.json();
        const response = await fetch('/api/ai/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({ serviceId, promptDescriptor: descriptor }),
        });
        if (!response.ok) throw new Error('quote');
        const quote = await response.json();
        if (!alive) return;
        const offer = quote.offers?.find((item: { id: string; points: number }) => item.id === serviceId);
        if (!offer || !Number.isSafeInteger(offer.points)) throw new Error('quote');
        rememberDisplayedPrice(serviceId, descriptor, offer.points);
        update({
          text: `${offer.points.toLocaleString(en ? 'en-US' : 'vi-VN')} ${unit}`,
          unit,
          points: offer.points,
          pending: false,
          paid: true,
        });
      } catch {
        if (alive) {
          update({ text: en ? 'Unable to load price' : 'Chưa tải được giá', pending: true, paid: true });
          retryTimer = setTimeout(() => {
            if (alive) void run();
          }, 5000);
        }
      }
    };
    void run();
    return () => {
      alive = false;
      clearTimeout(retryTimer);
    };
  }, [serviceId, prompt, astroxUser, points, key, revision, en]);
  return price.key === key ? price : loading;
}
