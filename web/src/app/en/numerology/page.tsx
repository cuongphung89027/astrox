import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { NumerologyClient } from '@/components/numerology/NumerologyClient';
export const metadata: Metadata = {
  alternates: {
    canonical: '/en/numerology',
    languages: { vi: '/thansohoc', en: '/en/numerology', 'x-default': '/thansohoc' },
  },
  title: 'Numerology — Decode the numbers of your life',
  description: 'Calculate your Life Path, Destiny number and core numerology indicators, interpreted by AstroX.',
  ...socialMetadata('/en/numerology'),
};
export default function Page() {
  return <NumerologyClient />;
}
