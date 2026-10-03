# Khảo sát polish AstroX — 03/10/2026

Owner: Codex root. Nguồn production: commit `1f00748`. Nhánh thực hiện nút Chỉ tay: `codex/palm-buttons-polish`.

## Kết luận và hướng đề xuất

AstroX đã có nền thiết kế phù hợp: nền kem, chữ serif ở tiêu đề, các bề mặt sáng và xanh rừng cho tác vụ chính. Nên polish theo từng lớp trên nền này: chuẩn hóa nút, icon, chữ và khoảng cách; sau đó sửa bố cục của từng hành trình. Giữ khác biệt nội dung giữa Tarot, lịch, lá số và Chỉ tay. Không áp kiểu scanner của Chỉ tay lên mọi module.

Ba hướng đã cân nhắc:

| Hướng | Giá trị | Hạn chế | Đề xuất |
|---|---|---|---|
| Chuẩn hóa từng lớp, rồi polish từng luồng | Sửa các điểm đang lệch, dễ kiểm chứng và triển khai từng đợt | Cần duy trì hệ thống thành phần chung | Chọn hướng này |
| Chỉ thêm icon toàn site | Nhanh và dễ nhận biết hành động | Không xử lý bảng giá dài, thông tin lặp hay phân cấp nội dung | Dùng như bước đầu |
| Thiết kế lại toàn bộ | Có thể tạo ngôn ngữ mới | Phạm vi lớn, phải kiểm lại lịch, lá số, đọc AI, ví và điều hướng | Chưa cần |

## Bằng chứng và giới hạn

- Khảo sát public trên production ở 390px: Trang chủ, Tử Vi, Cung Hoàng Đạo, Kinh Dịch, Bát Tự, Thần Số Học, Tarot, Tương Hợp, Lịch âm, Chỉ tay, Chuyên gia, Hồ sơ, Bảng giá, Điều khoản; bốn section Hồ sơ; các module tương ứng bản EN.
- Đối chiếu desktop 1280px: Trang chủ, Tarot, Kinh Dịch, Lịch âm, Tương Hợp, Bảng giá, Astrology, Numerology. Chỉ tay xem cả desktop và mobile trong đợt chỉnh nút.
- Đọc nguồn dùng CodeGraph: AppShell, Btn, FeatureIcon, PalmReader/PalmCamera, globals.css, CSS module, ProfileModal, PricingContent, serviceTree và danh mục thành phần Admin.
- Không có tràn ngang toàn trang trong các view đã đo. Đây không phải chứng nhận mọi trạng thái responsive.
- Public guest không thể xác minh toàn bộ kết quả lá số/AI, ví sau đăng nhập, thanh toán, cuộc hẹn hay quyền Admin. Các màn này cần tài khoản QA và dữ liệu kiểm thử trong đợt implementation.
- Screenshot kết quả Chỉ tay ở local dùng dữ liệu hư cấu, không có ảnh tay thật, không gọi AI và không trừ Point. Không dùng làm bằng chứng chất lượng luận giải.
- Bản EN và desktop/mobile có file JSON đo kích thước riêng; không suy diễn viewport từ tên screenshot.

Bằng chứng lưu tại `/Users/Thsonjpg/.codex/visualizations/2026/10/03/01a0ff65-7874-7550-abcb-1239895f6211/palm-buttons-polish/`: `site-audit-mobile.json`, `site-audit-en-mobile.json`, `site-audit-desktop.json` và screenshot cùng thư mục.

## Danh sách ưu tiên

