"use client";
import { useEffect } from "react";
import { usePreferences } from "@/lib/preferences";
export function PreferencesEffect() {
  const settings = usePreferences();
  useEffect(() => {
    document.documentElement.dataset.motion = settings.motion;
    document.documentElement.style.setProperty("--reading-font-size", settings.readingSize === "large" ? "18px" : "16px");
  }, [settings]);
  return null;
}
