/**
 * Birth place resolution (plan Task 06). A birth place carries an IANA zone —
 * never inferred from the visitor's current browser timezone. Legacy profiles
 * store a Vietnamese province string (→ Asia/Ho_Chi_Minh); new international
 * profiles additionally store `placeTz` on the profile.
 */
import { VN_PROVINCES } from './provinces.ts';
import { isValidZone } from './birth-time.ts';

export const VN_ZONE = 'Asia/Ho_Chi_Minh';

export type BirthPlaceInfo = {
  label: string;
  zone: string;
  group: 'VN' | 'US' | 'WORLD';
};

/** US states → IANA zone (largest-city zone per state; AZ/HI observe no DST). */
export const US_STATE_ZONES: Readonly<Record<string, string>> = {
  Alabama: 'America/Chicago',
  Alaska: 'America/Anchorage',
  Arizona: 'America/Phoenix',
  Arkansas: 'America/Chicago',
  California: 'America/Los_Angeles',
  Colorado: 'America/Denver',
  Connecticut: 'America/New_York',
  Delaware: 'America/New_York',
  Florida: 'America/New_York',
  Georgia: 'America/New_York',
  Hawaii: 'Pacific/Honolulu',
  Idaho: 'America/Boise',
  Illinois: 'America/Chicago',
  Indiana: 'America/Indiana/Indianapolis',
  Iowa: 'America/Chicago',
  Kansas: 'America/Chicago',
  Kentucky: 'America/New_York',
  Louisiana: 'America/Chicago',
  Maine: 'America/New_York',
  Maryland: 'America/New_York',
  Massachusetts: 'America/New_York',
  Michigan: 'America/Detroit',
  Minnesota: 'America/Chicago',
  Mississippi: 'America/Chicago',
  Missouri: 'America/Chicago',
  Montana: 'America/Denver',
  Nebraska: 'America/Chicago',
  Nevada: 'America/Los_Angeles',
  'New Hampshire': 'America/New_York',
  'New Jersey': 'America/New_York',
  'New Mexico': 'America/Denver',
  'New York': 'America/New_York',
  'North Carolina': 'America/New_York',
  'North Dakota': 'America/Chicago',
  Ohio: 'America/New_York',
  Oklahoma: 'America/Chicago',
  Oregon: 'America/Los_Angeles',
  Pennsylvania: 'America/New_York',
  'Rhode Island': 'America/New_York',
  'South Carolina': 'America/New_York',
  'South Dakota': 'America/Chicago',
  Tennessee: 'America/Chicago',
  Texas: 'America/Chicago',
  Utah: 'America/Denver',
  Vermont: 'America/New_York',
  Virginia: 'America/New_York',
  Washington: 'America/Los_Angeles',
  'West Virginia': 'America/New_York',
  Wisconsin: 'America/Chicago',
  Wyoming: 'America/Denver',
  'Washington, D.C.': 'America/New_York',
};

/** Curated world sample for manual entry outside VN/US (search, not geocoding). */
export const WORLD_SAMPLE: readonly BirthPlaceInfo[] = [
  { label: 'London, UK', zone: 'Europe/London', group: 'WORLD' },
  { label: 'Paris, France', zone: 'Europe/Paris', group: 'WORLD' },
  { label: 'Berlin, Germany', zone: 'Europe/Berlin', group: 'WORLD' },
  { label: 'Moscow, Russia', zone: 'Europe/Moscow', group: 'WORLD' },
  { label: 'Tokyo, Japan', zone: 'Asia/Tokyo', group: 'WORLD' },
  { label: 'Seoul, South Korea', zone: 'Asia/Seoul', group: 'WORLD' },
  { label: 'Beijing, China', zone: 'Asia/Shanghai', group: 'WORLD' },
  { label: 'Shanghai, China', zone: 'Asia/Shanghai', group: 'WORLD' },
  { label: 'Taipei, Taiwan', zone: 'Asia/Taipei', group: 'WORLD' },
  { label: 'Singapore', zone: 'Asia/Singapore', group: 'WORLD' },
  { label: 'Bangkok, Thailand', zone: 'Asia/Bangkok', group: 'WORLD' },
  { label: 'Sydney, Australia', zone: 'Australia/Sydney', group: 'WORLD' },
  { label: 'Melbourne, Australia', zone: 'Australia/Melbourne', group: 'WORLD' },
  { label: 'Toronto, Canada', zone: 'America/Toronto', group: 'WORLD' },
  { label: 'Vancouver, Canada', zone: 'America/Vancouver', group: 'WORLD' },
  { label: 'São Paulo, Brazil', zone: 'America/Sao_Paulo', group: 'WORLD' },
  { label: 'Mexico City, Mexico', zone: 'America/Mexico_City', group: 'WORLD' },
  { label: 'Dubai, UAE', zone: 'Asia/Dubai', group: 'WORLD' },
  { label: 'Kolkata, India', zone: 'Asia/Kolkata', group: 'WORLD' },
];

export function vnProvincePlace(province: string): BirthPlaceInfo | null {
  return VN_PROVINCES.includes(province) ? { label: province, zone: VN_ZONE, group: 'VN' } : null;
}

/**
 * Zone for a profile: explicit `placeTz` wins; a Vietnamese province maps to
 * VN; otherwise fall back to VN ONLY for legacy data (pre-international
 * profiles were all Vietnamese). New international flows must set placeTz.
 */
export function resolveProfileZone(profile: { placeTz?: string; place?: string }): string {
  if (profile.placeTz && isValidZone(profile.placeTz)) return profile.placeTz;
  return VN_ZONE;
}

/** Offline search over VN provinces, US states and the world sample. */
export function searchBirthPlaces(query: string): BirthPlaceInfo[] {
  const q = query.trim().toLowerCase();
  const all: BirthPlaceInfo[] = [
    ...VN_PROVINCES.map(p => ({ label: p, zone: VN_ZONE, group: 'VN' as const })),
    ...Object.entries(US_STATE_ZONES).map(([label, zone]) => ({ label, zone, group: 'US' as const })),
    ...WORLD_SAMPLE,
  ];
  if (!q) return all.slice(0, 24);
  return all.filter(p => p.label.toLowerCase().includes(q)).slice(0, 24);
}

/** Unique zone choices (representative label) for the international wizard. */
export function timeZoneChoices(): BirthPlaceInfo[] {
  const seen = new Set<string>();
  const out: BirthPlaceInfo[] = [];
  for (const p of [
    ...Object.entries(US_STATE_ZONES).map(([label, zone]) => ({ label, zone, group: 'US' as const })),
    ...WORLD_SAMPLE,
    { label: 'Việt Nam', zone: VN_ZONE, group: 'VN' as const },
  ]) {
    if (!seen.has(p.zone)) {
      seen.add(p.zone);
      out.push(p);
    }
  }
  return out;
}

/** Human-facing clock hint, e.g. "GMT-7" — derived from the zone, not the browser. */
export function zoneHint(zone: string): string {
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value;
  return offset || zone;
}
