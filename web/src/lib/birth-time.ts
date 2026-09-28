/**
 * Civil-time ⇄ instant conversion for international births (plan Task 06).
 * Zero dependencies: uses the platform tz database through Intl — the same
 * historical tzdata browsers, node and Workers ship. Wall times are ALWAYS
 * local civil time at the birth place; nothing here ever assumes UTC+7.
 *
 * DST policy (documented in docs/plans/english-us-birth-rules.md):
 *  - nonexistent wall time (spring-forward gap) → flagged `nonexistent`
 *  - ambiguous wall time (fall-back overlap) → flagged `ambiguous`, instant
 *    resolves to the FIRST occurrence (pre-transition offset).
 */

export type WallTime = { year: number; month: number; day: number; hour: number; minute: number };
export type ZonedInstant = {
  epochMs: number;
  offsetMinutes: number;
  ambiguous: boolean;
  nonexistent: boolean;
  zone: string;
};

const partsCache = new Map<string, Intl.DateTimeFormat>();
function zoneFormatter(zone: string): Intl.DateTimeFormat | null {
  let dtf = partsCache.get(zone);
  if (dtf) return dtf;
  try {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return null;
  }
  partsCache.set(zone, dtf);
  return dtf;
}

export function isValidZone(zone: string): boolean {
  return zoneFormatter(zone) !== null;
}

function wallInZone(epochMs: number, zone: string): WallTime | null {
  const dtf = zoneFormatter(zone);
  if (!dtf) return null;
  const parts = dtf.formatToParts(new Date(epochMs));
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? '0');
  const hour = get('hour') % 24; // Intl may yield "24" at midnight with hour12:false
  return { year: get('year'), month: get('month'), day: get('day'), hour, minute: get('minute') };
}

/** Zone offset (minutes east of UTC) in effect at an instant; null for a bad zone. */
export function zoneOffsetMinutes(epochMs: number, zone: string): number | null {
  const wall = wallInZone(epochMs, zone);
  if (!wall) return null;
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  return Math.round((asUtc - Math.floor(epochMs / 60000) * 60000) / 60000);
}

const sameWall = (a: WallTime | null, b: WallTime) =>
  !!a && a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute;

/** All valid instants for a wall time (two during a fall-back overlap), earliest first. */
export function wallTimeCandidates(wall: WallTime, zone: string): ZonedInstant[] {
  if (!isValidZone(zone)) return [];
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  if (!Number.isFinite(asUtc)) return [];
  const candidates = new Set<number>();
  for (const probe of [asUtc - 12 * 3600000, asUtc, asUtc + 12 * 3600000]) {
    const off = zoneOffsetMinutes(probe, zone);
    if (off !== null) candidates.add(off);
  }
  const valid: ZonedInstant[] = [];
  for (const off of candidates) {
    const t = asUtc - off * 60000;
    if (zoneOffsetMinutes(t, zone) === off && sameWall(wallInZone(t, zone), wall)) {
      valid.push({ epochMs: t, offsetMinutes: off, ambiguous: false, nonexistent: false, zone });
    }
  }
  return valid.sort((a, b) => a.epochMs - b.epochMs);
}

/** Converts a civil wall time in `zone` to a UTC instant with DST diagnostics. */
export function wallTimeToInstant(wall: WallTime, zone: string): ZonedInstant | null {
  if (!isValidZone(zone)) return null;
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  if (!Number.isFinite(asUtc)) return null;
  // Offsets plausibly in effect around this wall clock (≤2 in real zones).
  const candidates = new Set<number>();
  for (const probe of [asUtc - 12 * 3600000, asUtc, asUtc + 12 * 3600000]) {
    const off = zoneOffsetMinutes(probe, zone);
    if (off !== null) candidates.add(off);
  }
  const valid: { epochMs: number; offsetMinutes: number }[] = [];
  for (const off of candidates) {
    const t = asUtc - off * 60000;
    const offAt = zoneOffsetMinutes(t, zone);
    if (offAt === off && sameWall(wallInZone(t, zone), wall)) valid.push({ epochMs: t, offsetMinutes: off });
  }
  if (!valid.length) {
    // Gap: no offset round-trips. Best-effort instant from the pre-transition offset,
    // so callers can still show a position while flagging `nonexistent`.
    const pre = zoneOffsetMinutes(asUtc - 12 * 3600000, zone) ?? 0;
    const post = zoneOffsetMinutes(asUtc + 12 * 3600000, zone) ?? pre;
    const off = Math.max(pre, post);
    return { epochMs: asUtc - off * 60000, offsetMinutes: off, ambiguous: false, nonexistent: true, zone };
  }
  valid.sort((a, b) => a.epochMs - b.epochMs);
  return {
    epochMs: valid[0].epochMs,
    offsetMinutes: valid[0].offsetMinutes,
    ambiguous: valid.length > 1,
    nonexistent: false,
    zone,
  };
}

/** Parses "HH:mm" → minutes since midnight; null when malformed. */
export function parseClock(value: string | undefined): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** Parses "YYYY-MM-DD" → parts; null when malformed (calendar validity checked by caller). */
export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}
