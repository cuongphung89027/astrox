/** Promo expiry is entered in Vietnam time (UTC+07:00). */
export function promoExpiryLocal(iso: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  return new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 16);
}

export function promoExpiryIso(local: string): string {
  if (!local) return "";
  const value = new Date(`${local}:00+07:00`);
  return Number.isFinite(value.getTime()) ? value.toISOString() : "";
}
