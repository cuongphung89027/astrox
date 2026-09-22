import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { RouteBoundary } from "@/components/shell/RouteBoundary";

/** Beautique Display (serif display) — bộ font riêng, đủ glyph tiếng Việt. */
const beautique = localFont({
  src: [
    { path: "./fonts/BeautiqueDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/BeautiqueDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/BeautiqueDisplay-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/BeautiqueDisplay-Black.woff2", weight: "900", style: "normal" },
    { path: "./fonts/BeautiqueDisplay-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-beautique",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bevn",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://theastrox.space"),
  title: {
    default: "AstroX — Tử vi · Kinh Dịch · Cung Hoàng Đạo",
    template: "%s | AstroX",
  },
  description: "Khám phá thế giới của bạn cùng AstroX.",
  icons: { icon: "/assets/logo.png" },
  openGraph: {
    type: "website",
    siteName: "AstroX",
    images: ["/assets/og/trangchu.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className={`${beautique.variable} ${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RouteBoundary>{children}</RouteBoundary>
      </body>
    </html>
  );
}
