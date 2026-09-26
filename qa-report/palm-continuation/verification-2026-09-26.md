# Chỉ tay — kiểm chứng phần việc tiếp tục từ Codex

Ngày: 26/09/2026. Trạng thái: **hoàn tất triển khai và kiểm chứng local trong phạm vi đã nêu**. Lượt responsive độc lập cuối đạt 48/48; các giới hạn WebKit, camera vật lý và độ chính xác vẫn giữ bên dưới. Chưa commit, chưa triển khai production.

## Chủ sở hữu và phạm vi

- Chủ sở hữu tích hợp: phiên tiếp tục hiện tại, theo yêu cầu tiếp tục công việc bị ngắt của người dùng.
- Worktree: `/Users/Thsonjpg/.codex/worktrees/palm-redesign/astrox`.
- Nhánh: `codex/palm-redesign`; HEAD tài liệu `12c4f2a`; base `e0c982ed91bc718fc58264f49a589b2a0eedd0cf`.
- Các thay đổi triển khai được giữ ở trạng thái chưa commit. Không reset/stash công việc kế thừa; không sửa checkout main hay worktree khác.
- Giữ kiến trúc, dịch vụ `palm`, pricing, consent, prompt và backend hiện có. Không thêm/thay phiên bản dependency.
- Kế hoạch: [palm-redesign](../../docs/plans/2026-09-26-palm-redesign.md). Đặc tả: [palm-redesign-research](../../docs/superpowers/specs/2026-09-26-palm-redesign-research.md).

## Kết quả triển khai

1. Giữ và kiểm chứng bản sửa CSP cho MediaPipe: cho phép biên dịch WebAssembly, vẫn chặn JavaScript eval, giữ nonce và strict-dynamic. Chính sách phải có trên tài liệu đầu vào kể cả khi người dùng chuyển sang Chỉ tay bằng điều hướng phía client.
2. Giữ bản sửa chọn camera ưu tiên wide/main, lựa chọn thủ công và ghi nhớ; giải phóng camera trước khi đổi, rollback khi camera đích lỗi và chặn kết quả cũ sau khi thoát. Mô hình tải/lỗi không khóa chụp thủ công.
3. Bổ sung giới hạn chờ 5 giây cho thao tác native focus/torch; không để toàn bộ điều khiển bị khóa vĩnh viễn nếu trình duyệt không trả kết quả.
4. Chuẩn hóa ảnh có hủy tác vụ: kiểm tra định dạng/8 MB, hướng EXIF, cạnh dài tối đa 1200 px, fallback khi `createImageBitmap` không có hoặc lỗi; giải phóng bitmap/blob URL. Ảnh hiển thị và ảnh gửi AI cùng một JPEG.
5. Sửa lỗi chọn file không hợp lệ trong lúc ảnh cũ đang giải mã làm treo trạng thái tải. Ảnh/kết quả cũ không tự xuất hiện sau khi thay ảnh, xóa hoặc hủy.
6. Giữ giao diện Chỉ tay riêng với minh họa năm ngón, hướng dẫn gọn, ảnh có giới hạn kích thước và kết quả theo từng đường. Bổ sung tên truy cập cho hộp phóng to, trả focus về nút mở, nhóm nút có nhãn và khoảng cuộn tránh dock che nút phân tích.
7. Không vẽ tọa độ AI chưa xác minh lên ảnh. Văn bản hợp lệ vẫn được giữ dù tọa độ thiếu/sai; giao diện giải thích vì sao giữ nguyên ảnh.

Chi tiết tái hiện đỏ/xanh và các giả thuyết đã bác bỏ nằm trong `.superpowers/sdd/2026-09-26-palm-redesign/remaining-fixes-report.md`.

## Kiểm thử cuối đã chạy

