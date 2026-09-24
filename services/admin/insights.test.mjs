import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnv } from './test/sqlite.mjs';
import {
  insightPeriod,
  readInsights,
  readSupport,
  readIssues,
  updateIssue,
  requireInsightPermission,
} from './insights.mjs';
const params = new URLSearchParams('from=2026-09-24&to=2026-09-24');
const user = {
  email: 'owner@test',
  capabilities: ['reports.read', 'users.read', 'wallet.read', 'audit.read', 'access.manage'],
};
async function setup() {
  const env = testEnv();
  for (const statement of readFileSync(new URL('../../migrations/admin-insights.sql', import.meta.url), 'utf8')
    .split(';')
    .filter(x => x.trim()))
    await env.DB.prepare(statement).run();
  return env;
}
test('VN day and previous period use UTC+7 and reject impossible days', () => {
  const p = insightPeriod(params);
  assert.equal(p.start, '2026-09-23T17:00:00.000Z');
  assert.equal(p.end, '2026-09-24T17:00:00.000Z');
  assert.equal(p.previous, '2026-09-22T17:00:00.000Z');
  assert.throws(() => insightPeriod(new URLSearchParams('from=2026-02-30&to=2026-03-01')));
});
test('missing business sources produce null; real feature totals cover over 5000 events', async () => {
  const env = await setup();
  let report = await readInsights(env, params, user);
  assert.equal(report.finance.paidVnd, null);
  assert.equal(report.overview.activeSessions.current, null);
  await env.DB.prepare(
    'CREATE TABLE feature_events(id TEXT,event TEXT,module TEXT,service_id TEXT,source TEXT,session_id TEXT,device TEXT,created_at TEXT)',
  ).run();
  await env.DB.prepare(
    "WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<5101) INSERT INTO feature_events SELECT n,'result_view','tarot','tarot','ai','s','mobile','2026-09-23T18:00:00.000Z' FROM seq",
  ).run();
  await env.DB.prepare(
    "INSERT INTO feature_events VALUES('old','feature_view','tarot','tarot','navigation','s','mobile','2026-09-20T00:00:00.000Z')",
  ).run();
  report = await readInsights(env, params, user);
  assert.equal(report.overview.results.current, 5101);
  assert.equal(report.daily[0].results, 5101);
  assert.equal(report.overview.activeSessions.current, 1);
  assert.equal(report.features[0].completionRate, null);
});
test('support searches all users beyond 200 and exposes safe fields only', async () => {
  const env = await setup();
  await env.DB.prepare(
    'CREATE TABLE app_users(id TEXT PRIMARY KEY,display_name TEXT,email TEXT,status TEXT,created_at TEXT,updated_at TEXT,secret TEXT)',
  ).run();
  await env.DB.prepare(
    "WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<240) INSERT INTO app_users SELECT 'u'||n,'Person'||n,'mail'||n||'@test','active','2026-01-01','2026-01-01','hidden' FROM seq",
  ).run();
  const list = await readSupport(env, new URLSearchParams('page=9'), user);
  assert.equal(list.total, 240);
  assert.equal(list.rows.length, 25);
  assert.ok(!JSON.stringify(list).includes('hidden'));
  const found = await readSupport(env, new URLSearchParams('query=Person239&userId=u239'), user);
  assert.equal(found.total, 1);
  assert.equal(found.user.id, 'u239');
});
test('issue acknowledgment requires manage permission and atomically audits persisted state', async () => {
  const env = await setup();
  await env.DB.prepare(
    "INSERT INTO admin_ai_requests VALUES('bad','tarot',1,'2026-09-24T01:00:00.000Z','failed','[]',100)",
  ).run();
  const report = await readIssues(env, params, user);
  assert.equal(report.rows.length, 1);
  await assert.rejects(
    () => updateIssue(env, { id: report.rows[0].id, status: 'resolved' }, { ...user, capabilities: ['audit.read'] }),
    e => e.status === 403,
  );
  await updateIssue(env, { id: report.rows[0].id, status: 'in_progress' }, user);
  assert.equal((await readIssues(env, params, user)).rows[0].status, 'in_progress');
  assert.equal((await env.DB.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='issue.status'").first()).n, 1);
  await assert.rejects(() => updateIssue(env, { id: 'made-up', status: 'resolved' }, user));
});
test('capabilities fail closed and exports need explicit permission', () => {
  assert.throws(
    () => requireInsightPermission({ capabilities: [] }, 'insights'),
    e => e.status === 403,
  );
  assert.throws(
    () => requireInsightPermission(user, 'insights', true),
    e => e.status === 403,
  );
});
test('finance books receipts on paid date and support timeline paginates with wallet privacy', async () => {
  const env = await setup();
  await env.DB.prepare(
    'CREATE TABLE app_users(id TEXT PRIMARY KEY,display_name TEXT,email TEXT,status TEXT,created_at TEXT,updated_at TEXT)',
  ).run();
  await env.DB.prepare("INSERT INTO app_users VALUES('u','An','a@test','active','2026-01-01','2026-01-01')").run();
  await env.DB.prepare(
    'CREATE TABLE topup_orders_zalo(id TEXT,user_id TEXT,status TEXT,amount_vnd INTEGER,points INTEGER,created_at TEXT,paid_at TEXT)',
  ).run();
  await env.DB.prepare(
    "INSERT INTO topup_orders_zalo VALUES('o','u','paid',50000,50,'2026-09-01','2026-09-24T01:00:00.000Z')",
  ).run();
  await env.DB.prepare(
    'CREATE TABLE zalo_point_ledger(id TEXT,user_id TEXT,delta INTEGER,reason TEXT,created_at TEXT)',
  ).run();
  await env.DB.prepare(
    "WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<70) INSERT INTO zalo_point_ledger SELECT n,'u',-2,'ai','2026-09-24T02:00:00.000Z' FROM seq",
  ).run();
  const report = await readInsights(env, params, user);
  assert.equal(report.finance.paidVnd, 50000);
  assert.equal(report.finance.spentPoints, 140);
  assert.equal(report.daily[0].paidVnd, 50000);
  const first = await readSupport(env, new URLSearchParams('userId=u'), user);
  assert.equal(first.timeline.length, 50);
  assert.equal(first.nextTimelinePage, 2);
  const second = await readSupport(env, new URLSearchParams('userId=u&timelinePage=2'), user);
  assert.equal(second.timeline.length, 21);
  assert.equal(second.nextTimelinePage, null);
  const restricted = await readSupport(env, new URLSearchParams('userId=u'), { ...user, capabilities: ['users.read'] });
  assert.equal(restricted.timeline.length, 0);
});
test('missing and partial event coverage never invent historical counts', async () => {
  const env = await setup();
  await env.DB.prepare(
    'CREATE TABLE feature_events(id TEXT,event TEXT,module TEXT,service_id TEXT,source TEXT,session_id TEXT,device TEXT,created_at TEXT)',
  ).run();
  let report = await readInsights(env, params, user);
  assert.equal(report.overview.results.current, null);
  await env.DB.prepare(
    "INSERT INTO feature_events VALUES('1','result_view','tarot','tarot','cache','s','mobile','2026-09-24T01:00:00.000Z')",
  ).run();
  report = await readInsights(env, params, user);
  assert.equal(report.overview.results.current, 1);
  assert.equal(report.overview.activeSessions.current, 1);
  assert.equal(report.coverage.partial, true);
  assert.equal(report.overview.results.previous, null);
  assert.equal(report.features[0].cache, 1);
  const before = await readInsights(env, new URLSearchParams('from=2026-09-20&to=2026-09-21'), user);
  assert.equal(before.overview.results.current, null);
});
test('attendance counts distinguish repeats and milestones from site retention', async () => {
  const env = await setup();
  await env.DB.prepare(
    'CREATE TABLE reward_events(id TEXT,user_id TEXT,kind TEXT,status TEXT,payload TEXT,created_at TEXT)',
  ).run();
  for (const [id, date, milestones] of [
    ['r1', '2026-09-23T18:00:00.000Z', []],
    ['r2', '2026-09-24T18:00:00.000Z', [3]],
  ])
    await env.DB.prepare("INSERT INTO reward_events VALUES(?,'u','attendance','completed',?,?)")
      .bind(id, JSON.stringify({ milestones }), date)
      .run();
  const report = await readInsights(env, new URLSearchParams('from=2026-09-24&to=2026-09-25'), user);
  assert.equal(report.rewards.attendance, 2);
  assert.equal(report.rewards.repeatAttendance, 1);
  assert.equal(report.rewards.milestones, 1);
  assert.equal(report.rewards.attendanceDaily.length, 2);
});
test('HTTP routes require authentication and issue writes require matching CSRF', async () => {
  const { handleAdmin } = await import('./server.mjs');
  const env = { ...(await setup()), LOCAL_ADMIN: true, LOCAL_ADMIN_PASSWORD: 'test-only-password' };
  const request = (path, method = 'GET', body, headers = {}) =>
    new Request('http://localhost/api/admin/' + path, {
      method,
      headers: { origin: 'http://localhost', 'content-type': 'application/json', ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  assert.equal((await handleAdmin(request('data/insights'), env)).status, 401);
  const login = await handleAdmin(request('login', 'POST', { password: env.LOCAL_ADMIN_PASSWORD }), env),
    cookie = login.headers.get('set-cookie').split(';')[0],
    { csrf } = await login.json();
  assert.equal(
    (
      await handleAdmin(
        request('data/issues', 'POST', { id: 'ai-failed', status: 'resolved' }, { cookie, 'x-admin-csrf': 'wrong' }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleAdmin(
        request('data/issues', 'POST', { id: 'ai-failed', status: 'resolved' }, { cookie, 'x-admin-csrf': csrf }),
        env,
      )
    ).status,
    200,
  );
  assert.equal(
    (await handleAdmin(request('data/insights?from=2026-09-24&to=2026-09-24', 'GET', null, { cookie }), env)).status,
    200,
  );
});
test('issue update rollback preserves prior state when audit fails', async () => {
  const env = await setup();
  await updateIssue(env, { id: 'ai-failed', status: 'acknowledged' }, user);
  await env.DB.prepare(
    "CREATE TRIGGER reject_issue_audit BEFORE INSERT ON admin_audit BEGIN SELECT RAISE(ABORT,'test audit failure'); END",
  ).run();
  await assert.rejects(() => updateIssue(env, { id: 'ai-failed', status: 'resolved' }, user));
  assert.equal(
    (await env.DB.prepare("SELECT status FROM admin_issue_states WHERE id='ai-failed'").first()).status,
    'acknowledged',
  );
});
test('ad rewards use grant date even when session started in previous period', async () => {
  const env = await setup();
  await env.DB.prepare(
    'CREATE TABLE reward_ad_sessions(id TEXT,status TEXT,points INTEGER,created_at INTEGER,granted_at INTEGER)',
  ).run();
  await env.DB.prepare("INSERT INTO reward_ad_sessions VALUES('ad','granted',5,?,?)")
    .bind(Date.parse('2026-09-23T16:59:00Z'), Date.parse('2026-09-23T17:01:00Z'))
    .run();
  const report = await readInsights(env, params, user);
  assert.equal(report.rewards.adStarted, 0);
  assert.equal(report.rewards.adGranted, 1);
  assert.equal(report.rewards.adPoints, 5);
});
test('feature starts use collector taxonomy and AI failures share report classification', async () => {
  const env = await setup();
  await env.DB.prepare(
    'CREATE TABLE feature_events(id TEXT,event TEXT,module TEXT,service_id TEXT,source TEXT,session_id TEXT,device TEXT,created_at TEXT)',
  ).run();
  await env.DB.prepare(
    "INSERT INTO feature_events VALUES('1','feature_start','tarot','tarot','ai','s','mobile','2026-09-24T01:00:00.000Z')",
  ).run();
  for (const status of [
    'success',
    'replayed',
    'rate_limited',
    'SERVICE_UNAVAILABLE',
    'PROVIDERS_EXHAUSTED',
    'AI_BUDGET_EXHAUSTED',
    'UNKNOWN_ERROR',
    'failed',
  ])
    await env.DB.prepare("INSERT INTO admin_ai_requests VALUES(?,'tarot',1,'2026-09-24T01:00:00.000Z',?,'[]',1)")
      .bind(status, status)
      .run();
  const report = await readInsights(env, params, user);
  assert.equal(report.features[0].starts, 1);
  assert.equal(report.overview.errors.current, 4);
  assert.equal((await readIssues(env, params, user)).rows.find(r => r.id === 'ai-failed').count, 4);
});
test('reward ledger counts actual reference-based milestones and legacy colon-prefix rewards only', async () => {
  const env = await setup();
  await env.DB.prepare(
    'CREATE TABLE zalo_point_ledger(id TEXT,delta INTEGER,reason TEXT,reference_id TEXT,created_at TEXT)',
  ).run();
  for (const [reason, ref] of [
    ['attendance', '2026-09-24'],
    ['referral', 'u:milestone:2026-09-24'],
    ['referral', 'u:first-paid-topup'],
    ['milestone:3', 'u'],
    ['referral:signup', 'u'],
    ['admin_adjust', 'u'],
    ['referral_unrelated', 'u'],
  ])
    await env.DB.prepare("INSERT INTO zalo_point_ledger VALUES(?,5,?,?,'2026-09-24T01:00:00.000Z')")
      .bind(reason + ref, reason, ref)
      .run();
  assert.equal((await readInsights(env, params, user)).finance.rewardPoints, 25);
});
test('pending payment attention starts at 15 minutes, after configured expiry grace', async () => {
  const env = await setup();
  await env.DB.prepare('CREATE TABLE topup_orders_zalo(id TEXT,status TEXT,created_at TEXT)').run();
  await env.DB.prepare(
    "INSERT INTO topup_orders_zalo VALUES('old','pending',strftime('%Y-%m-%dT%H:%M:%fZ','now','-16 minutes')),('recent','pending',strftime('%Y-%m-%dT%H:%M:%fZ','now','-14 minutes'))",
  ).run();
  const result = await readIssues(env, new URLSearchParams(), user);
  assert.equal(result.rows.find(r => r.id === 'topup-pending')?.count, 1);
});

test('login issue stages exclude recovered fallbacks and non-login reward diagnostics', async () => {
  const env = await setup();
  await env.DB.prepare('CREATE TABLE login_diagnostics(stage TEXT,detail TEXT,created_at TEXT)').run();
  for (const stage of [
    'callback_rejected',
    'state_expired_or_missing',
    'token_exchange_failed',
    'server_verify_failed',
    'browser_fallback_started',
    'referral_reward_pending',
    'success',
  ])
    await env.DB.prepare("INSERT INTO login_diagnostics VALUES(?,'{}','2026-09-24T01:00:00.000Z')").bind(stage).run();
  assert.equal((await readIssues(env, params, user)).rows.find(r => r.id === 'login-errors').count, 4);
});
test('issue state storage alone does not imply source availability', async () => {
  const env = await setup();
  await env.DB.prepare('DROP TABLE admin_ai_requests').run();
  assert.equal((await readIssues(env, params, user)).available, false);
});
test('referral service conversion counts successful referred users once by period end', async () => {
  const env = await setup();
  await env.DB.prepare('CREATE TABLE user_referrals(user_id TEXT,inviter_id TEXT,created_at TEXT)').run();
  await env.DB.prepare(
    "INSERT INTO user_referrals VALUES('used','inviter','2026-09-24T01:00:00.000Z'),('refunded','inviter','2026-09-24T01:00:00.000Z'),('late','inviter','2026-09-24T01:00:00.000Z'),('old','inviter','2026-09-20T01:00:00.000Z')",
  ).run();
  await env.DB.prepare('DROP TABLE backend_ai_operations').run();
  assert.equal((await readInsights(env, params, user)).rewards.referredUsed, null);
  await env.DB.prepare(
    'CREATE TABLE backend_ai_operations(user_id TEXT,status TEXT,created_at INTEGER,updated_at INTEGER)',
  ).run();
  for (const [id, status, at] of [
    ['used', 'succeeded', '2026-09-24T02:00:00Z'],
    ['used', 'succeeded', '2026-09-24T03:00:00Z'],
    ['refunded', 'refunded', '2026-09-24T02:00:00Z'],
    ['late', 'succeeded', '2026-09-24T18:00:00Z'],
    ['old', 'succeeded', '2026-09-24T02:00:00Z'],
  ])
    await env.DB.prepare('INSERT INTO backend_ai_operations VALUES(?,?,?,?)')
      .bind(id, status, Date.parse(at), Date.parse(at))
      .run();
  assert.equal((await readInsights(env, params, user)).rewards.referredUsed, 1);
});
test('module ranking deduplicates sessions across services and distinguishes result sources', async () => {
  const env = await setup();
  await env.DB.prepare(
    'CREATE TABLE feature_events(id TEXT,event TEXT,module TEXT,service_id TEXT,source TEXT,session_id TEXT,device TEXT,created_at TEXT)',
  ).run();
  for (const [id, service, source] of [
    ['a', 'tarot_one', 'ai'],
    ['b', 'tarot_three', 'cache'],
    ['c', 'tarot_one', 'calculation'],
    ['d', 'tarot_three', 'saved'],
  ])
    await env.DB.prepare(
      "INSERT INTO feature_events VALUES(?,'result_view','tarot',?,?,'same-session','mobile','2026-09-24T01:00:00.000Z')",
    )
      .bind(id, service, source)
      .run();
  const report = await readInsights(env, params, user);
  assert.equal(report.modules.length, 1);
  assert.equal(report.modules[0].sessions, 1);
  assert.equal(report.modules[0].results, 4);
  assert.equal(report.modules[0].service, '');
  assert.equal(report.modules[0].completionRate, null);
  const one = report.features.find(f => f.service === 'tarot_one'),
    three = report.features.find(f => f.service === 'tarot_three');
  assert.equal(one.aiResults, 1);
  assert.equal(one.calculationResults, 1);
  assert.equal(three.savedResults, 1);
  assert.equal(three.cache, 1);
});
