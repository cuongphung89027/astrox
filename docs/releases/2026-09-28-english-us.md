# Release 28/09/2026 — English/US parity (market-isolated billing + Admin)

- Merge fast-forward `codex/history-amount-sign` vào main: release SHA `422d4b6`, hotfix `7828c80` (SHA live cuối). Đã push `main` lên cả hai remotes (origin `ngthson553-create/astrox`, upstream `cuongphung89027/astrox`).
- Worker `astrox-api`: deploy `scripts/deploy-worker.mjs` — `80d36f94` từ `422d4b6`, thay bằng `4aa0b4e2-73cd-4a48-b138-52ee7f29613f` từ `7828c80`; `--keep-vars` giữ `ZALO_BROWSER_FALLBACK_ENABLED=true`, binding D1 + cron `* * * * *` nguyên vẹn.
- Pages `theastrox`: tự build từ upstream — `a44c331d` (`422d4b6`) rồi `c7415b6c-8a96-44d9-844f-e346e397cc7e` (`7828c80`, Active).

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

## Còn lại (go-live G5, cần operator)

Secrets `LEMON_API_KEY`/`LEMON_WEBHOOK_SECRET` chưa stage; Google production OAuth client + Lemon duyệt store/catalog; set giá USD + publish usPackages qua Admin; 1 giao dịch thật + hoàn tiền; 1 đăng nhập Google thật; nghiệm thu camera iPhone (palm). Thứ tự bật theo runbook §4.
