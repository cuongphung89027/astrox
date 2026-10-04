/** Public, server-rendered identity only; never include account or reading data. */
export function SiteIdentity() {
  const base = 'https://theastrox.space';
  const identity = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        name: 'AstroX',
        url: `${base}/`,
        inLanguage: ['vi', 'en'],
        publisher: { '@id': `${base}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'AstroX',
        url: `${base}/`,
        logo: `${base}/assets/logo.png`,
        email: 'support@theastrox.space',
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(identity).replace(/</g, '\\u003c') }}
    />
  );
}
