# 005 — Chỉ tay, chuyên gia và lịch âm cho AstroX

Ngày khảo sát: 24/09/2026. Category: direction. Trạng thái: đề xuất nghiên cứu, chưa triển khai.
Planned at: `6c8c84fd1e6985a63816d82ec4394034f04299e6`.
Workspace: `/Users/Thsonjpg/.codex/worktrees/readings-kinhdich-couples/astrox`.

## Quyết định sản phẩm

- Người dùng yêu cầu nghiên cứu cả ba module, thông minh hơn trải nghiệm trong hai ảnh tham khảo và theo phong cách AstroX.
- Đã xác nhận: chuyên gia do AstroX tuyển chọn; không làm marketplace tự đăng ký ở bản đầu.
- Yêu cầu bổ sung: giữ đúng tên hiển thị **Lịch âm** trên trang chủ, trang module, menu và Admin; không đổi thành “Lịch của bạn”. Thêm card **Lịch âm** vào trang chủ.
- Giữ kem–xanh đậm–vàng dịu, Beautique/Be Vietnam Pro và khoảng cách thoáng. Chuyển động rõ, có ý nghĩa; nội dung hướng dẫn ngắn.
- Hai ảnh chỉ cho thấy giao diện chụp tay và đường vẽ phủ lên ảnh. Chưa có bằng chứng về độ chính xác nhận diện hay công nghệ phía sau. Không sao chép thương hiệu/asset của trang đó.
- Thứ tự đề xuất: làm nền lịch âm; thử nghiệm kỹ thuật chỉ tay song song; đưa đặt lịch vào pilot khi có chuyên gia, lịch và chính sách vận hành thật.
- Thay đổi Kinh Dịch đang dở trong working tree nằm ngoài phạm vi tài liệu này. Không sửa, commit hay deploy chúng trong đợt nghiên cứu.

## Căn cứ từ code hiện tại

| Bằng chứng | Ý nghĩa với module mới |
|---|---|
| `web/src/lib/api.ts:176–191` nhận ảnh qua `inline_data` nhưng gắn với hồ sơ/lá số | Có đường truyền ảnh AI để nghiên cứu tái sử dụng; không đồng nghĩa model đang cấu hình có khả năng nhận diện đường tay. Tạo contract ảnh tay riêng, không dùng chung state ảnh lá số. |
| `web/src/lib/state.ts:31–32,54–60` chứa ảnh lá số và fingerprint | Không nhét ảnh lòng bàn tay vào cache lá số/hồ sơ chung. |
| `web/src/lib/kinhdich.ts:261,312–315` ghi lịch Trung Hoa UTC+8 | Không lấy trực tiếp kết quả này làm lịch âm Việt. Adapter mới phải ghi convention/version. |
| `web/src/lib/batu.ts:261–263,322` dùng `lunar-typescript` tính Tứ Trụ và ngày âm | Lịch dân dụng Việt và phép tính Bát Tự cần tách rõ; không thay engine toàn cục một cách cơ học. |
| `web/src/lib/tuvi.ts:135` gọi `astro.bySolar` | Nếu dùng ngày âm mới cho nhập ngày sinh cần kiểm thử đối chiếu engine; không âm thầm đổi các lá số đã lưu. |
| `services/admin/config.ts:24,68` danh mục module cố định và validation | Phải thêm module vào Admin/validation cùng lúc với route; không chỉ thêm card ngoài trang chủ. |
| `services/admin/catalog.ts:4` danh mục dịch vụ, `services/admin/original-prompts.ts:3` nguyên tắc không bịa dữ liệu ảnh | Có điểm tích hợp prompt/service; giữ nguyên corpus gốc và chức năng khôi phục. |
| `services/backend/README.md:27–34` mô tả top-up PayOS/D1, khác billing AI | Không coi ví nạp Point là hệ thống thanh toán buổi tư vấn đã có. Cần xác minh live riêng trước mở thu tiền. |
| `web/src/components/kinhdich/KinhDich.module.css:1–12`; `web/src/app/globals.css:18–48`; `web/src/app/layout.tsx:16,23` | Tái sử dụng màu thực tế, type và nhịp card hiện có; comment font cũ không phải căn cứ thay font. |

Khảo sát route, module registry và tìm tên palm/chitay/booking/appointment/licham/chuyengia trong `web/src`, `services`, `migrations` chưa thấy triển khai các module này. Đây là kết quả tìm kiếm giới hạn trong repo, không phải xác nhận mọi hệ thống bên ngoài đều chưa có.

