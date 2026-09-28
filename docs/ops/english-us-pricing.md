# US pricing model (plan Task 20 — fixtures until Sơn approves)

All numbers below are **placeholders for approval**, not live prices. The server
always charges the published package snapshot; this sheet only justifies it.

## Cost model per paid reading (unit economics)

```
gross USD (package price, VAT-exclusive)
  − sales tax handled by Lemon merchant-of-record (varies by US state)
  − Lemon fee (per current lemonsqueezy.com pricing + 50¢/order, CHECK at onboarding)
  − AI cost per reading:
      p50 ≈ input 4k + output 1.2k tokens  → provider list price × our provider rates
      p95 ≈ retry + language repair pass   → ≈ 2.2× p50
  − refund provision (target ≤ 2% of orders)
  = margin
```

Rules: never advertise "unlimited"; each leaf reading has a fixed credit price;
repeatable readings (Tarot/I Ching/daily fortunes) price lower than fixed
profile reports; bundles upgrade at 2/3 of the sum of unbought members
(server formula unchanged from VN).

## Proposed starter packages (FOR APPROVAL — not configured anywhere live)

| id | credits | price (USD) | notes |
|---|---|---|---|
| us-5 | 5 | $4.99 | trial; covers ~5 mid readings |
| us-20 | 20 | $17.99 | featured; ~12% discount vs us-5 rate |
| us-50 | 50 | $39.99 | best value; ~20% discount |

First-topup bonus: +5 credits (once per account, market-bound — Task 18).
Daily check-in: +1 credit/day (placeholder). Referral: +5 credits to inviter.

## Approval checklist

- [ ] Sơn approves the three price points (or edits them in Admin → US → Billing).
- [ ] AI unit cost measured on live p50/p95 before flipping `environment: live`.
- [ ] Refund policy wording mirrors the /en/terms page exactly.
