/** Cấu hình backend — port từ index.html (window.ASTROX_AUTH_API_BASE, v.v.) */
export const AUTH_API_BASE = (
  process.env.NEXT_PUBLIC_AUTH_API_BASE || "https://api.theastrox.space"
).replace(/\/$/, "");

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const AI_BASE = "/api/ai";
export const STORAGE_KEY = "astrox_v2_state";
export const MOTION_KEY = "astrox_motion_pref";
export const DEFAULT_MODEL = "muse-spark-1.3-contributor";
export const PROMPT_VERSION = "2026-09-content-fix-v5";

export const MODULE_NAMES: Record<string, string> = {
  tuvi: "Tử Vi",
  zodiac: "Cung Hoàng Đạo",
  kinhdich: "Kinh Dịch",
  batu: "Bát Tự",
  numerology: "Thần Số Học",
  tarot: "Tarot",
};
export const GATED_MODULES = ["tuvi", "zodiac", "batu", "numerology"];
export const ALL_MODULES = ["tuvi", "zodiac", "kinhdich", "batu", "numerology", "tarot"];