| Mức | Phát hiện | Bằng chứng | Cách polish / tiêu chí nghiệm thu |
|---|---|---|---|
| P1 | Hành động thiếu icon và cỡ chữ không thống nhất | CTA Cung Hoàng Đạo 16px, Tarot 15px, Bát Tự/Kinh Dịch 14px; nhiều nút dùng ↗, ×, ‹, › | ActionButton/IconButton chung, icon SVG cùng nét, nhãn gọn 12–13px; tác vụ chính vùng bấm 48px, phụ 44px; giữ accessible name và badge giá |
| P1 | Một số nút phụ nhỏ, khó bấm | Tarot nút âm thanh 28px, đổi bộ 42px; xóa lịch sử Kinh Dịch 36px; Lịch âm nút điều hướng/hôm nay 36px; Tử Vi hoàn tất hồ sơ 40px | Mở rộng hit area mà không làm icon phình; đo lại kích thước ở 320/390px; focus không bị dock che |
| P1 | Chỉ tay chưa có trong Bảng giá | Main text không chứa Chỉ tay; `PricingContent.tsx:144–146` chỉ lấy node có children; các hàng tại depth 1 không render serviceIds | Hiển thị cả dịch vụ đơn theo service ID; test parity với public billing VN/US; giữ giá server, trạng thái pause/free/paid và phí hỏi tiếp rõ trước xác nhận |
| P1 | Bảng giá quá dài và khó quét | Cao 13.374px ở 390px và 12.200px ở 1280px trong bản VI | Mục lục module + tìm kiếm; accordion nhóm; giá và phạm vi dùng song song; giữ đường dẫn/điểm neo và nội dung đầy đủ, không thay bảng giá bằng bản rút gọn thiếu dịch vụ |
| P1 | Phân cấp hồ sơ bị lặp | Section personal/account/preferences hiện tiêu đề section và tiêu đề nội dung trùng nhau | Giữ một tiêu đề chính, một dòng mô tả; nhóm thông tin cá nhân, ví, tài khoản rõ; trạng thái thiếu hồ sơ dùng một CTA nhất quán |
| P2 | Mật độ đầu trang chưa đều | Desktop 1280 có 11 mục điều hướng VI; tên dài chia hai dòng. Mobile có header, heading và bước/tabs gần nhau | Rà hierarchy theo viewport; chuẩn chiều cao header, khoảng cách và tiêu đề; giữ quick links trong grid vuông theo contract; không giấu route quan trọng |
| P2 | Chữ phụ quá nhạt/nhỏ ở một số module | CSS Thần Số Học nhiều nhãn 9–11px, màu muted hard-code; Tarot hướng dẫn màu nhạt | Dùng token text-secondary thay màu tùy ý; đo contrast sau compositing; giữ body/luận giải dễ đọc và lựa chọn cỡ chữ lớn; chữ nhỏ của nút không áp lên mọi nội dung |
| P2 | Empty state không đồng nhất | Tử Vi “Hoàn tất hồ sơ”, Bát Tự/Thần Số “Bổ sung hồ sơ”, Hoàng Đạo “Hoàn tất hồ sơ”; chuyên gia chỉ báo chưa có lịch | Mẫu EmptyState có icon module, một lời giải thích và một CTA; phân biệt chưa đăng nhập, thiếu hồ sơ, chưa có nội dung, lỗi mạng và dịch vụ tạm ngưng |
| P2 | Luồng đọc dài cần hành động rõ và phục hồi tốt | Chỉ tay mới có lưu/hỏi tiếp/so sánh, module khác có khung AI riêng | ReadingSection + ReadingActions thống nhất; quan sát/căn cứ khác diễn giải; retry/cancel giữ dữ liệu; accordion không mặc định giấu phần cần đọc; không làm mới AI khi chỉ đổi bố cục |
| P2 | EN còn lỗi microcopy cần lượt riêng | Tarot hiển thị “One card1 cards”; EN các module có nhãn dài hơn VI | Kiểm singular/plural, wrapping, ngày/tiền tệ theo locale; kiểm không sót VI, không đổi service IDs hay giá theo tên dịch |
| P3 | Hiệu ứng và bề mặt cần tiết chế đồng bộ | globals dùng nhiều glass/blur, module có animation riêng | Token radius/shadow/motion; reduced-motion; xem GPU/scroll thực tế trước tối ưu. Chưa đo Core Web Vitals nên không kết luận chậm |
| P3 | Admin cần polish theo tác vụ quản trị riêng | Nguồn có Card/Fields/Empty, editor bảng giá và cấu hình nhiều nhóm | Rà với quyền QA: tìm kiếm/lọc, table density, sticky actions, thay đổi chưa lưu và lỗi inline. Không áp typography “chữ bé” vào dữ liệu cần vận hành |

## Ngôn ngữ thiết kế đề xuất

