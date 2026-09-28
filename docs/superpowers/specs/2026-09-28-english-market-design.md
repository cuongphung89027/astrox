# AstroX English / US — thiết kế để duyệt

Ngày: 2026-09-28. Owner: Codex, chat hiện tại.
Branch: `codex/english-market-design`.
Base: `db614b23eb549efcc38b5117c15220e0faa14b4f` (origin/main).
Scope lượt này: chỉ tài liệu này; không sửa source, cấu hình live hoặc triển khai.
Trạng thái: phạm vi sản phẩm đã thống nhất; chi tiết kiến trúc bên dưới là đề xuất để duyệt.

## 1. Quyết định đã thống nhất

- Cá nhân vận hành; bán nội dung AI tự động trước.
- Đầy đủ tính năng như AstroX Việt Nam, ngoại trừ đặt lịch chuyên gia. Không rút gọn còn ba bộ môn.
- Giữ trải nghiệm và hành vi tương đương; nội dung tiếng Anh và thanh toán phù hợp thị trường US.
- Mua Credits bằng USD; dùng Credits cho nhiều tính năng. Lemon Squeezy là nhà cung cấp ưu tiên, phụ thuộc duyệt sản phẩm.
- Bản US đăng nhập bằng Google; không triển khai đăng nhập email/mật khẩu, magic link hoặc Apple trong phạm vi này. Bản Việt giữ đăng nhập hiện tại.
- Cùng tên miền, bản Anh tại `/en/...`; giữ các URL tiếng Việt hiện có.
- Tự chọn phiên bản khi lần đầu vào trang chủ dựa trên quốc gia; ghi nhớ lựa chọn thủ công; không ép chuyển link có ngôn ngữ rõ.

## 2. Phạm vi và tính tương đương

Bản Anh bao gồm Tử Vi, Tarot, Hoàng Đạo/Birth Chart, Kinh Dịch, Bát Tự, Thần Số Học, Lịch Âm, xem tay, tương hợp; cùng hồ sơ, lịch sử, hỏi tiếp, ví, ưu đãi, thưởng, mở khóa và nâng cấp đang có trong bản Việt. Khi lập kế hoạch phải lấy danh mục tại commit triển khai làm nguồn đối chiếu và lập ma trận từng route/hành động/quyền lợi.

Loại đặt lịch chuyên gia khỏi menu, khám phá, danh mục bán và route tiếng Anh. Không thay đổi tính năng này ở bản Việt. Không thêm subscription hoặc tính năng mới chỉ dành cho US trong phạm vi đầu tiên.

Không chỉ dịch chữ UI: dịch nội dung AI, biểu đồ, giải thích thuật ngữ, trạng thái lỗi, thông báo, email, metadata, hỗ trợ và chính sách. Các thuật ngữ như Zi Wei Dou Shu, Four Pillars/Ba Zi, I Ching có bảng thuật ngữ thống nhất. Tên riêng và thuật ngữ gốc có thể giữ nguyên có giải thích.

## 3. Cấu trúc dùng chung

Dùng chung component và bộ máy tính; bổ sung ba ngữ cảnh độc lập: `locale`, `market`, `currency`. Locale là ngôn ngữ đọc; market quyết định danh mục giá, nhà cung cấp và đơn vị ví; currency là đơn vị tiền trên đơn hàng.

Tách chuỗi giao diện khỏi logic. Shared registry/config/navigation chỉ được chỉnh qua một integration owner theo docs/agent-workflow.md. Admin có khả năng quản lý bản dịch, prompt tiếng Anh, giá USD và mapping sản phẩm Lemon; không nhân bản toàn bộ Admin. Đề xuất giữ ngôn ngữ giao diện Admin hiện tại cho người vận hành.

Giữ ID dịch vụ ổn định. Cache AI phải phân biệt locale, phiên bản prompt và input; không dùng nhầm báo cáo tiếng Việt cho yêu cầu tiếng Anh. Báo cáo đã lưu giữ ngôn ngữ gốc; đổi UI không tự tạo lại hoặc tính phí.

## 4. URL, nhận diện quốc gia và SEO

