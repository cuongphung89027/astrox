# Chỉ tay — nghiên cứu sửa toàn diện

Ngày: 2026-09-26. Trạng thái: phương án để duyệt, chưa sửa sản phẩm.
Owner: Codex /root. Branch: codex/palm-redesign.
Base: e0c982ed91bc718fc58264f49a589b2a0eedd0cf.
Phạm vi hiện tại: tài liệu này. Không đưa ảnh bàn tay cá nhân vào Git.

## Bằng chứng

- Ảnh người dùng gửi: đầu đường vàng nằm trên nền ngoài bàn tay; các đường không theo nếp thực; nét và đầu mút lớn che chi tiết.
- Quan sát production /chitay và /tarot: Chỉ tay có hình bàn tay thiếu tự nhiên, hướng dẫn cao quá mức, bộ nút/thẻ riêng. Tarot có minh họa có chủ đích và phân cấp gọn hơn.
- PalmReader.tsx: polyline từ AI, strokeWidth 7/4 CSS px với non-scaling-stroke; circle r=9 trong viewBox 1000x1000 preserveAspectRatio=none có thể thành ellipse trên ảnh dọc. Không có kiểm tra bám nếp tay. Ảnh giữ tỷ lệ gốc; chưa chứng minh lỗi tọa độ do CSS.
- PalmGuide.tsx: cùng một đường SVG có các cạnh ngón chồng nhau; ví dụ tay nghiêng chỉ xoay hình trong mặt phẳng, không minh họa đúng nghiêng lòng bàn tay khỏi camera.
- hand-tracker.ts: catch vòng nhận diện nuốt lỗi; đánh giá aspect dùng tọa độ chuẩn hóa chưa hiệu chỉnh tỷ lệ ảnh; landmark chỉ hỗ trợ vị trí/tư thế, không phải nếp chỉ tay.
- PalmCamera.tsx: loader che preview và khóa chụp trong lúc tải; không có timeout/retry; đổi lens mở mới trước khi dừng cũ; fingertips cũ không được xóa khi mất tay; canvas chỉ cập nhật khi chiều rộng đổi.
- palm-camera.ts: zoomMin không chứng minh tiêu cự quang học; ứng viên thiếu facingMode bị bỏ; điểm bằng nhau giữ lens mặc định. Không thể cam kết tìm wide tự động trên mọi thiết bị chỉ bằng nhãn/zoom.
- Live HEAD /chitay: script-src nonce + strict-dynamic, không wasm-unsafe-eval. functions/[[path]].js có cùng cấu hình. Đây là trở ngại WASM cần tái hiện bằng console khi triển khai, chưa có log lỗi từ điện thoại người dùng.
- Live HEAD model và vision_wasm_internal.wasm đều 200, MIME tương ứng application/octet-stream và application/wasm. HTTP 200 không chứng minh khởi tạo model thành công.
- Model local 7.5 MB, runtime WASM khoảng 11 MB; thông báo tải khoảng 8 MB chưa tính runtime. Không được hứa các lần sau tức thì. Header cache live không khớp immutable trong public/_headers.

## Các lựa chọn

1. Chỉ đổi nét/màu: nhanh nhưng để nguyên lỗi nhận diện, không đáp ứng yêu cầu.
2. Khuyến nghị: sửa camera/nhận diện, chuẩn hóa dữ liệu ảnh, kiểm chứng đường thật, làm lại UX trong hệ thống AstroX. Overlay chỉ xuất hiện khi có bằng chứng đủ tốt.
3. Huấn luyện model phân đoạn nếp tay riêng: tiềm năng cao nhưng cần bộ dữ liệu được phép sử dụng và nhãn chuẩn; không coi là điều kiện để sửa các lỗi hiện tại.

## Thiết kế đề xuất

### Ngôn ngữ thị giác

