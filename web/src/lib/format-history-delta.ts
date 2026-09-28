/** Ledger deltas already carry their sign; format the magnitude only once. */
export function formatHistoryDelta(delta: number, locale: 'vi-VN' | 'en-US'): string {
  return `${delta < 0 ? '−' : '+'}${Math.abs(delta).toLocaleString(locale)}`;
}
