import type { NextConfig } from "next";
import path from "node:path";

/**
 * AstroX FE v5 (Next.js) — static export.
 *
 * App thuần client-side (tính toán lá số + gọi AI) nên export tĩnh là đủ;
 * output đặt ở web/out/, deploy về lại Cloudflare Pages cạnh functions/
 * hiện có để /api/* chạy cùng origin. Route /tuvi được Pages phục vụ từ
 * tuvi.html (hoặc tuvi/index.html nếu bật trailingSlash).
 */
const nextConfig: NextConfig = {
  // Shared admin contracts live beside web/, and must resolve in both bundles.
  turbopack: { root: path.resolve(__dirname, "..") },
  ...(process.env.NODE_ENV === "development"
    ? {
        async rewrites() {
          return [
            { source: "/api/admin/:path*", destination: "http://127.0.0.1:8789/api/admin/:path*" },
            { source: "/api/site-config", destination: "http://127.0.0.1:8789/api/site-config" },
            // Local by default so dev traffic never spends production points; opt in with ASTROX_PROD_AI=1.
            { source: "/api/ai", destination: process.env.ASTROX_PROD_AI === "1" ? "https://theastrox.space/api/ai" : "http://127.0.0.1:8789/api/ai" },
          ];
        },
      }
    : { output: "export" as const }),
  images: { unoptimized: true },
  // Playwright/QA sometimes hits 127.0.0.1; Next 16 blocks cross-origin
  // dev assets by default and client hydration never runs (text stays opacity:0
  // => trang trắng khi mở qua tunnel).
  // Wildcard "*.trycloudflare.com" phủ mọi quick tunnel mới (mỗi lần chạy
  // cloudflared sinh 1 subdomain ngẫu nhiên), không cần sửa file mỗi lần.
  // Next 16.3.5 hỗ trợ wildcard qua matchWildcardDomain() trong
  // next/dist/server/app-render/csrf-protection.js.
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.trycloudflare.com"],
};

export default nextConfig;
