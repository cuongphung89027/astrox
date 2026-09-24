"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { FEATURE_ROUTES, trackFeature } from "@/lib/feature-telemetry";
export function FeatureReporting() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const service = FEATURE_ROUTES[pathname];
    if (service) trackFeature("feature_view", service, "navigation");
  }, [pathname]);
  return null;
}
