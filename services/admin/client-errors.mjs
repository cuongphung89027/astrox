import { sign } from './crypto.mjs';
const routes = new Set([
  '/',
  '/tuvi',
  '/tarot',
  '/tuonghop',
  '/cunghoangdao',
  '/kinhdich',
  '/battu',
  '/thansohoc',
  '/hoso',
  '/banggia',
  '/dieukhoan',
]);
const kinds = new Set(['runtime', 'promise', 'resource']);
export async function clientError(request, env, now = Date.now()) {
  const reply = status => new Response(null, { status, headers: { 'cache-control': 'no-store' } });
  if (request.method !== 'POST') return reply(405);
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply(403);
  if (Number(request.headers.get('content-length')) > 1024) return reply(413);
  const raw = await request.text();
  if (raw.length > 1024) return reply(413);
  let b;
  try {
    b = JSON.parse(raw);
  } catch {
    return reply(400);
  }
  if (!b || !routes.has(b.path) || !kinds.has(b.kind) || Object.keys(b).some(k => !['path', 'kind'].includes(k)))
    return reply(400);
  try {
    const day = Math.floor(now / 86400000),
      id = await sign(env, `telemetry:${day}:${request.headers.get('cf-connecting-ip') || 'unknown'}`);
    const limits = await env.DB.batch(
      [
        [`telemetry:${id}:${day}`, 30],
        [`telemetry:global:${day}`, 10000],
      ].map(([key, max]) =>
        env.DB.prepare(
          'INSERT INTO ai_rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<? RETURNING count',
        ).bind(key, (day + 1) * 86400000, max),
      ),
    );
    if (limits.some(r => !r.results?.length)) return reply(429);
    await env.DB.prepare(
      'INSERT INTO client_error_counts(day,path,kind,count,last_at) VALUES(?,?,?,1,?) ON CONFLICT(day,path,kind) DO UPDATE SET count=count+1,last_at=excluded.last_at',
    )
      .bind(day, b.path, b.kind, now)
      .run();
    return reply(204);
  } catch {
    return reply(503);
  }
}