Dùng token và component hiện có của AstroX: nền kem, chữ mực, xanh ngọc/xanh thương hiệu theo ngữ cảnh, vàng làm điểm nhấn; tiêu đề display và nội dung sans hiện hữu. Đối chiếu cả globals.css, kit và Tarot; không thay toàn site theo bộ màu mới. Tách Palm.module.css khỏi Discovery.module.css để không làm lệch Lịch âm/Chuyên gia.

Minh họa biên tập thanh nhã, bàn tay năm ngón đúng tỷ lệ, khoảng ngón tự nhiên; bộ hình dùng chung cho trang đầu và hướng dẫn. Ba hướng dẫn ngắn: mở lòng tay, đủ ánh sáng, lấy trọn ngón và cổ tay. Phân biệt ảnh mẫu với kết quả cá nhân. Không dùng bộ khung xương làm hình chỉ tay.

### Luồng

1. Chọn ảnh: minh họa gọn, Chụp bàn tay là hành động chính, Chọn ảnh là phụ; hướng dẫn mở theo nhu cầu.
2. Chụp: preview hiện ngay khi stream có hình; trạng thái nhận diện nhỏ không che camera. Thanh điều khiển gồm chọn camera, đèn khi hỗ trợ, chụp, thoát. Chụp tự động có thể tắt; luôn có chụp thủ công khi hình sẵn sàng. Lỗi có nút thử lại và hướng khắc phục.
3. Kiểm tra ảnh: ảnh gọn trong viewport, chụp lại/thay ảnh; chọn bên tay và tay thuận; đồng ý gửi ảnh; giá và phân tích ở cùng hành động.
4. Kết quả: ảnh và nội dung song song trên desktop; mobile ảnh vừa màn hình, bộ chọn đường và luận giải ngay dưới. Nút xem ảnh gốc/đánh dấu, phóng to và quay về. Các thao tác không nằm dưới dock; tính safe-area và chiều cao thanh điều hướng.

### Nét chỉ tay

Nét hiển thị đề xuất 1.5–2 CSS px, đường chọn 2–2.5 px; viền tương phản mảnh theo nền, bỏ chấm lớn. Chỉ nhấn đường đang đọc, đường còn lại giảm độ đậm. Nhãn và nút chọn nằm ngoài ảnh; vùng chạm lớn độc lập nét vẽ và có phương án bàn phím. SVG dùng kích thước ảnh thật, một phép biến đổi chung với ảnh cho crop/zoom/rotate. Làm mượt có giới hạn sai số, không uốn đường để tạo hình đẹp khi không có dữ liệu.

### Độ chính xác

Chuẩn hóa EXIF, ảnh camera/upload, tỷ lệ và tọa độ theo một pipeline; ảnh gửi AI và ảnh hiển thị phải cùng hình học. Lưu metadata phép biến đổi. Giữ quan sát/luận giải tách khỏi việc có tọa độ đáng tin.

MediaPipe tìm bàn tay và ROI. Cần thử nghiệm riêng việc trích nếp tay trên crop độ phân giải đủ cao: AI đề xuất polyline dày điểm, kiểm tra vùng lòng tay và đối chiếu cấu trúc nếp ảnh. Không coi điểm confidence AI tự báo hoặc việc nằm trong ROI là bằng chứng bám đúng nếp. Edge detector cũng có thể bắt bóng, nhẫn hoặc texture, nên phải đánh giá trên mẫu có nhãn thủ công trước khi bật overlay.

Nếu thử nghiệm không đạt, vẫn trả phần nội dung phù hợp nhưng không vẽ đường trên ảnh; ghi rõ chưa xác định được vị trí. Không thay bằng một bộ đường chuẩn hay gắn đường mẫu lên tay. Không chặn toàn bộ kết quả chỉ vì một đường thiếu tọa độ.

### Camera và model

Sửa CSP có phạm vi tối thiểu cần cho WASM, giữ nonce/strict-dynamic và không mở unsafe-eval JavaScript. Chạy kiểm tra dưới chính CSP production, đồng bộ version SDK/runtime/model và kiểm tra cache.

