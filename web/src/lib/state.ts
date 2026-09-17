"use client";

/**
 * Store client-side — port trung thực từ STATE/loadState/saveState và bộ máy
 * AI-cache của index.html. Giữ nguyên STORAGE_KEY để người dùng cũ của trang
 * (cùng origin) không mất hồ sơ + cache AI khi chuyển sang bản Next.js.
 *
 * Dùng mô hình tiny store + subscribe để React đọc qua useSyncExternalStore
 * (xem src/lib/use-store.ts), không cần dependency ngoài.
 */
import { DEFAULT_MODEL, PROMPT_VERSION, STORAGE_KEY } from "./config";
import type { AiCache, AiProfileCache, AppState, Profile } from "./types";

function emptyAiProfileCache(): AiProfileCache {
  return {
    tuviTopics: {},
    tuviPeriod: { today: {}, week: {}, month: {} },
    zodiacTopics: {},
    zodiacPeriod: { today: {}, week: {}, month: {} },
    kinhDich: {},
    compatibility: {},
    batuTopics: {},
    numerologyTopics: {},
    tarot: {},
  };
}

function defaultState(): AppState {
  return {
    profile: null,
    chartImageBase64: null,
    chartImageMime: "image/jpeg",
    ziweiChart: null,
    natalChart: null,
    apiKey: null,
    model: DEFAULT_MODEL,
    onboarded: false,
    aiCache: { version: 2, profiles: {}, legacy: {} },
  };
}

function stableHash(value: string): string {
  const hash = (seed: number) => {
    let h = seed;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  return hash(2166136261) + hash(374761393) + hash(668265263) + hash(2246822519);
}

function makeFingerprint(profile: Profile | null, chart: unknown, image: string | null): string {
  const p = profile || ({} as Profile);
  return stableHash(
    JSON.stringify({
      profile: { name: p.name || "", gender: p.gender || "", dob: p.dob || "", hourChi: p.hourChi || "", place: p.place || "" },
      chart: chart || null,
      image: image ? stableHash(image) : "",
      promptVersion: PROMPT_VERSION,
    }),
  );
}

function migrateAiCache(state: AppState): AiCache {
  const old = state.aiCache as AiCache & Record<string, unknown>;
  if (old && old.version === 2 && old.profiles && typeof old.profiles === "object") return old;
  const next: AiCache = { version: 2, profiles: {}, legacy: {} };
  const target = state.profile
    ? ((next.profiles[makeFingerprint(state.profile, state.ziweiChart, state.chartImageBase64)] = emptyAiProfileCache()))
    : next.legacy;
  (["tuviTopics", "tuviPeriod", "zodiacTopics", "zodiacPeriod"] as const).forEach((k) => {
    const v = (old as Record<string, unknown>)[k];
    if (v) (target as unknown as Record<string, unknown>)[k] = v;
  });
  return next;
}

function loadState(): AppState {
  const base = defaultState();
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = { ...base, ...JSON.parse(raw) } as AppState;
    parsed.aiCache = migrateAiCache(parsed);
    return parsed;
  } catch {
    return base;
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

let state: AppState = defaultState();
let hydrated = false;
const listeners = new Set<() => void>();

export function getState(): AppState {
  if (!hydrated && typeof window !== "undefined") {
    state = loadState();
    state.apiKey = null;
    if (state.model !== DEFAULT_MODEL) state.model = DEFAULT_MODEL;
    hydrated = true;
  }
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((l) => l());
}

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* đầy bộ nhớ — bỏ qua, UI nên tự xử thông báo */
  }
  emit();
}

export function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  saveState();
}

export function setProfile(profile: Profile | null) {
  state = { ...state, profile, onboarded: !!profile };
  saveState();
  notifyDataDirty();
}

export function clearDerivedData() {
  state = {
    ...state,
    profile: null,
    chartImageBase64: null,
    ziweiChart: null,
    natalChart: null,
  };
  saveState();
  notifyDataDirty();
}

/* ------------------------------------------------------------------ */
/* AI cache (port 1:1 từ index.html)                                  */
/* ------------------------------------------------------------------ */

export function cacheFingerprint(): string {
  return stableHash(
    JSON.stringify({
      base: makeFingerprint(state.profile, state.ziweiChart, state.chartImageBase64),
      natal: state.natalChart || null,
    }),
  );
}

function getActiveAiCache(): AiProfileCache {
  const fp = cacheFingerprint();
  if (!state.aiCache.profiles[fp]) state.aiCache.profiles[fp] = emptyAiProfileCache();
  return state.aiCache.profiles[fp];
}

function cacheText(entry: unknown): string {
  if (typeof entry === "string") return entry;
  return entry && typeof (entry as { text?: string }).text === "string" ? (entry as { text: string }).text : "";
}

function cacheEntryUsable(entry: unknown, force: boolean): boolean {
  const e = entry as { expiresAt?: number | null; promptVersion?: string } | null;
  return (
    !force &&
    !!entry &&
    (!e?.expiresAt || e.expiresAt > Date.now()) &&
    (!e?.promptVersion || e.promptVersion === PROMPT_VERSION)
  );
}

type CacheGroup =
  | keyof AiProfileCache
  | "tuviPeriod.today"
  | "tuviPeriod.week"
  | "tuviPeriod.month"
  | "zodiacPeriod.today"
  | "zodiacPeriod.week"
  | "zodiacPeriod.month";

export function readAiCache(group: CacheGroup, key: string, force = false): string {
  const cache = getActiveAiCache();
  const entry = resolveBucket(cache, group)?.[key];
  return cacheEntryUsable(entry, force) ? cacheText(entry) : "";
}

export function writeAiCache(
  group: CacheGroup,
  key: string,
  text: string,
  meta: { module?: string; topic?: string; period?: string } = {},
) {
  const now = Date.now();
  const cache = getActiveAiCache();
  const bucket = resolveBucket(cache, group);
  if (!bucket) return;
  bucket[key] = {
    text,
    module: meta.module || "",
    topic: meta.topic || "",
    period: meta.period || "",
    fingerprint: cacheFingerprint(),
    promptVersion: PROMPT_VERSION,
    model: state.lastAiModel || state.model,
    createdAt: bucket[key]?.createdAt || now,
    updatedAt: now,
    expiresAt: null,
  };
  saveState();
  notifyDataDirty();
}

function resolveBucket(cache: AiProfileCache, group: CacheGroup): Record<string, import("./types").AiCacheEntry> | null {
  if (group === "tuviPeriod.today") return cache.tuviPeriod.today;
  if (group === "tuviPeriod.week") return cache.tuviPeriod.week;
  if (group === "tuviPeriod.month") return cache.tuviPeriod.month;
  if (group === "zodiacPeriod.today") return cache.zodiacPeriod.today;
  if (group === "zodiacPeriod.week") return cache.zodiacPeriod.week;
  if (group === "zodiacPeriod.month") return cache.zodiacPeriod.month;
  return (cache as unknown as Record<string, Record<string, import("./types").AiCacheEntry>>)[group] || null;
}

/* Đồng bộ user-data: state.ts chỉ phát tín hiệu dirty; việc fetch nằm ở auth.tsx. */
let dirtyListeners = new Set<() => void>();
export function onDataDirty(cb: () => void): () => void {
  dirtyListeners.add(cb);
  return () => {
    dirtyListeners.delete(cb);
  };
}
function notifyDataDirty() {
  dirtyListeners.forEach((cb) => cb());
}
