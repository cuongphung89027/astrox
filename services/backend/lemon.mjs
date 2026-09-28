/**
 * Lemon Squeezy checkout (plan Task 15). The server owns the order book: a
 * local row with the full commercial snapshot is written BEFORE the provider
 * call, keyed by (user, requestKey) so client retries never spawn duplicate
 * provider checkouts. The client sends only packageId + requestKey — never a
 * price. Hosted checkout keeps card data off our surface entirely.
 *
 * Upstream failure semantics: a transport timeout is an UNKNOWN — the order
 * stays pending and reconciliation (Task 17) resolves it; a definitive 4xx on
 * our payload marks the order failed without retrying blindly.
 */
const LEMON_API = 'https://api.lemonsqueezy.com/v1/checkouts';
const nowIso = () => new Date().toISOString();

export async function createLemonCheckout(env, config, { userId, packageId, requestKey, email }, fetchImpl = fetch) {
  if (!userId) return { ok: false, error: 'unauthorized', status: 401 };
  const lemon = config?.integrations?.lemon;
  if (!lemon?.enabled || !env.LEMON_API_KEY) return { ok: false, error: 'lemon_not_configured', status: 503 };
  if (typeof requestKey !== 'string' || !/^[a-zA-Z0-9_-]{8,120}$/.test(requestKey))
    return { ok: false, error: 'invalid_request_key', status: 400 };
  const pack = lemon.packages.find(p => p.id === packageId && p.enabled);
  if (!pack) return { ok: false, error: 'package_not_found', status: 404 };
  const environment = lemon.environment === 'live' ? 'live' : 'test';
  const storeId = lemon.storeIds?.[environment];
  if (!storeId || !pack.variantId) return { ok: false, error: 'lemon_not_configured', status: 503 };

  // One local order per (user, requestKey): retries replay the same row.
  const existing = await env.DB.prepare('SELECT * FROM lemon_orders WHERE user_id=? AND request_key=?')
    .bind(userId, requestKey)
    .first();
  const shape = row => ({ ...row, checkoutUrl: row.checkout_url ?? null });
  if (existing) {
    if (existing.status === 'failed')
      return { ok: false, error: 'order_failed_retry_new', status: 409, order: shape(existing) };
    return { ok: true, order: shape(existing) };
  }

  const id = crypto.randomUUID(),
    at = nowIso();
  await env.DB.prepare(
    `INSERT INTO lemon_orders(id,user_id,market,package_id,package_revision,credits,amount_usd_cents,variant_id,store_id,environment,status,request_key,created_at,updated_at)
     VALUES(?,?,'US',?,?,?,?,?,?,?,'pending',?,?,?)`,
  )
    .bind(
      id,
      userId,
      packageId,
      pack.revision ?? 1,
      pack.credits,
      pack.amountUsdCents,
      pack.variantId,
      storeId,
      environment,
      requestKey,
      at,
      at,
    )
    .run();

  try {
    const response = await fetchImpl(LEMON_API, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${env.LEMON_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            // Opaque local order id is the ONLY custom data — the webhook maps back through it.
            custom_data: { orderId: id },
            checkout_data: { email: String(email || '').slice(0, 320) },
            product_options: {
              enabled_variants: [pack.variantId],
              redirect_url: `https://theastrox.space/en/profile?topup=return`,
              receipt_button_text: 'Back to AstroX',
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: String(storeId) } },
            variant: { data: { type: 'variants', id: String(pack.variantId) } },
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      // Definitive provider rejection of OUR payload: surface safely, mark failed.
      await env.DB.prepare("UPDATE lemon_orders SET status='failed', updated_at=? WHERE id=? AND status='pending'")
        .bind(nowIso(), id)
        .run();
      return { ok: false, error: 'checkout_rejected', status: 502, order: { id, status: 'failed' } };
    }
    const body = await response.json().catch(() => null);
    const url = body?.data?.attributes?.url,
      lemonOrderId = String(body?.data?.id || '');
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      await env.DB.prepare("UPDATE lemon_orders SET status='failed', updated_at=? WHERE id=? AND status='pending'")
        .bind(nowIso(), id)
        .run();
      return { ok: false, error: 'checkout_invalid_response', status: 502, order: { id, status: 'failed' } };
    }
    await env.DB.prepare('UPDATE lemon_orders SET checkout_url=?, lemon_order_id=?, updated_at=? WHERE id=?')
      .bind(url, lemonOrderId || null, nowIso(), id)
      .run();
    const order = await env.DB.prepare('SELECT * FROM lemon_orders WHERE id=?').bind(id).first();
    return { ok: true, order: shape(order) };
  } catch {
    // Transport failure = UNKNOWN: keep pending, reconciliation resolves it later.
    const order = await env.DB.prepare('SELECT * FROM lemon_orders WHERE id=?').bind(id).first();
    return { ok: true, order: shape(order), unknown: true };
  }
}

/** Read-only order status for the return page — never mutates the wallet. */
export async function lemonOrderStatus(env, userId, orderId) {
  const row = await env.DB.prepare(
    'SELECT id,status,package_id,credits,created_at FROM lemon_orders WHERE id=? AND user_id=?',
  )
    .bind(orderId, userId)
    .first();
  if (!row) return { ok: false, status: 404, error: 'order_not_found' };
  return { ok: true, order: row };
}

/**
 * Webhook-side snapshot verification (PAY-05): the provider's first-order
 * subtotal must equal our pinned amount; taxes and genuine discounts are
 * accepted on top; variant/store/environment must match exactly.
 */
export function verifyCheckoutSnapshot(order, checkout) {
  const problems = [];
  if (checkout.subtotal_cents !== order.amount_usd_cents) problems.push('subtotal');
  if (checkout.total_cents !== checkout.subtotal_cents + (checkout.tax_cents || 0)) problems.push('total_math');
  if (checkout.variant_id !== order.variant_id) problems.push('variant');
  if (String(checkout.store_id) !== String(order.store_id)) problems.push('store');
  if (checkout.environment !== order.environment) problems.push('environment');
  return { ok: problems.length === 0, problems };
}
