# Nâng cấp AstroX Admin — kết quả nghiên cứu

Ngày 2026-09-24 · Nền code `568b0e2` · Trạng thái: **đề xuất để lựa chọn phạm vi**, chưa triển khai, không deploy.

## 1. Kết luận

Nên nâng cấp Admin đang có, giữ cấu hình, kho prompt gốc, phân quyền, audit và luồng xuất bản. Trọng tâm mới là biết người dùng sử dụng gì, kết quả có đến được với họ không, và vấn đề nào cần xử lý hôm nay. Không xây lại các chức năng ví, audit hay thống kê AI vốn đã tồn tại.

Đã khảo sát source Admin, API thống kê, các sự kiện AI/thưởng và giao diện theo mã. Trình duyệt local dừng ở màn đăng nhập Admin; chưa đánh giá trực quan màn dashboard sau đăng nhập. Không đọc dữ liệu người dùng production; không kiểm chứng mức độ đầy đủ của dữ liệu lịch sử. Kiểm chứng hàm thống kê bằng một bản ghi giả trong bộ nhớ, không ghi database.

Tài liệu 001 ngày 22/09 là lịch sử khảo sát: giả định chưa có backend trong repo đã cũ. Báo cáo này căn cứ source hiện tại, không kế thừa các kết luận chưa triển khai của tài liệu cũ.

## 2. Những gì đã có

- Tổng quan trạng thái cấu hình và số provider/dịch vụ/gói nạp/mốc thưởng: `web/src/components/admin/AdminDashboard.tsx:668`.
- AI: bộ lọc ngày/provider/model/service; lượt gọi, lỗi, thời gian, token, chi phí ước tính khi đủ dữ liệu: `web/src/components/admin/AiMetrics.tsx:17`, `services/admin/metrics.ts:23`.
- Người dùng, ví, giao dịch, thưởng, chẩn đoán đăng nhập, lỗi giao diện, audit và khôi phục phiên bản: navigation tại `web/src/components/admin/AdminDashboard.tsx:59`.
- Bảng có tìm/lọc/sắp xếp/CSV **trong dữ liệu đã tải**, không phải toàn database: `web/src/components/admin/AdminDataTable.tsx:44`.
- CSS đã có trạng thái hover/focus, breakpoint và giảm chuyển động; chưa có hệ thống chuyển cảnh/biểu đồ thống nhất: `web/src/components/admin/AdminDashboard.module.css:18`, `:1295`.

## 3. Các vấn đề đã xác minh

| Ưu tiên | Vấn đề | Ảnh hưởng | Công sức / rủi ro | Bằng chứng |
|---|---|---|---|---|
| P0 | Trả lại kết quả thành công bị đếm là lỗi | Tỷ lệ lỗi AI có thể cao giả | Nhỏ / thấp | `services/admin/integration-api.mjs:81` đặt `replayed`; `services/admin/metrics.ts:33` và `:36` coi mọi trạng thái khác `success` là lỗi |
| P1 | Lấy 5.000 request mới nhất trước khi áp dụng bộ lọc | Dịch vụ ít dùng có thể mất khỏi mẫu; không được hiểu là tổng toàn kỳ | Vừa–lớn / vừa | `services/admin/server.mjs:77`; lọc tại `services/admin/metrics.ts:30` |
| P1 | Chưa đo hành trình sử dụng tính năng nói chung | Không biết xem trang, dùng bộ tính, đọc lại cache, bỏ dở; không tính được tỷ lệ quay lại toàn sản phẩm | Lớn / vừa | `RuntimeReporting.tsx:6` chỉ báo lỗi; `AiMetrics.tsx:132` nêu giới hạn gateway/cache; `migrations/admin.sql:8` không có user/session |
| P2 | Dữ liệu quản lý trả tối đa 200 dòng | Tìm/CSV không bao phủ giao dịch và người dùng cũ | Vừa / vừa | `services/backend/handler.mjs:69`; `services/admin/server.mjs:101`; `AdminDataTable.tsx:44` |

Mức tin cậy: cao cho bốn hiện trạng trên. Giới hạn dữ liệu đã được UI công khai; đây là giới hạn cần nâng cấp, không phải cáo buộc báo cáo cố tình giấu dữ liệu.

Kiểm chứng P0: gọi `summarizeAi` với một bản ghi `status=replayed`, nhận `{requests:1,success:0,failed:1,errorRate:100}`. Đây là kiểm chứng cách tính trong code, không phải tỷ lệ lỗi production. Giá thay đổi và giới hạn lượt gọi cũng cần phân loại riêng thay vì lỗi provider (`integration-api.mjs:53,65–67`).

## 4. Sáu hạng mục nâng cấp đề xuất

### A. Tổng quan vận hành — làm sớm

Hiển thị số người hoạt động, lượt nhận kết quả, tiền nạp thành công, Point đã dùng và lỗi cần xử lý; so với kỳ trước. Có bộ chọn hôm nay/7 ngày/30 ngày theo giờ Việt Nam, thời điểm cập nhật và nguồn dữ liệu.

