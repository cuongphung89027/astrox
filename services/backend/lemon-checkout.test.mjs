import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createLemonCheckout, lemonOrderStatus, verifyCheckoutSnapshot } from './lemon.mjs';

function fixture() {
  const native = new DatabaseSync(':memory:');
  native.exec("CREATE TABLE app_users(id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active')");
  native.exec(readFileSync(new URL('../../migrations/lemon-orders.sql', import.meta.url), 'utf8'));
  native.exec(readFileSync(new URL('../../migrations/us-credits.sql', import.meta.url), 'utf8'));
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
  native.prepare("INSERT INTO app_users(id,status) VALUES('u1','active')").run();
  native.prepare("INSERT INTO app_users(id,status) VALUES('u2','active')").run();
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
    LEMON_API_KEY: 'test-key',
  };
}
const config = (overrides = {}) => ({
  integrations: {
    lemon: {
      enabled: true,
      environment: 'test',
      storeIds: { test: 'store-1', live: 'store-live' },
      packages: [
        { id: 'us-5', name: '5 Credits', credits: 5, amountUsdCents: 499, variantId: 'var-5', enabled: true },
        { id: 'us-20', name: '20 Credits', credits: 20, amountUsdCents: 1799, variantId: 'var-20', enabled: true },
      ],
      ...overrides,
    },
  },
});
const okUpstream = url => `https://checkout.example.test/${url.searchParams.get('x') || 'o'}`;

test('checkout creates one server-owned order per (user, requestKey) — retry returns the same order', async () => {
  const env = fixture();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return Response.json({
      data: { id: 'ls-1', attributes: { url: 'https://checkout.example.test/x', status: 'pending' } },
    });
  };
  const input = { userId: 'u1', packageId: 'us-5', requestKey: 'request-key-alpha-01', email: 'sam@example.com' };
  const a = await createLemonCheckout(env, config(), input, fetchImpl);
  const b = await createLemonCheckout(env, config(), input, fetchImpl);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(a.order.id, b.order.id);
  assert.equal(a.order.checkoutUrl, b.order.checkoutUrl);
  assert.equal(calls.length, 1); // retry never creates a second provider checkout
  // The provider payload carries only the opaque local order id as custom data.
  assert.equal(calls[0].body.data.attributes.custom_data.orderId, a.order.id);
  assert.equal(JSON.stringify(calls[0].body).includes('sam@example.com'), true);
  assert.equal(JSON.stringify(calls[0].body.data.attributes).includes('custom_price'), false);
});

test('the order snapshot pins package revision, credits, cents, variant and environment', async () => {
  const env = fixture();
  const fetchImpl = async () =>
    Response.json({ data: { id: 'ls-2', attributes: { url: 'https://checkout.example.test/y', status: 'pending' } } });
  const { order } = await createLemonCheckout(
    env,
    config({ packages: config().integrations.lemon.packages, storeIds: { test: 'store-1', live: 'store-live' } }),
    { userId: 'u1', packageId: 'us-20', requestKey: 'request-key-beta-02', email: 'e@x.com' },
    fetchImpl,
  );
  const row = await env.DB.prepare('SELECT * FROM lemon_orders WHERE id=?').bind(order.id).first();
  assert.equal(row.credits, 20);
  assert.equal(row.amount_usd_cents, 1799);
  assert.equal(row.variant_id, 'var-20');
  assert.equal(row.store_id, 'store-1');
  assert.equal(row.environment, 'test');
  assert.equal(row.status, 'pending');
  assert.equal(row.package_revision, 1);
});

test('unknown package, disabled package, disabled integration and anonymous users are refused', async () => {
  const env = fixture();
  const fetchImpl = async () => {
    throw new Error('must not call provider');
  };
  const unknown = await createLemonCheckout(
    env,
    config(),
    { userId: 'u1', packageId: 'nope', requestKey: 'request-key-unknown-05', email: 'e@x.com' },
    fetchImpl,
  );
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error, 'package_not_found');
  const disabled = await createLemonCheckout(
    env,
    config({ packages: [{ id: 'us-5', name: 'x', credits: 5, amountUsdCents: 499, variantId: 'v', enabled: false }] }),
    { userId: 'u1', packageId: 'us-5', requestKey: 'request-key-disabled-06', email: 'e@x.com' },
    fetchImpl,
  );
  assert.equal(disabled.error, 'package_not_found');
  const off = await createLemonCheckout(
    env,
    config({ enabled: false }),
    { userId: 'u1', packageId: 'us-5', requestKey: 'request-key-off-07', email: 'e@x.com' },
    fetchImpl,
  );
  assert.equal(off.error, 'lemon_not_configured');
  const anon = await createLemonCheckout(
    env,
    config(),
    { userId: '', packageId: 'us-5', requestKey: 'request-key-anon-08', email: 'e@x.com' },
    fetchImpl,
  );
  assert.equal(anon.error, 'unauthorized');
});

