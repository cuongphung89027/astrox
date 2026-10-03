import type { Metadata, Viewport } from 'next';
import { DocumentLayout } from '@/components/shell/DocumentLayout';
import { LocaleProvider } from '@/i18n/LocaleProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://theastrox.space'),
  title: {
    default: 'AstroX — Tử vi · Kinh Dịch · Cung Hoàng Đạo',
    template: '%s | AstroX',
  },
  description: 'Khám phá thế giới của bạn cùng AstroX.',
  icons: { icon: '/assets/logo.png' },
  openGraph: {
    type: 'website',
    siteName: 'AstroX',
    images: ['/assets/og/trangchu.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#f4f7f2',
  width: 'device-width',
  initialScale: 1,
};

export default function ViRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="vi">
      <DocumentLayout lang="vi">{children}</DocumentLayout>
    </LocaleProvider>
  );
}