| Hạng mục | Kết quả | Phạm vi/giới hạn |
| --- | --- | --- |
| `npm test` | Exit 0; 378/378 test, 0 lỗi | Có test tài nguyên ảnh, hủy tác vụ, timeout và late settlement |
| Kiểm chứng prompt | 79/79 full rendered prompts | Giữ lịch sử bài đã mua, revision và Tarot round trip |
| `npm run build` | Exit 0; 22 trang export | Không đồng nghĩa đã deploy |
| `npm run typecheck` | Exit 0 | Frontend và backend |
| ESLint phạm vi thay đổi | Exit 0; 0 lỗi, 2 cảnh báo | Hai cảnh báo `no-img-element` ở ảnh data URL riêng tư |
| CSP/MediaPipe thật | Exit 0; 14/14 | Chromium + WebKit, vào thẳng + Next Link + negative control |
| Camera/ảnh/consent Chromium | Exit 0; 46/46 | Camera/AI fixture, không camera phần cứng hoặc AI trả phí |
| Camera/ảnh/consent WebKit | Exit 0; 35/35 | 4 kiểm tra được bỏ qua có ghi rõ trong log |
| UI 30 kích thước, hai engine | Exit 0; 518/518 | Header/nav, Point/avatar, trang chủ, điều khoản, ví và Tarot |
| Chỉ tay responsive, 6 kích thước × 2 engine × 4 trạng thái | Exit 0; 48/48, 0 lỗi | Lượt chạy độc lập đã xác nhận; không force click. WebKit 320/360 cần cuộn giữa màn hình sau phép nearest-scroll; giới hạn được ghi rõ bên dưới |
| Source/spec review độc lập | PASS | Không có phát hiện Critical/Important; không phải phép deploy |
| CodeGraph / `git diff --check` | Đạt ở lượt cuối đã chạy | Kiểm tra lại nếu phát sinh sửa source |
| Preview local | HTTP 200 | `http://127.0.0.1:3126/chitay` |

### Phạm vi CSP/WASM được chứng minh

Harness gọi đúng `onRequest` của Pages Function, lấy chính sách từ response và chạy trên export thực. Node dùng adapter cho `HTMLRewriter` của Workers; vì vậy đây là kiểm chứng trình duyệt dưới chính sách từ source middleware, không phải kiểm chứng runtime Cloudflare đã triển khai.

Thư viện MediaPipe, WASM và model đều là bản thật được phục vụ local. Có khởi tạo GPU, gọi `detectForVideo` trên 5 khung hình tổng hợp mỗi tình huống và đóng tài nguyên. Chromium dùng video từ canvas captureStream; WebKit dùng canvas ImageSource trực tiếp. Số landmarks bằng 0 trên ảnh tổng hợp không được dùng để tuyên bố độ chính xác. Bỏ riêng quyền WASM làm biên dịch thất bại như dự kiến; JavaScript eval vẫn bị chặn.

### Bốn mục bỏ qua của flow WebKit

Bản WebKit headless này không phát thao tác pointer trên video tổng hợp theo cách fixture cần, nên bỏ qua kiểm tra khóa điều khiển và nhóm deadline camera. Hai kích thước 320×568 và 390×844 không thực hiện được phép kiểm Tab tự cuộn tới CTA. Các kiểm tra giải mã ảnh, EXIF, lỗi file, hủy/reset, consent, JPEG gửi AI, dialog và nhóm nút vẫn chạy. Không gọi tổng kết này là bao phủ đầy đủ ngang Chromium.

### Nguyên nhân lượt responsive từng thất bại

Bài test bấm checkbox rồi cuộn, để con trỏ nằm đúng dải 2 px ở mép nút. Với chế độ giảm chuyển động, transition bị tắt; hiệu ứng hover nâng nút 2 px tự bật/tắt liên tục ngay dưới con trỏ nên Playwright chờ ổn định mãi. Đo 240 khung hình cho thấy scrollY, chiều cao trang và kích thước nút không đổi, chỉ tọa độ y dao động đúng 2 px; không có animation đang chạy hoặc reflow giá.

Đã sửa riêng bài test: đưa con trỏ về vị trí trung tính trước thao tác click thông thường. Không dùng force click, không gọi DOM click/submit, không tắt các kiểm tra vị trí, enabled hay hit-test. Không đổi code sản phẩm để làm test xanh. Chi tiết đối chứng từng biến nằm trong `.superpowers/sdd/2026-09-26-palm-redesign/responsive-stability-report.md`.

