/**
 * Locale entry routing for Pages Functions (plan Task 04). Pure JS: importable
 * by the edge entrypoint and by node:test without Workers runtime.
 *
 * Decision order at `/` only: saved axlang cookie > country (VN/US) >
 * Accept-Language quality ranking > English. Deep links are never redirected,
 * and the VI choice serves `/` directly so there is no redirect loop.
 */

/** Reads the first `vi|en` value of the axlang cookie; '' when absent/invalid. */
export function cookieLocale(cookieHeader) {
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== 'axlang') continue;
    const value = part.slice(eq + 1).trim();
    if (value === 'vi' || value === 'en') return value;
    return '';
  }
  return '';
}

export function entryLocale({ saved, country, acceptLanguage = '' }) {
  if (saved === 'vi' || saved === 'en') return saved;
  if (country === 'VN') return 'vi';
  if (country === 'US') return 'en';
  const ranked = acceptLanguage
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().toLowerCase().split(';');
      const quality = params.find(p => p.trim().startsWith('q='));
      const q = quality ? Number(quality.trim().slice(2)) : 1;
      return { tag: tag.split('-')[0], q };
    })
    .filter(x => Number.isFinite(x.q) && x.q > 0 && x.q <= 1)
    .sort((a, b) => b.q - a.q);
  return ranked.find(x => x.tag === 'vi' || x.tag === 'en')?.tag ?? 'en';
}
