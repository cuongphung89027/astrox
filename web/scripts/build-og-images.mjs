/** Rebuild approved static OG layouts from original art, project logo and fonts. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const web = fileURLToPath(new URL('../', import.meta.url));
const design = path.join(web, 'design/og');
const catalog = JSON.parse(await readFile(path.join(design, 'catalog.json'), 'utf8'));
const out = path.join(web, 'public/assets/og', catalog.version);
const escape = s =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const selected = process.argv.slice(2);
const themes = catalog.themes.filter(x => !selected.length || selected.includes(x.id));
if (!themes.length) throw new Error('No matching OG theme selected');

const requests = [{ text: 'theastrox.space', font: 'body', size: 18, color: '#526354' }];
const cardIndexes = new Map();
for (const theme of themes) {
  for (const locale of ['vi', 'en']) {
    const content = theme[locale];
    if (!content) continue;
    cardIndexes.set(`${theme.id}-${locale}`, requests.length);
    requests.push(
      { text: content.lines.join('\n'), font: 'display', size: 84, fit: 486, color: '#244d40' },
      { text: content.caption, font: 'body', size: 21, wrap: 470, color: '#526354' },
      {
        text: content.label.toLocaleUpperCase(locale === 'vi' ? 'vi-VN' : 'en-US'),
        font: 'body',
        size: 11,
        color: '#526354',
      },
    );
  }
}
const outlined = spawnSync(process.env.ASTROX_OG_PYTHON || 'python3', [path.join(design, 'text-outline.py')], {
  input: JSON.stringify(requests),
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (outlined.status !== 0)
  throw new Error(`Font outlines require Python fontTools, brotli and Pillow: ${outlined.stderr}`);
const geometry = JSON.parse(outlined.stdout);
const raster = await Promise.all(
  geometry.map(async item => ({
    data: await sharp(Buffer.from(item.svg)).png().toBuffer(),
    info: { width: item.width, height: item.height },
    fontSize: item.fontSize,
  })),
);
{
  await mkdir(out, { recursive: true });
  const logo = (await readFile(path.join(web, 'public/assets/logo.png'))).toString('base64');
  const footer = raster[0];
  const metrics = [];
  for (const theme of themes) {
    const art = (await readFile(path.join(design, 'art', theme.art))).toString('base64');
    const background =
      Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#244d40"/>
      <image x="570" y="0" width="630" height="630" href="data:image/png;base64,${art}" preserveAspectRatio="xMidYMid slice"/>
      <path d="M0 0H650C586 106 556 208 556 315C556 426 586 530 650 630H0Z" fill="#fbf6ec"/>
      <path d="M650 0C586 106 556 208 556 315C556 426 586 530 650 630" fill="none" stroke="#c7860a" stroke-opacity=".48" stroke-width="1"/>
      <path d="M24 621C244 616 451 487 584 226" fill="none" stroke="#c7860a" stroke-opacity=".22" stroke-width=".8"/>
      <circle cx="354" cy="528" r="3.5" fill="#c7860a" opacity=".65"/>
      <image x="56" y="24" width="128" height="128" href="data:image/png;base64,${logo}"/>
    </svg>`);
    for (const locale of ['vi', 'en']) {
      const content = theme[locale];
      if (!content) continue;
      const index = cardIndexes.get(`${theme.id}-${locale}`);
      const [title, caption, label] = raster.slice(index, index + 3);
      const size = title.fontSize;
      if (title.info.width > 490) throw new Error(`Title too wide: ${theme.id}/${locale}`);
      const height = title.info.height + 26 + caption.info.height;
      if (height > 340) throw new Error(`Copy too tall: ${theme.id}/${locale}`);
      const top = 170 + Math.floor((340 - height) / 2);
      const file = `${theme.id}-${locale}.png`;
      await sharp(background)
        .composite([
          { input: label.data, left: 202, top: 84 },
          { input: title.data, left: 56, top },
          { input: caption.data, left: 58, top: top + title.info.height + 26 },
          { input: footer.data, left: 58, top: 572 },
        ])
        .removeAlpha()
        .png({ compressionLevel: 9 })
        .toFile(path.join(out, file));
      const bytes = (await readFile(path.join(out, file))).length;
      metrics.push({
        theme: theme.id,
        locale,
        file,
        fontSize: size,
        titleWidth: title.info.width,
        titleHeight: title.info.height,
        captionHeight: caption.info.height,
        copyBottom: top + height,
        bytes,
      });
      console.log(`${file}: ${Math.round(bytes / 1024)} KiB, title ${size}px`);
    }
  }
  await writeFile(
    path.join(design, selected.length ? 'partial-render-metrics.json' : 'render-metrics.json'),
    JSON.stringify(metrics, null, 2) + '\n',
  );
  const all = catalog.themes.flatMap(x => ['vi', 'en'].filter(l => x[l]).map(locale => ({ theme: x, locale })));
  if (!selected.length) {
    for (const locale of ['vi', 'en']) {
      const entries = all.filter(x => x.locale === locale);
      const width = 1200,
        tileWidth = 384,
        tileHeight = 202,
        rowHeight = 245,
        columns = 3;
      const overlays = [];
      for (const [i, entry] of entries.entries()) {
        const x = 12 + (i % columns) * 400,
          y = 12 + Math.floor(i / columns) * rowHeight;
        const image = await sharp(path.join(out, `${entry.theme.id}-${locale}.png`))
          .resize(tileWidth, tileHeight)
          .toBuffer();
        const title = raster[cardIndexes.get(`${entry.theme.id}-${locale}`) + 2];
        overlays.push({ input: image, left: x, top: y }, { input: title.data, left: x + 3, top: y + tileHeight + 9 });
      }
      await sharp({
        create: {
          width,
          height: Math.ceil(entries.length / columns) * rowHeight + 12,
          channels: 3,
          background: '#eee8dc',
        },
      })
        .composite(overlays)
        .png()
        .toFile(path.join(design, `contact-sheet-${locale}.png`));
    }
    const cards = all
      .map(
        ({ theme, locale }) =>
          `<figure><a href="${theme.id}-${locale}.png"><img src="${theme.id}-${locale}.png" alt="${escape(theme[locale].alt)}" width="1200" height="630" loading="lazy"></a><figcaption>${escape(theme[locale].label)} · ${locale.toUpperCase()}</figcaption></figure>`,
      )
      .join('');
    await writeFile(
      path.join(out, 'gallery.html'),
      `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AstroX — OG collection</title><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#fbf6ec;color:#244d40;font:16px system-ui}h1{font:40px Georgia;margin:0 0 12px}p{max-width:760px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}figure{margin:0}img{width:100%;height:auto;border-radius:12px;box-shadow:0 8px 22px #193e3314}figcaption{padding:10px 2px;font-size:14px}@media(max-width:600px){body{padding:16px}}</style><h1>AstroX · Bộ ảnh chia sẻ</h1><p>27 ảnh · 14 chủ đề · Việt / English. Chọn ảnh để xem bản đầy đủ.</p><main class="grid">${cards}</main></html>`,
    );
  }
}
