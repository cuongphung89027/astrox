'use client';
import { uiText } from './ui-locale';
export type ReadingOffer = {
  id: string;
  name: string;
  points: number;
  basePoints: number;
  credit: number;
  owned: boolean;
  members: string[];
  expiresAt: number | null;
};
export type ReadingSelection = {
  offerId: string;
  points: number;
  revision: number;
  version: string;
  scopeKey: string;
  expiresAt: number | null;
};
export type ReadingQuote = {
  market?: 'VN' | 'US';
  name: string;
  points: number;
  offers?: ReadingOffer[];
  revision?: number;
  version?: string;
  scopeKey?: string;
  scopeLabel?: string;
};
type Decision = { accepted: boolean; selection?: ReadingSelection };
let open: ((quote: ReadingQuote, signal?: AbortSignal) => Promise<Decision>) | null = null;
export function registerReadingConsent(handler: NonNullable<typeof open>) {
  open = handler;
  return () => {
    if (open === handler) open = null;
  };
}
export async function confirmReading(quote: ReadingQuote, signal?: AbortSignal) {
  if (!open)
    throw new Error(
      uiText('Chưa sẵn sàng xác nhận giá. Vui lòng tải lại trang.', 'Price confirmation is not ready. Please reload.'),
    );
  const decision = await open(quote, signal);
  if (!decision.accepted)
    throw new Error(
      uiText('Bạn đã hủy lượt luận giải. Chưa trừ Point.', 'Reading cancelled. Your wallet has not been charged.'),
    );
  return decision.selection;
}
