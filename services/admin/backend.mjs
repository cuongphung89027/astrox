import { readSecret } from './store.mjs';
export async function backendStatus(env) {
  if (!env.ASTROX_BACKEND) return { configVersioned: false, features: {}, inheritedSecrets: [] };
  try {
    const r = await env.ASTROX_BACKEND.fetch(
      new Request('https://astrox-internal/internal/admin/capabilities', { signal: AbortSignal.timeout(5000) }),
    );
    if (!r.ok) throw Error();
    const s = await r.json();
    return {
      configVersioned: s.configVersioned === true,
      features: s.features || {},
      inheritedSecrets: Array.isArray(s.inheritedSecrets) ? s.inheritedSecrets : [],
    };
  } catch {
    return { configVersioned: false, features: {}, inheritedSecrets: [] };
  }
}
export async function connectionSecretAvailable(env, ref, status) {
  return Boolean(await readSecret(env, ref)) || Boolean(status?.inheritedSecrets?.includes(ref));
}
export function importLegacyConfig(draft, legacy, { legacyAi = false } = {}) {
  const c = structuredClone(draft);
  c.integrations = legacy.integrations;
  c.billing.enabled = legacy.integrations.payos.enabled;
  c.billing.vndPerPoint = 1000;
  c.billing.packages = legacy.packages.map(p => ({
    id: p.id,
    name: p.label || `${p.amount_vnd}đ`,
    amountVnd: p.amount_vnd,
    mode: 'fixed',
    fixedPoints: p.points,
    bonus: 0,
    enabled: Boolean(p.active),
    featured: false,
  }));
  // Preserve legacy promo policies that the Admin schema cannot express by refusing
  // lossy import. An operator can then extend the schema before migrating.
  if (legacy.promos.some(p => p.bonus_type !== 'points' || p.min_amount_vnd || p.redeemed_count))
    throw new Error('Mã ưu đãi cũ có điều kiện cần chuyển đổi riêng; chưa nhập để tránh đổi quyền lợi.');
  c.billing.promos = legacy.promos.map(p => ({
    id: p.id,
    code: p.code,
    bonus: p.points,
    limit: p.max_redemptions || 1000000000,
    perUser: 1,
    enabled: Boolean(p.active),
    expiresAt: p.expires_at || '',
  }));
  for (const s of c.billing.services) {
    const m = legacy.modules.find(m => m.slug === s.module),
      price = legacy.prices.find(p => p.module_id === m?.id);
    s.points = price?.points || 0;
    s.status = !m
      ? 'free'
      : !m.enabled || m.access_mode === 'disabled'
        ? 'hidden'
        : m.access_mode === 'paid' && s.points > 0
          ? 'paid'
          : 'free';
  }
  if (legacyAi && !c.ai.providers.length) {
    c.ai.providers = [
      {
        id: 'legacy',
        name: 'AstroX hiện tại',
        baseUrl: 'https://opencode.ai/zen/go/v1',
        protocol: 'responses',
        model: 'muse-spark-1.3-contributor',
        enabled: true,
        timeoutMs: 90000,
        retries: 1,
        maxTokens: 8000,
        temperature: 0.7,
        secretRef: 'provider:legacy',
      },
    ];
    c.ai.enabled = true;
    c.ai.chain = ['legacy'];
  }
  return c;
}
