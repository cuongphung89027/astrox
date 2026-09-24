import type { SVGProps } from "react";
import { MODULES, type ModuleId } from "../../../../services/admin/modules.ts";

export type FeatureName = "palm" | "home" | "tuvi" | "zodiac" | "kinhdich" | "battu" | "numerology" | "tarot" | "compat" | "profile" | "explore" | "settings" | "wallet" | "motion" | "text" | "calendar" | "logout" | "close" | "invite" | "play";
const MODULE_ICON: Record<ModuleId, FeatureName> = { tuvi: "tuvi", zodiac: "zodiac", kinhdich: "kinhdich", batu: "battu", numerology: "numerology", tarot: "tarot", compat: "compat", palm: "palm", "lunar-calendar": "calendar", experts: "profile" };
export const FEATURE_BY_PATH: Record<string, FeatureName> = {
  "/": "home",
  ...Object.fromEntries(MODULES.flatMap(m => [m.route, ...m.legacyRoutes].map(route => [route, MODULE_ICON[m.id]]))),
  "/hoso": "profile",
};
/** Shared AstroX line icons. Use currentColor so only the active navigation item is accented. */
export function FeatureIcon({ name, size = 24, ...props }: SVGProps<SVGSVGElement> & { name: FeatureName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.55} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-feature-icon={name} {...props}>
    {name === "palm" && <><path d="M7 21 3 12c-1-3 2-4 3-1l2 3V5c0-2 3-2 3 0v6-8c0-2 3-2 3 0v8-6c0-2 3-2 3 0v7-4c0-2 3-2 3 0v6c0 4-2 6-3 7Z"/><path d="M10 15c3-2 5-1 6 1M11 18l4-1"/></>}
    {name === "home" && <><path d="m3.5 10.5 8.5-7 8.5 7"/><path d="M5.5 9v11h5v-6h3v6h5V9"/></>}
    {name === "tuvi" && <><path d="M19.8 14.2A8.3 8.3 0 0 1 9.8 4.1a8.4 8.4 0 1 0 10 10.1Z"/><path d="m17 3 .85 2.65L20.5 6.5l-2.65.85L17 10l-.85-2.65-2.65-.85 2.65-.85Z" strokeWidth="1.3"/></>}
    {name === "zodiac" && <><circle cx="12" cy="12" r="7.5"/><path d="m12 5.8 1.8 4.1 4.5.4-3.4 3 1 4.4-3.9-2.3-3.9 2.3 1-4.4-3.4-3 4.5-.4Z"/></>}
    {name === "kinhdich" && <path d="M5 6h14M5 12h5m4 0h5M5 18h14"/>}
    {name === "battu" && <><path d="M3 7h3m2-2h3m2 0h3m2 2h3M4.5 7v11M9.5 5v13M14.5 5v13M19.5 7v11M3 18h3m2 0h3m2 0h3m2 0h3M3 21h18"/><path d="M3.5 11h2m3-2h2m3 0h2m3 2h2" strokeWidth="1.2"/></>}
    {name === "numerology" && <><circle cx="12" cy="12" r="8.5"/><path d="M8.5 7.5h7L10 17m-1-5h6"/></>}
    {name === "tarot" && <><rect x="7" y="3" width="13" height="18" rx="2"/><path d="M4 6H3v13a2 2 0 0 0 2 2m8.5-14 1.2 3.4L18 12l-3.3 1.6-1.2 3.4-1.2-3.4L9 12l3.3-1.6Z"/></>}
    {name === "compat" && <path d="M12 20 4.3 12.5C-1 7.2 6.6.2 12 6.5 17.4.2 25 7.2 19.7 12.5Z"/>}
    {name === "profile" && <><circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>}
    {name === "settings" && <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5" fill="var(--color-kem, #faf6eb)"/><circle cx="16" cy="17" r="2.5" fill="var(--color-kem, #faf6eb)"/></>}
    {name === "wallet" && <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8V5l14-3v3M21 11h-6v5h6M17.5 13.5h.01"/></>}
    {name === "motion" && <><path d="M3 8h9a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h4"/></>}
    {name === "text" && <path d="m3 19 6-14 6 14M5 14h8M16 11h6M19 11v8"/>}
    {name === "calendar" && <><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h7"/></>}
    {name === "logout" && <><path d="M10 4H5v16h5M10 12h11m-4-4 4 4-4 4"/></>}
    {name === "close" && <path d="m6 6 12 12M6 18 18 6"/>}
    {name === "explore" && <path d="M12 5v14M5 12h14"/>}
    {name === "invite" && <><circle cx="9.5" cy="8" r="3.4"/><path d="M3.5 20.5v-1.7a6 6 0 0 1 12 0v1.7"/><path d="M18.5 5.5v5M16 8h5"/></>}
    {name === "play" && <><circle cx="12" cy="12" r="8.5"/><path d="m10 8.6 6 3.4-6 3.4Z"/></>}
  </svg>;
}
