import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { KinhDichClient } from '@/components/kinhdich/KinhDichClient';
export const metadata: Metadata = {
  alternates: { canonical: '/en/i-ching', languages: { vi: '/kinhdich', en: '/en/i-ching', 'x-default': '/kinhdich' } },
  title: 'I Ching — Cast and interpret hexagrams',
  description: 'Cast an I Ching hexagram, read the line texts and get an interpretation for your situation by AstroX.',
  ...socialMetadata('/en/i-ching'),
};
export default function Page() {
  return <KinhDichClient />;
}