Giới hạn nhỏ được giữ minh bạch: người dùng chuột giữ con trỏ sát mép 2 px khi bật giảm chuyển động vẫn có thể thấy hiệu ứng hover rung nhẹ của nút dùng chung. Đây là ghi nhận không chặn nghiệm thu, chưa sửa kit chung trong phạm vi này. WebKit có thể cần cuộn vào giữa màn hình sau `scrollIntoViewIfNeeded` cũ để tránh dock; bài responsive kiểm chứng CTA thực sự tiếp cận và bấm được, không tuyên bố mọi API tự cuộn của WebKit đã được sửa.

## Các tệp được thay đổi

Kế thừa và tiếp tục: `functions/[[path]].js`, `services/admin/routes.test.mjs`, `web/src/components/discovery/PalmCamera.tsx`, `PalmGuide.tsx`, `PalmReader.tsx`, `Palm.module.css`, `web/src/lib/hand-tracker.ts`, `palm-camera.ts`, `palm.ts`, `palm.test.ts`, `web/tests/hand-tracker.test.mjs`, `palm-camera.test.mjs`, `palm-controls.test.mjs`, `palm-reading.test.mjs`.

Bổ sung trong phần tiếp tục: `web/src/lib/palm-photo.ts`, `web/tests/palm-photo.test.mjs`, `web/scripts/palm-flow-qa.mjs`, `web/scripts/palm-csp-qa.mjs`; tài liệu và kết quả QA trong `qa-report/palm-*`.

## Bằng chứng và cách chạy lại

- [CSP/MediaPipe](../palm-csp/summary.json): chạy `node web/scripts/palm-csp-qa.mjs` từ gốc worktree sau build.
- [Flow Chromium](../palm-flow/palm-flow-report.json): chạy `node scripts/palm-flow-qa.mjs` trong `web/` khi dev server 3126 đang chạy.
- [Flow WebKit](../palm-flow-webkit/palm-flow-report.json): cùng script với `--engine webkit --out <thư-mục-bằng-chứng-riêng>`.
- [Responsive](responsive-results.json): script scratch `.superpowers/sdd/2026-09-26-palm-redesign/palm-responsive-qa.mjs`; controller đã chạy độc lập, exit 0, 48/48. JSON mới ghi lúc 10:49:08 ngày 26/09/2026 (UTC+7), khớp log cuối; đã đối chiếu ảnh mới Chromium/WebKit ở mobile và desktop.
- Bộ test, build, typecheck và lint được chạy lại khi chốt, cùng kết quả ở bảng trên; log lưu tại `/tmp/astrox-palm-final-checks.Y6Wulf/`.
- Nhật ký đầy đủ, exit code và log lệnh cuối: `.superpowers/sdd/2026-09-26-palm-redesign/progress.md`.
- Review cuối: `.superpowers/sdd/2026-09-26-palm-redesign/final-review-report.md`.

## Kết luận nghiệm thu local

Đã hoàn thành sáu mục triển khai/kiểm chứng trong phạm vi kế hoạch. Không còn lỗi chặn local được phát hiện trong các lượt đã chạy; các giới hạn nhỏ và phần không thể kiểm chứng bằng fixture vẫn được giữ nguyên trong báo cáo. Không có sửa source sản phẩm sau review PASS; thay đổi cuối chỉ nằm ở thao tác con trỏ của bài responsive và tài liệu bàn giao. Kết quả này không phải xác nhận sẵn sàng phát hành production.

## Giới hạn và điều kiện phát hành

- Chưa nghiệm thu camera vật lý trên OPPO Find X9 Ultra, iPhone/Safari hoặc Android nhiều camera. Xem [ma trận thiết bị](device-matrix.md).
- Chưa có bộ ít nhất 20 ảnh bàn tay có quyền sử dụng, được đánh dấu đường thật để kiểm chứng sai lệch. Overlay vẫn chủ đích tắt.
- Không chạy live AI/paid checkout. Cấu hình dịch vụ và AI trong flow test là fixture local miễn phí; không suy ra hành vi thanh toán production.
- Không đưa ảnh bàn tay cá nhân vào Git; fixture đều tổng hợp. Không thực hiện request mạng tới API ngoài loopback, không công bố credential/header/nonce.
- Không commit, merge, push, migration hoặc deploy. Main vẫn giữ các thay đổi không liên quan của chủ sở hữu cũ.