Giai đoạn chưa có tracking hoạt động: hiển thị các chỉ số giao dịch/AI đã có, còn người hoạt động và quay lại ghi “Chưa thu thập”. Không dùng số người đăng ký thay cho người hoạt động. Tách “đã cấu hình”, “đã kiểm tra kết nối” và “đang hoạt động thực tế”; không đổi cờ cấu hình thành dấu xanh sức khỏe hệ thống.

### B. Thống kê từng tính năng — ưu tiên cao nhất

Xếp hạng Tử Vi, Tarot, Cung Hoàng Đạo, Bát Tự, Kinh Dịch, Thần Số Học, Tương Hợp và từng phần luận giải. Mỗi hàng có số người dùng, lượt bắt đầu, nhận kết quả, tỷ lệ hoàn tất, lỗi và thời gian chờ. Bấm mở biểu đồ ngày, thiết bị và các bước bỏ dở.

Tách lượt tính toán, gọi AI mới, đọc lại cache và xem bài đã lưu. Một lần retry không là một lượt dùng mới. Người dùng duy nhất phải có định nghĩa rõ cho tài khoản/khách; không tự gộp danh tính xuyên thiết bị.

### C. Hiệu quả điểm danh, giới thiệu, quảng cáo

Dùng sự kiện nghiệp vụ hiện có để xem lượt điểm danh theo ngày, mốc thưởng, bạn được mời → đăng ký → dùng dịch vụ/nạp lần đầu, Point đã phát và quảng cáo đã được xác nhận thưởng. Không suy ra doanh thu quảng cáo từ Point phát.

Có thể bắt đầu với lịch sử `reward_events`, `user_referrals`, `reward_ad_sessions`, ledger. Tỷ lệ quay lại điểm danh khác tỷ lệ quay lại website. Dữ liệu cũ chỉ dùng khi đã kiểm tra thời gian bắt đầu ghi nhận và độ đầy đủ.

Bằng chứng: `services/backend/rewards.mjs:160–165`, `migrations/rewards.sql:9`, `migrations/reward-events.sql:2,14`.

### D. Trung tâm việc cần xử lý

Gom lỗi đăng nhập, lỗi giao diện, AI chậm/lỗi, giao dịch bất thường thành danh sách ưu tiên có thời điểm, số lượt ảnh hưởng **nếu đo được**, trạng thái và liên kết đến bản ghi. Ban đầu theo quy tắc rõ ràng, không cần thêm AI cho Admin.

Trạng thái đọc/đang xử lý/đã giải quyết, hạn hỗ trợ 2 ngày làm việc nếu bổ sung phiếu hỗ trợ. Cảnh báo không tự thay cấu hình, khóa tài khoản, hoàn tiền hay gửi tin ra ngoài.

Nền hiện có: `services/admin/server.mjs:69,122`, `services/admin/metrics.ts:28`, `services/backend/handler.mjs:64`.

### E. Hồ sơ hỗ trợ người dùng

Tra tài khoản theo mã/tên/email trong quyền cho phép; xem một dòng thời gian gồm đăng nhập, đồng bộ, giao dịch, sử dụng dịch vụ và nhận thưởng. Bấm đơn mở chi tiết trạng thái và lịch sử xử lý ngay trong ngăn bên phải. Kế thừa thao tác điều chỉnh Point hiện có, có lý do, quyền và audit; không tự hợp nhất tài khoản dựa trên tên.

Ưu tiên phân trang/tìm kiếm phía máy chủ trước khi làm UI. Không mặc định lộ câu hỏi, ngày sinh hoặc nội dung luận giải trong timeline.

Bằng chứng: `services/admin/server.mjs:103–120`, `services/backend/handler.mjs:69–72`, `services/backend/ai-operations.mjs:26`.

### F. Tài chính và sức khỏe AI

Biểu đồ tiền nạp đã thanh toán, đơn hủy/chờ, Point nạp/thưởng/đã dùng; drill-down tới chứng từ. Tách tiền thực nhận khỏi số dư Point và Point thưởng. Nâng màn AI hiện có bằng xu hướng lỗi/độ trễ theo dịch vụ, coverage token/chi phí; không gọi chênh lệch tiền nạp và AI là lợi nhuận khi chưa tính đủ các chi phí khác.

Đây là nâng báo cáo hiện hữu, không làm thêm một màn AI trùng lặp. Bằng chứng: `services/backend/handler.mjs:70–72`, `services/admin/metrics.ts:24–55`, `web/src/components/admin/AiMetrics.tsx`.

## 5. Hợp đồng dữ liệu cần chốt trước code

