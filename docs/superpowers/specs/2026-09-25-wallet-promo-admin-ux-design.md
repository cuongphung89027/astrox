# AstroX Point, promo và khả năng tìm kiếm Admin

Ngày: 2026-09-25. Chủ sở hữu: Codex. Nhánh: `codex/wallet-promo-admin-ux`. Base: `d89284e06d7040c5122b6d3404342a7005dbf2a7` (`origin/main`). Phạm vi dự kiến: `web/src/lib/{api,auth,points}.ts*`, thành phần Ví/Topup và nút dịch vụ có phí, `web/src/components/admin`, cấu hình Admin, backend thanh toán và các kiểm thử liên quan. Các file hợp đồng chung do chủ tích hợp của tác vụ này sửa trong worktree riêng.

## Mục tiêu và hành vi

1. Đăng nhập chỉ tải `/api/me` một lần; phản hồi khởi tạo cả tài khoản lẫn số dư. Tải quyền module chạy độc lập để số dư không phải chờ. Ví, chip và menu đọc cùng một store. Số dư có trạng thái tải/lỗi rõ ràng và nút thử lại.
2. Sau thao tác nhận, tiêu, nạp hoặc điều chỉnh Point do chính phiên hiện tại thực hiện, store cập nhật từ phản hồi đáng tin cậy hoặc tải lại ngay. Khi PayOS quay về, kiểm tra trạng thái đơn và refresh đến khi đơn được ghi nhận hoặc hết thời hạn chờ; không cộng lạc quan trước webhook. Khi tab hiển thị, kiểm tra lại lúc quay về và định kỳ 15 giây để nhận thay đổi từ Admin hoặc phiên khác. Không tạo nhiều request đồng thời, không giữ số dư tài khoản trước sau khi đổi tài khoản.
3. Admin tạo promo với mã, trạng thái, loại `topup_bonus` hoặc `direct_points`, số Point nguyên dương, số tiền nạp tối thiểu cho loại nạp, tổng lượt dùng, lượt mỗi người và ngày giờ hết hạn. Ngày giờ nhập bằng bộ chọn theo giờ Việt Nam, lưu ISO UTC; trường rỗng nghĩa là không hết hạn. Dữ liệu promo cũ mặc định là `topup_bonus`, mức nạp tối thiểu 0. Công bố cấu hình phải từ chối mã trùng, giá trị sai và ngày hết hạn sai.
4. Promo thưởng khi nạp được kiểm tra với gói đã chọn. Trả về số Point thưởng và thông báo cụ thể: áp dụng thành công, chưa đủ mức nạp, chưa đến hạn (nếu có), hết hạn, hết tổng lượt, hết lượt mỗi người, đã tắt, hoặc mã không tồn tại. Bước tạo đơn kiểm tra lại và giữ chỗ lượt dùng theo snapshot để tránh vượt giới hạn. Promo cộng thẳng Point có luồng đổi mã riêng sau đăng nhập; backend ghi ledger và cộng ví trong cùng giao dịch có khóa chống cộng trùng; trả trạng thái đã dùng/hết lượt rõ ràng. Mã loại này không được đưa vào đơn nạp. Mọi thay đổi số dư chỉ được quyết định ở backend.
5. Admin có ô tìm kiếm trong vùng điều hướng, lọc tên nhóm/trang/cài đặt theo từ khóa không dấu; kết quả dẫn tới đúng trang và giữ quyền hiện có. Các bảng đang có search riêng tiếp tục hoạt động.
6. Mọi nút bắt đầu hành động có phí hiển thị số Point phải trả trước khi mở popup xác nhận. Giá hiển thị lấy từ cùng báo giá backend dùng khi xác nhận, gồm quyền đã mua và phần khấu trừ nâng cấp. Khi báo giá chưa sẵn sàng, nút hiển thị trạng thái tải giá và không đưa ra con số đoán; nếu giá đổi, popup và nút cùng cập nhật trước khi thu.

## Cấu trúc và kiểm chứng

- Store Point làm đầu mối cho tất cả nơi hiển thị và tất cả sự kiện biến động. Backend trả lỗi promo có mã ổn định cùng dữ liệu ngưỡng nạp khi cần; giao diện dịch từng mã sang tiếng Việt.
- Promo cấu hình mới đi qua cùng luồng draft, publish, revision và runtime settings hiện có. Các đơn đã tạo giữ snapshot bất biến; sửa promo về sau không đổi Point của đơn cũ.
- Kiểm thử trọng tâm: một lần tải `/api/me` khi đăng nhập; refresh sau nạp/tiêu/điều chỉnh và đổi tài khoản; kiểm tra promo đúng/sai ngưỡng, hết hạn, hết lượt và cạnh tranh đồng thời; direct credit đúng một lần; ô tìm Admin; giá trên nút khớp popup và báo giá backend. Chạy typecheck, lint/build, test liên quan, `git diff --check`, rồi `codegraph sync` trước handoff.
- Kiểm chứng production chỉ thực hiện trong quy trình release riêng sau khi merge, migration, Worker và Pages cùng SHA; cần thử route, API và phiên đăng nhập thật.
