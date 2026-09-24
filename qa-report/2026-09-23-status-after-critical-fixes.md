# AstroX — bảng mới sau khi xử lý 4 lỗi đỏ

> Cập nhật 24/09/2026: bản sửa đã lên production. Tài liệu này giữ bằng chứng của đợt trước triển khai; xem bảng mới tại [2026-09-24-production-status.md](2026-09-24-production-status.md).
Cập nhật ngày 23/09/2026. Bốn lỗi đỏ C1–C4 đã được sửa trong bản phát triển và kiểm thử. **Chưa triển khai lên website thật, chưa bật thu phí và chưa tạo giao dịch tiền thật.** Các mục còn lại kế thừa báo cáo đã kiểm chứng; đây không phải một đợt rà soát lại toàn bộ website.

✅ = đã sửa/đã có trong mã nguồn. 🟡 = còn việc cần làm. ⏳ = cần kiểm tra thực tế. 🔵 = tuỳ chọn phát triển.

| Mức | Vấn đề dễ hiểu | Trạng thái hiện tại | Hướng khuyến nghị |
|---|---|---|---|
| ✅ / ⏳ | Đăng nhập Zalo có thể bị giả mạo | Đã bỏ đường nhận danh tính tự khai từ trình duyệt. Chỉ cấp phiên sau khi máy chủ xác minh với Zalo. Kịch bản giả mạo bị chặn. | Kiểm tra đăng nhập Zalo thật trước mở bán. Nếu Zalo từ chối xác minh máy chủ, đăng nhập sẽ dừng an toàn; cần xử lý kết nối với Zalo, không bật lại đường cũ. |
| ✅ / ⏳ | Đã đăng nhập nhưng lượt AI trả phí không nhận ra tài khoản | Đã nối phiên đăng nhập bằng vé chỉ dành cho AI, hết hạn sau 5 phút. Kiểm thử trình duyệt xác nhận trừ đúng tài khoản. | Sau triển khai, thử một lượt trả phí và kiểm tra lịch sử/số dư bằng tài khoản thật. |
| ✅ | Gọi AI liên tục làm tăng chi phí | Đã giới hạn cả đường AI có cấu hình và đường dự phòng; vượt giới hạn trả thông báo chờ. | Mặc định 6 yêu cầu/phút, 60/ngày cho mỗi IP và 2.000/ngày toàn hệ thống. Theo dõi để điều chỉnh theo lượng khách; người dùng chung Wi-Fi dùng chung hạn mức IP. |
| ✅ / ⏳ | Luận giải lỗi, gửi lại bị trừ thêm hoặc không hoàn Point | Đã lưu mã lượt, chống trừ lặp, lưu kết quả để trả lại; chỉ báo đã hoàn khi có xác nhận. Có tác vụ tự kiểm tra và hoàn lượt bị gián đoạn. Bài cũ không bị ẩn do lỗi cấu hình. | Triển khai kèm bảng dữ liệu và lịch kiểm tra 5 phút; xác nhận tác vụ chạy và thử lỗi có kiểm soát trước thu phí. |
| ✅ | Trang chủ có bài Tarot nhưng nhật ký trống | Giữ nguyên bản sửa: dùng cùng danh sách, lưu bài mới và phục hồi bài cũ còn trong bộ nhớ. | Kiểm tra lại bằng dữ liệu trên thiết bị từng báo lỗi sau khi cập nhật. |
| ✅ | Tương hợp bị hỏng giao diện, cần hỗ trợ LGBTQ+ | Giữ bản giao diện hai khung đầu tiên. Đã kiểm tra Nam–Nam, Nữ–Nữ, Nam–Nữ, Nữ–Nam; hướng dẫn AI không phân biệt cùng giới. | Dùng thử kết quả AI thật để đánh giá cách diễn đạt; các thử nghiệm giao diện dùng phản hồi giả lập. |
| ✅ / 🟡 | Điều khoản, miễn trừ, bảo mật, hoàn tiền và hỗ trợ | Đã thấy 3 văn bản tại `/dieukhoan`; có mục hoàn Point/hoàn tiền và email liên hệ. Không còn ghi “chưa có chính sách”. | Kiểm tra người dùng tìm được nội dung trước thanh toán, bổ sung thời gian phản hồi/xử lý cụ thể. Chưa thẩm định tính đầy đủ pháp lý. |
| 🟡 Cao | Đổi điện thoại có thể không thấy hồ sơ/bài cũ | Chưa sửa trong đợt này. Luồng đồng bộ Zalo và Supabase còn khác nhau. | Ưu tiên tiếp theo: đồng bộ theo tài khoản, mở máy mới phải tải bài cũ về trước khi ghi dữ liệu mới. |
| 🟡 Cao | Giá dịch vụ chưa rõ ở mọi nơi | Chưa sửa trong đợt này. | Hiện số Point ngay trước nút luận giải; cho xem bảng giá khi chưa đăng nhập. |
| 🟡 Cao | Số dư và thông báo hủy nạp chưa đồng nhất | Chưa sửa trong đợt này; chưa chứng minh mọi trường hợp đều hiện nhầm số dư giữa tài khoản. | Dùng chung nguồn số dư, xóa trạng thái khi đăng xuất, báo rõ nạp thành công/hủy/thất bại. |
| 🟡 Vừa | Trang chủ có tài nguyên nặng | Chưa tối ưu trong đợt này; chưa có số đo tốc độ 4G mới. | Giảm tải video, tải thư viện lập lá số khi cần; đo trước và sau. |
| 🟡 Vừa | Nội dung cho Google và theo dõi lỗi còn thiếu | Chưa xử lý trong đợt này. | Bổ sung nội dung hiển thị sẵn, sitemap/robots và theo dõi lỗi/giao dịch. |
| 🟡 Vừa | Các lỗi kiểm tra mã nguồn còn tồn đọng | Các file frontend sửa trong đợt này đã qua lint. Không tuyên bố toàn dự án hết lỗi lint. | Dọn các lỗi React có ảnh hưởng hành vi trước, sau đó phần còn lại. |
| 🔵 Tuỳ chọn | Điểm danh, giới thiệu và quảng cáo | Chưa xác nhận cấu hình live; tắt tính năng không tự nó là lỗi. | Chỉ bật khi cơ chế tài khoản, thanh toán và đối soát đã chạy ổn. |
| ⏳ Trước mở bán | Xác nhận bản sửa trên website thật | Chưa triển khai hoặc thử Zalo/PayOS/provider thật trong đợt này. | Triển khai có kiểm soát, kiểm tra đăng nhập → nạp → luận giải → hoàn Point và xác nhận đúng bản đang chạy. |

**Thứ tự tiếp theo:** triển khai/kiểm chứng bốn bản sửa → đồng bộ dữ liệu theo tài khoản → thống nhất giá/số dư/thông báo → tối ưu tốc độ và đo lường.

Chi tiết kiểm thử và lưu ý triển khai: [critical-fixes/verification.md](critical-fixes/verification.md).
