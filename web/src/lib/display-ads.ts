/** Deliberate placements: no ads on private profiles, paid reports or forms. */
export function displayAdPlacement(path: string): 'home' | 'calendar' | null {
  if (path === '/' || path === '/en') return 'home';
  if (path === '/licham' || path === '/en/lunar-calendar') return 'calendar';
  return null;
}
export const DISPLAY_AD_CLIENT = 'ca-pub-5916355239247970';
export const DISPLAY_AD_SLOT = '8989714444';
/** Enable only after site approval and Google consent-message setup. */
export const DISPLAY_ADS_ENABLED = process.env.NEXT_PUBLIC_DISPLAY_ADS_ENABLED === 'true';
