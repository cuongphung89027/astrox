# Ma trận thiết bị thật — nâng cấp Chỉ tay

- **Branch:** `codex/palm-upgrade` (base `a009880`), QA gate software đã pass — file này ghi kết quả **thử trên máy thật** trước khi deploy Pages.
- **Cách test:** mở `/chitay` trên trình duyệt điện thoại (qua tunnel `cloudflared` hoặc serve `web/out/`), làm theo từng cột, điền ✅/❌ + mô tả lỗi.
- **Bẫy dev:** Next dev StrictMode mở/đóng camera 2 lần trong dev — test trên build tĩnh (`out/`) hoặc không hoảng nếu dev thấy camera nhấp nháy lúc mới mở.

## Cột test chung

| Ký hiệu | Kiểm tra gì |
| --- | --- |
| **Wide?** | Mở camera → ảnh phải là góc rộng (không zoom光学). Find X9 Ultra là thiết bị đối chứng lỗi cam tele cũ. |
| **Nhận diện?** | Đưa tay vào khung → thấy chấm mốc + xương tay vàng, chữ dẫn đổi theo vị trí tay. |
| **Tự chụp?** | Giữ tay ổn định → đếm ngược 3-2-1 → tự chụp; cử động tay → huỷ đếm. |
| **Overlay?** | Bấm "Khám phá chỉ tay" (tốn 1 lượt AI) → đường vẽ dần + chấm đầu ngón khớp tay thật. |
| **Đổi lens?** | Nút "Đổi ống kính" (chỉ hiện máy ≥2 cam sau) → chuyển lens thành công, preview không tắt. |

## Ma trận

| Thiết bị | Wide? | Nhận diện? | Tự chụp? | Overlay? | Đổi lens? | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| OPPO Find X9 Ultra | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Đối chứng lỗi tele; nếu nút đổi lens báo lỗi → hardening retry đã ghi handoff |
| iPhone (Safari) | ⬜ | ⬜ | ⬜ | ⬜ | n/a | Mục MỚI — iOS expose 1 cam ảo; soi hướng dọc + WASM GPU delegate |
| Android phổ thông | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| Desktop Chrome (webcam) | n/a | ⬜ | ⬜ | ⬜ | n/a | Chỉ cần luồng không vỡ |

## Checklist phụ

- [ ] Máy dọc: khung camera không bị méo, overlay khớp tay (aspect từ video buffer — fix I3).
- [ ] Mạng chậm: model tải quá 4s → copy "Chụp thủ công" hiện, chụp tay vẫn dùng được (fix I4); model tải muộn xong thì copy về bình thường (item deferred, chấp nhận nếu chưa fix).
- [ ] Nguồn sáng yếu: cảnh báo "hơi tối/chói" hiện dưới dạng error cảnh báo, vẫn đọc được (chỉ cảnh báo, không chặn).
- [ ] 1 lần `read()` thật từ ảnh camera: AI nhận ảnh không lỗi payload (không downscale 1200px như upload — cap 1.15MB giữ).
- [ ] Tắt camera → đèn camera tắt thật; rời trang → stream dọn sạch.

## Kết quả (điền sau test)

_Diễn giải kết quả vào đây, kèm ngày test._

## Handoff release (theo docs/agent-workflow.md)

- **Owner:** Sơn (ductor). **Base SHA:** `a009880`. **Branch:** `codex/palm-upgrade`.
- **Paths đụng tới:** `web/src/lib/palm-camera.ts`, `web/src/lib/hand-tracker.ts`, `web/src/components/discovery/Palm{Reader,Guide,Camera}.tsx`, `web/src/components/discovery/Discovery.module.css`, `web/tests/palm-{camera,hand-tracker}.test.mjs`, `web/public/models/`, `web/public/mediapipe/`, `web/scripts/palm-engine-qa.mjs`, `web/package.json` (+lockfile).
- **Deploy:** chỉ Pages từ SHA đã QA; Worker/DB không đụng. Model+wasm (~41 MB) lên Pages cùng static export — release owner xác nhận CDN limit + cân nhắc Cache-Control immutable cho `/models/`, `/mediapipe/wasm/`.
- **Rollback:** revert deploy Pages về revision trước.
- **QA software:** xem `task-9-report.md` (518/518, 0/30 /chitay, engine 6/6).
