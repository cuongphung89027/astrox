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
  /** Representative coordinates (state centroid / city) for house math when known. */
  lat?: number;
  lon?: number;
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
  Ohio: 'America/New_York',
  Oklahoma: 'America/Chicago',
  Oregon: 'America/Los_Angeles',
  Pennsylvania: 'America/New_York',
  Tennessee: 'America/Chicago',
  Texas: 'America/Chicago',
  Utah: 'America/Denver',
  Vermont: 'America/New_York',
  Virginia: 'America/New_York',
  Washington: 'America/Los_Angeles',
  Wisconsin: 'America/Chicago',
  Wyoming: 'America/Denver',
  'New Hampshire': 'America/New_York',
  'New Jersey': 'America/New_York',
  'New Mexico': 'America/Denver',
  'New York': 'America/New_York',
  'North Carolina': 'America/New_York',
  'North Dakota': 'America/Chicago',
  'Rhode Island': 'America/New_York',
  'South Carolina': 'America/New_York',
  'South Dakota': 'America/Chicago',
  'Washington, D.C.': 'America/New_York',
  'West Virginia': 'America/New_York',
};

/** Curated world sample for manual entry outside VN/US (search, not geocoding). */
export const WORLD_SAMPLE: readonly BirthPlaceInfo[] = [
  { label: 'London, UK', zone: 'Europe/London', lat: 51.5, lon: -0.13, group: 'WORLD' },
  { label: 'Paris, France', zone: 'Europe/Paris', lat: 48.86, lon: 2.35, group: 'WORLD' },
  { label: 'Berlin, Germany', zone: 'Europe/Berlin', lat: 52.52, lon: 13.4, group: 'WORLD' },
  { label: 'Moscow, Russia', zone: 'Europe/Moscow', lat: 55.76, lon: 37.62, group: 'WORLD' },
  { label: 'Tokyo, Japan', zone: 'Asia/Tokyo', lat: 35.68, lon: 139.69, group: 'WORLD' },
  { label: 'Seoul, South Korea', zone: 'Asia/Seoul', lat: 37.57, lon: 126.98, group: 'WORLD' },
  { label: 'Beijing, China', zone: 'Asia/Shanghai', lat: 39.9, lon: 116.4, group: 'WORLD' },
  { label: 'Shanghai, China', zone: 'Asia/Shanghai', lat: 31.23, lon: 121.47, group: 'WORLD' },
  { label: 'Taipei, Taiwan', zone: 'Asia/Taipei', lat: 25.03, lon: 121.57, group: 'WORLD' },
  { label: 'Singapore', zone: 'Asia/Singapore', lat: 1.35, lon: 103.82, group: 'WORLD' },
  { label: 'Bangkok, Thailand', zone: 'Asia/Bangkok', lat: 13.76, lon: 100.5, group: 'WORLD' },
  { label: 'Sydney, Australia', zone: 'Australia/Sydney', lat: -33.87, lon: 151.21, group: 'WORLD' },
  { label: 'Melbourne, Australia', zone: 'Australia/Melbourne', lat: -37.81, lon: 144.96, group: 'WORLD' },
  { label: 'Toronto, Canada', zone: 'America/Toronto', lat: 43.65, lon: -79.38, group: 'WORLD' },
  { label: 'Vancouver, Canada', zone: 'America/Vancouver', lat: 49.28, lon: -123.12, group: 'WORLD' },
  { label: 'São Paulo, Brazil', zone: 'America/Sao_Paulo', lat: -23.55, lon: -46.63, group: 'WORLD' },
  { label: 'Mexico City, Mexico', zone: 'America/Mexico_City', lat: 19.43, lon: -99.13, group: 'WORLD' },
  { label: 'Dubai, UAE', zone: 'Asia/Dubai', lat: 25.2, lon: 55.27, group: 'WORLD' },
  { label: 'Kolkata, India', zone: 'Asia/Kolkata', lat: 22.57, lon: 88.36, group: 'WORLD' },
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
