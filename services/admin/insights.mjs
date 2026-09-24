import { blockedStatuses } from './metrics.ts';
import { auditStatement } from './store.mjs';
const DAY = 86400000;
// Share the report taxonomy: successful/replayed and blocked requests are not failures.
const nonFailureStatuses = ['success', 'replayed', ...blockedStatuses];
const aiFailureWhere = `COALESCE(status,'') NOT IN (${nonFailureStatuses.map(value => "'" + value.replaceAll("'", "''") + "'").join(',')})`;
const fail = (message, status = 422) => {
  throw Object.assign(new Error(message), { status });
};
const stmt = (env, query, ...args) => env.DB.prepare(query).bind(...args);
const rows = async (env, query, ...args) => (await stmt(env, query, ...args).all()).results;
async function tables(env) {
  return new Set((await rows(env, "SELECT name FROM sqlite_master WHERE type='table'")).map(r => r.name));
}
export function requireInsightPermission(user, kind, exporting = false) {
  const capability = { insights: 'reports.read', support: 'users.read', issues: 'audit.read' }[kind];
  if (
    !capability ||
    !user.capabilities.includes(capability) ||
    (exporting && !user.capabilities.includes('reports.export'))
  )
    fail('Bạn không có quyền thực hiện thao tác này.', 403);
}
export function insightPeriod(params, now = Date.now()) {
  const today = new Date(now + 7 * 3600000).toISOString().slice(0, 10),
    from = params.get('from') || new Date(Date.parse(today) - 6 * DAY).toISOString().slice(0, 10),
    to = params.get('to') || today;
  const valid = v =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (!valid(from) || !valid(to)) fail('Ngày không hợp lệ.');
  const start = Date.parse(from) - 7 * 3600000,
    end = Date.parse(to) + 17 * 3600000;
  if (end <= start || end - start > 90 * DAY) fail('Chọn khoảng thời gian từ 1 đến 90 ngày.');
  return {
    from,
    to,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    previous: new Date(start - (end - start)).toISOString(),
    days: (end - start) / DAY,
  };
}
// Current receipts use exact reasons; older receipts may encode reward subtype after a colon.
const rewardReason =
  "(reason IN ('attendance','referral','milestone','first_topup','ad_reward','ads','new_user') OR reason GLOB 'attendance:*' OR reason GLOB 'referral:*' OR reason GLOB 'milestone:*')";
