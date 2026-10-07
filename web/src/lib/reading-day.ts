/** Current personal day, distinct from the Vietnamese almanac's reference date. */
export function readingTimeZone(locale: 'vi' | 'en', deviceTimeZone?: string): string {
  if (locale === 'vi') return 'Asia/Ho_Chi_Minh';
  const zone = deviceTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format();
    return zone;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
export function readingDay(now: Date, locale: 'vi' | 'en', deviceTimeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: readingTimeZone(locale, deviceTimeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function referenceAlmanacDay(now: Date): string {
  return readingDay(now, 'vi');
}
