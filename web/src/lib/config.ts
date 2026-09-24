/** Cấu hình backend — port từ index.html (window.ASTROX_AUTH_API_BASE, v.v.) */
export const AUTH_API_BASE = (
  process.env.NEXT_PUBLIC_AUTH_API_BASE || "https://api.theastrox.space"
).replace(/\/$/, "");

export const AI_BASE = "/api/ai";
export const STORAGE_KEY = "astrox_v2_state";
export const DEFAULT_MODEL = "muse-spark-1.3-contributor";
export const PROMPT_VERSION = "2026-09-content-fix-v5";
