# Giá dịch vụ và mở khóa phân cấp

User approved the proposed design on 2026-09-24 and requested an audit of every feature before implementation.

## Contract

- Shared catalog projects every public AI service into a maximum three-level functional tree. Preserve existing service IDs, custom prices, prompt settings and provider chains.
- Tu Vi / Zodiac use module > functional topic > reading. Batu / Numerology use module > interpretation > reading. Tarot uses module > spread service with variants in that service's editor. Kinh Dich and Compatibility use two levels.
- Module availability remains separate from bundle sale availability. New bundle prices are disabled until explicitly configured, never inferred from a legacy module price.
- Optional published `billing.unlocks` enables persistent purchases for catalog profile/period services. Legacy saved configurations default to the existing per-request behavior. Session services continue per-request billing.
- Profile bundles contain only profile-policy leaves, explicitly listed in Admin and customer consent. Period services remain separately priced for the current day/week/month/year (Vietnam timezone). No perpetual entitlement to future forecasts.
- Quote derives profile identity from the structured prompt context used for the actual reading, never accepts a client price or ownership flag. Pair readings scope both people; western compatibility scopes the pair of signs.
- Customer may choose the leaf, its group bundle, or its module bundle in the existing confirmation dialog. Purchase is coupled to a successful first AI reading. Failure refunds the actual payment and grants no entitlement. Owned readings cost zero and still use existing rate limiting.
- Upgrade price: max(0, bundle price - floor(sum of eligible actual paid points * numerator / denominator)). Default ratio is exactly 2/3. Eligibility: same user, same scope, completed purchase, strict subset of target members, and not previously consumed by an upgrade. Once upgrading leaf > group, that leaf's payment cannot be counted again at group > module; only the group's actual payment is eligible.
- Membership is snapshotted at purchase. Newly added features are not silently granted. Disabled services and engines remain unavailable even if owned.
- A new durable operation table supports zero-point owned requests, grants, consumed credits and atomic Point transactions. Existing operation history is unchanged. Legacy payments without reliable profile scope are not retroactively guessed as entitlements.
- Quotes have a config revision and ownership version. Server validates both at charge time; a per-user/profile/module in-flight guard prevents overlapping purchases. Retry uses the same operation ID; account switching, refunds, and provider failure preserve isolation.

## Validation

Audit all topic arrays, period variants, spread variants and compatibility modes against the catalog. Test pricing math, malformed configs, scope/period boundaries, exclusions, concurrent purchases, retries, atomic rollback, upgrades through two levels and failed provider calls. Run project typecheck, unit/integration suite, production build and browser checks for Admin tree, save/publish/reload and customer consent at desktop/mobile widths. No production deployment is part of this implementation request.
