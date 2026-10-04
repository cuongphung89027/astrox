import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { BatuClient } from '@/components/batu/BatuClient';
export const metadata: Metadata = {
  alternates: { canonical: '/en/ba-zi', languages: { vi: '/battu', en: '/en/ba-zi', 'x-default': '/battu' } },
  title: 'Ba Zi (Four Pillars) — Destiny readings by AstroX',
  description: 'Build your Ba Zi Four Pillars chart, explore Ten Gods and Useful God analysis, interpreted by AstroX.',
  ...socialMetadata('/en/ba-zi'),
};
export default function Page() {
  return <BatuClient />;
}
