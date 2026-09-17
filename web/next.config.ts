import type { NextConfig } from "next";

/**
 * AstroX FE v5 (Next.js) — static export.
 *
 * App thuần client-side (tính toán lá số + gọi AI) nên export tĩnh là đủ;
 * output đặt ở web/out/, deploy về lại Cloudflare Pages cạnh functions/
 * hiện có để /api/* chạy cùng origin. Route /tuvi được Pages phục vụ từ
 * tuvi.html (hoặc tuvi/index.html nếu bật trailingSlash).
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
