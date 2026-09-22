# AstroX Admin — bản tích hợp redesign

Admin ở `/admin`, dùng cùng màu kem/xanh, typography và ngôn ngữ giao diện với web chính. Đã có cấu hình production qua Cloudflare Access; backend cũ được tích hợp tại `services/backend`.

## Chạy local

Yêu cầu Node hỗ trợ TypeScript stripping và `node:sqlite` (Node 24 khuyến nghị), dependencies trong `web` đã cài.

```sh
cd web
npm run dev:admin-api
# Terminal khác, trong web:
npm run dev -- --port 3311
```

Mở `http://localhost:3311/admin`. Mật khẩu local được tạo trong `.dev-admin/credentials.json` ở gốc repo; file này được gitignore, quyền 0600. Không đưa file vào git hoặc dùng thông tin local cho production. SQLite local nằm cùng thư mục. Server API chỉ lắng nghe loopback cổng 8789.

Mặc định AI của web preview vẫn dùng đường dẫn hiện có. Để kiểm thử router AI local, khởi động Next với `ASTROX_LOCAL_AI=1`; đặt `PROVIDER_ALLOWED_HOSTS` cho tiến trình API, cấu hình provider/key, mở dịch vụ miễn phí và áp dụng cấu hình trước khi gọi. Kiểm tra provider có thể phát sinh chi phí thực trên provider đã nhập.

## Phạm vi đã nối

- Draft lưu bền vững, kiểm tra dữ liệu, chống ghi đè phiên bản, áp dụng, lịch sử, khôi phục và audit.
- Provider, model, key mã hóa, chuỗi fallback chung/theo dịch vụ, timeout/retry/circuit breaker. Runtime hỗ trợ text chat/responses; domain provider phải được server cho phép.
- Tỷ giá VND/Point, gói nạp/khuyến mãi, giá/trạng thái dịch vụ; cấu hình PayOS, Zalo và kiểm tra độ sẵn sàng.
- Thưởng đăng ký/nạp đầu/điểm danh, mốc tùy chỉnh, giới thiệu không giới hạn hoặc có giới hạn, Ads, vận hành và phân quyền thành viên.
- Thông báo chung/lịch module và trạng thái bảo trì lấy cấu hình đã áp dụng trên web mới.
- Màn dữ liệu nghiệp vụ hiện trạng thái chưa kết nối khi backend vắng mặt. Không tạo giao dịch hay số liệu giả. Nếu có bảng cũ, chỉ đọc người dùng/số dư.

**Backend Zalo/PayOS đã được đưa vào repo tại `services/backend`.** Tái sử dụng tài khoản, số dư, đơn và khóa cũ; đọc cấu hình đã áp dụng, xử lý webhook và cộng Point nguyên tử. Nút nhập cấu hình chỉ dùng trên bản nháp chưa chỉnh sửa. Thu Point cho AI, thưởng/Ads tự động, đối soát và tác vụ theo lịch chưa được hỗ trợ nên vẫn bị chặn khi áp dụng. Nút kiểm tra PayOS/Zalo kiểm tra cấu hình và handshake, không xác nhận giao dịch hoặc OAuth thực đã hoàn tất. Xem hướng dẫn triển khai ở `services/backend/README.md`.

Các tùy chọn audit/retention/đối soát là chính sách cho backend tương lai; không cho phép tắt ghi audit cấu hình hay các bảo vệ chống cộng trùng. Frontend hiện suy ra service ID theo module; định giá riêng từng subtopic cần gắn ID tương ứng ở consumer khi nối backend.

## Nối Cloudflare sau khi merge

Áp dụng `migrations/admin.sql` vào D1 được bind tên `DB`. Migration chỉ thêm bảng admin; không sửa số dư cũ. Cấu hình Cloudflare Access bảo vệ cả `/admin*` và `/api/admin/*`, rồi đặt:

