# AstroX — bảng xử lý sau khi lên production

Cập nhật 24/09/2026. **Đã triển khai lên https://theastrox.space**, cả website và API xác nhận bản `2026-09-24-rewards-1`. Bốn lỗi đỏ đã lên trước, sau đó triển khai các hạng mục vàng. Giữ nguyên cấu hình 77 dịch vụ miễn phí; không tạo giao dịch tiền thật.

✅ Đã sửa và triển khai. ⏳ Cần kiểm chứng vận hành thực tế. 🔵 Tuỳ chọn, chưa bật thêm.

| Vấn đề | Hiện tại | Việc cần theo dõi / khuyến nghị |
|---|---|---|
| Đăng nhập Zalo có đường giả mạo | ✅ Bỏ đường nhận danh tính tự khai, xác minh trên máy chủ. Đường cũ trả 410 trên prod. | ⏳ Thử đăng nhập thật bằng tài khoản Zalo của người dùng trước mở bán. |
| AI không nhận phiên đăng nhập | ✅ Có vé chỉ dành cho AI, hết hạn 5 phút. Khách không có phiên nhận 401 trên prod. | ⏳ Kiểm chứng một lượt trả phí thật sau khi chủ sản phẩm chủ động bật thu phí. |
| Gọi AI liên tục làm tăng chi phí | ✅ Giới hạn chung bằng dữ liệu máy chủ: 6 lượt/IP/phút, 60/ngày, 2.000/ngày toàn hệ thống. | Theo dõi để điều chỉnh; người dùng chung Wi-Fi dùng chung hạn mức IP. |
| Trừ Point lặp / không hoàn khi lỗi | ✅ Chống trừ lặp, lưu kết quả, hoàn Point có đối soát. Đã cấu hình lịch kiểm tra mỗi 5 phút trên Worker. | ⏳ Đối soát chu trình PayOS/AI thật trước mở bán; chưa khẳng định đã chạy thử giao dịch tiền thật hay quan sát một lần cron live. |
| Trang chủ và nhật ký Tarot lệch nhau | ✅ Dùng chung danh sách, khôi phục bài cũ còn trên thiết bị. Kiểm thử đọc/xóa/số lượng đã qua. | Mở lại đúng thiết bị từng có bài cũ, đăng nhập và chờ báo đã đồng bộ. Dữ liệu đã bị xoá khỏi mọi thiết bị từ trước không tự khôi phục được. |
| Giao diện Tương hợp và LGBTQ+ | ✅ Giữ giao diện đã phục hồi; kiểm thử Nam–Nam, Nữ–Nữ, Nam–Nữ, Nữ–Nam đều qua. | ⏳ Đánh giá cách diễn đạt của kết quả AI thật; QA giao diện sử dụng phản hồi giả lập. |
| Đổi điện thoại bị mất hồ sơ/bài cũ | ✅ Đồng bộ theo tài khoản Zalo/Supabase, luôn tải dữ liệu trước khi ghi. Hợp nhất bài đọc, chặn ghi đè từ phiên bản cũ, giữ bản trên máy khi mất mạng. | Chỉ đổi máy sau khi thiết bị cũ báo **Đã đồng bộ với tài khoản**. Luồng máy mới đã qua kiểm thử trình duyệt với API giả lập; endpoint prod đã kiểm tra chặn khách chưa đăng nhập. |
| Giá chưa rõ | ✅ Có [bảng giá công khai](https://theastrox.space/banggia). Lượt trả phí yêu cầu xác nhận số Point; hủy không gọi AI, giá thay đổi phải xác nhận lại. | 77 dịch vụ hiện vẫn miễn phí theo cấu hình đã xuất bản. |
| Số dư / hủy nạp không đồng nhất | ✅ Các màn hình dùng chung số dư theo tài khoản. Phản hồi của tài khoản cũ không được hiển thị ở tài khoản mới. Có thông báo hủy nạp và chờ xác nhận thanh toán. | ⏳ Kiểm chứng đầy đủ PayOS thật trước thu tiền; thông báo quay về từ thanh toán không được coi là bằng chứng đã cộng Point. |
| Điều khoản / hỗ trợ | ✅ Link dễ tìm trước thanh toán. Đã thêm cam kết **phản hồi ban đầu trong 2 ngày làm việc**, đúng xác nhận của chủ sản phẩm; phiên bản 1.2 ngày 24/09/2026. | Thời gian hoàn tất hoàn tiền phụ thuộc xác minh và phương thức thanh toán. Đây không phải kết luận thẩm định pháp lý toàn bộ văn bản. |
| Trang chủ nặng | ✅ Thư viện lập lá số chỉ tải khi có hồ sơ. JavaScript trong các thẻ script ban đầu giảm từ 432.145 xuống 284.734 byte khi nén gzip — khoảng **34%**. | ⏳ Đo LCP/INP trên thiết bị và mạng thực. Hero video cũ hiện không được trang chủ sử dụng, nên không ghi nhận việc sửa video là thành tích tối ưu. |
| Nội dung cho Google | ✅ Có HTML nội dung sẵn, sitemap, robots; trang hồ sơ đặt noindex. Đã kiểm tra trên tên miền thật. | Google tự quyết định thời gian lập chỉ mục; chưa khẳng định đã tăng thứ hạng. |
| Theo dõi lỗi | ✅ Có mục **Lỗi giao diện** trong Admin và bộ đếm lỗi theo trang/loại, giữ tối đa khoảng 30 ngày. Không thu câu hỏi, nội dung luận giải, email hay stack trace. | Bộ đếm là số báo lỗi, không phải số người bị ảnh hưởng; chưa có cảnh báo tự động qua email/Slack. Giới hạn báo lỗi dùng mã IP HMAC thay đổi theo ngày, không lưu IP thô trong bảng này. |
| Lỗi kiểm tra mã | ✅ Sửa lỗi Hook, ref và reset trạng thái. Lint toàn frontend: **0 lỗi, 28 cảnh báo**. Build và **179 kiểm thử** qua. | Cảnh báo còn lại chủ yếu ảnh và mã chưa dùng; tiếp tục dọn khi tối ưu sâu, không gọi là đã sạch toàn bộ cảnh báo. |
| Điểm danh | ✅ Đã bật: 2 Point/ngày, thưởng mốc 3/7/10 ngày. Chống cộng trùng, hiện tiến độ và lịch sử. | ⏳ Kiểm chứng một lượt bằng tài khoản Zalo thật. |
| Giới thiệu | ✅ Đã bật: đăng ký mới qua link nhận 5 Point mỗi bên; người mời nhận 10 Point khi bạn bè nạp lần đầu. Giữ mã đầu tiên 7 ngày, không gắn người mời hồi tố. | ⏳ Kiểm chứng đăng ký/nạp thật; backend đã thử OAuth và PayOS giả lập, khôi phục lỗi và chống phát thưởng lặp. |
| Quảng cáo nhận Point | ⏳ Đã nối giao diện và backend; **chưa bật phân phối quảng cáo thật**. Có đồng ý xem, phiên, hạn mức và chống cộng trùng. | Cần network code/ad unit Google Ad Manager thật, kiểm tra inventory và yêu cầu consent. Google rewarded web không có SSV; tín hiệu cấp thưởng do trình duyệt báo. Xem [hướng dẫn](rewards/verification.md). |

## Bằng chứng và phạm vi

- Bản rewards: `0d8806a`, sửa tương thích CSP/Cloudflare `85d6965`. Bản vàng trước đó: `0ee6f9a`; bản lỗi đỏ: `4fc90af`.
- Worker: `cfb8355e-9219-4478-9d7e-71ce2a573484`.
- Pages: https://582f8407.theastrox-a3l.pages.dev ; tên miền chính đã trả đúng release mới.
- Đã sao lưu D1 và chạy hai migration bổ sung `user-sync.sql`, `client-errors.sql`; không xoá dữ liệu hiện có.
- Kiểm thử trình duyệt production: bảng giá tải từ cấu hình thật, không bị hộp đăng nhập che; điều khoản 2 ngày làm việc hiện đúng; mobile 390px không tràn ngang; endpoint dữ liệu riêng/AI chặn khách, đường đăng nhập cũ bị tắt; không có lỗi JavaScript trong các lượt kiểm tra này.
- Luồng đồng bộ nhiều thiết bị, đổi tài khoản, xác nhận giá, hủy thanh toán và các ghép giới tính đã được kiểm thử với API giả lập. Kiểm thử backend dùng mã xử lý thật với SQLite. Không thay thế một lượt Zalo/PayOS/provider thật.
- Rewards: migration `reward-events.sql` bổ sung sau backup; cấu hình xuất bản 2, bản nháp 3. Chỉ thay `rewards.enabled`; toàn bộ nội dung khác trong bản xuất bản và bản nháp được đối chiếu giữ nguyên.
- Prod đã kiểm tra các endpoint thưởng chặn khách 401, không có yêu cầu Google ads trước đồng ý, không có lỗi CSP/JavaScript trong các trang kiểm tra.
- Chi tiết: [rewards/verification.md](rewards/verification.md), [yellow-items/verification.md](yellow-items/verification.md).
