# AstroX release — 2026-09-25: badge giá trên nút dịch vụ

Hai đợt phát hành cùng ngày, đều là thay đổi UI web thuần (không có D1 migration, không đổi hợp đồng API).

## Đợt 1 — `0b92c03` "Restyle paid price on service buttons as gold badge pill"

Thay nhãn `· x Point` nối thẳng vào label bằng pill `PaidPriceBadge` (viền `#c9a95d`, nền `#fff3cd`) ở 9 call-site: Tarot, Kinh Dịch, Tử Vi (AiPanel + PeriodPanel), Horoscope, Compat ×2, Chỉ tay, SavedReading/ReadingInvitation.

- Worker `astrox-api`: version `5c3b3985-ad12-467a-ba44-20751fb600e9`.
- Pages `theastrox`: deployment `5452759f-802e-489e-8832-803e5df78a86`.

## Đợt 2 — `afb1576` + `30cecd5`

- `afb1576` — badge gọn lại: đồng xu `PointCoin` + số Point (pill ~36px, trước ~80px); dịch vụ cấu hình free hiển thị pill "Free" nền frosted trung tính; lỗi tải báo giá thu thành pill "…" mờ, nút vẫn khóa. `usePaidPrice` trả thêm `points?: number` và `free?: boolean` để phân biệt "dịch vụ free" với "nút không gắn dịch vụ" (nút không gắn dịch vụ không hiển thị gì). Nhãn ẩn "Point" giữ ý nghĩa cho screen reader.
- `30cecd5` — bỏ link "Xem cặp đôi ↗" gạch chân trên trang Tử Vi và Bát Tự (vô duyên, trùng với các chế độ cặp đôi riêng của `/tuonghop`).

## Kiểm chứng

- 305 unit test (`npm test`), typecheck, ESLint, static export build đạt tại cả hai commit.
- Playwright badge: paid/free/pending ở 320/390/1440 trên Tarot, Kinh Dịch, Tử Vi, Horoscope — không overflow, không đè.
- Bộ viewport 420 combo (30 kích thước × 14 route) sạch; duy nhất cảnh báo chữ 9px cũ sẵn trên `/dieukhoan` (không thuộc nhánh này).
- Đợt 1 sau deploy: 8/8 route prod 200, `/api/site-config` 79 dịch vụ paid, CSS badge live, browser thật trên theastrox.space render đúng badge với 0 lỗi JS/console; popup đăng nhập guest hoạt động đúng.

## Rollback

- Pages: redeploy `e96bfcc` (trước đợt 1) hoặc deployment trước đó trên dashboard `theastrox`.
- Worker: không đổi code backend; nếu cần, `wrangler versions rollback` tới version trước `5c3b3985`.
- Không có thay đổi dữ liệu.
