/** US wallet display helpers (plan Task 18): cents → "$x.yz" and safe balance text. */
export const usd = (cents: number): string =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export type WalletSummary = { available: number; reserved: number; status: string } | null;

export function creditsDisplay(wallet: WalletSummary): { text: string; pending: boolean } {
  if (wallet === null) return { text: '…', pending: true };
  if (wallet.status === 'restricted') return { text: 'Restricted — contact support', pending: false };
  const parts = [`${wallet.available.toLocaleString('en-US')} available`];
  if (wallet.reserved > 0) parts.push(`${wallet.reserved.toLocaleString('en-US')} reserved`);
  return { text: parts.join(' · '), pending: false };
}