- Giữ URL Việt hiện có; route tiếng Anh dưới `/en` có slug dễ hiểu và mapping sang cùng dịch vụ.
- Chỉ xét chuyển tự động tại `/`, không áp dụng cho API, webhook, callback đăng nhập/thanh toán hay route nội dung cụ thể.
- Tại entrypoint: lựa chọn đã lưu được ưu tiên; nếu chưa có, VN chọn Việt, US chọn Anh; quốc gia khác/không rõ dùng Accept-Language, mặc định Anh.
- Người truy cập trực tiếp `/en/...` luôn xem tiếng Anh; link Việt nội dung luôn giữ bản Việt.
- Bộ chọn ngôn ngữ mở trang tương đương và ghi nhớ cookie; người đã đăng nhập có thể lưu preference trong tài khoản. Cần hành động đổi ngôn ngữ rõ khi muốn trở lại trang chủ Việt từ bản Anh.
- Chuyển hướng tạm thời, không cache chung kết quả nhận diện theo khách; tránh vòng lặp. Có liên kết HTML tới cả hai phiên bản, hreflang, canonical tự tham chiếu và sitemap.
- IP chỉ là gợi ý; không dùng để phân quyền hoặc sửa ví/đơn hàng. Không cần GPS.

## 5. Danh tính, ví và thanh toán

Đã chốt đăng nhập Google cho bản Anh, giữ Zalo cho Việt. Giao diện US có nút “Continue with Google”; không hiển thị Zalo hoặc phương án đăng nhập email/Apple. Email từ Google dùng cho hồ sơ và liên hệ, không phải một phương thức đăng nhập riêng.

Một user ID nội bộ; danh tính Google được ánh xạ bằng định danh nhà cung cấp đã xác thực ở server. Đăng nhập lại không tạo tài khoản trùng. Không tự gộp với tài khoản Zalo chỉ vì email giống nhau; liên kết tài khoản, nếu bổ sung, phải chứng minh quyền sở hữu cả hai. Đổi ngôn ngữ không làm mất phiên đăng nhập hiện có.

Luồng Google cần kiểm tra callback hợp lệ, chống giả mạo đăng nhập, xử lý hủy/từ chối/lỗi bằng tiếng Anh và quay về đúng trang trước đăng nhập. Không tin thông tin danh tính do client tự gửi. Cấu hình OAuth tách môi trường và giữ secret ở server.

Đề xuất hai sổ ví tách theo market: Point/VN và Credits/US. Không tự chuyển đổi số dư hay gói mua khi đổi ngôn ngữ. Thị trường được trình bày và xác nhận trước lần mua đầu; không đổi theo IP sau đó. Quyền truy cập báo cáo đã mua phải gắn đúng chủ sở hữu, không mất chỉ vì đổi UI. Đây là chi tiết kiến trúc cần người dùng duyệt, chưa phải yêu cầu đã xác nhận.

Gói Credits được quản lý trong Admin, ánh xạ sang product/variant Lemon theo môi trường test/live. Chưa kích hoạt giá thương mại trong tài liệu này; giá và số Credits sẽ là cấu hình được duyệt riêng sau khi tính chi phí AI và phí bán hàng.

Luồng: đăng nhập → chọn gói, xem USD và quyền lợi → backend tạo đơn theo giá server → Lemon checkout → webhook xác thực → ghi đơn và cộng Credits đúng một lần → UI đọc trạng thái đơn từ backend. Trang return không có quyền cộng Credits.

Xử lý webhook lặp, đến trễ, sai thứ tự; đối chiếu môi trường, đơn, chủ sở hữu, variant và số tiền. Giữ trạng thái pending khi chưa đủ bằng chứng; có tác vụ đối soát khi bỏ lỡ webhook. Không gửi ảnh bàn tay, dữ liệu ngày sinh hoặc câu hỏi riêng tư sang checkout.

Giá sử dụng hiển thị trước thao tác; server quyết định giá và quyền truy cập. Đề xuất reserve/commit/release cho lượt AI: thành công ghi chi, thất bại giải phóng, retry cùng operation không thu hai lần. Phải hòa hợp với quyền mở khóa/nâng cấp hiện có, không chuyển mọi dịch vụ thành tính phí theo lượt. Đọc lại kết quả đã lưu không thu thêm.

Theo dõi riêng Credits mua và tặng. Đề xuất Credits mua không hết hạn; thưởng theo chính sách công khai. Refund/dispute tạo bút toán bù, không xóa lịch sử; nếu Credits đã dùng, chuyển xử lý có kiểm soát và chặn lạm dụng, không âm thầm lấy Point Việt. Chính sách hoàn tiền phải được chốt trước mở bán.

