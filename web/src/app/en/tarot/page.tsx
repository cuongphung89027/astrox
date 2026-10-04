import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TarotClient } from '@/components/tarot/TarotClient';
export const metadata: Metadata = {
  alternates: { canonical: '/en/tarot', languages: { vi: '/tarot', en: '/en/tarot', 'x-default': '/tarot' } },
  title: 'Tarot — Draw and interpret',
  description:
    'Pick a deck, lay out popular Tarot spreads and read interpretations by AstroX based on the exact cards you drew.',
  ...socialMetadata('/en/tarot'),
};
export default function Page() {
  return (
    <Suspense
      fallback={
        <div role="status" className="p-6 text-center">
          <h1 className="sr-only">Tarot</h1>
          Opening Tarot…
        </div>
      }
    >
      <TarotClient />
    </Suspense>
  );
}
