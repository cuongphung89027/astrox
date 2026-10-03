import type { ReactNode } from 'react';
import s from './Palm.module.css';

const paths = {
  camera: (
    <>
      <path d="M8 5 9.5 3h5L16 5h4a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.5" />
      <path d="m3 17 5-5 4 4 4-6 5 7" />
    </>
  ),
  zoom: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6M7 10h6M10 7v6" />
    </>
  ),
  retake: (
    <>
      <path d="M4 9a8 8 0 1 1 0 6M4 4v5h5" />
      <path d="M9 12h6M12 9v6" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
    </>
  ),
  save: (
    <>
      <path d="M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  compare: (
    <>
      <path d="M8 3v18M16 3v18M3 7h10m-3-3 3 3-3 3M21 17H11m3-3-3 3 3 3" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11a9 9 0 0 1-9 9H3l2-4a9 9 0 1 1 16-5Z" />
      <path d="M8 10h8M8 14h5" />
    </>
  ),
  stop: <rect x="5" y="5" width="14" height="14" rx="2" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  light: (
    <>
      <path d="m13 2-8 12h6l-1 8 9-12h-6Z" />
    </>
  ),
  expert: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
};

/** Decorative action icons follow the shared AstroX line style; labels remain accessible. */
export function PalmActionLabel({ icon, children }: { icon: keyof typeof paths; children: ReactNode }) {
  return (
    <span className={s.actionLabel}>
      <svg
        className={s.actionIcon}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {paths[icon]}
      </svg>
      {children != null && <span className={s.actionText}>{children}</span>}
    </span>
  );
}
