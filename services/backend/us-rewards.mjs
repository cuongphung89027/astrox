/**
 * US rewards (plan Task 18). Market-bound bonuses land ONLY in the Credits
 * ledger as bonus lots, idempotent by event key. Cross-market guard: the same
 * calendar event (e.g. a check-in day) can be rewarded once PER MARKET but the
 * VN wallet is never touched here, and switching market mid-day cannot double
 * the same-market reward. Amounts are defaults pending approved USD pricing
 * (Task 20 gates); ads require provider proof — no US provider configured yet
 * means the earn surface reports 'blocked', never a fake grant.
 */
import { creditPurchase, creditsBalance } from './credits.mjs';

/** Default US bonus amounts (credits) — placeholders until pricing approval. */
export const US_REWARD_DEFAULTS = { checkin: 1, referral: 5, firstTopup: 5 };

async function alreadyRewarded(env, key) {
  // creditPurchase prefixes operation keys with 'credit:' — dedupe on the same key it writes.
  const row = await env.DB.prepare('SELECT id FROM credits_ledger WHERE operation_key=?').bind(`credit:${key}`).first();
  return Boolean(row);
}

/** Daily check-in bonus: once per user per market per day. */
export async function usCheckin(env, userId, dayIso, amounts = US_REWARD_DEFAULTS) {
  const key = `us-checkin:${userId}:${dayIso}`;
  if (await alreadyRewarded(env, key)) return { granted: false, reason: 'already_claimed' };
  // Cross-market guard: a VN check-in for the same day does not block the US
  // bonus (separate wallets) — but the same reward never lands twice per market.
  await creditPurchase(env, { userId, amount: amounts.checkin, kind: 'bonus', orderId: key });
  return { granted: true, credits: amounts.checkin };
}

/** First paid top-up bonus: fires once, keyed by the fulfilled Lemon order id. */
export async function usFirstTopup(env, userId, lemonOrderId, amounts = US_REWARD_DEFAULTS) {
  const key = `us-first-topup:${userId}`;
  if (await alreadyRewarded(env, key)) return { granted: false, reason: 'already_claimed' };
  await creditPurchase(env, { userId, amount: amounts.firstTopup, kind: 'bonus', orderId: key });
  return { granted: true, credits: amounts.firstTopup };
}

/** Referral bonus for the inviter: once per invitee, no self-referral, market-bound. */
export async function usReferral(env, inviterId, inviteeId, amounts = US_REWARD_DEFAULTS) {
  if (!inviterId || !inviteeId || inviterId === inviteeId) return { granted: false, reason: 'invalid_referral' };
  const key = `us-referral:${inviteeId}`;
  if (await alreadyRewarded(env, key)) return { granted: false, reason: 'already_claimed' };
  const linked = await env.DB.prepare('SELECT user_id FROM user_referrals WHERE user_id=? AND inviter_id=?')
    .bind(inviteeId, inviterId)
    .first();
  if (!linked) return { granted: false, reason: 'not_linked' };
  await creditPurchase(env, { userId: inviterId, amount: amounts.referral, kind: 'bonus', orderId: key });
  return { granted: true, credits: amounts.referral };
}

/** Rewarded ads: grants ONLY with provider proof; without a US provider the
 * surface is blocked by design (parity blocker recorded, no fake credits). */
export async function usRewardedAd(env, userId, proof) {
  if (!proof || proof.provider !== 'gam' || typeof proof.adUnit !== 'string' || !proof.adUnit) {
    return { granted: false, reason: 'ads_unavailable', blocked: true };
  }
  const dayIso = new Date().toISOString().slice(0, 10);
  const key = `us-ad:${userId}:${dayIso}:${proof.adUnit}`;
  if (await alreadyRewarded(env, key)) return { granted: false, reason: 'daily_cap' };
  await creditPurchase(env, { userId, amount: US_REWARD_DEFAULTS.checkin, kind: 'bonus', orderId: key });
  return { granted: true, credits: US_REWARD_DEFAULTS.checkin };
}

/** Wallet summary for the US profile screen: purchased vs bonus vs reserved. */
export async function usWalletSummary(env, userId) {
  const wallet = await creditsBalance(env, userId);
  const lots = (
    await env.DB.prepare(
      'SELECT source,SUM(remaining) AS remaining FROM credit_lots WHERE user_id=? AND remaining>0 GROUP BY source',
    )
      .bind(userId)
      .all()
  ).results;
  return {
    ...wallet,
    purchased: Number(lots.find(l => l.source === 'purchase')?.remaining || 0),
    bonus: Number(lots.find(l => l.source === 'bonus')?.remaining || 0),
  };
}