- Giữ kem + xanh rừng + màu nhấn ngọc; module có accent riêng nằm trong một hệ token. Bề mặt, bo góc và shadow dùng cùng thang đo.
- Tiêu đề dùng Beautique, nội dung dùng Be Vietnam Pro. H1 mobile khoảng 28–32px, desktop 36–44px; H2 22–28px; nội dung dài 15–16px, nút 12–13px; nhãn phụ ưu tiên từ 12px. Đây là baseline thiết kế, cần kiểm bằng screenshot/text resize trước áp toàn site.
- Icon tác vụ 18–20px, icon navigation 20–24px; cùng nét 1.55px và currentColor. Icon cạnh nhãn là trang trí (`aria-hidden`); nút chỉ icon phải có tên truy cập. Không dùng emoji làm icon tác vụ.
- CTA chính một màu nhấn rõ; phụ có viền; xóa dùng màu cảnh báo và nhãn rõ. Nút có giá phải giữ badge hiển thị; disabled/loading không nhảy chiều rộng.
- Thang khoảng cách 4/8/12/16/24/32px, container và gutter thống nhất. Long reading có độ rộng dòng vừa đọc; tránh kéo dài edge-to-edge trên desktop.
- Focus ring rõ trên nền sáng/tối, trạng thái selected không chỉ dùng màu; không để sticky actions đè nội dung cuối, keyboard focus hoặc mobile dock.

## Chia đợt implementation

1. **Foundation + hành động:** ActionButton, IconButton, ActionLabel; token typography/spacing/contrast; áp vào nút và CTA của các module. Owner tích hợp duy nhất cho AppShell/kit; không đổi pricing/auth.
2. **Khám phá + hồ sơ:** entry/empty state, quick links, form profile, section headers; ưu tiên onboarding và mobile. Dùng dữ liệu QA cho VI/EN, xác minh lưu/sync đúng tài khoản.
3. **Giá + ví:** sửa leaf services bị lọc, accordion/search theo module, badge giá; kiểm free/paid/paused/bundle/upgrade và VN/US. Không thay chính sách tính giá trong đợt visual polish.
4. **Các luồng chuyên biệt:** Tarot deck/spread, lịch, lá số, Chỉ tay và trạng thái đọc AI. Rà từng module theo task, không phủ một CSS toàn cục lên mọi màn.
5. **Admin + hoàn thiện:** kiểm quyền, bảng/editor, trạng thái unsaved, contrast, bàn phím, reduced motion, đo hiệu năng và ảnh trên thiết bị.

Mỗi đợt có branch/worktree riêng, ảnh before/after, regression đúng luồng, build/CI và kiểm production. Tích hợp tuần tự, dễ rollback; không đánh dấu hoàn tất website dựa vào guest smoke.

## Nghiệm thu chung

- 320/390/768/1280/1440px, VI và EN; portrait/landscape với mẫu kiểm representative.
- Không overflow, nhãn dài không bị cắt; cỡ chữ 200% vẫn đọc/bấm được, giới hạn safe area và dock đúng.
- Contrast văn bản thường tối thiểu 4.5:1; icon ý nghĩa/focus/control đạt theo vai trò. Nút quan trọng dùng vùng bấm 44–48px theo thiết kế AstroX; WCAG 2.2 AA target-size minimum có baseline 24 CSS px cùng ngoại lệ, không coi 44px là mọi yêu cầu web.
- Bàn phím, screen reader labels, disabled/selected/expanded; giảm chuyển động; modal focus và trả focus.
- Giá/bundle/consent không đổi; AI không gọi khi chỉ resize/tab/reopen; ảnh/lịch sử theo tài khoản/locale; retry không mất dữ liệu.
- Đọc AI có pending/error/cancel/success và account-switch regression riêng. Thanh toán/camera thật cần kiểm đúng môi trường, không suy từ mock.

Nguồn chuẩn: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). Đây là tiêu chí thiết kế/kiểm thử, không phải tuyên bố website đã đạt WCAG.

## Phần thực hiện ngay trong lượt này

Chỉ tay: bổ sung SVG theo tác vụ cho camera/chọn ảnh/chụp lại/thay/xóa/phóng to, lưu/đã lưu/thêm tay, hỏi tiếp/gợi ý/dừng, đèn/thử lại/đóng và chuyên gia. Nhãn 12px, icon 18px, CTA 48px, phụ 44px. Giữ logic, giá, consent và hình ảnh. Phần polish rộng trong tài liệu là kết quả nghiên cứu để triển khai theo các đợt trên.