## 1. Chỉ tay — trải nghiệm tương tác trên ảnh thật

**Giá trị:** người dùng nhìn được phần ảnh đang được diễn giải và có thể hỏi tiếp về đúng phần đó. Không chỉ tải ảnh rồi nhận một bài viết chung.

### Luồng đề xuất

1. Trang mở có minh họa bàn tay nét vàng, hai lựa chọn **Chụp bàn tay** / **Chọn ảnh**; không bắt nhập ngày sinh để chụp tay.
2. Camera có khung bàn tay, hướng dẫn theo tình trạng: “Đưa tay xa hơn”, “Thêm ánh sáng”, “Giữ yên một chút”. Chỉ tự chụp sau khi người dùng bật chế độ tự chụp và khung ổn định; luôn có nút chụp thủ công.
3. Xem lại ảnh, xác nhận tay trái/phải và tay thuận. Camera có thể lật ảnh; không chỉ tin nhãn nhận diện. Một tay đủ bắt đầu, tay thứ hai là tùy chọn.
4. Kiểm tra ảnh → nhận diện đường → soạn luận giải. Hiện trạng thái thực tế; không chạy phần trăm giả để trông như đang phân tích.
5. Màn kết quả gồm ảnh lớn, bật/tắt đường phủ, chạm vào từng đường để mở phần giải thích. Có ảnh gốc cạnh chế độ đánh dấu. Đường chưa thấy rõ ghi “Chưa đủ rõ”, cho chụp lại; không vẽ bổ sung theo mẫu cố định.
6. Ba phần đọc nhanh: **Điểm nổi bật**, **Từng đường tay**, **Câu hỏi của bạn**. Lưu bản đọc khi người dùng chọn. “Trao đổi với chuyên gia” mang theo phần người dùng đồng ý chia sẻ.

### Làm thông minh ở đâu

- Tách ba tầng: chất lượng ảnh; quan sát hình học; diễn giải theo hệ thống chỉ tay đã chọn. Chỉ tầng quan sát được đo độ chính xác từ ảnh; không biến điểm nhận diện thành “độ chính xác vận mệnh”.
- Khởi đầu với những đường chính nhìn rõ. Đường phụ hoặc đường thường gọi là tài vận chỉ xuất hiện khi có bằng chứng thị giác đủ rõ. Không bắt mọi bàn tay phải có đủ một bộ đường.
- Contract dự kiến: `handSide`, `dominantHand`, `qualityIssues[]`, `lines[{id, pointsNormalized, visibility, provenance}]`, `observations[]`, `reading`, `modelVersion`, `promptVersion`. `provenance` phân biệt máy nhận diện với nét do người dùng/chuyên gia hiệu chỉnh.
- AI nhận các quan sát đã kiểm tra để diễn giải; lưu liên kết giữa nhận định và đường tương ứng. Nếu ảnh không đủ rõ, từ chối nhận định cụ thể thay vì suy đoán.
- Nội dung theo góc nhìn chiêm nghiệm truyền thống. Không suy ra tuổi thọ, bệnh tật hoặc cam kết giàu nghèo từ ảnh tay.

### Khả thi kỹ thuật và cổng thử nghiệm

MediaPipe Hand Landmarker trả 21 mốc bàn tay và trái/phải; tài liệu không cung cấp bộ dò đường chỉ tay. Vì vậy dùng nó để hỗ trợ khung chụp, còn nhận diện nếp lòng bàn tay là một thử nghiệm riêng. Tài liệu cũng lưu ý inference web đồng bộ có thể chặn UI; nghiên cứu Web Worker và tải module khi mở camera. [Nguồn Google](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js).

Thử hai hướng trên cùng bộ ảnh được phép sử dụng: model thị giác đa phương thức trả đường/quan sát có cấu trúc; bộ phân đoạn đường tay chuyên biệt. Không mua hoặc tích hợp API chỉ tay trước khi có dữ liệu đo và quyền sử dụng rõ ràng.

Cổng thử nghiệm đề xuất, chưa phải kết quả đã đạt:

