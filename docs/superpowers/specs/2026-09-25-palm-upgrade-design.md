# Thiết kế nâng cấp tính năng Chỉ tay

- **Ngày:** 25/09/2026
- **Owner:** Sơn (ductor) + agent thực thi trên nhánh này
- **Base:** `a009880` (main), nhánh `codex/palm-upgrade`, worktree `../astrox-palm`
- **Phạm vi:** chỉ frontend `/chitay` (`web/`), deploy Pages. Không đổi Worker, prompt AI, schema JSON, giá, luồng charge, admin.

## 1. Mục tiêu

Nâng trải nghiệm xem chỉ tay theo chuẩn của natal-chart.com (đã khảo sát 2 màn hình ảnh chụp ngày 25/09), gồm 4 khoảng cách cần vá:

1. **Không dạy chụp** — người dùng vào thẳng camera, ảnh xấu chỉ bị phát hiện sau khi đã tốn 1 lượt AI (bị trả "Chụp lại một chút nhé").
2. **Camera mở nhầm ống kính** — trên máy nhiều cam sau (OPPO Find X9 Ultra), `facingMode: "environment"` có thể mở cam tele thay vì cam wide.
3. **Thời gian chờ chết** — chỉ có đường quét vàng; đối thủ kể chuyện "Đang phân tích — Đường tài lộc" trên ảnh thật có chấm mốc đầu ngón.
4. **Overlay thiếu sống động** — các đường cùng màu nhạt, không mốc ngón, không hiệu ứng vẽ.

## 2. Nguyên tắc bất biến

- Một lượt gọi AI = một lần đọc (không thêm call, không streaming). Giá/badge `usePaidPrice("palm", …)` giữ nguyên.
- Single accent: đường đang đọc màu vàng đồng (`#f3cf79`), các đường còn lại màu nhạt hiện có. **Không** copy palette đa màu của đối thủ.
- Ảnh không rời máy ở bước nhận diện (MediaPipe chạy on-device); checkbox đồng ý gửi AI giữ nguyên trước bước đọc.
- Disclaimer hiện có giữ nguyên ("Đường đánh dấu do AI gợi ý, có thể lệch…"), pill "Thử nghiệm" giữ nguyên ở phiên bản này (trung thực, gỡ sau nếu muốn).
- Ngày hiển thị, legal, điều khoản không đổi.

## 3. Thiết kế theo luồng

### 3.1 Màn chụp hướng dẫn (thay empty state hiện tại)

- HandArt hiện tại được bổ sung khối minh hoạ **1 đúng + 3 sai** vẽ SVG theo kit Đông Sơn (không dùng ảnh chụp): đúng = lòng bàn tay hướng máy, trong khung; sai = tay nghiêng, tay xoay ngang, tay chật/le khung.
- Dòng riêng tư ngắn dưới cụm nút: "Nhận diện bàn tay chạy ngay trên thiết bị. Ảnh chỉ được gửi đi khi bạn bấm phân tích."
- Trạng thái này vẫn chứa 2 nút hiện tại (Chụp bàn tay / Chọn ảnh).

### 3.2 Camera engine — vá lỗi ống kính (Find X9 Ultra)

**Nguyên nhân:** Chrome Android liệt kê từng lens sau là một `videoinput` riêng; `facingMode: "environment"` chỉ lọc nhóm, thứ tự thiết bị không đảm bảo wide trước → có thể mở tele.

**Fix tự động:**
1. Mở track mặc định `facingMode: "environment"` như hiện tại.
2. Đọc `track.getCapabilities().zoom`. Nếu đáy dải của track đang mở **không** nằm quanh 1× (ngoài khoảng 0.9–1.3 và ngoài 90–130, phòng cả hai thang đơn vị) thì mới đi tìm: enumerate các `videoinput` cam sau, lần lượt mở ngắn (< 500 ms/lens) và đọc `zoom.min` từng lens. Cùng một máy thì các lens dùng chung thang đơn vị — quy về thang 1 (mọi giá trị ≥ 30 thì chia 100) rồi **chọn lens có đáy dải gần 1× nhất**: wide có đáy ≈1×, ultra-wide có đáy < 1×, tele có đáy ≥ ~2×, nên cả hai đều thua wide. Track mặc định cũng là một ứng viên — nếu chính nó gần 1× nhất thì giữ nguyên, không mở lại.
3. Cache lựa chọn trong session; các lần mở camera sau dùng lại.
4. Nếu `getCapabilities()` không trả zoom (Firefox, iOS Safari): giữ track mặc định. iOS chỉ expose một thiết bị ảo do hệ thống chọn lens nên mặc định đã là wide — xác nhận thêm ở test thiết bị.

**Fix thủ công (lưới an toàn):** khi có ≥ 2 thiết bị cam sau, hiện nút nhỏ "Đổi ống kính" trong view camera, xoay vòng `deviceId` và mở lại stream. Desktop 1 webcam thì nút không hiện.

### 3.3 Nhận diện bàn tay live (MediaPipe HandLandmarker)

