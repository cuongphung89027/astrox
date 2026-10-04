import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata, Viewport } from 'next';
import { DocumentLayout } from '@/components/shell/DocumentLayout';
import { LocaleProvider } from '@/i18n/LocaleProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://theastrox.space'),
  title: {
    default: 'AstroX — Tarot, Astrology & Numerology',
    template: '%s | AstroX',
  },
  description: 'Explore Tarot, astrology, numerology, Zi Wei and Ba Zi with AstroX. Build your chart, draw cards and use the lunar calendar for everyday reflection.',
  icons: { icon: '/assets/logo.png' },
  ...socialMetadata('/en'),
};

export const viewport: Viewport = {
  themeColor: '#fbf6ec',
  width: 'device-width',
  initialScale: 1,
};

export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="en">
      <DocumentLayout lang="en">{children}</DocumentLayout>
    </LocaleProvider>
  );
}
