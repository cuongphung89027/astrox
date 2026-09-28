/** Keep home-page previews and deep links in the language of the stored reading. */
export function dashboardEntries<T>(entries: Record<string, T> | undefined, locale: 'vi' | 'en'): [string, T][] {
  return Object.entries(entries || {})
    .filter(([key]) => key.startsWith('en::') === (locale === 'en'))
    .map(([key, value]) => [locale === 'en' ? key.slice(4) : key, value]);
}
