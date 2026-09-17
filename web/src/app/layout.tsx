import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { AuthProvider } from "@/lib/auth";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "vietnamese"],
  variable: "--font-bricolage",
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
    default: "AstroX — Tử vi · Kinh Dịch · Hoàng Đạo",
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
    <html lang="vi" className={`${bricolage.variable} ${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <div className="ax-bg" aria-hidden="true" />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