- Thư viện `@mediapipe/tasks-vision` (pin version cứng), model `hand_landmarker.task` (~8 MB) + wasm self-host trong `web/public/models/` và `web/public/mediapipe/wasm/` — cùng origin, không phụ thuộc CDN.
- Lazy load: chỉ tải khi bấm "Chụp bàn tay", có progress nhỏ; fail/tải quá 4 s → fallback chụp thủ công với khung tĩnh (như hiện tại) + hướng dẫn 3.1.
- Vòng dò 15 fps (throttle trong rAF), `numHands: 1`, running mode VIDEO, delegate GPU.
- Máy trạng thái dẫn khung, chữ ngắn một dòng: `KHÔNG_THẤY_TAY` → "Đưa lòng bàn tay vào khung" · `QUÁ_XA` → "Đưa tay sát hơn" · `CHƯA_ĐỨNG` (nghiêng/xoay quá) → "Xoay lòng bàn tay về phía máy" · `SẴN_SÀNG` → "Giữ yên…" + đếm ngược 3‑2‑1 → tự chụp.
- Ngưỡng (tỉ lệ bbox trong khung, độ yên theo biên độ landmark giữa các frame, số frame liên tiếp) gom vào một object hằng số trong `hand-tracker.ts` để tinh chỉnh nhanh sau test thiết bị thật.
- Tự chụp là mặc định nhưng luôn có nút chụp tay; đếm ngược huỷ được bằng cách cử động tay.
- Landmark tại frame chụp được lưu lại để vẽ chấm đầu ngón ở màn kết quả (map toạ độ video → ảnh canvas đã crop/resize).

### 3.4 Kiểm tra trước khi gửi (tránh mất lượt AI)

- Ảnh đạt: có tay tại frame chụp (từ 3.3), kích thước tối thiểu giữ nguyên chuẩn 350 px, độ sáng tương phản đủ (heuristic canvas đơn giản, cảnh báo chứ không chặn cứng).
- Ảnh không đạt → thông báo cụ thể + giữ camera, chưa tốn gì.

### 3.5 Màn chờ

- Vẫn 1 lượt gọi AI. Trong lúc chờ: giữ hiệu ứng quét, thêm lời dẫn kỳ vọng liệt kê đường sẽ đọc ("Sẽ đọc: đường Tâm, đường Đầu, đường Sống…") — nói trước, không fake tiến trình.

### 3.6 Màn kết quả — khoảnh khắc "tăng ảnh"

- Sau parse: các đường được **vẽ dần từng đường một** (stroke-dasharray/offset) trên ảnh người dùng; chấm nhỏ ở hai đầu đường từ landmark đã chụp; đường đang đọc màu vàng đồng, đậm hơn.
- Ảnh là trục giữa; bấm đường trên ảnh → thẻ ý nghĩa đường đó hiện dưới ảnh (thay tab phẳng); tóm tắt tổng vẫn đứng đầu. Toggle "Hiện đường gợi ý trên ảnh" giữ nguyên.
- `prefers-reduced-motion`: bỏ animation vẽ, hiện tĩnh đầy đủ.

## 4. Kiến trúc code

| File mới/vai trò | Nội dung |
| --- | --- |
| `web/src/lib/palm-camera.ts` | Mở/đóng stream, chọn lens (heuristic zoom-min), đổi lens, chụp frame |
| `web/src/lib/hand-tracker.ts` | Bọc MediaPipe: nạp model, vòng dò 15 fps, máy trạng thái, trả landmarks + verdict |
| `web/src/components/discovery/PalmGuide.tsx` | SVG đúng/sai + privacy line |
| `web/src/components/discovery/PalmCamera.tsx` | View camera live: video + overlay + chữ dẫn + shutter + đổi lens |
| `PalmReader.tsx` (sửa) | Điều phối bước; giữ phần form/kết quả hiện có, chỉ thay luồng chụp |
| `web/src/lib/palm-camera.test.ts` | Unit: heuristic chọn lens với capabilities giả, máy trạng thái, ngưỡng |

`PalmReader.tsx` đang 450 dòng; tách như trên để không vượt quá tầm đọc, không đụng file dùng chung (không nằm trong danh sách shared contracts).

## 5. Xử lý lỗi

- Không camera/không HTTPS → giữ thông báo hiện tại + lối "Chọn ảnh".
- Model MediaPipe tải fail/chậm → chụp thủ công + khung tĩnh; tính năng không vỡ.
- Nhận diện chậm (máy yếu) → hạ 8 fps; vẫn chậm → fallback thủ công.
- Người dùng rời trang giữa chừng: dọn stream + model như cleanup hiện tại (`generation` + unmount effect).

## 6. Kiểm thử

1. Unit `npm test`: heuristic chọn lens (tele/ultra-wide/1-cam/không-zoom), máy trạng thái, ngưỡng chờ.
2. `npm run qa:viewport` — 330 combo phải sạch (đọc ngược số liệu: 0 lỗi = pass).
3. `ui-30viewports.mjs` — 30 size, đăng nhập, dò va chạm topbar.
4. QA 2 engine webkit + chromium, dsf 2 cho phần UI tĩnh.
5. **Ma trận thiết bị thật:** OPPO Find X9 Ultra (phải mở wide — kiểm tra FOV/zoom không vượt 1x), iPhone Safari (cam ảo, đếm ngược mượt, WASM chạy tốt), một Android phổ thông, desktop webcam. iPhone là mục mới — chưa từng test camera tính năng này trên iOS.

## 7. Triển khai

- Chỉ Pages từ SHA đã QA của nhánh này; Worker/DB không đụng. Rollback = revert deploy Pages.
- Vô hiệu hoá tính năng khi hỏng: mọi nhánh lỗi đều chảy về luồng thủ công, không có cờ feature server-side.

## 8. Quyết định đã chốt mặc định (Sơn có thể đảo)

1. Giữ pill "Thử nghiệm".
2. Chấm đầu ngón lấy từ landmark lúc chụp; đường chỉ tay vẫn từ AI `points` (không thêm `landmarks` vào schema AI).
3. Tự chụp bật mặc định, tắt được trong view camera.
