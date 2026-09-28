# Release 28/09/2026 — English/US parity (market-isolated billing + Admin)

- Merge fast-forward `codex/history-amount-sign` vào main: release SHA `422d4b6`, hotfix `7828c80` (SHA live cuối). Đã push `main` lên cả hai remotes (origin `ngthson553-create/astrox`, upstream `cuongphung89027/astrox`).
- Worker `astrox-api`: deploy `scripts/deploy-worker.mjs` — live cuối **`943efcaa-e2b3-46f2-91e3-3e7a90b8e2c6`** từ `d55bc68` (code `7828c80`; chuỗi `80d36f94`→`4aa0b4e2` bị thay trong cùng đợt release); `--keep-vars` giữ `ZALO_BROWSER_FALLBACK_ENABLED=true`, binding D1 + cron `* * * * *` nguyên vẹn.
- Pages `theastrox`: tự build từ upstream — live cuối **`cbc675d1-7210-4098-9ae6-b3c7061b43af`** từ `d55bc68` (trước đó `a44c331d` `422d4b6` → `c7415b6c` `7828c80`). Các commit docs-only sau note này chỉ rebuild Pages với code không đổi.

## Migration D1 (additive, theo thứ tự runbook)

8 file mới áp thủ công từng file bằng `wrangler d1 execute --remote` (bảng `d1_migrations` chỉ theo dõi 3 file đầu từ trước — KHÔNG dùng `d1 migrations apply` vì sẽ chạy lại 19 file cũ theo thứ tự tên):

`google-identities` → `us-credits` → `market-ai-operations` → `lemon-orders` → `lemon-webhook` → `lemon-checkout-identity` → `lemon-promos` → `reward-market`.

Backup trước migrate: `~/astrox-backups/d1-pre-en-us-20260928.sql` (9,9 MB, 21:36 GMT+7). Invariants sau migrate: số liệu VN y nguyên (8 users, 8 point accounts tổng 874 điểm, 19 ledger rows, 7 AI ops đều `market='VN'`, 12 unlock ops); bảng US mới rỗng (credits_accounts/credits_ledger/lemon_orders/lemon_webhook_receipts/lemon_order_promos = 0); index email đã đổi `idx_app_users_email` → `idx_app_users_email_lookup` cho phép Google/Zalo cùng email.

## Sự cố trong release và xử lý (forward-fix)

Sau deploy `422d4b6`, `GET /api/site-config` trả 503 `config_unavailable` trên cả Pages và Worker (~15–20 phút, chỉ ảnh hưởng đọc config public; các route HTML vẫn 200). Nguyên nhân: config đang publish (revision 7, publish bởi Admin cũ 25/09) chỉ có `integrations.{payos,zalo}`; `publicConfig` đọc `c.integrations.lemon.enabled` không phòng thủ và `hydrateConfig` không nạp defaults cho `google/lemon` — các test dùng default config của code mới nên không bắt được.

Hotfix `7828c80`: `hydrateConfig` merge defaults `google/lemon` (disabled) trong khi giữ nguyên giá trị payos/zalo production; `publicConfig` optional-chain. Kiểm chứng: repro local bằng đúng config revision 7 từ D1 + 568/568 test + typecheck. Sau hotfix, diff config public VN giữa build cũ (`db614b2`) và mới: `availability`, `content`, `engines`, `maintenance`, `rewards` **byte-identical**; `billing` chỉ thêm khóa mới `usPackages: []`.

## Kiểm sau deploy (production, 28/09 ~22:05 GMT+7)

- VN: `/`, `/tuvi`, `/tarot`, `/chitay`, `/kinhdich`, `/hoso` 200 `lang="vi"`; CSP `/chitay` giữ `wasm-unsafe-eval`; `/api/ai` 400 validate (sống); `/api/webhooks/payos` POST 400 validate (sống); site-config trả đủ engines/packages/dịch vụ như cũ.
- US/EN: `/en`, `/en/tarot`, `/en/profile` 200 `lang="en"`; `/en/experts` 404 đúng thiết kế; `/api/site-config?market=US` 200, `usPackages: []`; `robots.txt` có `Disallow: /en/profile`.
- Flag: `/auth/google/login` 503 `google_not_configured` (từ chối sạch khi tắt); `/auth/google/callback` garbage 400 `invalid_oauth_state`; `/api/lemon/webhook` 503 `webhook_not_configured` (chưa có secret — đúng thiết kế).
- Đối chiếu A/B với build cũ: `/xemtuong`, `/api/points/history`, `/api/wallet`, `/api/me` 404 giống hệt bản trước (không regression).

## Flags và rollback

