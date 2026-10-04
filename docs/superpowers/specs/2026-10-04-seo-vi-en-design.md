# AstroX Vietnamese and English SEO foundation

Owner: root. Branch/worktree: codex/seo-vi-en. Base: 8371c2570481034bab7c3328fe020a255ee69039, verified on both main remotes. User approved the full proposed technical SEO scope on 2026-10-04. Root is the integration/release owner. Existing Google profile-label PR10 remains separate and unpublished until its approval.

## Observed production problems

An HTTP audit of 31 known URLs plus one unknown URL found repeated brand words in several titles; generic homepage descriptions; missing reciprocal hreflang on /en/pricing; no WebSite/Organization JSON-LD; old /trangchu, /hoangdao and /thanso aliases return 200 with client navigation rather than HTTP redirects. Tarot and compatibility HTML exports show only Suspense fallbacks and omit their initial H1. Private profile HTML already has noindex but robots.txt prevents crawlers reading that directive. The unknown URL correctly returns404. Sitemap already lists25 canonical public URLs and paired alternates.

## Chosen approach

Repair the current public site foundation rather than introducing a blog or redesign. Keep approved OG assets, palette, layout, auth and billing intact. Use factual descriptions matching actual features. Retain the existing per-page metadata structure, avoiding unnecessary shared metadata rewrites.

1. Clean repeated brand suffixes and improve homepage and compatibility descriptions in VI/EN. Add reciprocal pricing alternates. Canonicalize static alias fallback documents.
2. Add static server-rendered WebSite and Organization JSON-LD on both homepages: AstroX, canonical root URL, approved logo and public support identity only. No unverified address, social links, rating, price or search action.
3. Return permanent HTTP redirects for the three exact aliases through the existing Pages entrypoint, preserving queries and limiting this behavior to GET/HEAD. Keep CSP nonce behavior and existing locale routing kill switch unchanged. Set noindex response headers on Pages-hosted duplicate/preview HTML.
4. Put the existing localized page heading in the Tarot and compatibility Suspense fallback so the exported HTML has a meaningful H1 and hydration does not duplicate it. Retain the functioning client heading.
5. Let Google read the noindex directive on the public profile shell by removing profile Disallow entries; API/auth/admin protection remains unchanged. Sitemap excludes profiles, aliases and Admin. No pretend lastmod timestamps.
6. Add export QA for indexable page metadata, reciprocal alternates, real assets, schema and private noindex. Add edge regression tests for permanent redirects, query handling, method/path boundaries and CSP. Inspect VI/EN browser output and Search Console sitemap/URL inspection after production publication.

## Acceptance and rollout

All25 public canonical pages retain HTTP200, correct language, a unique title with one AstroX occurrence, one canonical, complete expected language pairs and existing OG assets. Exported Tarot/compatibility HTML includes its H1. The three aliases permanently redirect to existing pages with queries retained. Unknown paths remain404. Profiles remain noindex and backend private data stays unauthorized without a session. Preview HTML is excluded from indexing. JSON-LD is static and valid; no personal owner information appears.

Run focused tests, build, typecheck, ESLint/format and SEO/OG/English-export QA. Push an isolated PR and verify CI plus preview. Production approval applies to the concrete final commit, then deploy Worker and Pages from the same SHA and verify live routes/headers/assets. Submit sitemap through the verified theastrox.space Search Console property. Search appearance/indexing remains Google's decision and is not claimed from a green build.

Sources: Google Search Central title links, multilingual sites, canonicalization, noindex, site-name and Organization documentation; Cloudflare Pages redirects documentation. _redirects does not apply to routes served by Pages Functions, hence redirects belong in the existing entrypoint.
