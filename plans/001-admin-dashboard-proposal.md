# AstroX Admin mới — phương án khảo sát

Ngày: 2026-09-22. Nền khảo sát: HEAD `ed70b6e` **và working tree đang có redesign chưa commit**. Trạng thái: đề xuất để review, chưa phải lệnh triển khai. Không sửa source, không deploy.

## 1. Kết luận từ code

| Bằng chứng | Hiện trạng | Ý nghĩa đối với admin mới |
|---|---|---|
| `astrox-index-446507.html:855–890`, `:4820` | Dashboard cũ gồm tổng quan, user, promotion, Point, module, phần con, popup, quyền. Nội dung là placeholder; JS chỉ đổi panel. | Giữ phạm vi nghiệp vụ, không coi đây là backend đã hoàn thiện. |
| `web/src/app/layout.tsx`, `web/src/components/home/Dashboard.module.css`, `web/src/components/tuvi/TuVi.module.css` | Font Beautique Display + Be Vietnam Pro; các màn mới dùng kem, xanh rừng/ngọc, sage, vàng trầm. | Lấy giao diện đang chạy trong source làm chuẩn; comment đầu globals.css vẫn mô tả palette/font cũ. |
| `web/src/app/layout.tsx`, `web/src/components/shell/AppShell.tsx` | Root layout bọc toàn bộ route trong shell người dùng. | Thêm `/admin` trực tiếp sẽ kế thừa topbar, dock và provider không phù hợp. Phải tách shell. |
| `web/next.config.ts` | Production static export; development chỉ rewrite `/api/ai`. | Không dựa vào Next server actions hoặc API routes khi giữ deployment hiện tại. Dev admin cần adapter/backend test riêng. |
| `web/src/lib/auth.tsx` | Supabase bearer và Zalo cookie cùng tồn tại; localhost có preview user; quyền module poll 20 giây. | Cần định danh rõ nguồn tài khoản; admin auth độc lập, không dùng preview user làm quyền admin. |
| `schema.sql`, `functions/api/module-access.js` | D1 trong repo có users, user_data, user_module_access; không có bản ghi quyền nghĩa là cho phép. | Quyền bật/tắt cũ không phải chứng từ mua nội dung. Không tự đổi semantics toàn bộ dữ liệu cũ. |
| `web/src/lib/api.ts:170–265` | Client gọi backend riêng cho Zalo, số dư, gói nạp, PayOS, promo và quyền. | Hợp đồng API người dùng đã có dấu vết; chưa xác minh admin API và schema backend đó. |
| `docs/plans/2026-09-21-point-unlocks.md` | Đã chốt mua nội dung cố định một lần; Tarot/Kinh Dịch tính theo lượt; giá chưa duyệt. | Admin phải hỗ trợ catalog giá và entitlement, không chỉ khóa/mở module. Không tự kích hoạt thu Point. |
| `functions/api/ai.js` | Handler trong repo chuyển tiếp yêu cầu AI; chưa thấy kiểm tra thanh toán/quyền người dùng trong handler. | Muốn khóa dịch vụ có hiệu lực phải thực thi ở backend, không chỉ tắt nút frontend. Chưa kiểm tra lớp bảo vệ ngoài repo. |

Chưa tìm thấy source dashboard triển khai tại subdomain hoặc backend `api.theastrox.space` trong repo này. Không kết luận hệ thống production thiếu những phần đó. Ảnh `dash-desktop-logged-in.png` là giao diện cũ, không dùng làm chuẩn redesign hiện tại. Chưa kiểm tra giao diện mới trực tiếp trong trình duyệt ở lượt khảo sát này.

## 2. Lựa chọn kiến trúc

**Đề xuất: admin mới trong cùng codebase Next, shell riêng và dùng chung design primitives.** Giai đoạn đầu dùng `/admin`; nếu cần giữ `dashboard.theastrox.space`, chỉ chốt mapping/build deployment sau khi có cấu hình host hiện tại. Không mặc định một build static tự phục vụ hai ứng dụng khác nhau theo hostname.

- Ưu điểm: dùng chung font, logo, icon, token và catalog; ít lệch giao diện; không thêm framework.
- Đổi lại: phải tách public/admin layout cẩn thận và chạy regression toàn bộ route public.
- Phương án 2: app admin riêng, package UI chung. Phù hợp khi cần deploy và phân quyền vận hành độc lập; tốn thêm build pipeline và tổ chức package.
- Phương án 3: sửa dashboard HTML cũ. Ít setup nhưng giữ cách tổ chức placeholder và khó chia sẻ component; không đề xuất cho yêu cầu xây mới.

Tổ chức dự kiến: root chỉ giữ font/global metadata/providers thực sự dùng chung; `(public)/layout.tsx` giữ AppShell; `(admin)/admin/layout.tsx` giữ AdminShell. Các URL public không đổi. Component admin nằm trong `web/src/components/admin/`, client/types riêng trong `web/src/lib/admin/`. Đây là cấu trúc đề xuất, cần đối chiếu hướng dẫn Next cục bộ trước khi viết code.

## 3. Ngôn ngữ giao diện

- Nền kem `#fbf6ec`, nội dung chính xanh `#214d42`/`#264d40`, CTA xanh `#187650`, sage làm màu phụ, vàng trầm cho điểm nhấn. Chuẩn hóa thành semantic tokens dùng chung sau khi so sánh các module, tránh nhân bản hex khắp admin.
- Beautique cho tiêu đề trang; Be Vietnam Pro cho bảng, form, menu; số dùng tabular numerals. Không dùng serif cho dữ liệu dài.
- Sidebar desktop khoảng 240px; topbar gồm breadcrumb, tìm kiếm theo ngữ cảnh, tài khoản; vùng nội dung có tiêu đề, mô tả ngắn và một hành động chính.
- Card bo 16–24px, đường viền nhẹ, glass chỉ ở khung điều hướng/panel phụ; bảng có nền đủ đặc để đọc dễ.
- Dùng bảng cho quản trị nhiều bản ghi, drawer cho xem nhanh, trang chi tiết cho hồ sơ dài. Filter và phân trang phản ánh trên URL để quay lại giữ ngữ cảnh.
- Mobile: sidebar thành drawer, filter thành sheet, hành động quan trọng luôn thấy; danh sách chuyển card khi hợp lý, bảng đối soát được cuộn trong container riêng.
- Đỏ/vàng/xanh chỉ trạng thái có nhãn chữ; đủ focus, bàn phím, reduced motion. Không mang video hero hoặc hiệu ứng gieo/rút vào giao diện nghiệp vụ.
- Mọi màn có loading, empty, error/retry, forbidden, stale và saving/success. API chưa nối phải hiển thị chưa có dữ liệu, không giả số 0 hoặc thao tác lưu thành công.

## 4. Cấu trúc chức năng