export async function readInsights(env, params, user) {
  requireInsightPermission(user, 'insights', params.has('export'));
  const p = insightPeriod(params),
    t = await tables(env),
    module = params.get('module') || '';
  if (module.length > 80 || !/^[a-z0-9_-]*$/i.test(module)) fail('Bộ lọc module không hợp lệ.');
  const availability = Object.fromEntries(
    [
      'feature_events',
      'topup_orders_zalo',
      'zalo_point_ledger',
      'reward_events',
      'reward_ad_sessions',
      'user_referrals',
      'backend_ai_operations',
      'admin_ai_requests',
    ].map(k => [k, t.has(k)]),
  );
  const coverage = t.has('feature_events')
    ? (await stmt(env, 'SELECT MIN(created_at) first FROM feature_events').first()).first
    : null;
  availability.feature_events = Boolean(coverage);
  const featureWhere = 'created_at>=? AND created_at<?' + (module ? ' AND module=?' : '');
  const fa = (start, end) => [start, end, ...(module ? [module] : [])];
  async function period(start, end) {
    const f = availability.feature_events
      ? await stmt(
          env,
          `SELECT COUNT(DISTINCT session_id) sessions,COALESCE(SUM(event='result_view'),0) results FROM feature_events WHERE ${featureWhere}`,
          ...fa(start, end),
        ).first()
      : null;
    const o = t.has('topup_orders_zalo')
      ? await stmt(
          env,
          "SELECT COALESCE(SUM(amount_vnd),0) total,COUNT(*) count FROM topup_orders_zalo WHERE status='paid' AND paid_at>=? AND paid_at<?",
          start,
          end,
        ).first()
      : null;
    const l = t.has('zalo_point_ledger')
      ? await stmt(
          env,
          `SELECT COALESCE(SUM(CASE WHEN delta<0 THEN -delta ELSE 0 END),0) spent,COALESCE(SUM(CASE WHEN delta>0 AND reason='topup_payos' THEN delta ELSE 0 END),0) topup,COALESCE(SUM(CASE WHEN delta>0 AND ${rewardReason} THEN delta ELSE 0 END),0) reward FROM zalo_point_ledger WHERE created_at>=? AND created_at<?`,
          start,
          end,
        ).first()
      : null;
    const a = t.has('admin_ai_requests')
      ? await stmt(
          env,
          `SELECT COUNT(*) n FROM admin_ai_requests WHERE created_at>=? AND created_at<? AND ${aiFailureWhere}`,
          start,
          end,
        ).first()
      : null;
    return {
      activeSessions: f?.sessions ?? null,
      results: f?.results ?? null,
      paidVnd: o?.total ?? null,
      pointsSpent: l?.spent ?? null,
      errors: a?.n ?? null,
      o,
      l,
    };
  }
  const [current, previous] = await Promise.all([period(p.start, p.end), period(p.previous, p.start)]);
  // Show observed current counts with a partial-coverage marker; suppress incomplete comparisons.
  if (coverage && coverage >= p.end) {
    current.activeSessions = null;
    current.results = null;
  }
  if (coverage && coverage > p.previous) {
    previous.activeSessions = null;
    previous.results = null;
  }
  const overview = Object.fromEntries(
    ['activeSessions', 'results', 'paidVnd', 'pointsSpent', 'errors'].map(k => [
      k,
      { current: current[k], previous: previous[k] },
    ]),
  );
  const featureAggregates =
    "SUM(event='feature_view') views,SUM(event='feature_start') starts,SUM(event='result_view') results,SUM(event='result_view' AND source='cache') cache,SUM(event='result_view' AND source='ai') aiResults,SUM(event='result_view' AND source='calculation') calculationResults,SUM(event='result_view' AND source='saved') savedResults,SUM(event='result_save') saved,COUNT(DISTINCT session_id) sessions";
  const features = availability.feature_events
    ? await rows(
        env,
        `SELECT module,COALESCE(service_id,'') service,${featureAggregates} FROM feature_events WHERE ${featureWhere} GROUP BY module,service_id ORDER BY starts DESC,results DESC`,
        ...fa(p.start, p.end),
      )
    : [];
  // Aggregate directly from events: summing service rows would double-count shared sessions.
  const modules = availability.feature_events
    ? await rows(
        env,
        `SELECT module,'' service,${featureAggregates} FROM feature_events WHERE ${featureWhere} GROUP BY module ORDER BY starts DESC,results DESC`,
        ...fa(p.start, p.end),
      )
    : [];
  for (const f of [...features, ...modules]) {
    f.errors = null;
    f.completionRate = null;
  } // Events are not linked attempts.
  const devices = availability.feature_events
    ? await rows(
        env,
        `SELECT device,COUNT(*) events FROM feature_events WHERE ${featureWhere} GROUP BY device`,
        ...fa(p.start, p.end),
      )
    : [];
  const fd = availability.feature_events
    ? await rows(
        env,
        `SELECT date(created_at,'+7 hours') day,COUNT(DISTINCT session_id) sessions,SUM(event='result_view') results FROM feature_events WHERE ${featureWhere} GROUP BY day`,
        ...fa(p.start, p.end),
      )
    : [];
  const od = t.has('topup_orders_zalo')
    ? await rows(
        env,
        "SELECT date(paid_at,'+7 hours') day,SUM(amount_vnd) paidVnd FROM topup_orders_zalo WHERE status='paid' AND paid_at>=? AND paid_at<? GROUP BY day",
        p.start,
        p.end,
      )
    : [];
  const ld = t.has('zalo_point_ledger')
    ? await rows(
        env,
        "SELECT date(created_at,'+7 hours') day,SUM(CASE WHEN delta<0 THEN -delta ELSE 0 END) pointsSpent FROM zalo_point_ledger WHERE created_at>=? AND created_at<? GROUP BY day",
        p.start,
        p.end,
      )
    : [];
  const daily = Array.from({ length: p.days }, (_, i) => {
    const day = new Date(Date.parse(p.from) + i * DAY).toISOString().slice(0, 10),
      f = fd.find(r => r.day === day),
      o = od.find(r => r.day === day),
      l = ld.find(r => r.day === day),
      known =
        availability.feature_events && day >= new Date(Date.parse(coverage) + 7 * 3600000).toISOString().slice(0, 10);
    return {
      day,
      sessions: known ? f?.sessions || 0 : null,
      results: known ? f?.results || 0 : null,
      paidVnd: t.has('topup_orders_zalo') ? o?.paidVnd || 0 : null,
      pointsSpent: t.has('zalo_point_ledger') ? l?.pointsSpent || 0 : null,
    };
  });
  const reward = t.has('reward_events')
    ? await stmt(
        env,
        "SELECT COUNT(*) events,COALESCE(SUM(status='completed'),0) completed,COUNT(DISTINCT user_id) participants,COALESCE(SUM(kind='attendance' AND status='completed'),0) attendance FROM reward_events WHERE created_at>=? AND created_at<?",
        p.start,
        p.end,
      ).first()
    : null;
  const attendanceDaily = t.has('reward_events')
    ? await rows(
        env,
        "SELECT date(created_at,'+7 hours') day,COUNT(*) count FROM reward_events WHERE kind='attendance' AND status='completed' AND created_at>=? AND created_at<? GROUP BY day",
        p.start,
        p.end,
      )
    : [];
  const repeat = t.has('reward_events')
    ? await stmt(
        env,
        "SELECT COUNT(*) n FROM (SELECT user_id FROM reward_events WHERE kind='attendance' AND status='completed' AND created_at>=? AND created_at<? GROUP BY user_id HAVING COUNT(DISTINCT date(created_at,'+7 hours'))>1)",
        p.start,
        p.end,
      ).first()
    : null;
  const milestones = t.has('reward_events')
    ? await stmt(
        env,
        "SELECT COALESCE(SUM(CASE WHEN json_valid(payload) THEN COALESCE(json_array_length(payload,'$.milestones'),0) ELSE 0 END),0) n FROM reward_events WHERE kind='attendance' AND status='completed' AND created_at>=? AND created_at<?",
        p.start,
        p.end,
      ).first()
    : null;
  const ads = t.has('reward_ad_sessions')
    ? await stmt(
        env,
        "SELECT COALESCE(SUM(created_at>=?1 AND created_at<?2),0) started,COALESCE(SUM(status='granted' AND granted_at>=?1 AND granted_at<?2),0) granted,COALESCE(SUM(CASE WHEN status='granted' AND granted_at>=?1 AND granted_at<?2 THEN points ELSE 0 END),0) points FROM reward_ad_sessions WHERE (created_at>=?1 AND created_at<?2) OR (granted_at>=?1 AND granted_at<?2)",
        Date.parse(p.start),
        Date.parse(p.end),
      ).first()
    : null;
  const ref = t.has('user_referrals')
    ? await stmt(
        env,
        'SELECT COUNT(*) n FROM user_referrals WHERE created_at>=? AND created_at<?',
        p.start,
        p.end,
      ).first()
    : null;
  const referredUsed =
    t.has('user_referrals') && t.has('backend_ai_operations')
      ? await stmt(
          env,
          "SELECT COUNT(*) n FROM user_referrals r WHERE r.created_at>=? AND r.created_at<? AND EXISTS(SELECT 1 FROM backend_ai_operations o WHERE o.user_id=r.user_id AND o.status='succeeded' AND o.updated_at<?)",
          p.start,
          p.end,
          Date.parse(p.end),
        ).first()
      : null;
  const referredPaid =
    t.has('user_referrals') && t.has('topup_orders_zalo')
      ? await stmt(
          env,
          "SELECT COUNT(*) n FROM user_referrals r WHERE r.created_at>=? AND r.created_at<? AND EXISTS(SELECT 1 FROM topup_orders_zalo o WHERE o.user_id=r.user_id AND o.status='paid' AND o.paid_at<?)",
          p.start,
          p.end,
          p.end,
        ).first()
      : null;
  const orders = t.has('topup_orders_zalo')
    ? await stmt(
        env,
        "SELECT COALESCE(SUM(status='pending'),0) pending,COALESCE(SUM(status IN ('cancelled','expired')),0) cancelled FROM topup_orders_zalo WHERE created_at>=? AND created_at<?",
        p.start,
        p.end,
      ).first()
    : null;
  return {
    from: p.from,
    to: p.to,
    timezone: 'Asia/Ho_Chi_Minh',
    module,
    updatedAt: new Date().toISOString(),
    availability,
    coverageStart: coverage,
    coverage: { partial: Boolean(coverage && coverage > p.start && coverage < p.end) },
    notes: [
      'Phiên ẩn danh không tương đương số người; không gộp thiết bị.',
      'Sự kiện trình duyệt là tín hiệu hành vi, không xác nhận thanh toán.',
      'Mốc dữ liệu hành vi là sự kiện sớm nhất còn lưu trong 90 ngày, không phải ngày bắt đầu triển khai.',
      'Điểm danh lặp lại đếm tài khoản có điểm danh ít nhất hai ngày trong kỳ; không phải tỷ lệ quay lại website.',
      'Bộ lọc module áp dụng cho hành vi; tài chính và AI tổng quan là toàn hệ thống.',
      'Chưa đo tỷ lệ hoàn tất theo lần thao tác; không suy ra từ tỷ lệ tổng sự kiện.',
    ],
    overview,
    daily,
    features,
    modules,
    devices,
    rewards: {
      events: reward?.events ?? null,
      completed: reward?.completed ?? null,
      participants: reward?.participants ?? null,
      attendance: reward?.attendance ?? null,
      repeatAttendance: repeat?.n ?? null,
      milestones: milestones?.n ?? null,
      attendanceDaily,
      pointsGranted: current.l?.reward ?? null,
      referrals: ref?.n ?? null,
      referredUsed: referredUsed?.n ?? null,
      referredPaid: referredPaid?.n ?? null,
      adStarted: ads?.started ?? null,
      adGranted: ads?.granted ?? null,
      adPoints: ads?.points ?? null,
    },
    finance: {
      paidVnd: current.paidVnd,
      paidOrders: current.o?.count ?? null,
      pendingOrders: orders?.pending ?? null,
      cancelledOrders: orders?.cancelled ?? null,
      topupPoints: current.l?.topup ?? null,
      rewardPoints: current.l?.reward ?? null,
      spentPoints: current.pointsSpent,
    },
  };
}
const userColumns = 'id,display_name,email,status,created_at,updated_at';
export async function readSupport(env, params, user) {
  requireInsightPermission(user, 'support', params.has('export'));
  const t = await tables(env),
    page = Number(params.get('page') || 1),
    timelinePage = Number(params.get('timelinePage') || 1),
    pageSize = 25,
    query = (params.get('query') || '').trim(),
    userId = params.get('userId') || '';
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isSafeInteger(timelinePage) ||
    timelinePage < 1 ||
    timelinePage > 100000 ||
    query.length > 200 ||
    userId.length > 200
  )
    fail('Bộ lọc người dùng không hợp lệ.');
  const availability = Object.fromEntries(
    ['app_users', 'zalo_point_ledger', 'topup_orders_zalo', 'reward_events', 'backend_ai_operations', 'user_data'].map(
      k => [k, t.has(k)],
    ),
  );
  const result = {
    available: t.has('app_users'),
    page,
    pageSize,
    total: 0,
    rows: [],
    user: null,
    timeline: [],
    timelineTruncated: false,
    timelinePage,
    nextTimelinePage: null,
    availability,
  };
  if (!result.available) return result;
  const like = '%' + query.replace(/[!%_]/g, '!$&') + '%',
    where = query ? "WHERE id LIKE ? ESCAPE '!' OR display_name LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!'" : '',
    args = query ? [like, like, like] : [];
  result.total = (await stmt(env, `SELECT COUNT(*) n FROM app_users ${where}`, ...args).first()).n;
  result.rows = await rows(
    env,
    `SELECT ${userColumns} FROM app_users ${where} ORDER BY updated_at DESC,id LIMIT ? OFFSET ?`,
    ...args,
    pageSize,
    (page - 1) * pageSize,
  );
  if (!userId) return result;
  result.user = await stmt(env, `SELECT ${userColumns} FROM app_users WHERE id=?`, userId).first();
  if (!result.user) return result;
  const sources = [];
  if (t.has('reward_events'))
    sources.push(
      "SELECT id,'reward:'||kind kind,created_at at,status,NULL points,NULL amountVnd,NULL service FROM reward_events WHERE user_id=?",
    );
  if (t.has('backend_ai_operations'))
    sources.push(
      "SELECT operation_id id,'service' kind,strftime('%Y-%m-%dT%H:%M:%fZ',created_at/1000.0,'unixepoch') at,status,NULL points,NULL amountVnd,service_id service FROM backend_ai_operations WHERE user_id=?",
    );
  if (t.has('user_data'))
    sources.push(
      "SELECT user_id id,'sync' kind,strftime('%Y-%m-%dT%H:%M:%fZ',updated_at/1000.0,'unixepoch') at,NULL status,NULL points,NULL amountVnd,NULL service FROM user_data WHERE user_id=?",
    );
  if (user.capabilities.includes('wallet.read')) {
    if (t.has('zalo_point_ledger'))
      sources.push(
        "SELECT id,'points:'||reason kind,created_at at,NULL status,delta points,NULL amountVnd,NULL service FROM zalo_point_ledger WHERE user_id=?",
      );
    if (t.has('topup_orders_zalo'))
      sources.push(
        "SELECT id,'topup' kind,COALESCE(paid_at,created_at) at,status,points,amount_vnd amountVnd,NULL service FROM topup_orders_zalo WHERE user_id=?",
      );
  }
  if (sources.length) {
    const timeline = await rows(
      env,
      `SELECT * FROM (${sources.join(' UNION ALL ')}) ORDER BY at DESC,kind,id LIMIT 51 OFFSET ?`,
      ...sources.map(() => userId),
      (timelinePage - 1) * 50,
    );
    result.timeline = timeline.slice(0, 50);
    result.timelineTruncated = timeline.length > 50;
    result.nextTimelinePage = result.timelineTruncated ? timelinePage + 1 : null;
  }
  return result;
}
const issueDefinitions = [
  {
    id: 'ai-failed',
    table: 'admin_ai_requests',
    kind: 'ai',
    label: 'Yêu cầu AI thất bại',
    priority: 'high',
    time: 'created_at',
    where: aiFailureWhere,
  },
  {
    id: 'ai-slow',
    table: 'admin_ai_requests',
    kind: 'ai',
    label: 'Yêu cầu AI trên 30 giây',
    priority: 'medium',
    time: 'created_at',
    where: 'duration_ms>30000',
  },
  {
    id: 'client-errors',
    table: 'client_error_counts',
    kind: 'client',
    label: 'Lỗi giao diện được báo cáo',
    priority: 'medium',
    time: "strftime('%Y-%m-%dT%H:%M:%fZ',last_at/1000.0,'unixepoch')",
    where: '1=1',
    count: 'SUM(count)',
  },
  {
    id: 'login-errors',
    table: 'login_diagnostics',
    kind: 'login',
    label: 'Chẩn đoán đăng nhập thất bại',
    priority: 'high',
    time: 'created_at',
    where: "stage IN ('callback_rejected','state_expired_or_missing','token_exchange_failed','server_verify_failed')",
  },
  {
    id: 'topup-pending',
    table: 'topup_orders_zalo',
    kind: 'payment',
    label: 'Đơn chờ thanh toán quá 15 phút',
    priority: 'medium',
    time: 'created_at',
    where: "status='pending' AND julianday(created_at)<julianday('now','-15 minutes')",
  },
  {
    id: 'reward-pending',
    table: 'reward_events',
    kind: 'reward',
    label: 'Thưởng chờ xử lý quá 1 giờ',
    priority: 'medium',
    time: 'created_at',
    where: "status IN ('pending','processing') AND julianday(created_at)<julianday('now','-1 hour')",
  },
];
export async function readIssues(env, params, user) {
  requireInsightPermission(user, 'issues');
  const p = insightPeriod(params),
    t = await tables(env),
    availability = Object.fromEntries(issueDefinitions.map(d => [d.table, t.has(d.table)]));
  availability.admin_issue_states = t.has('admin_issue_states');
  const result = [];
  for (const d of issueDefinitions) {
    if (!t.has(d.table)) continue;
    const r = await stmt(
      env,
      `SELECT ${d.count || 'COUNT(*)'} count,MAX(${d.time}) lastAt FROM ${d.table} WHERE (${d.where}) AND ${d.time}>=? AND ${d.time}<?`,
      p.start,
      p.end,
    ).first();
    if (!r?.count) continue;
    const state = t.has('admin_issue_states')
      ? await stmt(env, 'SELECT status,updated_at FROM admin_issue_states WHERE id=?', d.id).first()
      : null;
    result.push({
      id: d.id,
      kind: d.kind,
      label: d.label,
      priority: d.priority,
      count: r.count,
      lastAt: r.lastAt,
      status: state && state.updated_at >= r.lastAt ? state.status : 'new',
      updatedAt: state?.updated_at ?? null,
    });
  }
  return {
    available: issueDefinitions.some(d => t.has(d.table)),
    canManage: t.has('admin_issue_states') && user.capabilities.includes('access.manage'),
    rows: result,
    availability,
  };
}
export async function updateIssue(env, body, user) {
  requireInsightPermission(user, 'issues');
  if (!user.capabilities.includes('access.manage')) fail('Không có quyền xử lý cảnh báo.', 403);
  if (
    !issueDefinitions.some(d => d.id === body.id) ||
    !['new', 'acknowledged', 'in_progress', 'resolved'].includes(body.status)
  )
    fail('Trạng thái cảnh báo không hợp lệ.');
  if (!(await tables(env)).has('admin_issue_states')) fail('Chưa cài đặt bảng xử lý cảnh báo.', 503);
  const now = new Date().toISOString();
  await env.DB.batch([
    stmt(
      env,
      'INSERT INTO admin_issue_states(id,status,updated_at,actor) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,actor=excluded.actor',
      body.id,
      body.status,
      now,
      user.email,
    ),
    auditStatement(env, user.email, 'issue.status', body.id, { status: body.status }),
  ]);
  return { ok: true, status: body.status, updatedAt: now };
}
