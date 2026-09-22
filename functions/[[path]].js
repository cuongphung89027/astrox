/**
 * Next.js exports one HTML document per route, including its own SEO metadata.
 * Preserve the requested URL so Pages can resolve clean URLs, assets and 404s.
 * Specific /api/* handlers continue to take precedence over this catch-all.
 */
export function onRequest({ request, env }) {
  return env.ASSETS.fetch(request);
}
