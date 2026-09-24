"use client";
import { useCallback, useEffect, useRef } from "react";
import { trackFeature } from "./feature-telemetry";
/** Report committed result presentation, not cache lookups during render.
 * Text remains in memory solely to distinguish fresh output; it is never sent.
 */
export function useFeatureResult(text: string, service: string, visible = true) {
  const fresh = useRef<string | null>(null);
  const last = useRef<{ text: string; service: string } | null>(null);
  useEffect(() => {
    if (!visible || !text) { last.current = null; return; }
    if (last.current?.text === text && last.current.service === service) return;
    last.current = { text, service };
    trackFeature("result_view", service, fresh.current === text ? "ai" : "cache");
    fresh.current = null;
  }, [text, service, visible]);
  return useCallback((value: string) => { fresh.current = value; }, []);
}
