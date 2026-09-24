"use client";
import { SERVICE_CATALOG } from "../../../services/admin/catalog.ts";
export type FeatureEvent = "feature_view" | "feature_start" | "result_view" | "result_save";
export type FeatureSource = "navigation" | "calculation" | "ai" | "cache" | "saved";
const modules = ["tuvi", "zodiac", "kinhdich", "batu", "numerology", "tarot", "compat"];
const services = new Map([...modules.map(m => [m, m] as const), ...SERVICE_CATALOG.map(s => [s.id, s.module] as const)]);
const SESSION_KEY = "astrox_feature_session_v1";
const TTL = 30 * 60 * 1000;
/** Anonymous, tab-scoped 30-minute activity sessions; never people or accounts. */
export function trackFeature(event: FeatureEvent, service: string, source: FeatureSource, id?: string) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  const featureModule = services.get(service);
  if (!featureModule) return;
  try {
    const now = Date.now();
    let session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!session || typeof session.id !== "string" || !Number.isFinite(session.at) || now - session.at > TTL || now < session.at) session = { id: crypto.randomUUID(), at: now };
    session.at = now;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const device = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
    void fetch("/api/feature-events", {
      method: "POST", credentials: "omit", keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: id || crypto.randomUUID(), event, module: featureModule, service_id: service, source, session_id: session.id, device }),
    }).catch(() => {});
  } catch { /* Disabled storage / telemetry must never interrupt a reading. */ }
}
export const FEATURE_ROUTES: Record<string, string> = { "/tuvi": "tuvi", "/cunghoangdao": "zodiac", "/kinhdich": "kinhdich", "/battu": "batu", "/thansohoc": "numerology", "/tarot": "tarot", "/tuonghop": "compat" };