| Binding/biến | Ý nghĩa |
| --- | --- |
| `DB` | D1 cấu hình, lịch sử, audit, secret mã hóa |
| `ADMIN_ACCESS_TEAM_DOMAIN` | Domain dạng `team.cloudflareaccess.com` |
| `ADMIN_ACCESS_AUD` | Audience ứng dụng Access |
| `ADMIN_OWNER_EMAILS` | Email chủ quản trị, ngăn cách dấu phẩy |
| `ADMIN_ENCRYPTION_KEY` | Secret base64 của 32 byte ngẫu nhiên; sao lưu an toàn |
| `ADMIN_ROLE_ASSIGNMENTS` | JSON email → role ID, tùy chọn; thành viên trong DB có ưu tiên |
| `PROVIDER_ALLOWED_HOSTS` | Danh sách hostname provider chính xác, ngăn cách dấu phẩy |
| `ASTROX_BACKEND` | Service binding Worker ví/xác thực, chỉ khi sẵn sàng |

Không cấu hình `LOCAL_ADMIN` trên deployment. Owner được quản lý qua môi trường, các vai trò khác chỉnh trong Admin. API xác minh chữ ký Access, audience, issuer và hạn token; không tin email/header tự gửi.

Lần áp dụng đầu tiên chuyển AI sang cấu hình Admin. Mặc định AI tắt, dịch vụ ở bản nháp và tỷ giá chưa đặt; hãy cấu hình trước khi áp dụng lên môi trường có người dùng. Local mặc định không chuyển AI production.

## Hợp đồng Worker nghiệp vụ cần bổ sung

- `GET /internal/admin/capabilities`: trả `{ "configVersioned": true }` chỉ khi backend thật sự đọc và thực thi phiên bản cấu hình.
- `GET /internal/admin/users`, `/wallet`, `/reports`, `/rewards`: trả `{ "rows": [...] }` cho màn quản trị; chỉ cho phép qua service binding. `x-admin-actor` là người đang xem.
- `POST /internal/ai`: nhận `{ messages, serviceId, operationId }`, cookie/authorization và `x-astrox-config-revision`. Backend phải xác thực người dùng, tải đúng phiên bản, kiểm tra quyền/giá, tự dựng prompt tin cậy, kiểm tra operation ID và trừ/hoàn point bằng giao dịch nguyên tử. Không tin giá, danh tính hoặc số dư từ client.
- Nạp tiền: backend tạo order từ gói/rate của phiên bản đã chốt, kiểm chữ ký callback PayOS, xác minh amount/order và dùng ledger/idempotency trước khi cộng điểm. Thưởng và Ads cần bằng chứng server; không nhận xác nhận thành công từ trình duyệt.
- Đối soát, retention, báo cáo và lịch chạy phải được Worker thực thi. Không trả handshake sẵn sàng nếu chỉ lưu được cấu hình.

## Kiểm thử

```sh
node --test services/admin/*.test.mjs services/rewards/rules.test.mjs
cd web
npx tsc --noEmit
npm run build
npm run qa:admin
npm run qa:admin:data
```

QA trình duyệt chỉ cho phép localhost, dùng dữ liệu local. Ảnh và kết quả nằm ở `web/qa-report/admin`. Full lint của redesign hiện còn lỗi ngoài phạm vi Admin; kiểm tra lint riêng các file Admin và shell mới khi đánh giá thay đổi này.

## Bổ sung tra cứu dữ liệu

Bảng người dùng, ví, báo cáo và audit hỗ trợ tìm tiếng Việt không dấu, lọc trạng thái, sắp xếp, phân trang, mở chi tiết đầy đủ và xuất CSV theo kết quả lọc. Phạm vi là các bản ghi API đã tải (hiện tối đa 200 ở các endpoint nội bộ), không phải xuất toàn bộ database. CSV xử lý ô có nguy cơ công thức spreadsheet. Báo cáo có các nguồn tổng hợp, lịch sử thưởng và hoạt động AI; hai nguồn nghiệp vụ cần Worker, AI đọc nhật ký thật từ Admin DB. Nút làm mới không thay đổi bản nháp cấu hình.

## Cài đặt AI nhiều model