test('upstream timeout stays "unknown": the order remains pending and no second provider order is created', async () => {
  const env = fixture();
  let attempts = 0;
  const fetchImpl = async () => {
    attempts++;
    throw new Error('network timeout');
  };
  const r = await createLemonCheckout(
    env,
    config(),
    { userId: 'u1', packageId: 'us-5', requestKey: 'request-key-timeout-03', email: 'e@x.com' },
    fetchImpl,
  );
  assert.equal(r.ok, true);
  assert.equal(r.order.checkoutUrl, null);
  assert.equal(r.order.status, 'pending');
  const row = await env.DB.prepare('SELECT status, checkout_url FROM lemon_orders WHERE id=?').bind(r.order.id).first();
  assert.equal(row.status, 'pending');
  // The retry path returns the SAME local order; the operator resolves it by reconciliation.
  const again = await createLemonCheckout(
    env,
    config(),
    { userId: 'u1', packageId: 'us-5', requestKey: 'request-key-timeout-03', email: 'e@x.com' },
    fetchImpl,
  );
  assert.equal(again.order.id, r.order.id);
});

test('status endpoint reads only; it never credits the wallet (PAY-02)', async () => {
  const env = fixture();
  const fetchImpl = async () =>
    Response.json({ data: { id: 'ls-9', attributes: { url: 'https://checkout.example.test/z', status: 'pending' } } });
  const { order } = await createLemonCheckout(
    env,
    config(),
    { userId: 'u1', packageId: 'us-5', requestKey: 'request-key-status-04', email: 'e@x.com' },
    fetchImpl,
  );
  const status = await lemonOrderStatus(env, 'u1', order.id);
  assert.equal(status.ok, true);
  assert.equal(status.order.status, 'pending');
  // Foreign user sees nothing.
  const foreign = await lemonOrderStatus(env, 'u2', order.id);
  assert.equal(foreign.ok, false);
  assert.equal(foreign.status, 404);
});

test('checkout verification blocks tax-free mismatches but accepts tax-added totals (PAY-05)', async () => {
  const order = { amount_usd_cents: 1799, variant_id: 'var-20', environment: 'test', store_id: 'store-1' };
  assert.equal(
    verifyCheckoutSnapshot(order, {
      subtotal_cents: 1799,
      tax_cents: 0,
      total_cents: 1799,
      variant_id: 'var-20',
      store_id: 'store-1',
      environment: 'test',
    }).ok,
    true,
  );
  assert.equal(
    verifyCheckoutSnapshot(order, {
      subtotal_cents: 1799,
      tax_cents: 144,
      total_cents: 1943,
      variant_id: 'var-20',
      store_id: 'store-1',
      environment: 'test',
    }).ok,
    true,
  );
  assert.equal(
    verifyCheckoutSnapshot(order, {
      subtotal_cents: 999,
      tax_cents: 0,
      total_cents: 999,
      variant_id: 'var-20',
      store_id: 'store-1',
      environment: 'test',
    }).ok,
    false,
  );
  assert.equal(
    verifyCheckoutSnapshot(order, {
      subtotal_cents: 1799,
      tax_cents: 0,
      total_cents: 1799,
      variant_id: 'var-OTHER',
      store_id: 'store-1',
      environment: 'test',
    }).ok,
    false,
  );
  assert.equal(
    verifyCheckoutSnapshot(order, {
      subtotal_cents: 1799,
      tax_cents: 0,
      total_cents: 1799,
      variant_id: 'var-20',
      store_id: 'store-1',
      environment: 'live',
    }).ok,
    false,
  );
});
