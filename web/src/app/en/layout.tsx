import type { Metadata, Viewport } from 'next';
import { DocumentLayout } from '@/components/shell/DocumentLayout';
import { LocaleProvider } from '@/i18n/LocaleProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://theastrox.space'),
  title: {
    default: 'AstroX — Zi Wei · Tarot · Astrology',
    template: '%s | AstroX',
  },
  description: 'Explore your world with AstroX.',
  icons: { icon: '/assets/logo.png' },
  openGraph: {
    type: 'website',
    siteName: 'AstroX',
    images: ['/assets/og/trangchu.png'],
  },
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
