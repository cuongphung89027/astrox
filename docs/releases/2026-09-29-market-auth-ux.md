# Release 29/09/2026 — Tài khoản gắn quốc gia + chọn khu vực khi đăng nhập + globe icon

- Main `766d135` (chuỗi `f027d95` → `b29b24a` → `063eb01` → `faf6f21` → `766d135`), push cả 2 remotes.
- Worker `astrox-api` `e18da1bb` (từ `b29b24a` — mọi thay đổi services nằm ở đây; các commit sau chỉ web/docs). Pages live `b41812bb` từ `766d135`.

## Nội dung (yêu cầu Sơn 29/09)

1. **Một tài khoản — một quốc gia**: Zalo → chỉ bản Việt Nam, Google → chỉ bản United States.
   - Server: login Zalo upsert `market_preferences='VN'`, login Google upsert `'US'` (sau khi resolve identity — chữa luôn hàng cũ của flow onboarding); `POST /api/market` khoá (`403 market_immutable`).
   - Client: `MarketGuard` popup — tài khoản mở nhầm cây (URL trực tiếp) → cảnh báo + đếm ngược 10s tự động đăng xuất (không đóng được ngoài nút logout); bấm globe khi đang đăng nhập → xác nhận "Đăng xuất & chuyển" / "Ở lại trang này" — **hai nút same size 344×50, xanh / trung tính**.
   - Bỏ flow "Chọn loại ví" (MarketOnboarding) và `chooseMarket` client: market đến từ auth context.
2. **Bước chọn khu vực trước đăng nhập**: popup mở với 2 nút đồng kích thước/bố cục (cờ SVG VN/US + tên + ↗); khu vực đang xem nền xanh `#214d40` + nhãn "Đang xem"; chọn khu vực → provider tương ứng (VN→Zalo, US→Google), có "Chọn khu vực khác" quay lại. Cờ vẽ SVG thuần (emoji cờ Windows Chrome render thành chữ).
3. **Nút đổi ngôn ngữ thành icon quả địa cầu** — nét 1.55 đồng bộ họ FeatureIcon (vòng tròn + xích đạo + thấu kính kinh tuyến bo). Icon Chỉ tay vẽ lại: 3 ngón + ngón cái, khe ngón 1.5đ để đọc rõ ở cỡ nhỏ.

## Bổ sung cùng ngày: đích đến sau logout vì market

Bấm "Đăng xuất & chuyển" hoặc bị auto-logout lệch cây → cờ một lần trong sessionStorage → popup đăng nhập trên cây đích **mở thẳng provider của cây đó** (VN → bước Zalo, EN → bước Google), không tự đăng nhập bên kia, không bắt chọn khu vực lại ("Chọn khu vực khác" vẫn có sẵn). Test: cờ tiêu thụ đúng 1 lần + LoginPrompt mở đúng provider.

## Kiểm chứng

- 576/576 unit/integration (thêm 8 test: bind/heal market Zalo+Google, khoá POST /api/market, region step LoginPrompt, MarketGuard logout, topup theo auth-market, từ điển i18n); typecheck sạch; lint 0 lỗi (20 cảnh báo baseline); build static export OK.
- UI30 **518/518** (sửa selector chip `[aria-label^="Ví AstroX"]` — script cũ tìm "Ví AstroX Point" đã stale từ `cadddd4`).
- Dev server 3311: globe → guard switch (2 nút 50px bằng nhau), logout → popup mời → region step → VN→Zalo/US→Google, đổi khu vực quay lại được; vision review 2 icon PASS.
- Prod smoke: `/` `/en` 200; khách thấy popup "Bạn đang ở đâu?" 2 nút cờ + globe; `POST /api/market` → 403 `market_immutable`; site-config rev 8 VN không đổi.

## Lưu ý vận hành

- Tài khoản đã có bị lệch market (hàng cũ) tự chữa ở lần đăng nhập kế tiếp theo provider.
- Google login vẫn chờ `integrations.google.enabled` (G5) — nút US chỉ dẫn tới flow Google khi bật; trước đó chọn US + Google sẽ đi tới /auth/google/login và bị từ chối sạch `google_not_configured` cho tới khi operator bật flag.
