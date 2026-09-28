/**
 * Shared <html>/<body> document shell for both root layouts. Owns fonts,
 * globals.css and the RouteBoundary so (vi)/layout.tsx and en/layout.tsx only
 * differ in lang and metadata. Font file paths are relative to this file.
 */
import { Be_Vietnam_Pro } from 'next/font/google';
import localFont from 'next/font/local';
import '../../app/globals.css';
import { RouteBoundary } from './RouteBoundary';

/** Beautique Display (serif display) — bộ font riêng, đủ glyph tiếng Việt. */
const beautique = localFont({
  src: [
    { path: '../../app/fonts/BeautiqueDisplay-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../app/fonts/BeautiqueDisplay-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../app/fonts/BeautiqueDisplay-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../app/fonts/BeautiqueDisplay-Black.woff2', weight: '900', style: 'normal' },
    { path: '../../app/fonts/BeautiqueDisplay-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-beautique',
  display: 'swap',
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bevn',
  display: 'swap',
});

export function DocumentLayout({ lang, children }: { lang: 'vi' | 'en'; children: React.ReactNode }) {
  return (
    <html
      lang={lang}
      data-scroll-behavior="smooth"
      className={`${beautique.variable} ${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RouteBoundary>{children}</RouteBoundary>
      </body>
    </html>
  );
}
