#!/usr/bin/env node
/** Certify actual static-export metadata and optional exact deployed OG assets. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const web = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(path.join(web, 'design/og/catalog.json'), 'utf8'));
const args = process.argv.slice(2);
const option = name => args.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const base = option('base-url')?.replace(/\/$/, '');
const reportPath = option('report');
const origin = 'https://theastrox.space';
const report = {
  sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: web, encoding: 'utf8' }).trim(),
  base: base || 'local-export',
  routes: [],
  images: [],
};
const decode = s =>
  s.replace(
    /&(?:amp|quot|apos|lt|gt|#39);/g,
    x => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' })[x],
  );
const attributes = tag =>
  Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x => [x[1].toLowerCase(), decode(x[2])]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const singleton = (map, key, expected, route) => assert.deepEqual(map.get(key), [expected], `${route}: ${key}`);

function certifyHtml(raw, route, entry) {
  const html = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const meta = new Map();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(match[0]);
    const key = a.property || a.name;
    if (key) meta.set(key, [...(meta.get(key) || []), a.content]);
  }
  const theme = catalog.themes.find(x => x.id === entry.theme),
    content = theme[entry.locale];
  const image = `${origin}/assets/og/${catalog.version}/${theme.id}-${entry.locale}.png`;
  for (const [key, expected] of Object.entries({
    'og:image': image,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': content.alt,
    'og:title': content.title,
    'og:description': content.description,
    'og:url': entry.canonical === '/' ? origin : `${origin}${entry.canonical}`,
    'og:site_name': 'AstroX',
    'og:type': 'website',
    'og:locale': entry.locale === 'vi' ? 'vi_VN' : 'en_US',
    'twitter:card': 'summary_large_image',
    'twitter:image': image,
    'twitter:image:alt': content.alt,
    'twitter:title': content.title,
    'twitter:description': content.description,
  }))
    singleton(meta, key, expected, route);
  const htmlAttrs = attributes(html.match(/<html\b[^>]*>/i)[0]);
  if (route === entry.canonical) assert.equal(htmlAttrs.lang, entry.locale, `${route}: html language`);
  else assert.ok(raw.includes(`NEXT_REDIRECT;replace;${entry.canonical};307;`), `${route}: unchanged redirect target`);
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(x => attributes(x[0]));
  const privateRoute = ['/hoso', '/en/profile', '/admin'].includes(route);
  const alias = route !== entry.canonical;
  const canonical = entry.canonical === '/' ? origin : `${origin}${entry.canonical}`;
  assert.deepEqual(
    links.filter(x => x.rel === 'canonical').map(x => x.href),
    privateRoute || alias ? [] : [canonical],
    `${route}: canonical preservation`,
  );
  if (['/hoso', '/en/profile', '/admin'].includes(route)) {
    assert.match(meta.get('robots')?.join(' ') || '', /noindex/, `${route}: noindex`);
    assert.match(meta.get('robots')?.join(' ') || '', /nofollow/, `${route}: nofollow`);
  }
  // Preserve the existing canonical-only EN pricing policy, aliases and private pages.
  const paired = theme.en && !privateRoute && !alias && route !== '/en/pricing';
  const vi = Object.entries(catalog.routes).find(
    ([r, e]) => e.theme === theme.id && e.locale === 'vi' && r === e.canonical && r !== '/admin',
  )?.[0];
  const en = Object.entries(catalog.routes).find(
    ([r, e]) => e.theme === theme.id && e.locale === 'en' && r === e.canonical,
  )?.[0];
  const absolute = route => (route === '/' ? origin : `${origin}${route}`);
  const expectedAlternates = paired
    ? [
        { hreflang: 'vi', href: absolute(vi) },
        { hreflang: 'en', href: absolute(en) },
        { hreflang: 'x-default', href: absolute(vi) },
      ]
    : [];
  assert.deepEqual(
    links.filter(x => x.rel === 'alternate' && x.hreflang).map(x => ({ hreflang: x.hreflang, href: x.href })),
    expectedAlternates,
    `${route}: hreflang preservation`,
  );
  return { route, image, canonical: `${origin}${entry.canonical}`, locale: entry.locale };
}

for (const [route, entry] of Object.entries(catalog.routes)) {
  const relative = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
  const html = await readFile(path.join(web, 'out', relative), 'utf8');
  const result = certifyHtml(html, route, entry);
  if (base) {
    const response = await fetch(base + route, {
      redirect: 'manual',
      headers: { 'Accept-Language': entry.locale === 'vi' ? 'vi-VN,vi;q=0.9' : 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200, `${route}: deployed HTTP status`);
    assert.match(response.headers.get('content-type') || '', /text\/html/, `${route}: deployed content type`);
    certifyHtml(await response.text(), route, entry);
    result.http = response.status;
  }
  report.routes.push(result);
}

for (const theme of catalog.themes) {
  for (const locale of ['vi', 'en']) {
    if (!theme[locale]) continue;
    const relative = `/assets/og/${catalog.version}/${theme.id}-${locale}.png`;
    const source = await readFile(path.join(web, 'public', relative));
    const exported = await readFile(path.join(web, 'out', relative));
    assert.equal(hash(source), hash(exported), `${relative}: export parity`);
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${relative}: PNG`);
    assert.equal(source.readUInt32BE(16), 1200, `${relative}: width`);
    assert.equal(source.readUInt32BE(20), 630, `${relative}: height`);
    assert.ok(source.length < 1024 * 1024, `${relative}: below 1 MiB`);
    const result = { image: relative, width: 1200, height: 630, bytes: source.length, sha256: hash(source) };
    if (base) {
      const response = await fetch(base + relative, { signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200, `${relative}: deployed HTTP status`);
      assert.match(response.headers.get('content-type') || '', /image\/png/, `${relative}: deployed content type`);
      assert.equal(hash(Buffer.from(await response.arrayBuffer())), result.sha256, `${relative}: exact deployed bytes`);
      result.http = response.status;
    }
    report.images.push(result);
  }
}
report.status = 'PASS';
if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.routes.length} rendered routes, ${report.images.length} PNGs: PASS (${report.base})`);
