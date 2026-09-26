# Chỉ tay — nghiệm thu thiết bị thật cho bản redesign

Ngày: 26/09/2026. Nhánh: `codex/palm-redesign`, base `e0c982e`, HEAD tài liệu `12c4f2a`; phần triển khai đang là thay đổi chưa commit. Tài liệu này không thay thế ma trận của đợt palm-upgrade cũ.

## Phần chưa thể chứng minh bằng giả lập

Các tình huống bên dưới cần phần cứng thật. Browser QA với nguồn video/track giả kiểm tra logic và giao diện, không chứng minh máy chọn đúng lens quang học, bật đèn hay lấy nét thật. Không chạy AI trả phí hoặc đưa ảnh cá nhân vào Git trong phiên kiểm tra này.

| Thiết bị | Camera chính/wide | Chọn lens + ghi nhớ | Đèn nếu hỗ trợ | Chạm lấy nét nếu hỗ trợ | Hướng ảnh | Tự chụp + chụp tay | Đóng/rời trang tắt camera |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OPPO Find X9 Ultra | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| iPhone / Safari | Chưa thử | Theo camera trình duyệt cung cấp | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| Android nhiều camera | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |

## Quy trình nghiệm thu thủ công

1. Mở `/chitay` bằng HTTPS trên điện thoại. Xác nhận hình xem trước xuất hiện dù mô hình nhận diện còn tải. Camera chỉ được mở sau thao tác của người dùng.
2. So với camera hệ thống ở mức 1×; xác nhận không mở tele. Nếu nhãn/capabilities không phân biệt được, chọn camera thủ công trong danh sách và kiểm tra lựa chọn được ghi nhớ.
3. Thử đổi camera liên tiếp, camera đích thất bại và thoát giữa khi mở. Không được để track cũ chạy nền hoặc tự mở lại sau khi thoát.
4. Với thiết bị báo hỗ trợ, bật/tắt đèn và chạm lấy nét. Giao diện không được báo thành công nếu phần cứng không xác nhận/không hỗ trợ. Điều khiển lỗi hoặc chờ quá lâu phải cho thao tác lại.
5. Chặn mạng hoặc làm chậm tải mô hình: chụp thủ công vẫn dùng được khi đã có hình; thông báo lỗi/retry rõ ràng. Chuyển tab/rời trang phải dừng tác vụ phù hợp.
6. Chụp dọc/ngang, thử ảnh JPEG có hướng EXIF; ảnh kiểm tra và ảnh gửi phân tích phải cùng hướng và hình học. Chọn lại/xóa ảnh khi xử lý chưa xong không được làm ảnh cũ hiện lại.
7. Đồng ý gửi ảnh rồi mới phân tích. Việc mở camera, chọn ảnh hoặc xem trước không được tự gửi ảnh tới AI.
8. Kết quả hiện tại giữ nguyên ảnh, không vẽ đường chỉ tay chưa xác thực. Đừng đánh dấu đây là lỗi mất overlay: đây là giới hạn có chủ đích cho đến khi có bộ ảnh hợp lệ, đánh dấu nếp thật và kiểm chứng độ chính xác.

## Giới hạn overlay

Không có dataset tối thiểu 20 ảnh có quyền sử dụng và nhãn nếp tay để chứng minh ngưỡng sai lệch trong đặc tả. Vì vậy overlay mặc định vẫn tắt; không có tuyên bố về độ chính xác nhận diện nếp tay hoặc phân tích AI trực tiếp. Xem `docs/superpowers/specs/2026-09-26-palm-redesign-research.md`.
