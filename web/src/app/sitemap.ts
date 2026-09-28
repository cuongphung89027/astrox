import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
const BASE = 'https://theastrox.space';
/** vi/en page pairs (plan §C route map); experts stays Vietnamese-only. */
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['/', '/en'],
  ['/tuvi', '/en/zi-wei'],
  ['/tarot', '/en/tarot'],
  ['/cunghoangdao', '/en/astrology'],
  ['/kinhdich', '/en/i-ching'],
  ['/battu', '/en/ba-zi'],
  ['/thansohoc', '/en/numerology'],
  ['/tuonghop', '/en/compatibility'],
  ['/licham', '/en/lunar-calendar'],
  ['/chitay', '/en/palm-reading'],
  ['/banggia', '/en/pricing'],
  ['/dieukhoan', '/en/terms'],
];
export default function sitemap(): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  for (const [vi, en] of PAIRS) {
    out.push({
      url: `${BASE}${vi}`,
      changeFrequency: 'weekly',
      priority: vi === '/' ? 1 : 0.7,
      alternates: { languages: { vi: `${BASE}${vi}`, en: `${BASE}${en}`, 'x-default': `${BASE}${vi}` } },
    });
    out.push({
      url: `${BASE}${en}`,
      changeFrequency: 'weekly',
      priority: vi === '/' ? 0.9 : 0.6,
      alternates: { languages: { vi: `${BASE}${vi}`, en: `${BASE}${en}`, 'x-default': `${BASE}${vi}` } },
    });
  }
  out.push({ url: `${BASE}/chuyengia`, changeFrequency: 'weekly', priority: 0.5 });
  return out;
}
