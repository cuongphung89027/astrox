/** An explicit opt-in for a temporary local preview; never used by production handlers. */
export function previewOrigin(value = '') {
  if (!value) return '';
  if (!/^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(value))
    throw new Error('ADMIN_PREVIEW_ORIGIN must be one exact HTTPS Quick Tunnel origin');
  return value;
}
export function rewriteLocalOrigin(origin, host, preview = '') {
  const local = [
    'http://localhost:3311',
    'http://127.0.0.1:3311',
    'http://localhost:3322',
    'http://127.0.0.1:3322',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];
  return local.includes(origin) || (preview && origin === preview) ? `http://${host}` : origin;
}
