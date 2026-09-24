# Rà soát danh mục và giá mở khóa dịch vụ

Ngày rà soát: 2026-09-24. CodeGraph được đồng bộ trong checkout triển khai trước khi lần theo luồng `SERVICE_CATALOG` → cấu hình Admin → Pages AI → Worker Point. Kiểm tra tự động đối chiếu ID với các mảng chủ đề/trải bài thật trong web và dựng prompt thật của từng dịch vụ có phạm vi mở khóa.

| Bộ môn | Dịch vụ chi tiết | Cấu trúc Admin | Gói mở lâu dài |
| --- | ---: | --- | --- |
| Tử Vi | 45 | Bộ môn → chủ đề chức năng → luận giải | Toàn bộ bộ môn hoặc từng chủ đề; dự báo ngày/tuần/tháng mua riêng theo kỳ |
| Cung hoàng đạo | 21 | Bộ môn → chủ đề chức năng → luận giải | Toàn bộ bộ môn hoặc từng chủ đề; dự báo ngày/tuần/tháng mua riêng theo kỳ |
| Bát Tự | 4 | Bộ môn → luận giải → phần | Toàn bộ bộ môn hoặc nhóm luận giải |
| Thần số học | 6 | Bộ môn → luận giải → phần | Toàn bộ bộ môn hoặc nhóm luận giải; năm cá nhân mua riêng theo năm |
| Tarot | 7 | Tarot → Trải bài; các kiểu trải là biến thể trong trình sửa | Theo lượt trải |
| Kinh Dịch | 1 | Kinh Dịch → Luận giải quẻ | Theo lượt gieo quẻ |
| Tương hợp | 3 | Tương hợp → kiểu luận giải | Theo hồ sơ/cặp; không tạo gói nhiều phần |

Tổng cộng 87 ID dịch vụ: 72 theo hồ sơ, 7 theo kỳ và 8 theo lượt. Cây Admin có tối đa ba lớp, giữ nguyên ID, giá riêng, prompt bổ sung và chuỗi provider cũ. Ba nhãn dịch vụ Cung hoàng đạo sai với chức năng được sửa mà không đổi ID. Dịch vụ thêm thủ công vẫn hiển thị trong bộ môn của nó.

Giá gói chức năng được cấu hình riêng và mặc định tắt. Gói Tử Vi/Cung hoàng đạo/Bát Tự/Thần số học chỉ bao gồm các phần theo hồ sơ và được chào bán khi mọi phần cùng bộ môn đang hoạt động. Giá nâng cấp dùng `max(0, giá gói − floor(Point thực trả đủ điều kiện × tử số / mẫu số))`, mặc định 2/3. Chỉ khoản mua đã hoàn thành của cùng người dùng, cùng hồ sơ, nằm trọn trong gói đích và chưa dùng làm khấu trừ mới được tính. Ví dụ đã trả 90 Point cho một phần, gói 300 Point còn 240 Point. Nếu sau đó lên gói lớn hơn, khoản 90 Point không được khấu trừ lần hai; khoản thực trả 240 Point cho gói giữa có thể được xét.

Worker xác định phạm vi từ ngữ cảnh prompt được hệ thống dựng lại, kiểm tra lại bản cấu hình/phiên bản quyền sở hữu và giá trước khi trừ Point. Giao dịch chỉ cấp quyền sau khi AI trả kết quả; lỗi được hoàn Point, không cấp quyền. Lượt đọc thuộc gói đã sở hữu có giá 0 Point nhưng vẫn đi qua giới hạn gọi AI. Dự báo hết hạn theo ranh giới kỳ ở giờ Việt Nam. Các giao dịch cũ không có dấu vết hồ sơ không được suy diễn thành quyền sở hữu mới.

Đã kiểm chứng: 276 ca unit/integration, 79 prompt kết xuất thật, typecheck, production build, ESLint các file giao diện thay đổi. Kiểm tra trình duyệt Admin ở 1440px và 390px gồm tìm kiếm, giá gói, ví dụ 300−60=240, lưu/tải lại bản nháp và khôi phục bản nháp ban đầu. Kiểm tra hộp xác nhận Tử Vi ở 390px bằng quote mô phỏng xác nhận nhóm 240 Point và kiểm tra payload gửi AI. Kiểm tra tích hợp SQLite giữa Pages và Worker bao gồm báo giá, giao dịch, đọc phần cùng gói với 0 Point, retry, đồng thời, hoàn tiền và ranh giới kỳ. Chưa triển khai production hay áp dụng migration D1 production.
