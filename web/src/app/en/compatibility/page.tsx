import type { Metadata } from 'next';
import { CompatClient } from '@/components/compat/CompatClient';
export const metadata: Metadata = {
  alternates: {
    canonical: '/en/compatibility',
    languages: { vi: '/tuonghop', en: '/en/compatibility', 'x-default': '/tuonghop' },
  },
  title: 'Compatibility — Compare two charts',
  description: "Compare two people's zodiac charts and see how compatible you are in character and emotion.",
  openGraph: {
    title: 'Compatibility — Compare two charts',
    description: "Compare two people's zodiac charts and see how compatible you are in character and emotion.",
    images: ['/assets/og/trangchu.png'],
  },
};
export default function Page() {
  return <CompatClient />;
}
