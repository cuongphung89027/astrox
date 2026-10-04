import { socialMetadata } from '@/lib/social-metadata';
import { PalmReader } from '@/components/discovery/PalmReader';
export const metadata = {
  alternates: {
    canonical: '/en/palm-reading',
    languages: { vi: '/chitay', en: '/en/palm-reading', 'x-default': '/chitay' },
  },
  title: 'Palm Reading',
  description: 'Photograph your palm and explore its lines with AstroX.',
  ...socialMetadata('/en/palm-reading'),
};
export default function Page() {
  return <PalmReader />;
}