| Màn | Nội dung và hành động | Phụ thuộc |
|---|---|---|
| Tổng quan | Người dùng mới/hoạt động, tiền nạp thành công, Point phát hành/tiêu, lượt sử dụng, giao dịch cần xử lý; bộ lọc thời gian; click chỉ số đi đến danh sách tương ứng | API thống kê với định nghĩa chỉ số và múi giờ rõ ràng; chưa có dữ liệu thì ẩn chart tương ứng |
| Người dùng | Tìm tên/ID/email nếu có; phân biệt nguồn Zalo/Supabase; chi tiết hồ sơ, quyền, ví, giao dịch, lượt đã mua | API danh sách phân trang và định danh backend; không tự gộp tài khoản theo email/tên |
| Dịch vụ & giá | Sáu module, cây chức năng/chủ đề, trạng thái mở/bảo trì, giá Point theo nội dung/lượt, xem trước ảnh hưởng | Catalog server; map `zodiac`→`/cunghoangdao`, `batu`→`/battu`, `numerology`→`/thansohoc`; Tương Hợp cần xác định là chức năng con hay dịch vụ độc lập |
| Point & giao dịch | Tab đơn nạp PayOS, lịch sử cộng/trừ, điều chỉnh có lý do, giao dịch lệch/chờ xử lý | Backend ví thật; adjustment tạo bút toán mới, không sửa số dư trực tiếp |
| Point miễn phí | Cấu hình Ads, giới thiệu, điểm danh; lịch sử cấp thưởng, đối soát và báo cáo; quy tắc đã chốt tại mục 10 | Dùng chung backend ví và ledger; sự kiện đăng ký, thanh toán, điểm danh phải xác thực phía server |
| Khuyến mãi | Loại mã/bonus đúng backend hỗ trợ, điều kiện, hạn dùng, giới hạn lượt, lịch sử sử dụng | Đối chiếu model promo hiện có trước khi thiết kế form |
| Thông báo | Soạn nội dung, mục tiêu module/chức năng, lịch hiển thị, preview desktop/mobile, bật/tắt | Hiện chưa xác minh CMS API hoặc public consumer; phải làm cả hai đầu |
| Nhật ký quản trị | Ai thay đổi gì, trước/sau, lý do, thời điểm, request ID; filter theo đối tượng | Audit append-only phía server; không ghi token, khóa, toàn bộ dữ liệu nhạy cảm |
| Quyền quản trị | Vai trò owner/admin/support theo nhu cầu thực; support mặc định chỉ đọc, thao tác tiền/quyền tách riêng | Session và authorization server; tránh mở rộng permission editor tổng quát ở bản đầu |

Phạm vi đã được người dùng mở rộng: bắt buộc tích hợp PayOS, Zalo và quản lý API provider, thứ tự fallback, tỷ giá, gói nạp, giá từng dịch vụ trực tiếp trong admin. Mục 9 dưới đây thay thế giới hạn AI chỉ đọc ở phương án ban đầu. Backend contract còn thiếu phải được xây dựng sau khi đối chiếu source, không dùng làm lý do loại các chức năng này khỏi sản phẩm cuối.

## 5. Contract và dữ liệu

Admin → admin API → backend có thẩm quyền với từng dữ liệu. Trình duyệt không truy cập D1 trực tiếp và không giữ service secret. Đề xuất namespace `/api/admin/*`; endpoint cụ thể chỉ chốt khi đọc backend, không coi các URL đề xuất là đã tồn tại.

- Session admin phải được xác thực và kiểm tra quyền ở mọi endpoint. Nếu dùng cookie, cần ràng buộc origin/CSRF và credential CORS đúng host triển khai.
- Giữ ba khái niệm tách biệt: dịch vụ đang mở/bảo trì, quyền truy cập tài khoản, quyền sở hữu nội dung đã mua. Bản đầu đề xuất bảo trì chặn lượt mới nhưng vẫn cho xem kết quả đã mua, trừ khóa tài khoản có lý do riêng.
- Module/topic ID ổn định, không dùng nhãn tiếng Việt hoặc pathname làm khóa giao dịch. Thay prompt không tự thu lại tiền.
- Giá chưa duyệt ở trạng thái nháp, không mặc định giá 0 đồng hoặc tự bật thu phí. Chính sách vận trình theo ngày/tuần/tháng vẫn cần chốt.
- Giao dịch cộng/trừ/hoàn phải idempotent; webhook trùng và retry không phát hành Point lần hai; kiểm tra số dư nguyên tử.
- Admin chỉ đọc kết quả đã lưu khi có quyền; xem chi tiết không kích hoạt AI. Không hứa hiển thị đầy đủ lịch sử từ dữ liệu hiện còn chỉ nằm ở localStorage.
- Cấu hình có version; lưu bằng expected version để phát hiện hai admin sửa cùng lúc. Publish trả bản đã lưu và invalidate cache; người dùng thấy trạng thái mới trong SLA được thống nhất (cơ chế cũ poll 20 giây).

## 6. Lộ trình đề xuất

1. **Đối chiếu backend và admin production:** lấy source, xác minh auth, schema, endpoint, deploy, dữ liệu cũ; lập ma trận giữ/thay/thêm. Đây là điều kiện trước khi chốt migration, không chặn thiết kế UI.
2. **Nền UI và shell:** chốt token, tách layout, dựng login/forbidden, Tổng quan và Người dùng với fixture ghi rõ chế độ demo; review desktop/mobile. Chưa kết nối mutation production.
3. **Đọc dữ liệu thật:** nối session admin, danh sách, chi tiết, số liệu; xử lý lỗi/phân trang; so khớp ID giữa các hệ thống mà không gộp tự động.
4. **Nghiệp vụ quản trị:** nền cấu hình versioned và kho secret → PayOS/Zalo → provider/model/fallback → tỷ giá/gói nạp/promo/ledger → Point miễn phí (giới thiệu/điểm danh/Ads, mục 10) → dịch vụ/chức năng/giá → thông báo/nội dung. Audit và authorization đi cùng mỗi mutation, không để cuối dự án. Chỉ bật phần giá/mua nội dung sau khi backend unlock hoàn thiện và giá được duyệt. Chia thành các mốc kiểm thử, nhưng tất cả là phạm vi sản phẩm theo yêu cầu bổ sung.
5. **Kiểm thử và chuyển đổi:** regression public, quyền truy cập, giao dịch đồng thời, webhook lặp, snapshot viewport; chạy admin mới song song trên staging, giữ đường rollback; sau nghiệm thu mới chuyển host/đường dẫn chính.

## 7. Tiêu chí tương thích và nghiệm thu

“100% tương thích” là tiêu chí cần kiểm thử, chưa phải kết luận của khảo sát:

- Cùng font/logo/token và ngôn ngữ tương tác của redesign; không kế thừa nhầm palette cũ từ comment.
- Giữ toàn bộ URL public, hồ sơ, số dư, quyền và chứng từ đã mua; không đổi ID khi đổi tên hiển thị.
- Cấu hình admin thật sự ảnh hưởng đúng màn và được server thực thi, gồm module + phần con + popup.
- Reload trực tiếp route admin trên static hosting hoạt động; endpoint ngoài quyền trả 401/403 dù gọi trực tiếp, tắt JavaScript hay sửa client.
- Không có âm ví, thu trùng hoặc phát Point trùng trong kiểm thử hai tab, retry, webhook lặp. Hoàn/điều chỉnh có ledger và audit.
- Kiểm tra 30 viewport trong `docs/VIEWPORT-CONTRACT.md`, cả bàn phím/reduced motion; không overflow trang hoặc nút bị che.