| Flag | Trạng thái |
| --- | --- |
| `AX_EN_ROUTING` (Pages) | chưa set — không geo-redirect |
| `integrations.lemon.enabled` | false (mặc định hydrate) |
| `integrations.google.enabled` | false (mặc định hydrate) |
| `integrations.lemon.environment` | test |

Rollback targets: Worker `56da6e6d` (`db614b2`), Pages `6dfb9e6c` (`db614b2`) — nhưng **không** rollback Worker về build trước schema `lemon_orders` (runbook §5); lỗi nghiệp vụ US thì tắt flag, deploy forward.

## Bảng giá US đã set trong config (28/09, sau release)

Publish `admin_versions` id **8** (API revision 7→8, `admin_state.revision` 11→12, audit `script:zcode-us-pricing`) theo đúng transaction `store.publish()` qua D1, `validateConfig()` 0 lỗi:

- **Giá dịch vụ US = giá VN**: overlay `billing.usServices` để rỗng — code kế thừa `points` chung (`ai-operations.mjs`), đã đối chiếu 96 dịch vụ US (trừ experts) khớp từng giá VN.
- **Gói Credits USD, rate 1 USD = 10 credits, bonus cộng sẵn vào credits** (như VN cộng vào `fixedPoints`), đều `enabled=false` chờ Variant ID Lemon:

| Gói | USD | Credits | Bonus | Hiệu dụng |
| --- | --- | --- | --- | --- |
| pkg-us-5 | 5 | 50 | — | 10/USD |
| pkg-us-10 | 10 | 120 | +20% | 12/USD |
| pkg-us-20 | 20 | 260 | +30% | 13/USD |
| pkg-us-50 | 50 | 700 | +40% | 14/USD |
| pkg-us-100 | 100 | 1500 | +50% | 15/USD |

- Kiểm chứng sau publish: config public VN **byte-identical** revision 7 (chưa publish gói VN nào thay đổi), `usPackages` vẫn `[]` (lemon đang tắt), draft trùng publish. Rate đối chiếu: VN `vndPerPoint`=1000đ → 1 USD ≈ 25,5 point; US 10 credits/USD thấp hơn đúng yêu cầu.
- Lúc Lemon duyệt: Admin → US → Billing điền Store ID + Variant ID từng gói, bật gói, set `environment: live`, publish — packages hiện ngay trên `/en` topup.

## Sự cố AI trả tiếng Việt trên /en (29/09) — đã sửa + xác thực live

Hiện tượng: luận giải trên `/en` trả về tiếng Việt (lượt `tuvi--tim-hieu-ban-than--tinh-cach` 00:51 GMT+7, `language: clean`). Hai lỗi chồng nhau, sửa qua 2 commit:

1. **`2e9b230`** — inspector EN chỉ bắt chữ Hán ≥4 ký tự, văn xuôi tiếng Việt (Latin + dấu) luôn "clean"; repair EN đòi JSON span trong khi code dùng nguyên response. Sửa: phát hiện văn xuôi Việt theo mật độ dấu (≥6 từ có dấu Việt và ≥15% của ≥24 từ), tên riêng có dấu lẻ không bị cờ đỏ; repair đổi thành **viết lại toàn bộ bằng tiếng Anh**. Policy thêm câu "nhãn dữ liệu tiếng Việt không đổi ngôn ngữ đầu ra". Version `en-reading-2`.
2. **`44a0b0d` (gốc rễ)** — `handleConfiguredAi` gọi `executeProviderChain` chỉ truyền `{messages, serviceId}`, **mất `locale`** → runtime luôn vào nhánh Việt: chèn system prompt VN + `VIETNAMESE_READING_POLICY` ("Viết toàn bộ bằng tiếng Việt") + inspector Việt. EN pipeline tồn tại nhưng không bao giờ chạy. Sửa: truyền `locale` ở cả 2 call site + test tích hợp khóa hợp đồng (policy EN tới provider, không gửi policy Việt, reply Việt bị repair).

Kiểm chứng: 570/570 test; **repro live trên prod** — request EN giống hệt client trước fix trả tiếng Việt, sau fix (Worker `ef5ef183` / Pages `68987fd1`) trả tiếng Anh, `languagePolicyVersion: en-reading-2`, thuật ngữ cung/sao giữ nguyên kèm gloss (7/169 từ — đúng policy). Vùng dễ tái phát: mọi đường gọi provider mới phải truyền `locale`.

## Còn lại (go-live G5, cần operator)

Secrets `LEMON_API_KEY`/`LEMON_WEBHOOK_SECRET` chưa stage; Google production OAuth client + Lemon duyệt store/catalog; 1 giao dịch thật + hoàn tiền; 1 đăng nhập Google thật; nghiệm thu camera iPhone (palm). Thứ tự bật theo runbook §4.
