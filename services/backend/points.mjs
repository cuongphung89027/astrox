// Lịch sử Point cho người dùng — đọc thẳng từ zalo_point_ledger (nguồn duy nhất
// mà admin Rewards view cũng đọc qua /internal/admin/rewards). Chỉ đọc, không ghi.
import { readSession } from './auth.mjs';
import { json } from './http.mjs';

const encodeCursor = row =>
  btoa(JSON.stringify({ t: row.created_at, i: row.id }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const decodeCursor = raw => {
  try {
    const dec = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(String(raw).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
      ),
    );
    if (typeof dec?.t === 'string' && typeof dec?.i === 'string' && Number.isFinite(Date.parse(dec.t))) return dec;
  } catch {}
  return null;
};
export async function handlePointsHistory(env, request) {
  const session = await readSession(env, request);
  if (!session) return json(env, request, { error: 'unauthorized' }, 401);
  const url = new URL(request.url);
  let limit = Number(url.searchParams.get('limit'));
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) limit = 20;
  const rawCursor = url.searchParams.get('cursor');
  let before = null;
  if (rawCursor) {
    before = decodeCursor(rawCursor);
    if (!before) return json(env, request, { error: 'invalid_cursor' }, 400);
  }
  let query = 'SELECT id,delta,reason,reference_id,created_at FROM zalo_point_ledger WHERE user_id=?';
  const bind = [session.sub];
  if (before) {
    query += ' AND (created_at<? OR (created_at=? AND id<?))';
    bind.push(before.t, before.t, before.i);
  }
  query += ' ORDER BY created_at DESC,id DESC LIMIT ?';
  bind.push(limit + 1);
  const rows = (
    await env.DB.prepare(query)
      .bind(...bind)
      .all()
  ).results;
  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit && page.length ? encodeCursor(page[page.length - 1]) : null;
  return json(env, request, { transactions: page, nextCursor });
}
