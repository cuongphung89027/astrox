import type { Metadata } from 'next';
import { ZodiacClient } from '@/components/zodiac/ZodiacClient';
export const metadata: Metadata = {
  alternates: {
    canonical: '/en/astrology',
    languages: { vi: '/cunghoangdao', en: '/en/astrology', 'x-default': '/cunghoangdao' },
  },
  title: 'Astrology — Western horoscope every day',
  description:
    'Daily, weekly and monthly horoscopes for all 12 zodiac signs based on real celestial positions, interpreted by AstroX.',
  openGraph: {
    title: 'Astrology — Western horoscope every day',
    description:
      'Daily, weekly and monthly horoscopes for all 12 zodiac signs based on real celestial positions, interpreted by AstroX.',
    images: ['/assets/og/cunghoangdao.png'],
  },
};
export default function Page() {
  return <ZodiacClient />;
}
