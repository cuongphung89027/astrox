# Nâng cấp luận giải, Kinh Dịch và cặp đôi

Ngày kiểm tra: 24/09/2026. Baseline: `37e48ab`. Nhánh: `codex/readings-kinhdich-couples`.

## Đã triển khai trong worktree

- Chính sách tiếng Việt dùng chung cho Chat Completions, Responses, Anthropic và đường gọi legacy. Phát hiện chữ Hán trong văn bản hoặc chuỗi JSON, sửa tối đa một lần trong cùng hạn mức/thời gian/lượt thanh toán. Chỉ gửi các đoạn chữ Hán sang bước dịch; giữ cấu trúc JSON và các giá trị số gốc. Thuật ngữ đã biết dùng từ điển cố định. Nếu sửa không hợp lệ, không trả kết quả như thành công; luồng trả phí hoàn điểm theo operation ban đầu. Giữ cơ chế từ chối của nhà cung cấp.
- Admin có số liệu phát hiện/sửa/chặn, số lần sửa, thời gian và chi phí sửa khi có đơn giá. Dữ liệu cũ chưa đo không bị báo như đã đạt.
- Hiển thị bài cũ bằng bản dịch từ điển khi đủ thuật ngữ; giữ nguyên bản lưu trong phần mở rộng. Không xóa bài đã mua. Lưu phiên bản chính sách trong metadata.
- Kinh Dịch: 3 xu gieo 6 lần hoặc nhập kết quả xu thật; Mai Hoa theo 3 số; Mai Hoa theo thời gian; số serial tiền; số điện thoại; dãy số tùy chọn. Sáu hào có thể có 0–6 hào động. Tên 64 quẻ cố định, Thể là quái tĩnh ở phép Mai Hoa. Mỗi lịch sử có snapshot, phiên bản và ID; quẻ cũ giữ quy tắc và khóa cache cũ. Không lưu/gửi số điện thoại nguyên dạng trong snapshot/AI DTO.
- Cặp đôi Tử Vi và Bát Tự: lập hai lá số bằng bộ tính hiện có trước khi gọi AI, đưa dữ kiện đối chiếu vào prompt; không tạo phần trăm tương hợp. Hỗ trợ cặp cùng giới, thiếu giờ sinh thì yêu cầu bổ sung. Giữ dữ liệu khi đổi phương pháp. Hai service và template mới có trong cấu hình Admin; override vẫn giữ hướng dẫn tôn trọng mọi cặp đôi. Bài cặp đôi từ phiên bản cũ có mục mở lại, không gọi AI.
- Giữ nguyên `original-prompts.ts`. Các template mới bổ sung riêng. Cấu hình đã lưu tự bổ sung hai dịch vụ cặp đôi theo giá/trạng thái của dịch vụ cũ nếu chưa có override.

## Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Admin/runtime, ngôn ngữ, cặp đôi, lịch sử/cache, race và Kinh Dịch | 176 test PASS |
| Backend, user-data, thanh toán/an toàn và rewards | 76 test PASS |
| Tổng test Node | **252 PASS, 0 FAIL** |
| Prompt roundtrip | **79** prompt đầy đủ; kiểm tra giữ bài cố định đã mua và Tarot PASS |
| TypeScript `npx tsc --noEmit` | PASS |
| ESLint | 0 lỗi; 26 cảnh báo tồn tại trong codebase |
| `npm run build -- --webpack` | PASS, 19 route static |
| Pages Functions bundle | PASS |
| Backend Worker `wrangler deploy --dry-run` | PASS, không deploy |
| Chromium 390×900 và 1440×900 | **22 checkpoint PASS**, không lỗi page/overflow ngang |

Test Kinh Dịch duyệt 4.096 tổ hợp giá trị sáu hào, ma trận độc lập của 64 quẻ, chuẩn hóa số, thời điểm đổi ngày/giờ, tháng nhuận, lịch sử cũ và snapshot lỗi. Cặp đôi có fixture hai bộ tính, cùng giới và cache khi đổi dữ liệu. Kiểm thử runtime/integration dùng response giả lập để kiểm tra contract và accounting.

Browser: `web/scripts/readings-upgrade-qa.mjs`. Tính lá số thật ở local; các API auth/cấu hình/AI được mock. Có 4 lời gọi AI giả lập, không gọi model thật và không thanh toán thật. Kết quả máy đọc: [report.json](report.json). Ảnh mobile/desktop nằm cùng thư mục. Ảnh chụp toàn trang khi đang cuộn có thể đặt thanh điều hướng cố định giữa ảnh; đó là vị trí viewport lúc chụp.

## Giới hạn và điều kiện phát hành

- Chưa triển khai production, chưa kiểm chứng chất lượng dịch/luận giải với model thật. Kiểm tra không còn ký tự Hán và giữ cấu trúc không chứng minh mọi thuật ngữ lạ đã được dịch đúng nghĩa.
- Số serial/điện thoại/dãy số dùng quy ước sản phẩm công khai (tách đôi, tổng chữ số, modulo); không trình bày như một công thức cổ truyền duy nhất.
- Mai Hoa thời gian dùng giờ dân sự Việt Nam UTC+7, nhưng âm lịch của thư viện hiện tại theo chuẩn Trung Quốc UTC+8. UI và metadata công khai điều này; không khẳng định là lịch âm Việt Nam.
- Cặp đôi nhận ngày dương lịch 1900–2100 và can giờ. Bát Tự hiện hỗ trợ 5 thành phố Việt Nam, lấy giữa can giờ và hiệu chỉnh kinh độ; không hỗ trợ mọi nơi sinh hoặc giờ sinh chính xác tới phút.
- Khi phát hành cần đưa cả frontend/Pages Functions và backend Worker lên cùng đợt, kiểm tra cấu hình/giá hai service mới, rồi thử model thật và một lượt thanh toán/hoàn điểm có kiểm soát. Không có thao tác phát hành nào trong đợt này.
