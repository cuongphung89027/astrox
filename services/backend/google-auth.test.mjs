import test from 'node:test';
import { defaultConfig } from '../admin/config.ts';
import { state, saveDraft, publish } from '../admin/store.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  googleLogin,
  googleCallback,
  verifyGoogleIdToken,
  allowedReturn,
  completeGoogleLogin,
} from './google-auth.mjs';

/** Same D1 wrapper as admin/test/sqlite.mjs, plus the real login schema files. */
async function fixture() {
  const native = new DatabaseSync(':memory:');
  for (const file of [
    '../../migrations/admin.sql',
    '../../migrations/ai-safety.sql',
    '../../migrations/service-unlocks.sql',
    '../backend/test/legacy-schema.sql',
    '../../migrations/google-identities.sql',
    '../../migrations/rewards.sql',
    '../../migrations/reward-events.sql',
    '../../migrations/us-credits.sql',
  ]) {
    native.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
  const prepare = (query, args = []) => ({
    bind(...v) {
      return prepare(query, v);
    },
    async first() {
      return native.prepare(query).get(...args) || null;
    },
    async all() {
      return { results: native.prepare(query).all(...args) };
    },
    async run() {
      return { meta: { changes: native.prepare(query).run(...args).changes } };
    },
    execute() {
      const stmt = native.prepare(query);
      return stmt.columns().length ? { results: stmt.all(...args) } : { meta: { changes: stmt.run(...args).changes } };
    },
  });
  const env = {
    DB: {
      prepare,
      async batch(statements) {
        native.exec('BEGIN');
        try {
          const out = statements.map(s => s.execute());
          native.exec('COMMIT');
          return out;
        } catch (e) {
          native.exec('ROLLBACK');
          throw e;
        }
      },
    },
  };
  env.GOOGLE_CLIENT_ID = 'google-client-id';
  env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
  env.GOOGLE_REDIRECT_URI = 'https://api.theastrox.space/auth/google/callback';
  env.SESSION_SECRET = 'test-secret';
  env.APP_ORIGIN = 'https://theastrox.space';
  return env;
}

const settings = { google: { enabled: true, returnUrl: '/en/profile' } };
const req = (path, init = {}) => new Request(`https://api.theastrox.space${path}`, init);

const goodClaims = {
  sub: 'google-sub-1',
  aud: 'google-client-id',
  iss: 'accounts.google.com',
  exp: Math.floor(Date.now() / 1000) + 600,
  nonce: 'the-nonce',
  email: 'sam@example.com',
  email_verified: 'true',
  name: 'Sam Example',
  picture: 'https://lh3.googleusercontent.com/x',
};

function tokenFetch(claims = goodClaims, tokenStatus = 200) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('tokeninfo')) return Response.json(claims, { status: tokenStatus });
    return Response.json({ id_token: 'fake.id.token', access_token: 'access' }, { status: tokenStatus });
  };
  return { fetchImpl, calls };
}

async function startLogin(env) {
  const res = await googleLogin(env, req('/auth/google/login'), settings);
  assert.equal(res.status, 302);
  const state = new URL(res.headers.get('location')).searchParams.get('state');
  const cookie = `astrox_google_oauth=${state}`;
  const nonceRow = await env.DB.prepare('SELECT nonce FROM oauth_states WHERE id=?').bind(state).first();
  return { state, cookie, nonce: nonceRow.nonce };
}

test('login redirect carries state, PKCE and nonce; state row is single-use', async () => {
  const env = await fixture();
  const { state, nonce } = await startLogin(env);
  assert.ok(state);
  assert.ok(nonce);
  const url = new URL((await googleLogin(env, req('/auth/google/login'), settings)).headers.get('location'));
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('nonce'));
});

