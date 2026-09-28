import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/hoso', '/en/profile', '/api/'] },
    sitemap: 'https://theastrox.space/sitemap.xml',
  };
}
