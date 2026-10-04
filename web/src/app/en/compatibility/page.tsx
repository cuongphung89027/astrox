import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { CompatClient } from '@/components/compat/CompatClient';
export const metadata: Metadata = {
  alternates: {
    canonical: '/en/compatibility',
    languages: { vi: '/tuonghop', en: '/en/compatibility', 'x-default': '/tuonghop' },
  },
  title: 'Compatibility — Compare two charts',
  description: "Explore compatibility through Zi Wei, Ba Zi or zodiac signs. Compare two charts and reflect on your connection with AstroX.",
  ...socialMetadata('/en/compatibility'),
};
export default function Page() {
  return <CompatClient />;
}