test('valid token: first login creates exactly one user and one identity', async () => {
  const env = await fixture();
  const { state, cookie, nonce } = await startLogin(env);
  const { fetchImpl } = tokenFetch({ ...goodClaims, nonce });
  const res = await googleCallback(
    env,
    req(`/auth/google/callback?state=${state}&code=abc`, { headers: { cookie } }),
    settings,
    fetchImpl,
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://theastrox.space/en/profile');
  const identity = await env.DB.prepare(
    "SELECT user_id FROM zalo_identities WHERE provider='google' AND provider_subject='google-sub-1'",
  ).first();
  assert.ok(identity);
  const user = await env.DB.prepare('SELECT id,email,status FROM app_users WHERE id=?').bind(identity.user_id).first();
  assert.equal(user.email, 'sam@example.com');
  assert.equal(user.status, 'active');
  // State consumed: replay is rejected.
  const replay = await googleCallback(
    env,
    req(`/auth/google/callback?state=${state}&code=abc`, { headers: { cookie } }),
    settings,
    fetchImpl,
  );
  assert.equal(replay.status, 400);
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM zalo_identities WHERE provider='google'").first();
  assert.equal(count.n, 1);
});

test('wrong audience, issuer, expired token and bad nonce are rejected without creating users', async () => {
  const env = await fixture();
  for (const bad of [
    { ...goodClaims, aud: 'other-client' },
    { ...goodClaims, iss: 'https://evil.example' },
    { ...goodClaims, exp: Math.floor(Date.now() / 1000) - 60 },
    { ...goodClaims, nonce: 'wrong-nonce' },
    { ...goodClaims, email_verified: 'false' },
  ]) {
    const { state, cookie, nonce } = await startLogin(env);
    const { fetchImpl } = tokenFetch(bad);
    const res = await googleCallback(
      env,
      req(`/auth/google/callback?state=${state}&code=abc`, { headers: { cookie } }),
      settings,
      fetchImpl,
    );
    assert.equal(res.status, 401, JSON.stringify(bad));
  }
  const users = await env.DB.prepare('SELECT COUNT(*) AS n FROM app_users').first();
  assert.equal(users.n, 0);
});

test('cookie/state mismatch and off-flow callbacks are rejected', async () => {
  const env = await fixture();
  const { state } = await startLogin(env);
  const { fetchImpl } = tokenFetch();
  const noCookie = await googleCallback(env, req(`/auth/google/callback?state=${state}&code=abc`), settings, fetchImpl);
  assert.equal(noCookie.status, 400);
  const wrongCookie = await googleCallback(
    env,
    req(`/auth/google/callback?state=${state}&code=abc`, { headers: { cookie: 'astrox_google_oauth=someone-else' } }),
    settings,
    fetchImpl,
  );
  assert.equal(wrongCookie.status, 400);
});

test('email colliding with a Zalo user never links accounts', async () => {
  const env = await fixture();
  // Pre-existing Zalo user with the same email.
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO app_users(id,display_name,email,status,created_at,updated_at) VALUES('zuser','Zalo Person','sam@example.com','active','2026-01-01','2026-01-01')",
    ),
    env.DB.prepare(
      "INSERT INTO zalo_identities(id,user_id,provider,provider_subject,created_at) VALUES('zi1','zuser','zalo','zalo-123','2026-01-01')",
    ),
  ]);
  const { state, cookie, nonce } = await startLogin(env);
  const { fetchImpl } = tokenFetch({ ...goodClaims, nonce });
  const res = await googleCallback(
    env,
    req(`/auth/google/callback?state=${state}&code=abc`, { headers: { cookie } }),
    settings,
    fetchImpl,
  );
  assert.equal(res.status, 302);
  const googleIdentity = await env.DB.prepare(
    "SELECT user_id FROM zalo_identities WHERE provider='google' AND provider_subject='google-sub-1'",
  ).first();
  assert.notEqual(googleIdentity.user_id, 'zuser');
});

test('suspended Google account cannot log in', async () => {
  const env = await fixture();
  // Create the user first, then suspend.
  await completeGoogleLogin(env, req('/x', { method: 'POST' }), settings, {
    sub: 'google-sub-1',
    email: 'sam@example.com',
    name: 'Sam',
    picture: '',
  });
  const identity = await env.DB.prepare(
    "SELECT user_id FROM zalo_identities WHERE provider='google' AND provider_subject='google-sub-1'",
  ).first();
  await env.DB.prepare("UPDATE app_users SET status='suspended' WHERE id=?").bind(identity.user_id).run();
  const { state, cookie, nonce } = await startLogin(env);
  const { fetchImpl } = tokenFetch({ ...goodClaims, sub: 'google-sub-1', nonce });
  const res = await googleCallback(
    env,
    req(`/auth/google/callback?state=${state}&code=abc`, { headers: { cookie } }),
    settings,
    fetchImpl,
  );
  assert.equal(res.status, 403);
});

