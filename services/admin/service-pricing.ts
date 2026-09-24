export type CreditRatio = { numerator: number; denominator: number };
export type BundlePrice = { id: string; enabled: boolean; points: number };
export type UnlockSettings = { enabled: boolean; credit: CreditRatio; bundles: BundlePrice[] };
export const defaultUnlockSettings = (): UnlockSettings => ({
  enabled: false,
  credit: { numerator: 2, denominator: 3 },
  bundles: [],
});
export type PurchaseGrant = {
  id: string;
  points: number;
  members: string[];
  status: string;
  consumedBy: string | null;
  expiresAt: number | null;
};
export function upgradeQuote(
  basePoints: number,
  members: string[],
  grants: PurchaseGrant[],
  ratio: CreditRatio,
  now = Date.now(),
) {
  const active = grants.filter(g => g.status === 'succeeded' && (g.expiresAt === null || g.expiresAt > now));
  const owned = active.some(g => members.every(id => g.members.includes(id)));
  if (owned) return { basePoints, points: 0, credit: 0, creditIds: [] as string[], owned: true };
  const eligible = active.filter(
    g =>
      !g.consumedBy &&
      g.points > 0 &&
      g.members.length > 0 &&
      g.members.length < members.length &&
      g.members.every(id => members.includes(id)),
  );
  const paid = eligible.reduce((sum, g) => sum + BigInt(g.points), BigInt(0));
  const discount = (paid * BigInt(ratio.numerator)) / BigInt(ratio.denominator);
  const credit = Number(discount > BigInt(basePoints) ? BigInt(basePoints) : discount);
  return { basePoints, points: basePoints - credit, credit, creditIds: eligible.map(g => g.id).sort(), owned: false };
}
