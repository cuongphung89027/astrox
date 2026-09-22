# AstroX Point — mở khóa và lưu kết quả

## Quy tắc đã được người dùng xác nhận

- Point được nạp bằng tiền và dùng để mở khóa dịch vụ.
- Nội dung cố định theo hồ sơ: thanh toán một lần, lưu kết quả, xem lại không trừ Point và không gọi AI lại.
- Tarot và Kinh Dịch: mỗi lượt mới là một giao dịch riêng. Xem lại cùng lượt không trừ thêm.
- Giá từng dịch vụ chưa được chốt. Không tự đặt giá hoặc bật thu tiền trước khi có cấu hình được duyệt.

## Nhận diện nội dung

- Nội dung cố định: account ID + loại dịch vụ + ID chủ đề + phiên bản dữ liệu hồ sơ có liên quan. Không dùng tên hiển thị hoặc phiên bản prompt để tự động vô hiệu hóa quyền đã mua.
- Tarot/Kinh Dịch: account ID + session UUID tạo một lần khi bắt đầu lượt; lưu dữ liệu rút/gieo và câu hỏi. Retry, refresh, mở lại dùng cùng session UUID.
- Đổi câu hỏi hoặc rút/gieo lại tạo lượt mới, hiển thị giá trước khi xác nhận.
- Vận trình: đề xuất khóa theo kỳ ngày/tuần/tháng thực tế; chờ người dùng xác nhận chính sách này.

## Giao dịch phía server

1. Xác thực tài khoản, đọc giá từ catalog server. Không nhận số dư, giá hoặc quyền đã mua từ client.
2. Tìm kết quả đã hoàn tất theo khóa nội dung/lượt. Có kết quả thì trả ngay, không gọi AI hoặc trừ tiền.
3. Tạo yêu cầu idempotent và giữ chỗ Point bằng transaction; khóa duy nhất ngăn thanh toán trùng và kiểm tra số dư nguyên tử ngăn âm ví.
4. Sinh AI một lần cho yêu cầu đang xử lý, lưu nội dung kết quả và đầu vào cùng giao dịch mở khóa.
5. Hoàn tất thu Point khi kết quả đã lưu; lỗi phải hoàn giữ chỗ. Có tiến trình đối soát yêu cầu treo và timeout; client retry phải nhận lại cùng yêu cầu.
6. Lịch sử gồm số Point, dịch vụ/lượt, thời gian, trạng thái, kết quả. Mỗi lần nạp và chi đều có bản ghi ledger.

## Trải nghiệm

- Trước mở khóa: giá Point, số dư, nút xác nhận; thiếu điểm mở luồng nạp đang có.
- Chưa đăng nhập: đăng nhập Zalo trước khi mua.
- Đã mở: nút Xem lại thay cho Tạo lại. Không thu lại do nâng phiên bản prompt hay hết hạn cache.
- Lượt đã lưu truy cập được từ lịch sử, gồm trải/gieo bài và kết quả; không chỉ giữ văn bản trong localStorage.

## Hiện trạng và phần cần nối

- Frontend đã có API số dư /api/me và topup PayOS trên api.theastrox.space.
- Repo này không chứa backend ví/PayOS; cần xác định repo backend để mở khóa dùng chung ví thật.
- functions/api/module-access.js là quyền cấp thủ công theo Supabase, không phải chứng từ mở khóa Zalo.
- Cache hiện tại nằm trong dữ liệu client và không thể làm bằng chứng thanh toán.
- Endpoint AI hiện chưa có lớp thanh toán; phải bảo vệ cùng luồng mở khóa phía server trước khi bật thu Point.

## Kiểm tra bắt buộc trước bật thu tiền

- Bấm hai lần, hai tab, retry timeout: chỉ trừ một lần.
- Hai giao dịch đồng thời không được làm số dư âm.
- AI lỗi/ghi kết quả lỗi không làm mất Point; tiến trình chết có đối soát.
- Xem lại trên thiết bị khác trả đúng kết quả cũ, không gọi AI.
- Lượt Tarot/Kinh Dịch mới có ID riêng kể cả rút trùng lá/quẻ.
- Không đọc được kết quả hoặc ví của tài khoản khác; sửa localStorage không mở khóa được.