test('concurrent first logins create exactly one user (unique identity wins)', async () => {
  const env = await fixture();
  const results = await Promise.all([
    completeGoogleLogin(env, req('/a', { method: 'POST' }), settings, {
      sub: 'race-sub',
      email: 'a@x.com',
      name: 'A',
      picture: '',
    }),
    completeGoogleLogin(env, req('/b', { method: 'POST' }), settings, {
      sub: 'race-sub',
      email: 'a@x.com',
      name: 'A',
      picture: '',
    }),
  ]);
  assert.ok(results.every(r => r.status === 200));
  const identities = await env.DB.prepare(
    "SELECT user_id FROM zalo_identities WHERE provider='google' AND provider_subject='race-sub'",
  ).all();
  assert.equal(identities.results.length, 1);
});

test('return path allowlist refuses absolute and protocol-relative URLs', async () => {
  assert.equal(allowedReturn('/en/profile'), 'https://theastrox.space/en/profile');
  assert.equal(allowedReturn('https://evil.example'), 'https://theastrox.space/en/profile');
  assert.equal(allowedReturn('//evil.example'), 'https://theastrox.space/en/profile');
  assert.equal(allowedReturn(undefined), 'https://theastrox.space/en/profile');
});

test('tokeninfo failures surface as verification errors, never as logins', async () => {
  const env = await fixture();
  await assert.rejects(() => verifyGoogleIdToken('fake', env, 'n', async () => new Response('{}', { status: 400 })));
  const { state, cookie, nonce } = await startLogin(env);
  const failing = async (url, init) =>
    String(url).includes('tokeninfo') ? new Response('{} {', { status: 200 }) : Response.json({ id_token: 'x' });
  const res = await googleCallback(
    env,
    req(`/auth/google/callback?state=${state}&code=abc`, { headers: { cookie } }),
    settings,
    failing,
  );
  assert.equal(res.status, 401);
  assert.equal(nonce.length > 8, true);
});

test('new verified Google identity earns configured US referral Credits exactly once', async () => {
  const env = await fixture();
  await state(env);
  const c = defaultConfig();
  c.rewardsUs.enabled = true;
  c.rewardsUs.registrationEnabled = true;
  c.rewardsUs.registrationUser = 3;
  c.rewardsUs.registrationInviter = 4;
  await saveDraft(env, 'test', c, 0);
  await publish(env, 'test', c, 1, 'US rewards');
  await env.DB.prepare(
    "INSERT INTO app_users(id,display_name,status,created_at,updated_at) VALUES('inviter','Invite','active','now','now')",
  ).run();
  await env.DB.prepare("INSERT INTO market_preferences VALUES('inviter','US','now')").run();
  await env.DB.prepare("INSERT INTO referral_codes VALUES('inviter','REFER1','now')").run();
  const me = { sub: 'new-google', name: 'Alex', email: 'alex@example.com', picture: '' };
  for (let i = 0; i < 2; i++)
    assert.equal((await completeGoogleLogin(env, req('/auth/google/callback'), settings, me, 'REFER1')).status, 302);
  const user = (await env.DB.prepare("SELECT user_id FROM zalo_identities WHERE provider_subject='new-google'").first())
    .user_id;
  assert.equal(
    (await env.DB.prepare('SELECT balance FROM credits_accounts WHERE user_id=?').bind(user).first()).balance,
    3,
  );
  assert.equal(
    (await env.DB.prepare("SELECT balance FROM credits_accounts WHERE user_id='inviter'").first()).balance,
    4,
  );
  assert.equal(
    (await env.DB.prepare('SELECT balance FROM zalo_point_accounts WHERE user_id=?').bind(user).first()).balance,
    0,
  );
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM credits_ledger').first()).n, 2);
});