Một provider giữ API key dùng chung và model mặc định (ID route vẫn là ID provider để tương thích dữ liệu cũ). Các model bổ sung nằm trong `models`, mỗi cấu hình có tên, model ID, URL gốc, giao thức, timeout/retry/output cap/temperature và trạng thái. Một model có thể khai báo nhiều lần với các giao thức khác nhau. Route con dùng `providerId:modelId`; global fallback và override theo dịch vụ chọn route cụ thể. Tắt/xóa model hoặc provider dọn các tham chiếu fallback tương ứng trong bản nháp. Circuit breaker và kiểm tra kết nối hoạt động theo route; secrets vẫn thuộc provider.

Adapter hỗ trợ văn bản qua OpenAI-compatible Chat Completions, Responses và Anthropic Messages. Messages dùng `/messages`, `x-api-key`, `anthropic-version`, cùng `system` riêng. Không hỗ trợ Gemini native, tool calling, ảnh hoặc streaming trong adapter này. Cấu hình model phải phù hợp với endpoint, quyền và tham số provider thực tế; kiểm thử local dùng phản hồi mô phỏng, chưa xác nhận tài khoản provider thật.

Tham khảo giao thức: [OpenAI Chat](https://platform.openai.com/docs/api-reference/chat/object), [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create).

## Thống kê AI

`/admin?view=aiMetrics` gọi `GET /api/admin/data/ai-metrics` (quyền config.read). Chọn ngày UTC, tối đa 90 ngày, lọc provider/model/dịch vụ. Tối đa 5.000 bản ghi mới nhất trong khoảng được tổng hợp; API và UI báo rõ khi bị giới hạn, cần thu hẹp khoảng ngày. Dữ liệu được lấy từ admin_ai_requests, không cần sửa schema hiện hữu.

Request là lượt qua gateway đã có cấu hình Admin xuất bản, khác với các lần thử gọi upstream. Retry là lần gọi lại cùng route; fallback là request đã gọi nhiều route. Circuit-open không tính là một lần gọi upstream. Độ trễ là toàn request kể cả retry/fallback. Báo cáo provider/model chọn request có lần gọi khớp, sau đó chỉ cộng usage/lần gọi khớp. Bản ghi cũ không có usage/model giữ trạng thái thiếu dữ liệu. Lỗi trước khi parse input không có service ID. Request chuyển Worker có outcome gateway nhưng không có token/model cho đến khi Worker bổ sung telemetry. API legacy trước khi xuất bản cấu hình không thuộc báo cáo.

Token đọc cache OpenAI nằm trong tổng input; Anthropic input chuẩn hóa bằng input + cache read + cache creation. Chi phí USD ước tính theo giá từng model tại lúc gọi, lưu cùng attempt; không hồi tố giá mới lên bản ghi cũ. Chỉ ước tính khi đủ input/output/cache usage và giá. Với Chat/Responses không có cơ chế tính giá ghi cache riêng nên thành phần chi phí ghi cache là 0; trường thống kê cache write vẫn là thiếu dữ liệu nếu provider không báo. Tổng chi phí có coverage, không phải hóa đơn. Cache kết quả trong trình duyệt chưa gửi telemetry xác thực, hiển thị “Chưa thu thập”.

Không ghi prompt, completion hoặc API key vào nhật ký thống kê. Kiểm thử browser dùng fixture riêng, không ghi số liệu giả vào database và không gọi provider trả phí.

## Quick Tunnel để test từ xa

Chạy `cloudflared tunnel --url http://localhost:3311 --no-autoupdate`, lấy origin HTTPS được cấp rồi khởi động local Admin API với `ADMIN_PREVIEW_ORIGIN` đúng origin đó. Chỉ chấp nhận một origin `https://<tunnel>.trycloudflare.com`, không wildcard. Mật khẩu local và kiểm tra CSRF vẫn bắt buộc, cookie đăng nhập qua origin preview có Secure. Tuỳ chọn này chỉ nằm trong dev-server, không thay đổi Cloudflare Access của production. Tắt tunnel để ngừng truy cập từ xa; link không phải deployment lâu dài.