- Bộ tối thiểu 100 ảnh của ít nhất 30 người đồng ý tham gia, đa dạng thiết bị, sắc da, ánh sáng, tay trái/phải; tách tập đánh giá theo người.
- Đánh dấu nếp tay nhìn thấy bằng hai người độc lập; bất đồng được phân xử. Nhãn hình học không phải chứng minh luận giải bói tay.
- Đo riêng tỷ lệ ảnh bị yêu cầu chụp lại, bỏ sót ảnh xấu, nhầm trái/phải, đường vẽ không nằm trên nếp thật, độ trễ và chi phí/lượt; công bố mẫu số theo từng nhóm.
- Ngưỡng pilot đề xuất: ít nhất 90% ảnh đạt chất lượng có đường chính được hai người đánh giá chấp nhận; dưới 5% ảnh không đủ rõ vẫn bị hệ thống gán đường chắc chắn. Cần hiệu chỉnh tiêu chí chấm trước khi đo, không đổi ngưỡng sau khi thấy kết quả.
- Nếu không đạt: phát hành thử nghiệm có chuyên gia xác nhận hoặc chỉ hướng dẫn/chú giải trên hình minh họa được ghi rõ. Không bán tính năng “quét chính xác” bằng overlay trang trí.

Camera cần HTTPS và quyền truy cập; từ chối quyền phải vẫn chọn ảnh được. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

Ảnh preview xử lý tại máy khi có thể; dừng camera khi rời màn; loại EXIF trước upload. Mặc định không lưu ảnh lâu dài; nếu cần xử lý máy chủ, đề xuất xóa ảnh tạm trong 24 giờ, kiểm chứng cả log/provider retention trước khi công bố cam kết. Lưu lịch sử/ảnh và chia sẻ cho chuyên gia là lựa chọn riêng. Không dùng ảnh để huấn luyện nếu chưa có đồng ý riêng.

## 2. Đặt lịch — chuyên gia AstroX tuyển chọn

**Giá trị:** chuyển từ bản đọc tự động sang cuộc trao đổi có chuẩn bị, đúng chuyên môn và rõ chi phí.

### Luồng người dùng

**Chọn vấn đề → chọn chuyên gia → chọn buổi và giờ → xác nhận → cuộc hẹn.**

- Thẻ chuyên gia có ảnh thật, phương pháp tư vấn, chủ đề phù hợp, thời lượng, giá và lịch trống gần nhất. Chỉ hiển thị huy hiệu/kinh nghiệm đã được AstroX xác minh; không tạo đánh giá mẫu giống đánh giá thật.
- Người dùng nhập vấn đề ngắn. AI gợi ý chuyên gia theo chuyên môn, ngôn ngữ, giá và lịch trống; giải thích bằng một câu. Không xếp hạng theo lời hứa giải hạn/đổi vận.
- Chọn suất 30/60 phút là giả định thiết kế, quản trị viên cấu hình được. Múi giờ hiện rõ cạnh lịch; dùng UTC lưu timestamp, hiển thị theo vùng người dùng.
- Màn xác nhận ghi tổng phí, nội dung buổi, hình thức liên lạc, quy định đổi/hủy. Trạng thái “Yêu cầu đang chờ xác nhận” và “Đã xác nhận lịch” phải khác nhau.
- Trang cuộc hẹn có thời gian, đếm ngược vừa phải, đổi/hủy theo chính sách, nút vào buổi chỉ khi link hợp lệ được cấp. Bản đầu dùng link họp do vận hành quản lý, chưa xây video riêng.
- AI soạn bản tóm tắt từ câu hỏi và bản đọc người dùng chọn; người dùng xem, sửa rồi đồng ý chia sẻ. Chuyên gia không mặc nhiên được xem cả hồ sơ, ảnh tay hay lịch sử.
- Sau buổi: chuyên gia ghi ghi chú, người dùng xem lại và đánh giá nếu đã hoàn thành cuộc hẹn.

### Điểm tích hợp booking đã kiểm tra thêm

