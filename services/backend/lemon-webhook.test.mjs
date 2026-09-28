import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHmac } from 'node:crypto';
import { handleLemonWebhook, verifyLemonSignature } from './lemon-webhook.mjs';
import { creditsBalance } from './credits.mjs';

const SECRET = 'whsec-test';
function fixture() {
  const native = new DatabaseSync(':memory:');
  native.exec("CREATE TABLE app_users(id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active')");
  for (const f of ['lemon-orders.sql', 'us-credits.sql', 'lemon-webhook.sql'])
    native.exec(readFileSync(new URL('../../migrations/' + f, import.meta.url), 'utf8'));
  native.prepare("INSERT INTO app_users(id,status) VALUES('u1','active')").run();
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
  return {
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
    LEMON_WEBHOOK_SECRET: SECRET,
  };
}
async function seedOrder(env, overrides = {}) {
  const id = overrides.id || crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO lemon_orders(id,user_id,market,package_id,package_revision,credits,amount_usd_cents,variant_id,store_id,environment,status,request_key,created_at,updated_at)
     VALUES(?,?,'US','us-5',1,5,499,'var-5','store-1','test','pending','rk-${id.slice(0, 8)}','2026','2026')`,
  )
    .bind(id, overrides.userId || 'u1')
    .run();
  return id;
}
const event = (orderId, attrs = {}) => ({
  meta: { event_name: 'order_created', custom_data: { orderId }, test_mode: true },
  data: {
    id: 'evt-1',
    attributes: {
      order_id: 9001,
      status: 'paid',
      store_id: 11111,
      currency: 'USD',
      subtotal: 499,
      tax: 0,
      total: 499,
      variant_id: 424242,
      first_order_item: { variant_id: 424242 },
      ...attrs,
    },
  },
});
const signedRequest = (payload, secret = SECRET) => {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  return new Request('https://api.theastrox.space/api/lemon/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Signature': signature },
    body,
  });
};

test('signed paid order credits the wallet exactly once (PAY-01: 20 replays, one entry)', async () => {
  const env = fixture();
  await seedOrder(env, {});
  // Map provider store/variant ids onto the snapshot before processing.
  await env.DB.prepare("UPDATE lemon_orders SET store_id='11111', variant_id='424242' WHERE user_id='u1'").run();
  const payload = event((await env.DB.prepare('SELECT id FROM lemon_orders').first()).id);
  let last;
  for (let i = 0; i < 20; i++) last = await handleLemonWebhook(env, signedRequest(payload));
  assert.equal(last.status, 200);
  const wallet = await creditsBalance(env, 'u1');
  assert.equal(wallet.balance, 5);
  const ledger = (await env.DB.prepare("SELECT COUNT(*) AS n FROM credits_ledger WHERE kind='purchase'").first()).n;
  assert.equal(ledger, 1);
  const order = await env.DB.prepare('SELECT status FROM lemon_orders').first();
  assert.equal(order.status, 'fulfilled');
});

test('tampered body, missing or malformed signature → 401, nothing recorded', async () => {
  const env = fixture();
  const id = await seedOrder(env);
  await env.DB.prepare("UPDATE lemon_orders SET store_id='11111', variant_id='424242' WHERE id=?").bind(id).run();
  const payload = event(id);
  // Signature over the ORIGINAL body; the transmitted body differs → must 401.
  const goodSig = createHmac('sha256', SECRET).update(JSON.stringify(payload)).digest('hex');
  const tampered = await handleLemonWebhook(
    env,
    new Request('https://api.theastrox.space/api/lemon/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Signature': goodSig },
      body: JSON.stringify({ ...payload, evil: true }),
    }),
  );
  assert.equal(tampered.status, 401);
  const missing = await handleLemonWebhook(
    env,
    new Request('https://x/api/lemon/webhook', { method: 'POST', body: JSON.stringify(payload) }),
  );
  assert.equal(missing.status, 401);
  const malformed = await handleLemonWebhook(
    env,
    new Request('https://x/api/lemon/webhook', {
      method: 'POST',
      headers: { 'X-Signature': 'zz' },
      body: JSON.stringify(payload),
    }),
  );
  assert.equal(malformed.status, 401);
  assert.equal((await creditsBalance(env, 'u1')).balance, 0);
});

test('wrong store/currency/variant or unpaid status is accepted but never credited', async () => {
  const env = fixture();
  for (const [i, attrs] of [
    { store_id: 99999 },
    { currency: 'EUR' },
    { variant_id: 777 },
    { status: 'pending' },
  ].entries()) {
    const id = await seedOrder(env);
    await env.DB.prepare("UPDATE lemon_orders SET store_id='11111', variant_id='424242' WHERE id=?").bind(id).run();
    const res = await handleLemonWebhook(env, signedRequest(event(id, { order_id: 9000 + i, ...attrs })));
    assert.equal(res.status, 200, JSON.stringify(attrs));
  }
  assert.equal((await creditsBalance(env, 'u1')).balance, 0);
  const orders = (await env.DB.prepare("SELECT COUNT(*) AS n FROM lemon_orders WHERE status='fulfilled'").first()).n;
  assert.equal(orders, 0);
});

test('price mismatch between webhook subtotal and pinned order is rejected loudly (operator signal)', async () => {
  const env = fixture();
  const id = await seedOrder(env);
  await env.DB.prepare("UPDATE lemon_orders SET store_id='11111', variant_id='424242' WHERE id=?").bind(id).run();
  const res = await handleLemonWebhook(env, signedRequest(event(id, { subtotal: 100, total: 100 })));
  assert.equal(res.status, 200); // accepted (provider will not retry), but flagged
  const body = await res.json();
  assert.equal(body.credited, false);
  assert.equal((await env.DB.prepare('SELECT status FROM lemon_orders WHERE id=?').bind(id).first()).status, 'pending');
  assert.equal((await creditsBalance(env, 'u1')).balance, 0);
});

test('forged custom order id and unknown signed events are acknowledged and ignored', async () => {
  const env = fixture();
  const forged = await handleLemonWebhook(env, signedRequest(event('not-a-real-order')));
  assert.equal(forged.status, 200);
  const unknown = await handleLemonWebhook(
    env,
    signedRequest({ meta: { event_name: 'subscription_created', test_mode: true }, data: { id: 'e', attributes: {} } }),
  );
  assert.equal(unknown.status, 200);
  assert.equal((await creditsBalance(env, 'u1')).balance, 0);
});

test('signature helper: correct hex passes, wrong secret fails, length-safe', async () => {
  const body = '{"a":1}';
  const good = createHmac('sha256', SECRET).update(body).digest('hex');
  assert.equal(await verifyLemonSignature(body, good, SECRET), true);
  assert.equal(await verifyLemonSignature(body, good, 'other-secret'), false);
  assert.equal(await verifyLemonSignature(body, 'deadbeef', SECRET), false);
  assert.equal(await verifyLemonSignature(body, '', SECRET), false);
});
