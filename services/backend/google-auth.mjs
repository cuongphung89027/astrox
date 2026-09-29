import { registrationEventStatements, settleRegistration } from './rewards.mjs';
/**
 * Google OIDC login for the English/US edition (plan Task 11).
 *
 * Mirrors the Zalo flow in auth.mjs: state + PKCE stored in oauth_states (with
 * the new nonce column), single-use consumption via DELETE … RETURNING, atomic
 * first-login user creation through the shared identity table
 * (zalo_identities, UNIQUE(provider, provider_subject) — no duplicate table),
 * and the same session cookie. Identity verification is server-side: Google's
 * tokeninfo endpoint checks the id_token signature, then we locally assert
 * audience, issuer, expiry, nonce and email verification. No JWT crypto is
 * hand-rolled; no access token is stored beyond the request.
 *
 * Google identities never auto-link to a Zalo account, even on email collision.
 */
import { json } from './http.mjs';
import { sessionCookie } from './auth.mjs';
import { equal } from '../admin/crypto.mjs';

const enc = new TextEncoder();
const base64url = bytes =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function diag(env, stage, detail) {
  try {
    await env.DB.prepare('INSERT INTO login_diagnostics(stage,detail,created_at) VALUES(?,?,?)')
      .bind(stage, JSON.stringify(detail).slice(0, 900), new Date().toISOString())
      .run();
  } catch {
    /* Diagnostics never block login. */
  }
}

export function googleConfigured(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET);
}

export async function googleLogin(env, request, settings) {
  if (!settings?.google?.enabled || !googleConfigured(env))
    return json(env, request, { error: 'google_not_configured' }, 503);
  const state = crypto.randomUUID();
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const challenge = base64url(await crypto.subtle.digest('SHA-256', enc.encode(verifier)));
  const ref = new URL(request.url).searchParams.get('ref');
  await env.DB.batch([
    ...(ref && /^[A-Z0-9]{4,10}$/.test(ref)
      ? [
          env.DB.prepare('INSERT INTO oauth_referrals(id,ref,created_at) VALUES(?,?,?)').bind(
            state,
            ref,
            new Date().toISOString(),
          ),
        ]
      : []),
    env.DB.prepare('INSERT INTO oauth_states(id,code_verifier,nonce,created_at) VALUES(?,?,?,?)').bind(
      state,
      verifier,
      nonce,
      new Date().toISOString(),
    ),
  ]);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      location: url.href,
      'cache-control': 'no-store',
      'set-cookie': `astrox_google_oauth=${state}; HttpOnly; Secure; SameSite=Lax; Path=/auth/google; Max-Age=600`,
    },
  });
}

/** Only same-site relative paths may be used as the post-login return; the
 *  path is validated then resolved against the trusted frontend origin because
 *  the callback runs on the API host (api.theastrox.space). */
export function allowedReturn(value, origin = 'https://theastrox.space') {
  const path = typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/en/profile';
  const base = /^https:\/\/[a-z0-9.-]+$/i.test(origin) ? origin : 'https://theastrox.space';
  return new URL(path, base + '/').href;
}

/** Verifies a Google id_token via Google's tokeninfo endpoint (signature-checked
 * by Google) and enforces audience/issuer/expiry/nonce locally. */
export async function verifyGoogleIdToken(idToken, env, expectedNonce, fetchImpl = fetch, now = Date.now) {
  if (typeof idToken !== 'string' || !idToken) throw new Error('google_identity_unverified:missing_id_token');
  const r = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  const payload = await r.json().catch(() => null);
  if (!r.ok || !payload || !payload.sub) throw new Error(`google_identity_unverified:status=${r.status}`);
  if (payload.aud !== env.GOOGLE_CLIENT_ID) throw new Error('google_identity_unverified:audience');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss))
    throw new Error('google_identity_unverified:issuer');
  if (Number(payload.exp) * 1000 <= now()) throw new Error('google_identity_unverified:expired');
  if (!expectedNonce || typeof payload.nonce !== 'string' || !(await equal(payload.nonce, expectedNonce)))
    throw new Error('google_identity_unverified:nonce');
  if (payload.email_verified === 'false' || payload.email_verified === false)
    throw new Error('google_identity_unverified:email_not_verified');
  return payload;
}

