"use client";
import { useSyncExternalStore } from "react";

export interface Preferences { motion: "system" | "reduced"; readingSize: "normal" | "large"; period: "today" | "week" | "month"; }
const DEFAULT: Preferences = { motion: "system", readingSize: "normal", period: "today" };
const KEY = "astrox_preferences_v1";
let snapshot = DEFAULT;
let rawSnapshot: string | null | undefined;
function getSnapshot() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== rawSnapshot) {
      rawSnapshot = raw;
      const value = raw ? JSON.parse(raw) : {};
      snapshot = { motion: value.motion === "reduced" ? "reduced" : "system", readingSize: value.readingSize === "large" ? "large" : "normal", period: ["today", "week", "month"].includes(value.period) ? value.period : "today" };
    }
  } catch { return DEFAULT; }
  return snapshot;
}
function subscribe(listener: () => void) {
  window.addEventListener("astrox-preferences", listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener("astrox-preferences", listener); window.removeEventListener("storage", listener); };
}
export function usePreferences() { return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT); }
export function savePreferences(patch: Partial<Preferences>) {
  const next = { ...getSnapshot(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("astrox-preferences"));
}