Các lệnh có trong repo, chạy từ `web/` khi triển khai: `npm run lint`, `npm run build`, `npm run qa:viewport`, `node scripts/home-visual-qa.mjs`. Hai lệnh QA cần server `http://localhost:3311`; script hiện tại phục vụ public, phải bổ sung bộ kiểm thử admin, không coi chúng đã bao phủ admin. Đọc Next docs trong node_modules theo `web/AGENTS.md` trước thay layout. Chưa chạy các gate này trong lượt lập phương án; không có kết luận build/test pass.

## 8. Ranh giới và phần còn cần xác nhận

- Đã khảo sát source HTML cũ, frontend mới, API client, handlers trong repo, schema D1 và spec Point. Chưa audit production, backend ví/Zalo/PayOS hoặc dashboard ở repo khác; chưa thực hiện visual QA trực tiếp.
- Cần đường dẫn source admin/backend để chốt phần 1; nếu không có, làm bản UI + contract proposal và giữ chức năng ghi dữ liệu bị vô hiệu hóa cho đến khi backend được xác minh.
- Không sửa thuật toán chiêm tinh, không đổi quy tắc Point đã chốt, không deploy AWS, không reset/commit working tree redesign trong phạm vi phương án.
- Khi triển khai phải so sánh cả working tree hiện tại, không chỉ diff từ HEAD: nhiều file redesign chưa commit. Nếu UI/contract đã đổi, cập nhật phương án trước khi viết code.

## 9. Phạm vi cấu hình toàn hệ thống — yêu cầu bổ sung

Mục tiêu: người vận hành thay đổi mọi cấu hình nghiệp vụ được liệt kê dưới đây trong admin mà không sửa code/redeploy. Thêm một provider cùng giao thức adapter đã hỗ trợ được thực hiện bằng form; giao thức hoàn toàn mới vẫn cần adapter và kiểm thử. Đăng ký ứng dụng, phê duyệt quyền và cấp credential tại bên thứ ba vẫn theo quy trình của bên đó; admin quản lý tích hợp sau khi được cấp. Hạ tầng gốc như DNS, database binding và khóa mã hóa gốc thuộc deployment, không biến thành form chỉnh tùy ý.

### 9.1. PayOS và Zalo

**PayOS:** nhập/thay Client ID, API Key, Checksum Key; bật/tắt tạo đơn mới; hiển thị webhook URL từ backend và trạng thái xác minh; cấu hình URL trở về/hủy trong danh sách origin cho phép, thời hạn đơn, mẫu mô tả hợp lệ, lịch đối soát. Có kiểm tra kết nối và luồng thử được gắn nhãn, không ngầm tạo thanh toán thật. Tách config test/live của AstroX; chỉ dùng sandbox phía PayOS nếu tài liệu/tài khoản thực tế hỗ trợ, không tự giả định có sandbox.

Chỉ cộng Point sau khi backend xác minh webhook/chữ ký hoặc đối soát có xác thực, đối chiếu mã đơn, số tiền và trạng thái. Redirect thành công ở trình duyệt không chứng minh đã thanh toán. Tắt tạo đơn không được tắt xử lý webhook cho đơn cũ. Đơn lưu reference kênh thanh toán và phiên bản credential phù hợp; thay khóa phải có quy trình chuyển tiếp theo khả năng bên cung cấp và đối soát đơn đang mở, không xóa khóa cũ tùy tiện.

**Zalo:** cấu hình App ID, secret, callback đúng app đăng ký, URL trở về hợp lệ, bật/tắt đăng nhập mới; trạng thái tích hợp, kiểm tra luồng đăng nhập và lỗi callback đã lọc dữ liệu nhạy cảm. Backend xử lý OAuth state, chống replay, trao đổi code/token, refresh theo giao thức được hỗ trợ; không để browser giữ app secret. Đổi App ID phải đánh giá định danh người dùng, không tự tạo ví mới hoặc gộp user. Có phiên đăng nhập quản trị độc lập để sửa cấu hình khi Zalo lỗi. Zalo hiện có trong code là đăng nhập; OA/ZNS là khả năng mở rộng riêng, không coi là đã được tích hợp chỉ vì có Zalo Login.

