import type { Metadata } from 'next';
import catalog from '../../design/og/catalog.json' with { type: 'json' };

type SocialRoute = keyof typeof catalog.routes;
const BASE = 'https://theastrox.space';

/** Static sharing cards only: never derived from account data or URL query strings. */
export function socialMetadata(route: SocialRoute): Pick<Metadata, 'openGraph' | 'twitter'> {
  const entry = catalog.routes[route];
  if (!entry) throw new Error(`Unknown social route: ${route}`);
  const theme = catalog.themes.find(item => item.id === entry.theme);
  const content = theme?.[entry.locale as 'vi' | 'en'];
  if (!theme || !content) throw new Error(`Missing localized sharing card: ${route}`);
  const image = {
    url: `${BASE}/assets/og/${catalog.version}/${theme.id}-${entry.locale}.png`,
    width: catalog.width,
    height: catalog.height,
    alt: content.alt,
  };
  return {
    openGraph: {
      title: content.title,
      description: content.description,
      url: `${BASE}${entry.canonical}`,
      siteName: 'AstroX',
      type: 'website',
      locale: entry.locale === 'vi' ? 'vi_VN' : 'en_US',
      alternateLocale: theme.en ? (entry.locale === 'vi' ? ['en_US'] : ['vi_VN']) : [],
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}
