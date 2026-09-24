# Điểm danh, giới thiệu và quảng cáo — 24/09/2026

Release: `2026-09-24-rewards-1`.

| Phần | Hành vi đã triển khai | Điều kiện vận hành |
|---|---|---|
| Điểm danh | 2 Point/ngày theo giờ Việt Nam; mốc 3/7/10 ngày thưởng thêm 3/5/10 Point, mỗi mốc một lần cho mỗi tài khoản. Bỏ ngày thì chuỗi tính lại. | Đăng nhập Zalo thật. |
| Giới thiệu | Link riêng; giữ mã giới thiệu đầu tiên trong 7 ngày; đăng ký Zalo mới qua link: mỗi bên 5 Point. Người mời nhận 10 Point khi người được mời nạp tiền lần đầu; mốc điểm danh của bạn bè thưởng 2/3/5 Point. | Không thưởng hồi tố cho tài khoản cũ hoặc khoản nạp đã thanh toán từ trước. Chế độ giới thiệu hiện không giới hạn số người. |
| Quảng cáo | Người dùng chủ động đồng ý xem; phiên thuộc tài khoản, chống cộng trùng, 5 Point/lượt, tối đa 5 lượt/ngày, cách nhau 90 giây, phiên 10 phút theo cấu hình hiện có. | Chưa bật phân phối: thiếu Google Ad Manager network code và ad unit thật. |

## Kiểm chứng

- 179/179 tests: `node --test services/admin/*.test.mjs services/backend/*.test.mjs services/rewards/*.test.mjs web/tests/*.test.mjs`.
- Next build/TypeScript passed; ESLint 0 errors, 28 existing warnings.
- D1-compatible SQLite: concurrent attendance, immutable referrer, origin/cookie guards, verified OAuth callback with mocked Zalo provider, historical-payment exclusion, registration outbox recovery, credit rollback/retry, frozen reward snapshot, concurrent ad reservation, ownership, expiry, cancel and duplicate grant.
- Browser `web/scripts/rewards-qa.mjs`: 360/390/1440px; actual painted content (caught and fixed wallet reveal opacity bug), check-in/history, link copy/query preservation, explicit ad consent, close without reward, duplicate granted event, one wallet credit. APIs and Google SDK mocked.
- Same browser flow also passed through local Cloudflare Pages runtime with real HTMLRewriter and enforced nonce CSP. Local runtime needed compatibility date 2026-06-02; deployed Worker retains 2026-09-15.
- Worker dry-run passed. Full production deployment evidence appended below after live checks.

## Cách bật quảng cáo cho người không code

1. Cần tài khoản Google Ad Manager có khả năng phục vụ quảng cáo thưởng trên web, cấu hình website và inventory thực tế theo tài khoản của bạn.
2. Lấy **network code** và **ad unit path**; ví dụ minh họa `/123456/astrox_rewarded` (không dùng ví dụ làm mã thật). Không gửi mật khẩu hoặc khóa bí mật.
3. Trong Admin → Thưởng/Quảng cáo: nhập hai mã, kiểm tra mức thưởng/hạn mức, lưu và xuất bản khi inventory đã sẵn sàng. Ad unit phải thuộc đúng network code.
4. Trước khi mở rộng, kiểm tra bằng lượt quảng cáo thử nghiệm hợp lệ của nhà cung cấp: đồng ý xem, hết quảng cáo nhận đúng một thưởng, đóng sớm/no-fill không thưởng, chạm hạn mức. Đối chiếu ví với báo cáo nhà cung cấp; không tự tạo lượt quảng cáo thật để kiểm thử doanh thu.
5. Rà soát công bố nhà cung cấp quảng cáo/cookie trong chính sách dữ liệu và cấu hình consent phù hợp thị trường phục vụ trước khi bật. Nút đồng ý xem quảng cáo không thay thế mọi yêu cầu về consent của Google.

Google Rewarded Web **không có xác minh máy chủ SSV**. Backend kiểm soát phiên, hạn mức và việc cộng trùng; tín hiệu hoàn thành do trình duyệt báo nên có thể bị giả mạo bởi tài khoản cố ý lạm dụng. Không được gọi đây là bằng chứng xem quảng cáo. Tài liệu: [Google rewarded web](https://support.google.com/admanager/answer/9116812?hl=en), [GPT sample](https://developers.google.com/publisher-tag/samples/display-rewarded-ad), [CSP](https://developers.google.com/publisher-tag/guides/content-security-policy).

Chưa kiểm chứng bằng người dùng Zalo thật, tiền nạp thật, quảng cáo thật hoặc một lần cron khôi phục thực tế trên production. Những kiểm thử mô phỏng ở trên không thay thế các bước đó.

## Production

- D1 private backup taken before additive migration; new tables installed.
- Worker `astrox-api`: version `cfb8355e-9219-4478-9d7e-71ce2a573484`; five-minute cron retained, deployment used `--keep-vars`.
- Frontend source `0d8806a`, edge compatibility fix `85d6965`; Pages deployment: https://582f8407.theastrox-a3l.pages.dev.
- Production published config **2**, draft revision **3**. Compared complete private before/after snapshots: only `rewards.enabled` changed; unrelated published settings and draft prompt edits are identical. Activation writes an audit entry.
- The first live CSP check caught script preloads without nonces and Cloudflare email-obfuscation injection. Fixed by noncing script preload links and `Cache-Control: no-transform`. Final live rerun passed: prices/terms/wallet rendered, zero page errors or CSP violations, no Google ad requests before opt-in, guest summary/check-in/ad-start/ad-grant all return 401. Evidence: `production-browser.json`.