Tài liệu đối chiếu: [payOS API](https://payos.vn/docs/api/), [payOS Node SDK](https://payos.vn/docs/sdks/back-end/node/), [Zalo Social user token](https://stc-developers.zdn.vn/docs/v2/social-api/tham-khao/user-access-token-v4). Đây là nguồn cho contract tích hợp, không phải bằng chứng backend hiện tại đã triển khai đúng.

### 9.2. API provider, model và fallback

Thêm mục **AI & API** gồm Providers, Models, Routing & fallback, Prompt templates và Request logs.

- Provider: tên, protocol/adapter, HTTPS base URL, credential nhập mới/thay, header được cho phép, bật/tắt, timeout, retry/backoff, giới hạn request/concurrency, ngân sách nếu có dữ liệu usage. Kiểm tra endpoint ở server, chặn địa chỉ nội bộ/metadata, kiểm tra cả redirect/DNS; không cho nhập mã thực thi tùy ý.
- Model: ID thật, provider, capability text/image/structured output/streaming, giới hạn token/context, tham số được hỗ trợ, giá upstream nếu muốn ước tính chi phí. Giá upstream là số vận hành cấu hình, hiển thị rõ estimated/actual, không đồng nhất với giá Point thu khách.
- Routing: mặc định toàn hệ thống; ghi đè theo module → chức năng/chủ đề. Khi ghi đè dùng trọn một chain, không ghép ngầm các chain. Mỗi bước là provider + model + tham số; kéo thả hoặc dùng nút lên/xuống để đặt thứ tự; cấm chu kỳ/trùng bước vô nghĩa và publish chain không có target hợp lệ.
- Policy: cấu hình loại lỗi được thử lại/chuyển bước, số lần thử từng bước, tổng lần thử, tổng thời gian, cooldown và ngưỡng tạm ngắt provider lỗi. Timeout/network/429/5xx có thể chuyển bước theo policy; lỗi xác thực provider đánh dấu unhealthy và cảnh báo; lỗi input/client dừng sớm. Từ chối nội dung không được tự fallback để vượt cơ chế an toàn.
- Fallback chỉ dùng target đủ capability cho yêu cầu; không tự bỏ ảnh hoặc đổi schema đầu ra. Nếu provider đã trả một phần nội dung, không nối văn bản từ model khác; lưu attempt riêng và xử lý lại theo policy rõ ràng trước khi công bố kết quả cuối.
- Backend điều phối toàn bộ. Loại bỏ việc model client hard-code ghi đè config và tránh retry nhân lên giữa client/proxy/provider. Client retry cùng operation ID chỉ theo dõi lại yêu cầu cũ.
- Một operation có thể có nhiều attempt nhưng chỉ một kết quả được chốt và một lần thu Point. Fallback có thể phát sinh nhiều phí upstream; theo dõi riêng, không hứa upstream chỉ xử lý một lần khi timeout chưa rõ kết quả. Hết chain thì trả lỗi có thể retry và hoàn giữ chỗ theo quy tắc ví.
- UI hiển thị chuỗi thực tế được áp dụng, test một provider hoặc mô phỏng lỗi cả chuỗi, latency/error/usage từng attempt đã che secret; không log đầy đủ thông tin ngày sinh hoặc nội dung riêng tư mặc định.
- Prompt template: theo module/chức năng, version, biến đầu vào có schema, preview/test bằng dữ liệu giả, publish/rollback. Prompt đổi không thu lại tiền nội dung đã mua; template không chứa JavaScript hoặc quyền sửa các kiểm tra thanh toán/an toàn ở server.

Hiện `functions/api/ai.js` hard-code endpoint, model, timeout, retry và `web/src/lib/api.ts` gửi model cố định; cả hai phải chuyển sang resolver cấu hình backend. Đây là thay đổi backend thực sự, không chỉ thêm màn form.

### 9.3. Tỷ giá VND → AstroX Point

- Cấu hình rõ chiều: **số VND cho 1 Point**, số nguyên dương; Point bản đầu là số nguyên, làm tròn xuống với gói tính theo tỷ giá. Có máy tính xem trước VND → Point cơ bản → bonus → tổng; không tự định nghĩa chức năng rút Point ra VND.
- Có version và thời điểm hiệu lực. Thay tỷ giá chỉ áp dụng đơn mới; ví và lịch sử đã phát sinh không được quy đổi lại.
- Khi tạo đơn, backend chốt amount VND, base Point, bonus, promo, rate version, package version và tổng Point vào order snapshot. Webhook muộn vẫn dùng snapshot đó.
- Công thức gói theo tỷ giá: base = floor(amountVnd / vndPerPoint); tổng = base + bonus gói + bonus promo theo chính sách cộng dồn. Tiền và Point dùng số nguyên/decimal chính xác, không dựa vào sai số floating point.

### 9.4. Gói nạp

- CRUD gói với ID ổn định: tên, mô tả, giá VND, cách tính Point **theo tỷ giá** hoặc **Point cố định**, bonus, thứ tự, nhãn nổi bật, bật/tắt, lịch hiệu lực, giới hạn và điều kiện áp dụng.
- Gói cố định không tự đổi Point khi đổi tỷ giá; admin hiển thị rõ chế độ và tỷ lệ thực nhận. Bonus hỗ trợ số Point hoặc % cơ bản với quy tắc làm tròn xác định; không trộn hai cách một cách ngầm định.
- Promo cấu hình điều kiện, quota toàn cục/theo user, thời gian, cho phép cộng dồn bonus gói hay không; kiểm tra/giữ quota nguyên tử. Preview phải giải thích từng thành phần Point.
- Lưu nháp, preview đúng panel nạp mới, publish. Gói từng phát sinh giao dịch chỉ archive, không xóa lịch sử. Cấu hình cho phép nạp số tiền tùy chọn hay chỉ các gói; nếu bật tùy chọn phải có min/max/bước tiền hợp lệ.
- Client hiện gửi `amount_vnd` để chọn gói; hợp đồng mới cần `package_id` và version báo giá vì hai gói có thể trùng giá nhưng khác quyền lợi. Server tính lại và yêu cầu người dùng xác nhận giá mới khi báo giá hết hiệu lực; không nhận tổng Point do client khai.

### 9.5. Giá từng dịch vụ/chức năng

- Catalog cây module → dịch vụ → chủ đề/chức năng; từng mục có ID, giá Point nguyên không âm, miễn phí/thu phí/bảo trì/ẩn, chính sách tính phí và route AI tương ứng.
- Giá mặc định module chỉ là giá kế thừa cho từng dịch vụ nếu không ghi đè; không tự cộng cả giá module và giá con. Bundle mở toàn module, nếu bật, phải có danh sách quyền cụ thể và cách xử lý phần người dùng đã mua.
- Nội dung cố định theo hồ sơ: mua một lần cho khóa nội dung; Tarot/Kinh Dịch: theo session mới. Các kỳ vận trình cần chọn chính sách trong admin trước publish, không dùng mặc định mơ hồ. Quyền đã mua giữ điều khoản và giá tại thời điểm mua, không bị thu lại do tăng giá.
- Hỗ trợ nháp, lịch áp dụng, preview toàn bộ giá thực tế sau kế thừa, thay đổi hàng loạt có diff. Đổi giá không làm request đang giữ chỗ đổi số Point; giá server được snapshot khi chấp nhận giao dịch.
- Chỉnh giá và routing trong admin phải được public UI lẫn endpoint AI/mua nội dung sử dụng cùng source of truth. Không để giá chỉ là nhãn hiển thị trên nút.

### 9.6. Các cấu hình vận hành còn lại

Admin cũng quản lý trạng thái module/chức năng, giới hạn lượt/người dùng, thời hạn lưu dữ liệu theo chính sách được chọn, quota AI, khuyến mãi, thông báo, nội dung tên/mô tả/ảnh/thứ tự module, liên kết hỗ trợ, metadata công khai và feature flags có danh mục. Nội dung động cần public consumer hoặc cơ chế rebuild rõ ràng nếu là metadata static; không hứa cập nhật runtime cho HTML được build sẵn. Upload kiểm tra kiểu/kích thước; nội dung được sanitize.

Mỗi trường cấu hình có schema, mặc định, giới hạn hợp lệ, quyền sửa, phạm vi ảnh hưởng và consumer xác định. Không dựng một JSON editor “mọi thứ” mà backend không sử dụng. Chỉ trường đã nối tới consumer và có kiểm thử mới được đánh dấu khả dụng.

### 9.7. Nền cấu hình dùng chung

Luồng: **Nháp → Kiểm tra → Xem thay đổi/ảnh hưởng → Áp dụng ngay hoặc đặt lịch → Theo dõi → Khôi phục phiên bản**. Publish nguyên tử theo nhóm có phụ thuộc (ví dụ giá + gói + tỷ giá); optimistic concurrency để chặn ghi đè ngoài ý muốn. Request chốt config version khi bắt đầu. Cache có invalidation và hiển thị version đang dùng; lỗi cấu hình mới giữ bản hợp lệ gần nhất. Fail-closed cho mutation tài chính nếu không xác định được phiên bản hợp lệ.

Secret nhập qua admin nhưng mã hóa ở backend bằng khóa gốc ngoài DB; API chỉ trả metadata đã che và trạng thái đã cấu hình. Không lưu vào localStorage, không đưa vào bundle hoặc audit diff, không export plaintext. Rollback cấu hình không tự phục hồi credential đã thu hồi. Tách quyền xem, sửa, publish, quản lý secret và điều chỉnh ví; audit ghi actor, target, version, thời gian, lý do.

Các entity đề xuất để đối chiếu backend: config versions, secret references, providers/models, routing policies, prompt versions, exchange rates, packages, service prices, payment orders với snapshot, wallet ledger, operations/attempts, audit events. Không tạo database ví thứ hai nếu backend hiện có đã là nguồn dữ liệu chính.

### 9.8. Nghiệm thu bổ sung bắt buộc

1. Đổi provider/model/thứ tự và gây lỗi giả ở A/B: request đi đúng A → B → C; timeout tổng không bị retry nhân lên; mỗi lỗi có trace; user chỉ bị trừ một lần.
2. Tất cả provider lỗi, response sai schema, request timeout không rõ trạng thái và hai tab retry: không chốt hai kết quả/thu hai lần; giữ chỗ được hoàn hoặc đối soát.
3. Đổi tỷ giá/gói/promo khi đơn PayOS đang pending; webhook trễ/lặp/sai chữ ký/sai tiền: chỉ đơn hợp lệ cộng đúng snapshot đúng một lần.
4. Đổi giá dịch vụ sau báo giá hoặc trong lúc AI chạy: xác nhận lại trước giao dịch nếu cần; operation đã bắt đầu giữ giá cũ; xem lại kết quả đã mua không thu thêm.
5. Config nháp không ảnh hưởng live; lịch publish dùng múi giờ hiển thị rõ; hai admin sửa xung đột được báo; rollback và cache invalidation kiểm chứng bằng version.
6. Callback Zalo sai state/replay/đổi app config không làm chiếm hoặc gộp nhầm tài khoản; vẫn có đường admin đăng nhập để sửa integration.
7. Secret không xuất hiện ở GET config, log, audit, HTML, bundle hoặc export; provider URL không truy cập mạng nội bộ; người không có quyền không test/publish/sửa secret.
8. Thay đổi gói, giá, trạng thái và nội dung được kiểm tra trên giao diện public thực, không chỉ trong màn admin.


## 10. Point miễn phí — phạm vi admin đã được yêu cầu

Mục này là đặc tả để xây admin và các backend consumer tương ứng, cập nhật theo quyết định mới nhất của người dùng. Thay thế đề xuất referral +15/+10, kích hoạt ngày thứ hai, giới hạn 10 bạn/tháng và rollout thử nghiệm trong `plans/002-free-points-research.md`. **Mặc định không giới hạn số bạn được giới thiệu, không áp trần referral theo ngày/tháng hoặc giới hạn thử nghiệm ngầm.** Admin được cấu hình chế độ không giới hạn hoặc hạn mức công khai cho lời mời mới theo mục 10.8. Ads mặc định 5 lượt/ngày và được cấu hình trong admin. Chống cộng trùng và kiểm tra gian lận không phải hạn mức số bạn được mời.

### 10.1. Quy tắc và giá trị mặc định đã chốt

| Sự kiện | Người dùng/người được mời | Người giới thiệu | Điều kiện cấp |
|---|---:|---:|---|
| Đăng ký qua lời mời | +5 Point | +5 Point | Ngay khi hoàn tất đăng ký hợp lệ và xác thực định danh; một lần mỗi tài khoản mới |
| Nạp lần đầu | Point của gói nạp theo snapshot đơn | +10 Point | Lần thanh toán tiền thật thành công đầu tiên được backend xác minh; không tính tạo đơn, redirect hoặc mã miễn phí |
| Điểm danh hằng ngày | +2 Point | Không thưởng hằng ngày | Người dùng chủ động bấm điểm danh; tối đa một lần/ngày theo giờ Việt Nam |
| Chuỗi 3 ngày | Thêm +3 Point | +2 Point | Mỗi mốc một lần trong vòng đời tài khoản |
| Chuỗi 7 ngày | Thêm +5 Point | +3 Point | Mỗi mốc một lần trong vòng đời tài khoản |
| Chuỗi 10 ngày | Thêm +10 Point | +5 Point | Mỗi mốc một lần trong vòng đời tài khoản |
| Hoàn thành Rewarded Ads | +5 Point | Không có | Tối đa 5 lượt được thưởng/ngày; cooldown đề xuất mặc định 90 giây |

- Chuỗi điểm danh là ngày liên tiếp theo `Asia/Ho_Chi_Minh`. Bỏ ngày thì chuỗi bắt đầu lại; các mốc đã nhận không reset. Sau ngày 10 vẫn +2/ngày, không tự tạo chu kỳ thưởng mốc mới. Đăng nhập đơn thuần chưa tính điểm danh.
- Người không qua giới thiệu vẫn có đầy đủ thưởng điểm danh và mốc của bản thân. Người mời chỉ nhận khi bạn được mời có liên kết hợp lệ thực sự đạt mốc.
- Thưởng mốc cộng thêm vào thưởng ngày. Ví dụ ngày 3 nhận 2 + 3 = 5 Point; đủ 10 ngày nhận tổng 38 Point điểm danh, hoặc 43 nếu có 5 Point đăng ký. Người mời nhận tổng 15 Point từ đăng ký và ba mốc, thành 25 nếu bạn đó có nạp lần đầu; chưa tính Ads.
- Một người được mời chỉ gắn một người giới thiệu, không đổi sau đăng ký; tài khoản cũ không gắn hồi tố. Chỉ thưởng một tầng, không tự mời hoặc tạo vòng giới thiệu. Xác minh tại server, không tin flag từ trình duyệt.
- Không ép người mới nạp hoặc xem Ads để nhận 5 Point đăng ký hay thưởng điểm danh. Thưởng nạp là quyền lợi riêng.
- Admin được cấu hình số Point và bật/tắt từng chương trình; bảng này là bản cấu hình khởi tạo. Không tự thay mức khi xây UI. Quy tắc một lần/mốc và một tầng là bất biến nghiệp vụ, không có công tắc bỏ chống trùng.

### 10.2. Cấu trúc màn Point miễn phí

| Màn/tab | Nội dung và thao tác |
|---|---|
| Tổng quan | Point đã cấp theo Ads/đăng ký/nạp đầu/điểm danh/mốc; số người nhận, lượt chờ/lỗi; biểu đồ theo ngày; liên kết tới giao dịch nguồn |
| Điểm danh | Bật/tắt, Point mỗi ngày, mốc 3/7/10 và thưởng hai phía; xem trước tổng thưởng; hiển thị múi giờ và quy tắc đứt chuỗi/mốc một lần |
| Giới thiệu bạn bè | Bật/tắt nhận lời mời mới; mức thưởng đăng ký mỗi bên, thưởng nạp đầu; bảng quan hệ người mời–người được mời, ngày đăng ký, trạng thái thưởng và các mốc; hiển thị rõ “Không giới hạn số bạn giới thiệu” |
| Quảng cáo | Bật/tắt phiên mới, cấu hình GAM network/ad-unit hợp lệ, mức thưởng, 5 lượt/ngày, cooldown, trạng thái tích hợp/no-fill/lỗi, phiên đang xử lý; không cho dán JavaScript tùy ý |
| Lịch sử & đối soát | Lọc nguồn, người hưởng, người được mời, ngày, trạng thái, mã giao dịch; xem phiên bản quy tắc, ledger ID và lỗi; retry giao dịch bị treo hoặc bù thưởng theo quyền |

Chi tiết người dùng bổ sung: mã/link giới thiệu, người giới thiệu, danh sách bạn mời phân trang, chuỗi hiện tại, ngày điểm danh gần nhất, mốc đã nhận, thưởng đã cấp và giao dịch liên quan. Không tải toàn bộ mạng lưới vào một bảng không phân trang. Admin không sửa trực tiếp streak hoặc đánh dấu “đã nạp” để phát thưởng; xử lý ngoại lệ qua điều chỉnh có lý do và bằng chứng.

Các trạng thái hiển thị phân biệt: chưa đạt điều kiện, đang cấp, đã cấp, cần đối soát, bị từ chối có lý do. “Chưa nạp lần đầu” không phải lỗi; no-fill không phải hết quota; mất kết nối không hiển thị đã nhận. Một sự kiện có hai người hưởng phải hiển thị trạng thái từng khoản, đồng thời báo lỗi nếu chưa hoàn tất cả hai.

### 10.3. Cấu hình, hiệu lực và quyền quản trị

- Dùng nền cấu hình versioned tại mục 9.7: nháp, validation, preview, diff, publish/đặt lịch và rollback. Point là số nguyên không âm; mốc ngày nguyên dương, duy nhất và có thứ tự. Preview giải thích thưởng ngày và thưởng thêm; kiểm tra tổng không vượt kiểu số của ledger.
- Chính sách hiệu lực: lưu snapshot quyền lợi referral khi gắn lời mời; lưu phiên bản điểm danh cho chuỗi đang chạy và phiên bản Ads khi cấp phiên. Đổi mức chỉ áp dụng lời mời/chuỗi/phiên mới; không đổi quyền lợi đã hứa hoặc trả lại mốc đã nhận. Khi chuỗi mới dùng config mới, các mốc lifetime đã nhận vẫn bị loại. Giao diện phải nêu rõ thời điểm áp dụng.
- Mức thưởng mốc cho người dùng lấy từ snapshot chuỗi; mức thưởng mốc cho người mời lấy từ snapshot lời mời. Backend cần hỗ trợ hai nguồn này, không lấy một config live cho cả hai rồi làm thay đổi cam kết cũ.
- Bật/tắt chỉ ngăn nhận sự kiện mới thuộc phạm vi đã nêu; phiên Ads hợp lệ, claim đã nhận và nghĩa vụ referral đã hứa vẫn được xử lý. Tạm dừng điểm danh phải có thông báo và chính sách bảo toàn chuỗi bị ảnh hưởng, không tự làm người dùng mất chuỗi do bảo trì.
- Owner/quyền publish quản lý cấu hình; quyền xử lý thưởng tách khỏi quyền sửa cấu hình. Support mặc định chỉ xem; xem dữ liệu cá nhân và xuất báo cáo có quyền riêng. API kiểm tra quyền mọi lần, không dựa vào việc ẩn nút.
- Mọi publish, bật/tắt, retry, duyệt/từ chối hoặc bù thưởng ghi actor, lý do, thời gian, target, request ID, before/after và config version. Bù/thu hồi bằng ledger mới tham chiếu giao dịch gốc, không sửa/xóa lịch sử; không tự lấy Point đã nạp để bù thưởng nghi vấn đã tiêu.
- Không cài sẵn hạn mức referral hay ngân sách thử nghiệm làm khóa ngầm. Có thể hiển thị cảnh báo tốc độ phát hành/chi phí cho người vận hành mà không tự cắt thưởng đã hứa.

### 10.4. Backend và dữ liệu bắt buộc

Cùng backend có thẩm quyền đang quản lý ví/Zalo/PayOS phải thực hiện cấp thưởng. Không tạo ví thứ hai trong D1 frontend hoặc dùng localStorage làm chứng từ. Các entity sau là mô hình đề xuất để đối chiếu schema thực:

| Entity | Dữ liệu chính / ràng buộc |
|---|---|
| Reward config versions | Quy tắc, snapshot, thời điểm hiệu lực, trạng thái publish, actor |
| Referrals | Referee duy nhất, inviter khác referee, thời điểm gắn, định danh đã xác thực, snapshot quyền lợi |
| Attendance | User, ngày cuối theo giờ VN, streak, snapshot chuỗi, các mốc lifetime đã cấp |
| Reward events/claims | Nguồn sự kiện, beneficiary, amount, config version, trạng thái, idempotency key, lỗi đối soát |
| Ad sessions | User, ad unit, expiry, ngày quota, trạng thái slot/claim và snapshot thưởng |
| Wallet ledger / audit | Giao dịch cộng/bù, nguồn, liên kết claim/đơn/người được mời; nhật ký quản trị |

- Sự kiện đăng ký chỉ phát từ backend sau xác thực; ghi quan hệ và hai khoản +5 đúng một lần. OAuth callback lặp không cộng lại. Giữ dấu vết định danh tối thiểu để xóa/tạo lại tài khoản không tái nhận; không tự gộp Zalo/Supabase bằng tên/email.
- Hook nạp đầu chạy sau xác minh thanh toán/đối soát ở mục 9.1. Kiểm tra lịch sử thanh toán thật, không chỉ đơn hiện tại; unique reward theo người được mời, không theo mã đơn. Hai đơn thành công đồng thời vẫn chỉ +10 một lần. Tài khoản cũ đã nạp không trở thành “nạp đầu” khi ra mắt chương trình.
- Điểm danh dùng giờ server; đọc/khóa trạng thái, cập nhật streak, lifetime milestones và ghi thưởng cả hai phía trong cùng transaction. Request lặp trả kết quả cũ. Không nhận ngày/streak/Point/inviter từ client làm sự thật.
- Khóa duy nhất cho đăng ký theo referee + beneficiary; nạp đầu theo referee; ngày theo user + ngày VN; mốc theo user đạt mốc + milestone + beneficiary. Đổi config version không thay khóa để cấp lại thưởng cũ.
- Nếu cần nhiều dịch vụ, dùng outbox bền vững và ledger consumer idempotent; có worker đối soát để tránh claim thành công nhưng ví chưa cộng. Retry từ admin phải dùng cùng event ID, không tạo thưởng mới.
- Tín hiệu IP/thiết bị và tốc độ bất thường hỗ trợ review; dùng chung mạng không tự động coi là gian lận. Unlimited referral vẫn yêu cầu chống self-referral, duplicate identity và replay.
- API admin đề xuất: đọc/lưu/publish config, danh sách/chi tiết referrals, attendance, claims, ad sessions, báo cáo và retry/adjustment. Tên endpoint chốt khi đối chiếu backend; mutation cookie auth có CSRF/origin checks; không cung cấp endpoint public tự khai amount để cộng ví.

### 10.5. Ads: quản trị tích hợp và giới hạn xác minh

Dùng Google Ad Manager + GPT Rewarded, user chủ động đồng ý; chỉ cấp theo `rewardedSlotGranted`, không lấy việc đóng slot hoặc video ended làm bằng chứng. Copy “Hoàn thành quảng cáo để nhận 5 Point”; không yêu cầu click hay vận động ủng hộ. Point nội bộ không chuyển nhượng/đổi tiền. Admin AstroX quản lý cấu hình được cấp, không thay thế việc Google duyệt tài khoản/site/inventory.

Google xác nhận Rewarded web không hỗ trợ server-side verification. Session một lần, quota và cooldown ngăn cộng vượt/nhân bản, nhưng không chứng minh xem thật; admin không được hiển thị trạng thái “Google xác minh phía server”. Tham khảo [Google Rewarded web](https://support.google.com/admanager/answer/9116812?hl=en), [GPT sample](https://developers.google.com/publisher-tag/samples/display-rewarded-ad), [reward policies](https://support.google.com/admanager/answer/7496282?hl=en).

Quota chỉ tính lượt đã cấp thưởng, không tính no-fill/AdBlock/đóng trước khi đủ điều kiện. Một phiên hoạt động mỗi tài khoản; quản lý giữ chỗ, hết hạn và giao ngày để không vượt quota đã cấu hình (khởi tạo 5 lượt/ngày). UI có ready, no-fill, unsupported, cooldown, đủ quota, đang xác nhận và lỗi retry. Chưa có ad unit thật thì trạng thái “Chưa cấu hình”, không bật nút giả hoặc phát thưởng thử vào ví production. Không áp hạn mức thử nghiệm bổ sung.

### 10.6. Báo cáo và đối soát

- Tách Point nạp tiền, Ads, thưởng đăng ký, nạp đầu, điểm danh hằng ngày, mốc người dùng và mốc người mời. Số liệu dựa trên ledger thành công, không đếm callback hoặc lượt click.
- Referral funnel: đăng ký hợp lệ → mốc 3/7/10 → nạp lần đầu; người nhận duy nhất, số lượt và số Point riêng. Tỷ lệ milestone dùng cohort đủ thời gian đạt mốc; D1/D7 ghi định nghĩa ngày VN.
- Ads: request, ready, displayed, granted báo từ client và credited xác nhận server là các chỉ số riêng; no-fill, thất bại cấp, cooldown/quota. Doanh thu Google có nguồn/kỳ/thời điểm đồng bộ, phân biệt ước tính và quyết toán; chưa tích hợp thì hiện chưa có dữ liệu, không giả bằng 0.
- Đối chiếu claim với ledger và số dư; cảnh báo thưởng treo, lệch tổng hai người hưởng, trùng event hoặc lượng thưởng bất thường. Chi phí thực dùng dịch vụ tách khỏi giá bán Point; báo cáo hỗ trợ đánh giá ảnh hưởng tới nạp tiền mà không tự giới hạn referral.
- Xuất dữ liệu theo quyền, che thông tin không cần thiết. Không đưa ngày sinh hoặc nội dung luận giải vào bảng referral/báo cáo thưởng.

### 10.7. Kiểm thử nghiệm thu và tình trạng hiện tại

1. Đăng ký hợp lệ cấp +5 mỗi bên ngay, OAuth retry/đăng ký lại/self-referral/tài khoản cũ không nhận trùng. Bạn thứ 11 trở đi vẫn được áp dụng bình thường, không có trần thử nghiệm.
2. Nạp đầu hợp lệ +10 một lần; webhook giả/lặp, hai đơn cùng lúc, redirect giả và mã khuyến mãi miễn phí không cấp sai.
3. Điểm danh nhiều tab/retry chỉ +2 một lần ngày VN; kiểm tra 23:59–00:00, đứt chuỗi, cả ba mốc, sau ngày 10 và tài khoản không có người mời. Mốc cũ không nhận lại khi đứt chuỗi hoặc đổi config.
4. Sau 10 ngày, số Point khớp ví dụ mục 10.1; kiểm tra cả hai beneficiary và ledger, không chỉ kết quả hàm tính.
5. Config nháp, hai admin ghi xung đột, publish/lịch/rollback, snapshot cũ và cache; user thấy đúng quyền lợi mà server áp dụng. Tắt chương trình/bảo trì không bỏ mất claim hợp lệ đã nhận.
6. Ads không fill, đóng trước/sau granted, callback trùng/giả, expiry, ngày mới và thay config; không vượt quota và không hứa chống giả lập callback hoàn toàn.
7. Crash giữa các bước và retry/đối soát không cộng trùng hoặc mất một phía; user/support không gọi được API publish/bù thưởng; audit đầy đủ.
8. Kiểm tra admin cùng UI ví/điểm danh/link giới thiệu thực, mobile, trạng thái lỗi và số dư sau refresh; không nghiệm thu chỉ bằng fixture.

Đã có phần tính quy tắc thuần trong `services/rewards/rules.ts`, kiểm thử `services/rewards/rules.test.mjs` và ghi chú tích hợp `services/rewards/README.md`; đây không phải backend ví hoàn chỉnh. Bảy kiểm thử thuần đã đạt ở lượt triển khai trước, chưa chứng minh transaction, concurrent requests, API hoặc admin hoạt động. Source backend ví vẫn cần được cung cấp để nối đúng hệ thống. Kế hoạch triển khai tại `docs/plans/2026-09-22-free-points-implementation.md`. Phần snapshot hai nguồn và chính sách bảo trì nêu trên cần được bổ sung vào lớp orchestration khi xây backend; không mặc định hàm thuần hiện tại đã xử lý.


### 10.8. Ma trận cấu hình chi tiết — bổ sung theo yêu cầu mới nhất

Mục này cụ thể hóa “cần config được” và có ưu tiên nếu mô tả trước đó xem một giá trị mặc định là cố định. Các giá trị ở mục 10.1 là seed config, không hard-code trong UI hoặc orchestration. Thay đổi có schema, quyền, phiên bản, preview, thời điểm hiệu lực và backend consumer thực sự.

| Nhóm | Trường admin được cấu hình | Mặc định / quy tắc áp dụng |
|---|---|---|
| Đăng ký | Bật/tắt chương trình; Point người mới; Point người mời; phạm vi có lời mời/không có lời mời; lịch hiệu lực | Giữ +5/+5 khi có lời mời hợp lệ; ngoài referral chưa bật thưởng đăng ký. Xác thực và một lần mỗi định danh luôn bắt buộc |
| Nạp đầu | Bật/tắt; Point người mời; bonus người nạp nếu bật riêng; ngưỡng tiền nạp hợp lệ; gói được áp dụng; cộng dồn khuyến mãi | Người mời +10; bonus riêng người nạp mặc định tắt; chỉ thanh toán thật đã xác minh. Ngưỡng chỉ xét lần thanh toán thật đầu tiên, không biến lần thứ hai thành “nạp đầu” |
| Điểm danh | Bật/tắt; Point/ngày; lịch chương trình; cách bảo toàn chuỗi khi bảo trì | +2/ngày; ngày theo Asia/Ho_Chi_Minh; một lần/ngày. Thay múi giờ chỉ qua migration được kiểm tra vì ảnh hưởng khóa chống trùng |
| Mốc chuỗi | Thêm/sửa/ngừng mốc; số ngày; Point người dùng; Point người mời; bật/tắt từng phía | Seed 3–7–10 với mức hiện tại; ngày nguyên dương, duy nhất; mỗi mốc một lần lifetime. Mốc đã cấp và nghĩa vụ từ snapshot cũ được giữ; đổi ID không được dùng để cấp lại cùng quyền lợi |
| Referral | Chế độ không giới hạn hoặc có hạn mức; nếu bật giới hạn: số bạn đủ điều kiện được thưởng theo ngày/tháng/toàn kỳ, lịch hiệu lực; bật/tắt nhận lời mời mới | Khởi tạo unlimited, biểu diễn rõ bằng mode, không dùng 0 mơ hồ. Không giới hạn số link/chia sẻ. Hạn mức thưởng phải hiện cho user, chỉ áp dụng liên kết mới, không cắt cam kết cũ; cấu hình hiện tại không tự có trần |
| Ads | Network/ad-unit, vị trí đã hỗ trợ, bật/tắt, Point/lượt, quota/ngày, cooldown, thời hạn phiên, lịch hoạt động, copy theo template | +5/lượt, 5 lượt/ngày, cooldown đề xuất 90 giây. Config phải nằm trong khả năng adapter và chính sách nhà cung cấp; server khóa quota với snapshot, không tin client |
| Quản lý thưởng | Bộ lọc/view đã lưu; điều kiện chờ review; ngưỡng cần người duyệt thứ hai; giới hạn bù thưởng theo vai trò; lý do chuẩn; retry/backoff và cảnh báo claim treo | Bù qua ledger tham chiếu nguồn; retry giữ nguyên event ID; không sửa Point hoặc trạng thái lịch sử trực tiếp |
| Báo cáo | Khoảng thời gian, nguồn thưởng, cohort, nhóm dữ liệu, cột, lịch tổng hợp/xuất, định dạng, múi giờ hiển thị, ngưỡng cảnh báo | Phân quyền export; định nghĩa chỉ số và version hiển thị rõ. Đổi múi giờ báo cáo không đổi ngày điểm danh; không cho công thức tùy ý làm sai số ledger |
| Phân quyền | Tạo vai trò từ danh sách capability; gán/thu hồi vai trò; quyền xem/sửa/publish/secret/duyệt/bù/export; ngưỡng phê duyệt theo giá trị | Server thực thi mọi request; ngăn tự nâng quyền và mất owner cuối cùng. Support khởi tạo chỉ xem; không có nút bỏ kiểm tra quyền |
| Nhật ký | Bộ lọc, quyền xem/export, thời gian lưu theo ngưỡng tối thiểu hệ thống, nơi lưu trữ được hỗ trợ, cảnh báo hoạt động | Luôn ghi tác động tiền, quyền, secret và publish. Không cho tắt/xóa/sửa nhật ký bắt buộc; log không chứa secret dù config thế nào |
| Chống gian lận/cộng trùng | Ngưỡng tốc độ, cửa sổ phát hiện bất thường, cooldown, danh sách ngoại lệ có hạn, hành động cảnh báo/chờ review và thời gian xử lý | Unique event, kiểm tra định danh, chống replay, self-referral và transaction luôn bắt buộc. IP chung không tự chứng minh gian lận; thay ngưỡng không thay khóa idempotency |
| Đối soát ví | Lịch chạy, batch size, lookback, tuổi claim treo, retry/backoff tối đa, ngưỡng cảnh báo, chế độ chỉ báo cáo hoặc sửa các trường hợp xác định an toàn | Mọi lệch Point đều được phát hiện, không cho đặt sai số để bỏ qua mất cân bằng. Tự sửa chỉ replay idempotent khoản có bằng chứng; điều chỉnh khác qua phê duyệt và bút toán mới |
| Backend vận hành | Timeout, concurrency, retry, TTL phiên/cache, batch/queue, lịch job, health alert và kill switch ngừng nhận việc mới | Giá trị có giới hạn kỹ thuật; config không tắt webhook/đối soát/hoàn giữ chỗ cho việc cũ. Binding DB, khóa mã hóa và code adapter vẫn thuộc deployment |
| Nghiệm thu | Bộ dữ liệu test, số user/request đồng thời, cấu hình cần chạy, mốc thời gian giả lập trong test, ngưỡng latency/error, bộ viewport và báo cáo kết quả | Màn “Kiểm tra cấu hình” chỉ chạy fixture/mock hoặc môi trường test tách biệt; không cộng tiền thật. Không cho tắt các kiểm tra bắt buộc về phân quyền, chữ ký, chống trùng, ledger và snapshot để được pass |

**Chính sách thay đổi quota:** quota Ads tính theo ngày server và policy ngày có version được chốt khi dùng lần đầu; các phiên đang mở giữ snapshot. Thay quota/cooldown có hiệu lực từ ngày tiếp theo với user đã có policy ngày; UI hiển thị chính xác thời điểm. Referral giới hạn, nếu được admin bật, giữ slot nguyên tử khi liên kết hợp lệ được tạo; đạt trần phải thông báo trước, không hứa thưởng rồi âm thầm từ chối.

**Mốc và snapshot:** cả mức thưởng và tập mốc có hiệu lực phải được snapshot. Không xóa mốc còn nghĩa vụ. Quyền lợi người mời từ snapshot lời mời có thể cần đánh giá riêng với tập mốc của người dùng trong snapshot chuỗi; không chỉ lặp qua các mốc live rồi bỏ mất khoản đã hứa. Nếu thay số ngày mốc, preview phải chỉ ra cohort bị ảnh hưởng; không dùng tái tạo config để reset lifetime claims.

**Hợp đồng quản trị:** API schema/validate/draft/publish/effective/history/rollback cho từng nhóm; quyền hạn và secrets được lọc ở server. Public config chỉ chứa quyền lợi/giá/quota người dùng cần thấy; không lộ khóa, ngưỡng phát hiện gian lận hoặc quyền admin. Mỗi trường phải có mô tả, đơn vị, mặc định, giá trị hợp lệ, nguồn kế thừa và thời điểm hiệu lực. Registry field → backend consumer → public/admin UI → test chứng minh hiệu lực là tài liệu nghiệm thu bắt buộc.

**Nghiệm thu tính cấu hình được:** chạy ít nhất seed config và một config khác (mức Point, mốc, quota, cooldown, referral limited/unlimited); kiểm tra publish và rollback, snapshot cũ, hai admin xung đột, cùng event gửi nhiều lần, crash giữa claim/ledger và đối soát lặp. Kết quả mong đợi lấy từ snapshot độc lập đã chốt, không chỉ gọi lại hàm đang được kiểm thử. Unlimited phải vượt mốc 10 bạn bình thường; mode có giới hạn phải thực thi đúng trần công khai và không cắt quyền cũ. Chưa có backend consumer hoặc test tương ứng thì trường được ghi “chưa tích hợp”, không đánh dấu hoàn tất vì form lưu được.

Phạm vi lượt cập nhật này chỉ là phương án; chưa sửa `services/rewards/rules.ts`, API, database hoặc giao diện. Hàm hiện tại đã nhận mức thưởng/mốc qua `RewardConfig`, nhưng chưa có đầy đủ mode referral, quota Ads, quyền publish, jobs hoặc registry nói trên. Cần mở rộng trong giai đoạn triển khai, không coi khả năng cấu hình thuần là admin hoạt động end-to-end.
