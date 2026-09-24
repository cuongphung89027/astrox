# Phương án AstroX

| Tài liệu | Trạng thái | Bước tiếp theo |
|---|---|---|
| [001 — Admin dashboard mới](001-admin-dashboard-proposal.md) | Đề xuất sau khảo sát; chưa triển khai | Review hướng thiết kế và bổ sung source admin/backend để chốt contract |
| [005 — Chỉ tay, chuyên gia và lịch âm](005-palm-experts-lunar-research.md) | Nghiên cứu; chưa triển khai | Lịch Việt độc lập, thử nghiệm nhận diện chỉ tay, booking chuyên gia tuyển chọn |

Phương án dựa trên working tree ngày 2026-09-22, không chỉ HEAD `ed70b6e`. Không dùng tài liệu này như bằng chứng backend đã tồn tại hoặc các gate kiểm thử đã pass.

## Cập nhật nghiên cứu 24/09/2026

- [003 — Nâng cấp Admin: thống kê sử dụng, vận hành và motion](003-admin-upgrade-research.md): khảo sát trên `568b0e2`, chưa triển khai. Tài liệu 001 giữ làm lịch sử; một số giả định về việc thiếu backend đã cũ. Ưu tiên lựa chọn phạm vi theo báo cáo 003.
- [004 — Luận giải tiếng Việt, Kinh Dịch nhiều phương pháp và cặp đôi](004-readings-kinhdich-couples-research.md): khảo sát source và thử hàm tính với dữ liệu giả lập trên working tree `568b0e2`; có đối chiếu tài liệu phương pháp. Chưa sửa source hoặc kiểm chứng production. Khuyến nghị xử lý chất lượng đầu ra và tính toán nền trước, rồi mở cách lập quẻ và cặp đôi.