- `services/backend/auth.mjs:17–21`: session và trạng thái tài khoản; `services/backend/user-data.mjs:4–20`: dữ liệu cá nhân dạng JSON có revision, không phù hợp làm kho booking.
- `services/backend/payments.mjs:28–43,67–79`: đơn nạp và webhook cộng Point/thưởng referral. Booking phải có order type và nghiệp vụ riêng để không cộng sai.
- `services/backend/worker.mjs:14`: scheduled handler là điểm khảo sát cho reconciliation/reminder, không phải bằng chứng reminder đã tồn tại.
- `services/admin/server.mjs:11–17,44–45`: Access/capability/CSRF; `web/src/components/admin/AdminDashboard.tsx:40–68`: điểm mở rộng navigation Admin. Thêm quyền quản lý chuyên gia/lịch/hoàn phí riêng.
- Dùng slot cố định do Admin mở ở pilot. Khi atomic claim cập nhật 0 dòng, phải trả xung đột; transaction không lỗi chưa có nghĩa đã chiếm được slot. D1 batch có rollback khi một statement lỗi, nhưng vẫn phải kiểm tra điều kiện claim. [Cloudflare D1](https://developers.cloudflare.com/d1/worker-api/d1-database/).

### Admin và backend bắt buộc

Admin quản lý hồ sơ chuyên gia, dịch vụ/giá, lịch tuần, ngày nghỉ, khoảng nghỉ giữa buổi, cuộc hẹn, đổi/hủy, hoàn phí và nhật ký thao tác. Có dashboard “Hôm nay / Chờ xử lý / Sắp tới”. Ban đầu vận hành nhập lịch; cổng chuyên gia chỉ mở khi có nhu cầu thực.

Entity dự kiến: `experts`, `expert_services`, `availability_rules`, `availability_exceptions`, `appointment_slots`, `bookings`, `booking_events`, `booking_payments`, `notification_outbox`. Snapshot giá/thời lượng/chính sách vào booking; thay giá tương lai không đổi cuộc hẹn cũ.

- Chống trùng ở máy chủ, không chỉ disable nút. Dùng slot chuẩn hóa và atomic claim; nếu thời lượng khác nhau phải khóa toàn bộ slot nhỏ bị chiếm, gồm buffer. UNIQUE start time riêng lẻ không đủ chống overlap.
- Khi có thanh toán: `held → pending_payment → confirmed → completed`, nhánh `expired/cancelled/no_show`; trạng thái refund tách khỏi trạng thái buổi tư vấn. Mỗi hành động retry/webhook có idempotency key.
- Payment đến sau khi hold hết hạn không tự cướp slot đã cấp cho người khác: chuyển xử lý hoàn/đổi lịch có thông báo rõ.
- Nhắc lịch qua một kênh được triển khai thật trước; outbox chống gửi trùng, retry có giới hạn, hủy lịch thì hủy reminder. File ICS có thể tải ngay; không hứa push khi chưa có hạ tầng.
- Lịch trống có thể xem công khai; đặt/xem thông tin riêng cần session và ownership phía server. Chuyên gia chỉ xem booking được phân công.

**Phương án mở pilot:** trước hết lịch do Admin xác nhận, chưa thu tiền tự động; vẫn ghi nhận fee dự kiến nếu có. Chỉ bật xác nhận tức thì và thu tiền sau khi kiểm chứng đồng thời giữ chỗ, thanh toán, hủy/hoàn và thông báo bằng flow thật. Đây là lựa chọn triển khai đề xuất, chưa phải quyết định giá hoặc kênh thanh toán của người dùng.

## 3. Lịch âm — tiện ích dùng hằng ngày

**Giá trị:** mở nhanh để xem hôm nay, đổi ngày, ghi nhớ ngày gia đình; tạo lý do quay lại AstroX mà không cần đọc luận giải dài.

### Giao diện và chức năng

- **Card trang chủ:** tiêu đề **Lịch âm**, mô tả “Xem ngày âm, đổi ngày và ghi nhớ những dịp quan trọng”, dẫn tới `/licham`. Dùng cùng bố cục, kiểu chữ và khoảng cách với các card tính năng hiện có; biểu tượng lịch kết hợp mặt trăng theo màu AstroX. Card và route phải phát hành cùng nhau, không dẫn tới trang chưa tồn tại.
- **Hôm nay:** ngày dương lớn, ngày âm rõ, thứ/Can Chi, sự kiện tiếp theo. Hình trăng nhỏ phản ánh pha trăng nếu có dữ liệu đã kiểm chứng.
- **Tháng:** ô ngày dương chính, âm phụ; chạm ngày mở chi tiết bên dưới trên mobile. Nhấn “Hôm nay” quay lại ngay; tháng chuyển ngang mượt.
- **Đổi ngày:** âm ↔ dương, chọn tháng nhuận rõ ràng; báo không tồn tại thay vì tự sửa ngày.
- **Ngày của gia đình:** giỗ, sinh nhật âm, mùng một/rằm; quy tắc tháng nhuận và tháng thiếu 30 ngày được hỏi khi tạo sự kiện. Có xem trước ngày dương sẽ nhắc.
- **Chọn ngày theo việc** ở giai đoạn sau: chọn mục đích và khoảng ngày, đưa ra vài lựa chọn kèm lý do theo một bộ quy tắc truyền thống đã biên tập. Không chấm “92% hợp mệnh” không có cơ sở.
- AI giải thích dữ liệu lịch có sẵn, gợi ý lọc; không để model tự sinh ngày âm hoặc giờ tốt. Người dùng có thể mở nguồn/quy ước khi muốn, màn mặc định vẫn gọn.

### Nền lịch

Tách `calendar-vn` cho lịch dân dụng Việt, ghi `convention`, `timezone`, `algorithmVersion`, phạm vi năm và flag nhuận. Đề xuất bản đầu hỗ trợ 1976–2100 sau kiểm chứng; chưa dùng cho quy đổi ngày sinh lịch sử. Mở rộng năm cũ cần chính sách riêng vì lịch lịch sử có khác biệt vùng/thời kỳ.

Bài thuật toán của Hồ Ngọc Đức giải thích ngày đầu tháng theo Sóc, cách xác định tháng nhuận và khác biệt UTC+7/UTC+8; chính tác giả lưu ý công thức giới thiệu đã đơn giản hóa. Trang gốc Leipzig không truy cập được trong lần khảo sát, đã đọc bản lưu nội dung tác giả; cần đối chiếu nguồn độc lập và license trước tái sử dụng code. [Bản lưu bài thuật toán](https://www.xemamlich.uhm.vn/calrules.html).

Repo đã có `astronomy-engine`; thư viện hỗ trợ hiện tượng thiên văn nhưng không thay thế toàn bộ quy tắc lịch Việt. Nghiên cứu dùng để đối chiếu thời điểm, tránh thêm thư viện chỉ vì cùng tên “lunar”. [Tài liệu nhà phát triển](https://github.com/cosinekitty/astronomy).

Kiểm chứng: đối chiếu bảng mốc từ nguồn lịch Việt độc lập đã xác nhận; toàn bộ ngày trong phạm vi phải đổi đi–về đúng; test tháng nhuận, Tết, tháng 29/30 ngày, ranh giới năm, Sóc gần nửa đêm UTC+7/8, timezone máy khác Việt Nam. Round-trip chỉ chứng minh nhất quán nội bộ, không đủ chứng minh đúng lịch.

Không thay Bát Tự/Tử Vi/Kinh Dịch ngay khi thêm lịch; lập regression riêng, version phép tính và giữ nguyên kết quả cũ đã lưu. Quy tắc dân gian tốt/xấu là dữ liệu biên tập có nguồn/version riêng, không trộn với tính toán thiên văn.

## Thiết kế chung và motion

| Module | Điểm nhấn | Chuyển động có mục đích |
|---|---|---|
| Chỉ tay | Ảnh tay làm trung tâm, đường vàng/xanh mảnh, card nội dung bên cạnh | Khung bắt nét ổn định; đường đã nhận diện xuất hiện lần lượt; chạm đường làm sáng và mở nội dung tương ứng |
| Chuyên gia | Chân dung thật, nhiều khoảng trắng, lịch trống dễ đọc | Slot được chọn chuyển màu; tóm tắt cập nhật nhẹ; xác nhận thành công bằng nét check ngắn |
| Lịch âm | Chữ ngày lớn, mặt trăng và họa tiết Việt rất nhẹ | Lật/chuyển tháng 240–320ms; chi tiết ngày mở êm; highlight ngày đang chọn |

Dùng nền `#fbf6ec`, xanh `#244d40` và vàng dịu từ module Kinh Dịch làm hướng thiết kế, không đổi toàn bộ token site. Card radius 22–26px. Mobile gutter 20px, card padding 20–24px, nhóm cách 24–32px; label/input 8–12px; CTA cách card 20–24px. Một action chính mỗi bước, target tối thiểu 44px, input 16px. Desktop nội dung 1080–1200px, mobile một cột; tránh đặt ảnh camera và form chen cùng một hàng.

Motion hỗ trợ `prefers-reduced-motion`; không flash, không khóa chờ animation xong mới thao tác, không loop ở mọi card. Hiệu ứng scan chỉ xuất hiện lúc có tác vụ đang xử lý, đường phủ bám ảnh khi resize/xoay. Âm thanh mặc định tắt. Toàn bộ trạng thái và lỗi tiếng Việt; phần giải thích dài mở theo nhu cầu.

## Các hướng triển khai và mức chắc chắn

| Hướng | Impact | Effort ước lượng | Risk | Confidence |
|---|---|---|---|---|
| Lịch Việt độc lập và UI Hôm nay/Tháng/Đổi ngày | Tiện ích hằng ngày, tránh lấy nhầm convention hiện tại | L, nhiều ngày và dữ liệu đối chiếu | MED: ranh giới lịch và đồng bộ engine | HIGH về khoảng trống trong repo; chưa chọn thuật toán cuối |
| Thử nghiệm nhận diện tay trước sản phẩm AI | Xác định có làm được trải nghiệm như ảnh một cách trung thực | L; có thể kéo dài nếu cần model riêng | HIGH: ảnh thực tế, chi phí, độ chính xác | HIGH về giới hạn landmarks; MED về khả năng dò đường bằng model hiện có |
| Booking chuyên gia tuyển chọn | Hành trình tư vấn tiếp nối bản đọc | L, backend + Admin + vận hành | HIGH nếu thu tiền; MED cho pilot xác nhận thủ công | HIGH về mô hình đã chốt; cần kiểm chứng provider thực |

Không đưa ngày cam kết phát hành trước kết quả thử nghiệm chỉ tay và chốt năng lực vận hành chuyên gia.

## Handoff cho đợt triển khai sau

Tài liệu này cho phép thiết kế/thử nghiệm theo scope, không phải lệnh deploy. Tạo nhánh `codex/` riêng khi bắt đầu. Kiểm tra drift bằng `git diff --stat 6c8c84f..HEAD -- web/src services migrations` và `git diff --stat -- web/src services migrations`; đối chiếu các điểm tích hợp trên trước sửa. Đọc `web/AGENTS.md` và tài liệu Next được repo yêu cầu.

Các đường dẫn mới dự kiến, chưa tồn tại: `web/src/app/chitay/page.tsx`, `web/src/app/chuyengia/page.tsx`, `web/src/app/licham/page.tsx`; component tương ứng; `web/src/lib/calendar-vn.ts`; backend booking và migration tách riêng. Naming/module ID cuối phải đồng bộ Admin catalog, prompt, telemetry, history, navigation và sitemap.

Các bước nên tách để review:

1. Chốt wireframe ba màn chính và contract data; lấy palette/type từ UI thực tế. Không sửa engine cũ.
2. Làm spike chỉ tay với benchmark và bảng chi phí; làm fixture lịch có nguồn độc lập. Chỉ qua bước sản phẩm khi có kết luận đo được.
3. Triển khai lịch cơ bản; capture/read-only palm pilot nếu đạt; booking Admin xác nhận với chuyên gia thật.
4. Chạy QA mobile 360/390px và desktop, keyboard/reduced motion, camera Safari iOS/Chrome Android; lỗi quyền camera, ảnh mờ, timeout, đổi tab/rời màn, retry.
5. Booking kiểm tra cạnh tranh nhiều request cùng slot, duration overlap, expiry/webhook muộn/trùng, unauthorized access, đổi/hủy và reminder; lịch kiểm tra timezone/tháng nhuận; palm kiểm tra annotation bám ảnh và không tạo đường khi input sai.
6. Sau khi đủ bằng chứng mới mở paid flow. Production check tách riêng khỏi test mô phỏng.

Lệnh hiện có dùng khi triển khai (đợt nghiên cứu này chưa chạy): `cd web && npx tsc --noEmit` → exit 0; `cd web && npm run build -- --webpack` → exit 0; `cd web && npm run test:admin` → test pass. Bổ sung suite cho module mới cùng contract rồi chốt lệnh chính xác; không coi các suite hiện tại là coverage của ba module chưa có.

Dừng và báo kết quả thử nghiệm nếu: không tìm được nguồn lịch/giấy phép phù hợp; model không đủ khả năng nhận diện; cần thay semantics engine cũ; hoặc thu phí đòi thay đổi ledger mà chưa có migration và regression. Kết quả không đạt là kết luận nghiên cứu hợp lệ, không đổi thành “pass” bằng overlay hoặc mock.

## Kết quả của đợt nghiên cứu

Đã đối chiếu code và tài liệu kỹ thuật, chốt mô hình chuyên gia tuyển chọn, lập scope/luồng/UI/giới hạn/kiểm chứng. Chưa chạy benchmark nhận diện, chưa xác nhận provider ảnh, chưa tích hợp lịch mới, chưa triển khai hay deploy ba module.
