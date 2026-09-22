/** Kiểu dữ liệu dùng chung — giữ shape giống hệt state cũ (astrox_v2_state). */

export interface Profile {
  /** Tên gọi thân mật (bước 1 của onboarding cũ). */
  name: string;
  /** "Nam" | "Nữ" — giữ nguyên chuỗi như app cũ. */
  gender: string;
  /** Ngày sinh dương lịch dạng YYYY-MM-DD. */
  dob: string;
  /** Giờ sinh theo can giờ, ví dụ "Tí (23:00–01:00)". */
  hourChi: string;
  /** Exact local time (HH:mm), when known. */
  birthTime?: string;
  /** Nơi sinh (tự do). */
  place: string;
  /** Họ tên đầy đủ (tuỳ chọn — dùng cho Thần Số Học). */
  fullName?: string;
}

export interface AiCacheEntry {
  configRevision?: number;
  text: string;
  module?: string;
  topic?: string;
  period?: string;
  fingerprint?: string;
  promptVersion?: string;
  model?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number | null;
}

export interface AiProfileCache {
  tuviTopics: Record<string, AiCacheEntry>;
  tuviPeriod: { today: Record<string, AiCacheEntry>; week: Record<string, AiCacheEntry>; month: Record<string, AiCacheEntry> };
  zodiacTopics: Record<string, AiCacheEntry>;
  zodiacPeriod: { today: Record<string, AiCacheEntry>; week: Record<string, AiCacheEntry>; month: Record<string, AiCacheEntry> };
  kinhDich: Record<string, AiCacheEntry>;
  compatibility: Record<string, AiCacheEntry>;
  batuTopics: Record<string, AiCacheEntry>;
  numerologyTopics: Record<string, AiCacheEntry>;
  tarot: Record<string, AiCacheEntry>;
}

export interface AiCache {
  version: 2;
  profiles: Record<string, AiProfileCache>;
  legacy: Record<string, AiCacheEntry>;
}

export interface AppState {
  profile: Profile | null;
  chartImageBase64: string | null;
  chartImageMime: string;
  ziweiChart: unknown;
  natalChart: unknown;
  apiKey: string | null;
  model: string;
  onboarded: boolean;
  lastAiModel?: string;
  aiCache: AiCache;
}

export interface AstroxUser {
  id?: string | number;
  display_name?: string;
  [key: string]: unknown;
}