Tách trạng thái download/init/detect/error; timeout có dọn tài nguyên và chặn kết quả đến muộn, retry rõ ràng, GPU rồi CPU. Đừng nuốt lỗi liên tục; chỉ ghi mã lỗi không ghi ảnh. Dừng vòng nhận diện khi chuyển camera/ẩn trang; reset landmark và countdown; kiểm tra cả chiều rộng và cao.

Wide: ưu tiên bằng chứng nhãn main/wide, không suy tiêu cự từ zoomMin. Khi không thể phân biệt, cung cấp danh sách camera rõ ràng và nhớ lựa chọn thủ công. Dừng track trước khi mở lens mới, khôi phục nếu mở thất bại, chống race khi chụp/thoát/đổi liên tiếp.

Đèn dùng torch theo capabilities; lấy nét dùng focusMode/pointsOfInterest khi nền tảng hỗ trợ. Không hiển thị vòng lấy nét như thành công nếu không áp dụng được. Cho mở camera hệ thống như phương án bổ sung khi web thiếu điều khiển phần cứng.

## Kế hoạch thực hiện và phạm vi

A. Tái hiện CSP, lỗi loader, đổi camera và phép biến đổi bằng test trước sửa. Paths: functions/[[path]].js, web/src/lib/hand-tracker.ts, palm-camera.ts, web/tests/*palm*, *hand-tracker*.
B. Sửa engine/capture lifecycle và trạng thái UX. Paths: PalmCamera.tsx và helper camera/tracker; không sửa dispatcher backend.
C. Thử nghiệm độ chính xác overlay với ảnh gốc được phép sử dụng; screenshot đã có overlay chỉ dùng làm bằng chứng lỗi, không làm ground truth nếp bị che. Paths: palm.ts, PalmReader.tsx, module geometry/overlay mới. Nếu đổi prompt/schema, giữ nguyên bản gốc và version trong Admin; phối hợp owner shared contract.
D. Làm lại PalmGuide, minh họa, PalmReader, Palm.module.css theo thiết kế trên; reuse kit và motion chung.
E. Kiểm tra frontend, build, diff và review production riêng khi được triển khai; ghi trạng thái live AI và camera vật lý tách khỏi test mock.

## Điều kiện nghiệm thu

- Model khởi tạo và detect được trên môi trường mang CSP production; mất mạng/lỗi model vẫn chụp thủ công được, không treo.
- Kiểm tra quyền bị từ chối, model chậm/hỏng, GPU fail, đổi lens thất bại, thoát khi đang mở, xoay thiết bị, ảnh EXIF, reset khi AI đang trả.
- Kiểm tra tọa độ bằng fixture ảnh vuông/dọc/ngang/xoay/lật và crop/zoom; overlay không bị trôi hoặc kéo giãn đầu mút.
- Dataset kiểm chứng ít nhất 20 ảnh gốc có quyền sử dụng, tay trái/phải, ánh sáng và nền đa dạng; người kiểm tra đánh dấu nếp thật. Đề xuất median sai lệch <=1% bề rộng lòng tay, P95 <=3%; báo riêng tỷ lệ từ chối và tỷ lệ vẽ sai, không chỉ điểm trung bình. Chỉ bật mặc định khi mọi đường được chấp nhận nằm trong vùng tay và đạt ngưỡng trên tập kiểm chứng. Đây là ngưỡng nghiệm thu đề xuất, chưa có kết quả.
- Mobile 360/390/412 px và desktop; không dock che CTA; keyboard/focus/reduced motion; trạng thái lỗi có hành động.
- Camera wide, đèn và lấy nét phải thử trên điện thoại nhiều lens thực tế, gồm máy người dùng gặp lỗi. Giả lập không chứng minh tính năng phần cứng.

## Nguồn kỹ thuật

- https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- https://www.w3.org/TR/image-capture/

## Giới hạn hiện tại

Chưa thay code, chưa chạy AI với ảnh cá nhân, chưa test camera vật lý, chưa deploy. Chưa chứng minh toàn bộ lỗi tọa độ là do model hay mapping. Cần duyệt hướng thiết kế trước triển khai theo brainstorming skill.
