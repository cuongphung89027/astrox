import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const catalog = JSON.parse(readFileSync(resolve(root, 'design/og/catalog.json'), 'utf8'));
const base = 'https://theastrox.space';
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(match => Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key.toLowerCase(), decode(value)])));
const file = path => resolve(root, 'out', path === '/' ? 'index.html' : `${path.slice(1)}.html`);
const sameUrl = (actual, expected) => assert.equal(new URL(actual).href, new URL(expected, base).href);
const failures = [];
const titles = new Set();
const publicRoutes = Object.entries(catalog.routes).filter(([path, entry]) => path === entry.canonical && !['/admin', '/hoso', '/en/profile'].includes(path));
for (const [path, entry] of publicRoutes) {
  try {
    const html = readFileSync(file(path), 'utf8');
    const meta = tags(html, 'meta'), links = tags(html, 'link');
    const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || '');
    assert.ok(title.length > 8, 'descriptive title');
    assert.equal((title.match(/AstroX/g) || []).length, 1, `one brand in title: ${title}`);
    assert.ok(!titles.has(title), `unique title: ${title}`); titles.add(title);
    assert.equal(tags(html, 'html')[0]?.lang, entry.locale, 'document language');
    assert.equal(meta.filter(item => item.name === 'description').length, 1, 'one description');
    assert.ok(meta.find(item => item.name === 'description').content.length > 40, 'meaningful description');
    assert.ok(!meta.some(item => item.name === 'robots' && item.content.includes('noindex')), 'public page indexable');
    const canonical = links.filter(item => item.rel === 'canonical');
    assert.equal(canonical.length, 1, 'one canonical'); sameUrl(canonical[0].href, path);
    const variants = publicRoutes.filter(([, variant]) => variant.theme === entry.theme);
    if (variants.length > 1) {
      for (const [variantPath, variant] of variants) {
        const alternate = links.find(item => item.hreflang === variant.locale);
        assert.ok(alternate, `missing ${variant.locale} alternate`); sameUrl(alternate.href, variantPath);
      }
      const vi = variants.find(([, variant]) => variant.locale === 'vi')[0];
      assert.ok(links.find(item => item.hreflang === 'x-default'), 'x-default');
      sameUrl(links.find(item => item.hreflang === 'x-default').href, vi);
    }
    const image = meta.find(item => item.property === 'og:image')?.content;
    assert.equal(image, `${base}/assets/og/${catalog.version}/${entry.theme}-${entry.locale}.png`, 'approved localized OG image');
    assert.ok(existsSync(resolve(root, 'out', new URL(image).pathname.slice(1))), 'OG asset exists');
    assert.equal(tags(html, 'h1').length, 1, 'one initial HTML H1');
    if (entry.theme === 'home') {
      const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
      const graph = blocks.flatMap(item => item['@graph'] || [item]);
      const site = graph.find(item => item['@type'] === 'WebSite'), org = graph.find(item => item['@type'] === 'Organization');
      assert.ok(site && org, 'WebSite and Organization identity');
      assert.equal(site.name, 'AstroX'); sameUrl(site.url, '/');
      assert.equal(org.name, 'AstroX'); assert.equal(org.email, 'support@theastrox.space');
      assert.ok(existsSync(resolve(root, 'out', new URL(org.logo).pathname.slice(1))), 'organization logo exists');
      assert.ok(!org.address && !org.aggregateRating, 'no invented address or rating');
    }
  } catch (error) { failures.push(`${path}: ${error.message}`); }
}
const sitemap = readFileSync(resolve(root, 'out/sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decode(match[1]));
assert.deepEqual([...sitemapUrls].sort(), publicRoutes.map(([path]) => `${base}${path}`).sort(), 'sitemap contains exactly public canonical URLs');
for (const path of ['/hoso', '/en/profile', '/admin']) {
  const meta = tags(readFileSync(file(path), 'utf8'), 'meta');
  assert.ok(meta.some(item => item.name === 'robots' && item.content.includes('noindex')), `${path}: private noindex`);
}
for (const [path, entry] of Object.entries(catalog.routes).filter(([path, entry]) => path !== entry.canonical)) {
  try { sameUrl(tags(readFileSync(file(path), 'utf8'), 'link').find(item => item.rel === 'canonical')?.href, entry.canonical); }
  catch (error) { failures.push(`${path}: alias canonical ${error.message}`); }
}
const robots = readFileSync(resolve(root, 'out/robots.txt'), 'utf8');
if (/Disallow: \/(?:hoso|en\/profile)/.test(robots)) failures.push('robots blocks Google from reading profile noindex');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`SEO export verified: ${publicRoutes.length} canonical pages, reciprocal VI/EN alternates, headings, identity schema, OG assets and private noindex.`);