- Bộ sự kiện tối thiểu: mở tính năng, bắt đầu thao tác, xem kết quả (AI/bộ tính/cache), lưu kết quả. Dùng module/service ID chuẩn, event ID, timestamp, loại thiết bị theo nhóm, session ID ngẫu nhiên có thời hạn; user ID chỉ khi đã đăng nhập và đúng phạm vi.
- Sự kiện trình duyệt là tín hiệu hành vi, có thể thiếu/trùng hoặc bị giả; không dùng để cộng Point hay xác nhận giao dịch. Kết quả AI, thanh toán và thưởng căn cứ backend.
- Không ghi câu hỏi, prompt, kết quả, ngày giờ/nơi sinh, token đăng nhập hoặc URL có tham số nhạy cảm vào analytics. Xác định thời hạn lưu, giới hạn gửi và quyền xem.
- Lưu thời điểm UTC, hiển thị/tổng hợp theo ngày Việt Nam; phân biệt khoảng ngày có dữ liệu với khoảng chưa thu thập.
- Tổng hợp cả khoảng lọc ở máy chủ; phân trang riêng phần chi tiết. Có ngày không phát sinh thì 0, chưa đo thì null/“Chưa thu thập”.
- Chỉ so sánh cùng định nghĩa và cùng độ dài kỳ. D1/D7 chung cần dữ liệu hoạt động tương lai; không thể phục dựng lịch sử chỉ từ AI.

## 6. Hướng UI và chuyển động

Giữ kem–xanh đậm, chữ rõ, số liệu nổi bật. Gộp khoảng 20 mục hiện có vào 5 nhóm: Tổng quan; Người dùng & sử dụng; Point & tăng trưởng; Dịch vụ & AI; Vận hành & cài đặt. Tách khu cấu hình nháp/áp dụng khỏi màn chỉ xem số liệu, tránh thanh “Lưu bản nháp” xuất hiện trên mọi màn báo cáo (`AdminDashboard.tsx:2182`).

- Bộ lọc thời gian chung, chip bộ lọc, so sánh kỳ trước, tìm nhanh và lưu góc nhìn thường dùng.
- Chọn thẻ số → lọc biểu đồ/bảng tương ứng; mở chi tiết bên phải, đóng về đúng vị trí và bộ lọc.
- Chuyển mục/chuyển tab 180–240ms; mở drawer 240–320ms; biểu đồ và số 400–600ms lần đầu hoặc khi đổi bộ lọc. Dùng transform/opacity, chuyển động theo tương tác, không lặp vô hạn trên biểu đồ.
- Khi tải lại, giữ số cũ với trạng thái “đang cập nhật”, không chớp về 0. Không sắp xếp lại hàng khi người quản trị đang thao tác; có nút áp dụng cập nhật.
- Desktop: sidebar đầy đủ và biểu đồ song song. Laptop/tablet: sidebar thu gọn, ít cột. Mobile: một cột, bộ lọc dạng sheet, bảng có cách xem chi tiết từng dòng.
- Giảm chuyển động phải tắt cả animation và transition; không gây mất focus, mất cuộn hoặc trì hoãn thao tác lưu/xác nhận.

## 7. Thứ tự nên chọn

1. Sửa phân loại thống kê + định nghĩa đo + truy vấn đầy đủ.
2. Tổng quan mới + màn sử dụng tính năng + nền UI/motion; triển khai tracking tối thiểu.
3. Hiệu quả thưởng + trung tâm việc cần xử lý + hồ sơ hỗ trợ.
4. Mở rộng tài chính, cohort và xuất báo cáo toàn kỳ khi dữ liệu đủ.

Ước lượng tương đối: sửa cách tính là nhỏ; phân trang/tổng hợp và từng màn là vừa; tracking xuyên tính năng, retention và dashboard hoàn chỉnh là lớn. Cần chọn phạm vi rồi lập kế hoạch triển khai chi tiết; chưa cam kết lịch giao khi chưa đối chiếu dữ liệu thực.

## 8. Điều kiện nghiệm thu cho giai đoạn triển khai

- Replay thành công không tăng lỗi, retry không tăng số người dùng; kiểm thử ngày Việt Nam qua nửa đêm, sự kiện trùng, khoảng không có dữ liệu, giới hạn quyền.
- Tổng hợp >5.000 request và tra cứu >200 dòng không mất bản ghi do cắt mẫu trước bộ lọc.
- Dashboard đọc số liệu không ghi vào cấu hình hoặc thay số dư; endpoint analytics áp dụng quyền server.
- UI thử 360,390,768,1024,1242,1280,1440,1920px; có keyboard/reduced-motion, không overflow và không mất bộ lọc khi mở/đóng chi tiết.
- Chạy `node --test services/admin/*.test.mjs services/backend/*.test.mjs services/rewards/*.test.mjs`, build `npm --prefix web run build`, lint riêng file đổi. Bộ QA cũ tham khảo được nhưng cần bổ sung flow mới. Không tuyên bố đã pass các gate triển khai trong lượt nghiên cứu này.

## Không đưa vào phạm vi lần này

Không viết lại bộ tính/prompt; không đổi quy tắc thu Point; không đổi Zalo fallback đã được người dùng chấp nhận; không thêm chatbot quản trị, công cụ tracking trả phí hay tự động khóa người dùng. Không audit toàn bộ bảo mật ứng dụng, dependency hoặc thực hiện đo tải production trong khảo sát này.
