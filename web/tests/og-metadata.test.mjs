import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { load } from './support/load.mjs';
const catalog = JSON.parse(readFileSync(new URL('../design/og/catalog.json', import.meta.url)));

const sharing = async route => (await load('lib/social-metadata.ts')).socialMetadata(route);

test('Vietnamese and English share images have independent localized URLs and alt text', async () => {
  const vi = await sharing('/');
  const en = await sharing('/en');
  assert.equal(vi.openGraph.images[0].url, 'https://theastrox.space/assets/og/v2/home-vi.png');
  assert.equal(en.openGraph.images[0].url, 'https://theastrox.space/assets/og/v2/home-en.png');
  assert.match(vi.openGraph.images[0].alt, /Khám phá/);
  assert.match(en.openGraph.images[0].alt, /Explore/);
  assert.equal(vi.openGraph.locale, 'vi_VN');
  assert.equal(en.openGraph.locale, 'en_US');
});

test('missing-feature previews use their own topic rather than the homepage fallback', async () => {
  for (const [route, image] of [
    ['/chitay', 'palm-vi'],
    ['/licham', 'lunar-vi'],
    ['/tuonghop', 'compatibility-vi'],
    ['/banggia', 'pricing-vi'],
    ['/chuyengia', 'experts-vi'],
    ['/dieukhoan', 'terms-vi'],
  ]) {
    const meta = await sharing(route);
    assert.equal(meta.openGraph.images[0].url, `https://theastrox.space/assets/og/v2/${image}.png`);
    assert.equal(meta.openGraph.url, `https://theastrox.space${route}`);
  }
});

test('OG and Twitter carry the same card, readable title and required dimensions', async () => {
  for (const route of Object.keys(catalog.routes)) {
    const meta = await sharing(route);
    const image = meta.openGraph.images[0];
    assert.equal(image.width, 1200);
    assert.equal(image.height, 630);
    assert.ok(image.alt.length > 10);
    assert.equal(meta.twitter.card, 'summary_large_image');
    assert.equal(meta.twitter.images[0].url, image.url);
    assert.equal(meta.twitter.images[0].alt, image.alt);
    assert.equal(meta.twitter.title, meta.openGraph.title);
    assert.equal(meta.openGraph.type, 'website');
    assert.equal(meta.openGraph.siteName, 'AstroX');
    assert.doesNotMatch(meta.openGraph.title, /AstroX.*AstroX/);
  }
});

test('legacy aliases keep their canonical target and topic artwork', async () => {
  for (const [alias, canonical] of [
    ['/trangchu', '/'],
    ['/hoangdao', '/cunghoangdao'],
    ['/thanso', '/thansohoc'],
  ]) {
    const a = await sharing(alias),
      b = await sharing(canonical);
    assert.equal(a.openGraph.url, b.openGraph.url);
    assert.equal(a.openGraph.images[0].url, b.openGraph.images[0].url);
  }
});

test('every actual page route is covered and experts remain Vietnamese-only', () => {
  const app = new URL('../src/app/', import.meta.url);
  const pages = readdirSync(app, { recursive: true }).filter(p => p.endsWith('page.tsx'));
  for (const page of pages) {
    const route = '/' + page.replace('(vi)/', '').replace(/\/?page\.tsx$/, '');
    assert.ok(catalog.routes[route], `No OG mapping for ${route}`);
  }
  assert.equal(pages.length, Object.keys(catalog.routes).length);
  assert.equal(catalog.themes.length, 14);
  assert.equal(catalog.themes.filter(x => x.en).length, 13);
  assert.equal(catalog.routes['/en/experts'], undefined);
});

test('profile sharing is generic and static in both locales', async () => {
  for (const route of ['/hoso', '/en/profile']) {
    const meta = await sharing(route);
    assert.match(meta.openGraph.images[0].url, /profile-(vi|en)\.png$/);
    assert.equal(meta.openGraph.url, `https://theastrox.space${route}`);
    assert.doesNotMatch(meta.openGraph.url, /[?#]/);
  }
});

test('an unmapped route fails clearly instead of silently choosing an incorrect locale', async () => {
  const { socialMetadata } = await load('lib/social-metadata.ts');
  assert.throws(() => socialMetadata('/unknown'), /Unknown social route/);
});

test('Vietnamese-only expert booking does not advertise a missing English variant', async () => {
  const expert = await sharing('/chuyengia');
  assert.deepEqual(expert.openGraph.alternateLocale, []);
  const palm = await sharing('/chitay');
  assert.deepEqual(palm.openGraph.alternateLocale, ['en_US']);
});
