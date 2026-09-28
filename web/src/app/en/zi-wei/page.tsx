import type { Metadata } from 'next';
import { TuViClient } from '@/components/tuvi/TuViClient';
export const metadata: Metadata = {
  alternates: { canonical: '/en/zi-wei', languages: { vi: '/tuvi', en: '/en/zi-wei', 'x-default': '/tuvi' } },
  title: 'Zi Wei Dou Shu — Chart readings by AstroX',
  description:
    'Build your Zi Wei Dou Shu chart and read daily, weekly and monthly fortunes grounded in real astronomical cycles, interpreted by AstroX.',
  openGraph: {
    title: 'Zi Wei Dou Shu — Chart readings by AstroX',
    description:
      'Build your Zi Wei Dou Shu chart and read daily, weekly and monthly fortunes grounded in real astronomical cycles, interpreted by AstroX.',
    images: ['/assets/og/tuvi.png'],
  },
};
export default function Page() {
  return <TuViClient />;
}
