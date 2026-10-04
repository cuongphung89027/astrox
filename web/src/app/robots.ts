import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
/** Profile shells use crawlable meta noindex; their data APIs still require a session. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: 'https://theastrox.space/sitemap.xml',
  };
}