export async function googleCallback(env, request, settings, fetchImpl = fetch) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const cookie = (request.headers.get('cookie') || '').match(/(?:^|;\s*)astrox_google_oauth=([^;]+)/)?.[1];
  if (!state || !code || !cookie || !(await equal(state, cookie))) {
    await diag(env, 'google_callback_rejected', {
      has_state: !!state,
      has_code: !!code,
      has_cookie: !!cookie,
      google_error: url.searchParams.get('error') || null,
    });
    return json(env, request, { error: 'invalid_oauth_state' }, 400);
  }
  const row = await env.DB.prepare(
    "DELETE FROM oauth_states WHERE id=? AND julianday(created_at)>julianday('now','-10 minutes') RETURNING code_verifier,nonce",
  )
    .bind(state)
    .first();
  if (!row) {
    await diag(env, 'google_state_expired_or_missing', {});
    return json(env, request, { error: 'invalid_or_expired_state' }, 400);
  }
  const tokenResponse = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code_verifier: row.code_verifier,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
    }).toString(),
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  const tokens = await tokenResponse.json().catch(() => null);
  if (!tokenResponse.ok || !tokens?.id_token) {
    await diag(env, 'google_token_exchange_failed', { status: tokenResponse.status });
    return json(env, request, { error: 'token_exchange_failed' }, 502);
  }
  let claims;
  try {
    claims = await verifyGoogleIdToken(tokens.id_token, env, row.nonce, fetchImpl);
  } catch (e) {
    await diag(env, 'google_server_verify_failed', { reason: String(e?.message || '').slice(0, 250) });
    return json(env, request, { error: 'google_identity_unverified' }, 401);
  }
  const refRow = await env.DB.prepare('DELETE FROM oauth_referrals WHERE id=? RETURNING ref').bind(state).first();
  return await completeGoogleLogin(
    env,
    request,
    settings,
    {
      sub: String(claims.sub),
      email: String(claims.email || ''),
      name: String(claims.name || ''),
      picture: String(claims.picture || ''),
    },
    refRow?.ref || null,
  );
}

export async function completeGoogleLogin(env, request, settings, me, ref = null) {
  const now = new Date().toISOString();
  const candidate = crypto.randomUUID();
  const existing = await env.DB.prepare(
    "SELECT user_id FROM zalo_identities WHERE provider='google' AND provider_subject=?",
  )
    .bind(me.sub)
    .first();
  const referralWork = !existing ? await registrationEventStatements(env, candidate, ref, 'US') : [];
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO app_users(id,display_name,email,avatar_url,status,created_at,updated_at) SELECT ?,?,?,?,'active',?,? WHERE NOT EXISTS(SELECT 1 FROM zalo_identities WHERE provider='google' AND provider_subject=?)",
    ).bind(
      candidate,
      me.name.slice(0, 200) || me.email.slice(0, 200) || 'Google User',
      me.email.slice(0, 320),
      me.picture.slice(0, 2000),
      now,
      now,
      me.sub,
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO zalo_identities(id,user_id,provider,provider_subject,created_at) SELECT ?,?,'google',?,? WHERE EXISTS(SELECT 1 FROM app_users WHERE id=?)",
    ).bind(crypto.randomUUID(), candidate, me.sub, now, candidate),
    env.DB.prepare(
      "INSERT OR IGNORE INTO zalo_point_accounts(user_id,balance,updated_at) SELECT user_id,0,? FROM zalo_identities WHERE provider='google' AND provider_subject=?",
    ).bind(now, me.sub),
    env.DB.prepare(
      "INSERT OR IGNORE INTO market_preferences(user_id,market,updated_at) SELECT id,'US',? FROM app_users WHERE id=?",
    ).bind(now, candidate),
    ...referralWork,
  ]);
  const identity = await env.DB.prepare(
    "SELECT user_id FROM zalo_identities WHERE provider='google' AND provider_subject=?",
  )
    .bind(me.sub)
    .first();

  // Sơn 29/09: tài khoản gắn một quốc gia — Google luôn là US; upsert theo user
  // thật để chữa hàng market_preferences cũ do flow onboarding từng cho tự chọn.
  await env.DB.prepare(
    "INSERT INTO market_preferences(user_id,market,updated_at) VALUES(?,'US',?) ON CONFLICT(user_id) DO UPDATE SET market='US', updated_at=excluded.updated_at",
  )
    .bind(identity.user_id, now)
    .run();
  if (!identity) return json(env, request, { error: 'google_login_failed' }, 500);
  const user = await env.DB.prepare("SELECT id FROM app_users WHERE id=? AND status='active'")
    .bind(identity.user_id)
    .first();
  if (!user) return json(env, request, { error: 'account_disabled' }, 403);
  if (ref)
    try {
      await settleRegistration(env, user.id);
    } catch {
      await diag(env, 'referral_reward_pending', {});
    }
  const cookies = [
    ['set-cookie', await sessionCookie(env, user.id)],
    ['set-cookie', 'astrox_google_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/auth/google; Max-Age=0'],
  ];
  const target = allowedReturn(settings?.google?.returnUrl, env.APP_ORIGIN);
  if (request.method === 'GET') {
    const headers = new Headers({ location: target, 'cache-control': 'no-store' });
    for (const [k, v] of cookies) headers.append(k, v);
    return new Response(null, { status: 302, headers });
  }
  const r = json(env, request, { ok: true, redirect: target });
  for (const [k, v] of cookies) r.headers.append(k, v);
  return r;
}
