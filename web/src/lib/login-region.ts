/** One-use sign-in continuation across the separate Vietnamese/English root layouts. */
import type { Locale } from './locale';

const LOGIN_REGION = 'axLoginRegion';

export function markLoginRegion(locale: Locale): void {
  try {
    sessionStorage.setItem(LOGIN_REGION, locale);
  } catch {
    // The locale navigation still works; the destination offers its region picker.
  }
}

export function consumeLoginRegion(locale: Locale): boolean {
  try {
    const pending = sessionStorage.getItem(LOGIN_REGION);
    sessionStorage.removeItem(LOGIN_REGION);
    return (pending === 'vi' || pending === 'en') && pending === locale;
  } catch {
    return false;
  }
}
