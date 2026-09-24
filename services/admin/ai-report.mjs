import { createAiSummary, parseAttempts } from './metrics.ts';
import { sql } from './store.mjs';
const DAY = 86400000;
const invalid = message => Object.assign(new Error(message), { status: 422 });
const validDate = value =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
/** All selected rows contribute; only 500 request rows are retained at a time. */
export async function aiReport(env, params, now = Date.now()) {
  const timezone = params.get('timezone') || 'Asia/Ho_Chi_Minh';
  if (!['UTC', 'Asia/Ho_Chi_Minh'].includes(timezone)) throw invalid('Múi giờ không hợp lệ.');
  const shift = timezone === 'UTC' ? 0 : 7 * 3600000;
  const from = params.get('from') || new Date(now + shift - 6 * DAY).toISOString().slice(0, 10),
    to = params.get('to') || new Date(now + shift).toISOString().slice(0, 10);
  if (!validDate(from) || !validDate(to)) throw invalid('Ngày không hợp lệ.');
  const start = Date.parse(from) - shift,
    end = Date.parse(to) + DAY - shift;
  if (end <= start || end - start > 90 * DAY) throw invalid('Chọn khoảng thời gian từ 1 đến 90 ngày.');
  // Freeze the report boundary so new requests cannot appear in later pages.
  const upper = new Date(Math.min(end, now)).toISOString();
  const args = [new Date(start).toISOString(), upper],
    where = ['created_at>=?', 'created_at<?'];
  const filters = Object.fromEntries(['provider', 'model', 'service'].map(k => [k, params.get(k) || '']));
  if (Object.values(filters).some(v => v.length > 200)) throw invalid('Bộ lọc quá dài.');
  if (filters.service) {
    where.push('service_id=?');
    args.push(filters.service);
  }
  const safeAttempts =
    "CASE WHEN json_valid(attempts) THEN CASE WHEN json_type(attempts)='array' THEN attempts ELSE '[]' END ELSE '[]' END";
  if (filters.provider || filters.model) {
    const predicates = ["json_type(a.value,'$.providerId')='text'"];
    if (filters.provider) {
      predicates.push(
        "CASE WHEN instr(json_extract(a.value,'$.providerId'),':')>0 THEN substr(json_extract(a.value,'$.providerId'),1,instr(json_extract(a.value,'$.providerId'),':')-1) ELSE json_extract(a.value,'$.providerId') END=?",
      );
      args.push(filters.provider);
    }
    if (filters.model) {
      predicates.push("json_extract(a.value,'$.model')=?");
      args.push(filters.model);
    }
    where.push(
      `EXISTS (SELECT 1 FROM json_each(${safeAttempts}) a WHERE a.type='object' AND ${predicates.join(' AND ')})`,
    );
  }
  const clause = where.join(' AND '),
    acc = createAiSummary(filters, false);
  const options = { providers: new Set(), models: new Set(), services: new Set() };
  let optionsTruncated = false,
    loaded = 0,
    cursor = null;
  const remember = (set, value) => {
    if (!value) return;
    if (set.size < 500 || set.has(value)) set.add(value);
    else optionsTruncated = true;
  };
  for (;;) {
    const pageArgs = [...args];
    let after = '';
    if (cursor) {
      after = ' AND (created_at>? OR (created_at=? AND id>?))';
      pageArgs.push(cursor.created_at, cursor.created_at, cursor.id);
    }
    const rows = (
      await sql(
        env,
        `SELECT id,service_id,created_at,status,attempts,duration_ms FROM admin_ai_requests WHERE ${clause}${after} ORDER BY created_at,id LIMIT 500`,
        ...pageArgs,
      ).all()
    ).results;
    for (const row of rows) {
      remember(options.services, row.service_id);
      for (const a of parseAttempts(row.attempts)) {
        remember(options.providers, a.providerId.split(':')[0]);
        remember(options.models, a.model);
      }
    }
    loaded += rows.length;
    acc.add(rows.map(row => ({ ...row, created_at: new Date(Date.parse(row.created_at) + shift).toISOString() })));
    if (rows.length < 500) break;
    cursor = rows.at(-1);
  }
  const summary = acc.finish();
  // Exact nearest-rank percentile stays in SQLite rather than retaining every duration.
  const durationWhere = `${clause} AND typeof(duration_ms)='integer' AND duration_ms>=0 AND duration_ms<=9007199254740991`;
  const latency = await sql(
    env,
    `SELECT COUNT(*) AS n,AVG(duration_ms) AS averageMs FROM admin_ai_requests WHERE ${durationWhere}`,
    ...args,
  ).first();
  summary.averageMs = latency?.averageMs ?? null;
  summary.p95Ms = latency?.n
    ? ((
        await sql(
          env,
          `SELECT duration_ms FROM admin_ai_requests WHERE ${durationWhere} ORDER BY duration_ms LIMIT 1 OFFSET ?`,
          ...args,
          Math.ceil(latency.n * 0.95) - 1,
        ).first()
      )?.duration_ms ?? null)
    : null;
  const daily = new Map(summary.daily.map(day => [day.day, day]));
  summary.daily = Array.from({ length: (end - start) / DAY }, (_, i) => {
    const day = new Date(start + shift + i * DAY).toISOString().slice(0, 10);
    return daily.get(day) || { day, requests: 0, failed: 0 };
  });
  return {
    summary,
    from,
    to,
    timezone,
    truncated: false,
    loaded,
    coverage: 'full-period',
    optionsTruncated,
    options: Object.fromEntries(Object.entries(options).map(([key, set]) => [key, [...set].sort()])),
    generatedAt: new Date(now).toISOString(),
  };
}
