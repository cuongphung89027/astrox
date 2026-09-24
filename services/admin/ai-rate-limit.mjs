import { sign } from './crypto.mjs';
const positive = (value, fallback) =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
const unavailable = () =>
  Response.json(
    { code: 'ai_safety_unavailable', error: 'Dịch vụ đang kiểm tra giới hạn sử dụng. Vui lòng thử lại sau.' },
    { status: 503, headers: { 'cache-control': 'no-store' } },
  );
/** Shared D1 counters, not per-isolate memory. CF-Connecting-IP is set by the edge. */
export async function limitAi(request, env, now = Date.now()) {
  if (!env.DB) return unavailable();
  try {
    const day = Math.floor(now / 86400000),
      minute = Math.floor(now / 60000);
    const identity = await sign(env, `ai-ip:${day}:${request.headers.get('cf-connecting-ip') || 'unknown'}`);
    const windows = [
      [`minute:${identity}:${minute}`, positive(env.AI_IP_PER_MINUTE, 6), (minute + 1) * 60000],
      [`day:${identity}:${day}`, positive(env.AI_IP_PER_DAY, 60), (day + 1) * 86400000],
      [`global:${day}`, positive(env.AI_GLOBAL_PER_DAY, 2000), (day + 1) * 86400000],
    ];
    const rows = await env.DB.batch(
      windows.map(([bucket, max, expiry]) =>
        env.DB.prepare(
          'INSERT INTO ai_rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<? RETURNING count',
        ).bind(bucket, expiry, max),
      ),
    );
    const denied = rows.findIndex(r => !r.results?.length);
    if (denied < 0) return null;
    return Response.json(
      { code: 'rate_limited', error: 'Bạn đã đạt giới hạn lượt luận giải trong thời gian này. Vui lòng quay lại sau.' },
      {
        status: 429,
        headers: {
          'cache-control': 'no-store',
          'retry-after': String(Math.max(1, Math.ceil((windows[denied][2] - now) / 1000))),
        },
      },
    );
  } catch {
    return unavailable();
  }
}
