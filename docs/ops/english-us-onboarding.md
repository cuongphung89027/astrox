# English/US provider onboarding package (plan Task 20)

> Operator-owned document. Nothing here is submitted automatically; the agent
> never files provider applications or creates credentials on the operator's
> behalf (plan §A).

## Product description (truthful, for Lemon review)

**AstroX** is a web app that generates personalized entertainment content about
traditional divination systems — Zi Wei Dou Shu (Chinese astrology), Western
astrology birth charts, Tarot readings, I Ching hexagrams, Ba Zi (Four Pillars),
numerology, zodiac compatibility, a Vietnamese lunar calendar and an
experimental palm-reading feature. Readings are produced by AI language models
from user-supplied birth data and questions.

**Credits** are prepaid units sold in fixed packages (e.g. 5 / 20 / 50), used
inside the app to unlock individual readings. Credits:
- never expire by purchase design (bonus credits may carry conditions),
- are non-transferable, non-refundable as cash, and hold no cash value,
- are not a subscription; there is no recurring billing.

We do **not** offer: real psychic services, guaranteed predictions, medical /
legal / financial advice, or expert booking in the US edition.

## Store assets to prepare before submission

- [ ] Demo site access (staging URL) with 3+ sample reports per family
      (Zi Wei topic reading, Tarot spread, natal chart overview).
- [ ] Screenshots: reading flow 1–2–3 (profile → paid badge → result).
- [ ] Benefits table: what each credit package unlocks (from the pricing sheet).
- [ ] Support contact: support@theastrox.space + refund policy page (/en/terms).
- [ ] This file's product description pasted into the store profile.

## Google OAuth production checklist (Task 23 gate)

- [ ] Production OAuth client on the operator Google Cloud project.
- [ ] Authorized redirect URI exactly `https://api.theastrox.space/auth/google/callback`.
- [ ] App name/logo/privacy policy URLs published on /en/terms.
- [ ] Test users cleared before production verification.

## Operator confirmations still pending (G5 blockers)

1. Lemon approval of "AI content + prepaid credits" product profile.
2. Live store id + variant ids entered in Admin (US → Billing) after approval.
3. KYC/payout completion inside the operator's Lemon account.
4. Final USD package prices and bonus policy approved by Sơn.
5. Refund wording approved by Sơn (mirrors docs/ops/english-us-pricing.md).
