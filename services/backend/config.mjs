import { readPublished, readSecret } from '../admin/store.mjs';
import { quotePackage } from '../admin/config.ts';
export const secretBindings = {
  'payos:apiKey': 'PAYOS_API_KEY',
  'payos:checksumKey': 'PAYOS_CHECKSUM_KEY',
  'zalo:appSecret': 'ZALO_APP_SECRET',
};
export function capabilities(env) {
  return {
    configVersioned: true,
    features: { payos: true, zalo: true, packages: true, services: true, paidAi: true, rewards: true },
    inheritedSecrets: Object.entries(secretBindings)
      .filter(([, name]) => Boolean(env[name]))
      .map(([ref]) => ref),
  };
}
export async function legacySnapshot(env) {
  const packages = (
    await env.DB.prepare(
      'SELECT id,amount_vnd,points,label,active,sort_order FROM topup_packages ORDER BY sort_order,amount_vnd',
    ).all()
  ).results;
  const modules = (await env.DB.prepare('SELECT id,slug,name,access_mode,enabled FROM modules').all()).results;
  const prices = (
    await env.DB.prepare('SELECT module_id,points FROM module_prices WHERE part_id IS NULL AND active=1').all()
  ).results;
  const promos = (
    await env.DB.prepare(
      'SELECT id,code,points,bonus_type,min_amount_vnd,max_redemptions,redeemed_count,active,expires_at FROM promotion_codes',
    ).all()
  ).results;
  return {
    ...capabilities(env),
    packages,
    modules,
    prices,
    promos,
    integrations: {
      payos: {
        enabled: Boolean(env.PAYOS_CLIENT_ID && env.PAYOS_API_KEY && env.PAYOS_CHECKSUM_KEY),
        clientId: env.PAYOS_CLIENT_ID || '',
        returnUrl: 'https://theastrox.space/hoso?topup=success',
        cancelUrl: 'https://theastrox.space/hoso?topup=cancelled',
        expiryMinutes: 10,
      },
      zalo: {
        enabled: Boolean(env.ZALO_APP_ID && env.ZALO_APP_SECRET),
        appId: env.ZALO_APP_ID || '',
        callbackUrl: env.ZALO_REDIRECT_URI || 'https://api.theastrox.space/auth/zalo/callback',
        returnUrl: env.APP_ORIGIN || 'https://theastrox.space/',
      },
      wallet: { enabled: true, label: 'AstroX Wallet' },
    },
  };
}
export async function runtimeSettings(env) {
  const published = await readPublished(env);
  if (!published) {
    const legacy = await legacySnapshot(env);
    return {
      env,
      revision: null,
      config: null,
      packages: legacy.packages.filter(p => p.active),
      payos: legacy.integrations.payos,
      zalo: legacy.integrations.zalo,
    };
  }
  const config = published.config,
    runtimeEnv = {
      ...env,
      PAYOS_CLIENT_ID: config.integrations.payos.clientId,
      ZALO_APP_ID: config.integrations.zalo.appId,
      ZALO_REDIRECT_URI: config.integrations.zalo.callbackUrl,
    };
  for (const [ref, key] of Object.entries(secretBindings)) {
    const value = await readSecret(env, ref);
    if (value) runtimeEnv[key] = value;
  }
  return {
    env: runtimeEnv,
    revision: published.revision,
    config,
    payos: config.integrations.payos,
    zalo: config.integrations.zalo,
    packages:
      config.billing.enabled && config.integrations.payos.enabled && !config.operations.maintenance
        ? config.billing.packages
            .filter(p => p.enabled)
            .map(p => ({
              id: p.id,
              amount_vnd: p.amountVnd,
              points: quotePackage(p, config.billing.vndPerPoint).total,
              label: p.name,
              active: 1,
            }))
        : [],
  };
}
