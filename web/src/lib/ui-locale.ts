/** Route locale for browser-side services outside React. */
export function currentUiLocale(): 'vi' | 'en' {
  return typeof window !== 'undefined' && /^\/en(?:\/|$)/.test(window.location?.pathname || '') ? 'en' : 'vi';
}
export const uiText = (vi: string, en: string) => (currentUiLocale() === 'en' ? en : vi);
