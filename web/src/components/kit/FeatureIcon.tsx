import type { SVGProps } from 'react';
import { MODULES, type ModuleId } from '../../../../services/admin/modules.ts';

export type FeatureName =
  | 'palm'
  | 'home'
  | 'tuvi'
  | 'zodiac'
  | 'kinhdich'
  | 'battu'
  | 'numerology'
  | 'tarot'
  | 'compat'
  | 'profile'
  | 'explore'
  | 'settings'
  | 'wallet'
  | 'motion'
  | 'text'
  | 'calendar'
  | 'logout'
  | 'close'
  | 'invite'
  | 'play';
const MODULE_ICON: Record<ModuleId, FeatureName> = {
  tuvi: 'tuvi',
  zodiac: 'zodiac',
  kinhdich: 'kinhdich',
  batu: 'battu',
  numerology: 'numerology',
  tarot: 'tarot',
  compat: 'compat',
  palm: 'palm',
  'lunar-calendar': 'calendar',
  experts: 'profile',
};
/** Icon by route id (locale-independent) — preferred over path lookups in localized nav. */
export const FEATURE_BY_ID: Record<string, FeatureName> = { home: 'home', profile: 'profile', ...MODULE_ICON };
export const FEATURE_BY_PATH: Record<string, FeatureName> = {
  '/': 'home',
  ...Object.fromEntries(MODULES.flatMap(m => [m.route, ...m.legacyRoutes].map(route => [route, MODULE_ICON[m.id]]))),
  '/hoso': 'profile',
};
/** Shared AstroX line icons. Use currentColor so only the active navigation item is accented. */
export function FeatureIcon({
  name,
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { name: FeatureName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.55}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-feature-icon={name}
      {...props}
    >
      {name === 'palm' && (
        <>
          {/* Bàn tay xòe 4 ngón + ngón cái phải theo icon Sơn gửi 29/09 —
              glyph front_hand (Material Symbols, weight 300, Apache-2.0) đặt
              trong không gian 960; scale về 24. Bút ~1.5đ khớp họ nét 1.55. */}
          <path
            d="M486.54-490v-370q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63 8.62 8.62 8.62 21.37v370h-60Zm-153.46 0v-330q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63 8.62 8.62 8.62 21.37v330h-60Zm167 430q-133.62 0-226.85-93.18Q180-246.35 180-380v-370q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q240-762.75 240-750v370q0 109 75.5 184.5T500-120q109 0 184.5-75.5T760-380v-150h-10q-20.85 0-35.42 14.58Q700-500.85 700-480v138.46h-98.46q-37.62 0-63.81 26.19-26.19 26.19-26.19 63.81v30h-60v-30q0-62.15 43.92-106.08 43.93-43.92 106.08-43.92H640V-780q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q700-792.75 700-780v204.69q11.15-6.84 23.45-10.77Q735.76-590 750-590h70v210q0 133.65-93.16 226.82Q633.69-60 500.08-60ZM530-355Z"
            fill="currentColor"
            stroke="none"
            transform="scale(.025) translate(0 960)"
          />
        </>
      )}
      {name === 'home' && (
        <>
          <path d="m3.5 10.5 8.5-7 8.5 7" />
          <path d="M5.5 9v11h5v-6h3v6h5V9" />
        </>
      )}
      {name === 'tuvi' && (
        <>
          <path d="M19.8 14.2A8.3 8.3 0 0 1 9.8 4.1a8.4 8.4 0 1 0 10 10.1Z" />
          <path d="m17 3 .85 2.65L20.5 6.5l-2.65.85L17 10l-.85-2.65-2.65-.85 2.65-.85Z" strokeWidth="1.3" />
        </>
      )}
      {name === 'zodiac' && (
        <>
          <circle cx="12" cy="12" r="7.5" />
          <path d="m12 5.8 1.8 4.1 4.5.4-3.4 3 1 4.4-3.9-2.3-3.9 2.3 1-4.4-3.4-3 4.5-.4Z" />
        </>
      )}
      {name === 'kinhdich' && <path d="M5 6h14M5 12h5m4 0h5M5 18h14" />}
      {name === 'battu' && (
        <>
          <path d="M3 7h3m2-2h3m2 0h3m2 2h3M4.5 7v11M9.5 5v13M14.5 5v13M19.5 7v11M3 18h3m2 0h3m2 0h3m2 0h3M3 21h18" />
          <path d="M3.5 11h2m3-2h2m3 0h2m3 2h2" strokeWidth="1.2" />
        </>
      )}
      {name === 'numerology' && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 7.5h7L10 17m-1-5h6" />
        </>
      )}
      {name === 'tarot' && (
        <>
          <rect x="7" y="3" width="13" height="18" rx="2" />
          <path d="M4 6H3v13a2 2 0 0 0 2 2m8.5-14 1.2 3.4L18 12l-3.3 1.6-1.2 3.4-1.2-3.4L9 12l3.3-1.6Z" />
        </>
      )}
      {name === 'compat' && <path d="M12 20 4.3 12.5C-1 7.2 6.6.2 12 6.5 17.4.2 25 7.2 19.7 12.5Z" />}
      {name === 'profile' && (
        <>
          <circle cx="12" cy="7.5" r="3.5" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </>
      )}
      {name === 'settings' && (
        <>
          <path d="M4 7h16M4 17h16" />
          <circle cx="9" cy="7" r="2.5" fill="var(--color-kem, #faf6eb)" />
          <circle cx="16" cy="17" r="2.5" fill="var(--color-kem, #faf6eb)" />
        </>
      )}
      {name === 'wallet' && (
        <>
          <rect x="3" y="5" width="18" height="15" rx="2" />
          <path d="M3 8V5l14-3v3M21 11h-6v5h6M17.5 13.5h.01" />
        </>
      )}
      {name === 'motion' && (
        <>
          <path d="M3 8h9a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h4" />
        </>
      )}
      {name === 'text' && <path d="m3 19 6-14 6 14M5 14h8M16 11h6M19 11v8" />}
      {name === 'calendar' && (
        <>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h7" />
        </>
      )}
      {name === 'logout' && (
        <>
          <path d="M10 4H5v16h5M10 12h11m-4-4 4 4-4 4" />
        </>
      )}
      {name === 'close' && <path d="m6 6 12 12M6 18 18 6" />}
      {name === 'explore' && <path d="M12 5v14M5 12h14" />}
      {name === 'invite' && (
        <>
          <circle cx="9.5" cy="8" r="3.4" />
          <path d="M3.5 20.5v-1.7a6 6 0 0 1 12 0v1.7" />
          <path d="M18.5 5.5v5M16 8h5" />
        </>
      )}
      {name === 'play' && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m10 8.6 6 3.4-6 3.4Z" />
        </>
      )}
    </svg>
  );
}