## 6. Bản địa hóa dữ liệu

Kiểm chứng nơi sinh quốc tế, tọa độ, múi giờ IANA và DST theo ngày sinh. Phân biệt giờ sinh với múi giờ hiển thị hiện tại. Không hard-code UTC+7 cho người dùng US.

Quy tắc tính lịch âm/Tử Vi/Bát Tự ở ngoài Việt Nam phải được xác định theo từng engine và kiểm tra bằng mẫu tham chiếu; không đổi thuật toán chỉ để dịch giao diện. Thần Số Học cần kiểm tra tên có dấu/ký tự quốc tế theo quy tắc đã chọn. Cùng input chuẩn hóa phải cho cùng kết quả số học ở hai locale.

## 7. Duyệt Lemon và mở bán

Lemon liệt kê Việt Nam trong danh sách payout và hỗ trợ thẻ, PayPal, Apple Pay, Google Pay tùy thiết bị/vị trí. Đây không phải bằng chứng AstroX đã được duyệt.

Hồ sơ mô tả trung thực: phần mềm tạo nội dung AI về astrology/Tarot và các bộ môn hiện có; Credits trả trước dùng nội bộ, không chuyển nhượng hoặc rút tiền; không tư vấn trực tiếp. Chuẩn bị website demo, báo cáo mẫu, bảng quyền lợi và chính sách. Xin xác nhận mô hình Credits và loại nội dung trước live; không chỉ đổi tên dịch vụ để tránh quy định.

Tích hợp có thể kiểm thử bằng test mode; bán thật phụ thuộc duyệt store, xác minh danh tính, payout, giá và chính sách. Nghĩa vụ thu nhập của người vận hành cần xử lý riêng với phần thuế bán hàng mà MoR đảm nhiệm.

Nguồn đã kiểm tra trong cuộc trao đổi:
- https://docs.lemonsqueezy.com/help/getting-started/prohibited-products
- https://docs.lemonsqueezy.com/help/getting-started/supported-countries
- https://docs.lemonsqueezy.com/help/getting-started/activate-your-store
- https://docs.lemonsqueezy.com/help/checkout/payment-methods
- https://developers.cloudflare.com/rules/snippets/examples/country-code-redirect/
- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites

## 8. Các gói triển khai và tiêu chí nghiệm thu

1. Inventory parity và hợp đồng locale/market/identity/wallet; chốt cơ chế ví trước migration.
2. Routing và bản địa hóa đầy đủ UI, nội dung, metadata; giữ regression bản Việt.
3. AI tiếng Anh và dữ liệu quốc tế; kiểm tra độc lập chất lượng luận giải cùng engine parity.
4. Đăng nhập Google cho US, Credits, Lemon test mode và công cụ Admin.
5. QC đầy đủ, duyệt thương mại rồi release có kiểm soát.

Nghiệm thu: ma trận parity không thiếu tính năng trong phạm vi; không sót tiếng Việt ngoài thuật ngữ/tên riêng; kiểm tra responsive, bàn phím, reduced motion; chuyển ngôn ngữ không mất trạng thái đã lưu; URL trực tiếp, cookie, VPN/quốc gia không rõ không gây loop; crawler truy cập được cả hai bản.

Thanh toán phải có positive/negative tests cho chủ sở hữu, webhook giả/trùng/trễ, sai môi trường, giá client bị sửa, thanh toán bỏ dở, refund, dispute, retry AI và đối soát. Kiểm chứng thanh toán live/hoàn tiền và payout riêng, không suy từ test mode.

Release owner triển khai từ một SHA đã xác minh, migration cộng thêm trước Worker rồi Pages, kiểm tra production và lưu rollback. Có cờ tắt checkout US độc lập; rollback không xóa đơn hoặc ledger.

## 9. Tình trạng tự rà soát

Tài liệu giữ toàn bộ phạm vi người dùng đã chốt, không thêm subscription hoặc chuyên gia. Google cho US là quyết định đã được người dùng xác nhận. Các đề xuất ví, hạn Credits và hoàn tiền được ghi rõ, không giả định đã được duyệt. Giá và provider approval là điều kiện thương mại trước live, không phải lý do trì hoãn inventory/bản địa hóa. Chưa có thay đổi sản phẩm hoặc bằng chứng triển khai trong lượt này.
