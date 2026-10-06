# AstroX — báo cáo luận giải trực quan và hợp đồng prompt

Trạng thái: đề xuất thiết kế và prompt nháp; chưa tích hợp renderer hoặc publish prompt.

Owner: `/root`. Branch: `codex/visual-reading-report`.
Base: `bc7efe3e6a2a90854903e7b6125cf41f851837a7` (`origin/main`, đã fetch).
Source audit: checkout người dùng tại `2fd3c1b850cc1a9fc054d54d1897cf0eaa568596`.
Hai checkout khác nhau ở một số file. Trước khi triển khai, rebase lên SHA đã được release owner xác nhận và kiểm tra lại các điểm tích hợp.
Touched scope: tài liệu trong `docs/superpowers/specs/` và `docs/visual-readings/`; mẫu giao diện nằm trong thư mục visualization của chat. Không sửa shared contracts trong bản đề xuất này.

## Mục tiêu và phạm vi

Biến một luận giải theo hồ sơ/topic thành báo cáo có chương, các tầng thông tin và visual gắn với nhận định. Phạm vi module: Tử Vi, Cung Hoàng Đạo, Bát Tự, Thần Số Học, Tương Hợp. Tarot/Kinh Dịch theo lượt không thuộc đợt này.

Một báo cáo gắn với đúng `serviceId` đã yêu cầu. Các chương là cách tổ chức nội dung của topic đó, không tự mở thêm topic hoặc quyền truy cập có tính phí.

## Học từ bộ ảnh tham chiếu

- Mục lục, số chương và điều hướng trước/sau giúp người đọc biết mình đang ở đâu.
- Mở chương bằng hình và một luận điểm rõ tạo nhịp giữa các phần.
- Biểu đồ xuất hiện trước diễn giải dài; hai khối tổng quan giúp quét điểm mạnh/điểm cần cân bằng.
- Tiêu đề từng luận điểm, khoảng cách và điểm nhấn hình ảnh giúp tránh một đoạn văn liên tục.

Chuyển các nguyên tắc này thành ngôn ngữ AstroX: Beautique Display + Be Vietnam Pro, logo hiện có, nền kem, ngọc/xanh theo module, vàng nhẹ, khối glass và viền sáng. Không sao chép hình minh họa, palette bạc hà, văn bản, góc trang hoặc cấu trúc nội dung riêng của nguồn.

Các ảnh là tham chiếu trình bày, không phải nguồn dữ liệu để luận giải người dùng. Không suy ra hồ sơ, sao, giờ sinh hoặc tính cách từ ảnh.

## Cấu trúc báo cáo

1. Cover topic: nhận diện module, tên báo cáo, một câu dẫn và các dữ kiện chính đã tính.
2. Mục lục 2–4 chương, tiêu đề ngắn; mỗi chương được xác định bởi recipe của topic.
3. Mỗi chương: luận điểm tóm tắt → visual chính → nhóm nhận định ngắn → phần căn cứ/đọc sâu → gợi ý thực hành.
4. Điều hướng chương bằng mục lục và trước/sau, trạng thái chương hiện tại rõ, giữ vị trí/focus khi thao tác.

Ví dụ `numerology--life-path`: Dấu ấn riêng → Điểm cần cân bằng → Động lực phát triển → Gợi ý áp dụng. Không ép các module khác theo cùng tên chương. Không đưa phân tích chu kỳ trả phí của topic khác vào báo cáo này.

## Chọn visual theo dữ liệu

| Nội dung | Visual | Nguồn giá trị |
| --- | --- | --- |
| Nhóm nhận định tính cách | Vòng/cụm nhận định, nhánh insight | Nhãn AI có căn cứ; các vùng là danh mục, không phải điểm số |
| Hai cách ứng xử | Các mức nghiêng định tính hoặc cặp thẻ đối chiếu | Rubric rõ và evidence; không tự tạo phần trăm tâm lý |
| Tử Vi | Các cung/nhóm sao có chú thích, mối liên hệ luận điểm | Lá số đã tính; AI chỉ nối nhận định với fact IDs |
| Bát Tự | Dòng chảy Tứ trụ → Ngũ hành, phân bố, đối chiếu | Tứ trụ và counts/relations đã tính; không tự tính lại bằng AI |
| Chiêm tinh | Bản đồ sao/góc chiếu có chú thích | Natal/transit đã tính; nhãn AI là phần diễn giải |
| Chu kỳ/vận hạn | Timeline theo giai đoạn | Khoảng tuổi/thời gian đã được calculator cung cấp |
| Tương hợp | Hai hồ sơ, yếu tố đồng điệu/cần dung hòa | Hai bộ dữ liệu và evidence; chỉ hiển thị số nếu có phép tính hiện hành |
| Gợi ý thực hành | Các bước và thẻ hành động | AI gợi ý từ evidence, không trình bày như dự báo chắc chắn |

## Hợp đồng giữa calculator, prompt và UI

Calculator tạo `trustedFacts` có ID, nhãn, giá trị và source path. Recipe của topic tạo `chapterPlan` với ID chương, visual cho phép và giới hạn nội dung. AI trả JSON `astrox.visual-reading.v1`; chỉ viết tiêu đề, summary, insight, giải thích, căn cứ và gợi ý, rồi tham chiếu fact IDs đã cấp.

AI không trả SVG/HTML/CSS, biểu đồ tự vẽ, tọa độ, màu, phần trăm mới hoặc công thức tính lại. UI lấy giá trị từ `trustedFacts`, dựng visual theo component của recipe, hiển thị các chuỗi AI bằng text an toàn.

`trait-spectrum` là ngoại lệ về phân loại, không phải số liệu: AI chọn enum left/balanced/right/unknown cho axis IDs đã định nghĩa trong recipe, liên kết với insight có căn cứ. UI dùng các vị trí phân loại cố định và nhãn mức nghiêng; không hiện 0–100% hoặc gọi đây là thang đo tâm lý. Trục không đủ căn cứ được bỏ/để unknown.

Tệp `report.schema.json` định nghĩa hình dạng phản hồi. Ngoài schema cần kiểm tra ngữ nghĩa:

- `module`, `serviceId`, `locale` phải trùng request.
- ID và thứ tự chương phải trùng `chapterPlan`.
- `visual.kind` trùng slot visual của chương; mọi `factIds`/`sourceFactIds` phải tồn tại và thuộc phạm vi topic.
- Insight ID duy nhất; không HTML/script và không nhãn chẩn đoán hoặc phán xét cực đoan.
- Số liệu chỉ lấy từ calculator; không dùng tên chapter hay field của AI làm quyền truy cập.

Không ép kết quả thành các trục không cùng nghĩa như “đồng cảm ↔ thao túng”. Nhận định thiếu căn cứ thì bỏ, không lấp bằng điểm số.

## Prompt và điểm tích hợp đã kiểm tra

`web/src/lib/managed-prompts.ts` ghi nhận descriptor. `services/admin/prompt-engine.ts` kiểm tra module/template và áp task theo leaf `serviceId`. `services/admin/prompt-templates.ts` hiện có nhiều yêu cầu Markdown; thay đổi định dạng phải có version mới và kiểm thử round-trip, không chỉ thêm câu “trình bày trực quan”.

Audit system prompt mặc định cũng tìm thấy yêu cầu “in đậm cho tiêu đề nhỏ” và gạch đầu dòng. Cần system-format contract do server chọn cho capability/topic mới, để chỉ thay quy tắc định dạng trên request được bật. Tệp `prompts/system-format.v1.txt` là draft của adapter này; không sửa/publish global system cho mọi dịch vụ.

Đề xuất thêm template versioned riêng cho từng module, cùng hợp đồng dùng chung; không nới lỏng kiểm tra module của engine. Bảo toàn `services/admin/original-prompts.ts`, lịch sử và bản published hiện hành. Các tệp `.txt` trong `docs/visual-readings/prompts/` là draft chuẩn bị cho bước này.

Các builder hiện tại (`tuviPromptBody`, `zodiacPromptBody`, `buildBatuPromptBody`, `numerologyPromptBody`, `couplePrompt`) sẽ nhận dữ liệu cấu trúc và recipe phù hợp. Giá/quote vẫn được tính với prompt thật, theo flow hiện có; một lần đọc không phát sinh thêm request AI chỉ để dựng hình.

`SavedReading`/`StructuredReading` cần nhánh renderer theo schema version và nhánh Markdown cũ. Không làm mất báo cáo đã mua, không tự gọi lại AI khi cache/prompt revision đổi. Payload mới không hợp lệ: không bịa visual, không tự retry có tính phí; giữ kết quả và hiển thị trạng thái định dạng có kiểm soát.

Tương Hợp có định dạng JSON cũ riêng; giữ renderer hiện hành cho payload legacy của nó, không ép thành Markdown hoặc envelope mới.

Locale và schema version phải đi cùng provenance/cache. Bản nháp không đồng nghĩa published; chỉ xác nhận prompt production sau publish revision và một request thực đã kiểm tra.

Mỗi báo cáo mới cần lưu snapshot của fact set và phiên bản calculator cùng provenance của request. Khi mở lại, visual dùng snapshot đi cùng báo cáo, không âm thầm lấy một bộ số mới sau khi công thức/calculator thay đổi. Provider chỉ trả nội dung; snapshot và liên kết request do ứng dụng giữ. Luận giải cũ không có snapshot vẫn đọc bằng nhánh Markdown hiện hành.

## Motion

- Mở phần đọc sâu và đổi chương: dịch ngắn + opacity + chiều cao ổn định, khoảng 240–420 ms.
- Chọn visual: chuyển mềm từ trạng thái đang hiển thị; không restart giật khi bấm nhanh.
- Dòng chảy: trace chạy một lần từ nguồn đến điểm đang chọn, rồi tắt.
- Hover chỉ trên pointer phù hợp; touch/keyboard có phản hồi tương đương.
- Hủy motion cũ khi đổi lựa chọn/rời chương; không loop khi idle.
- Tôn trọng `prefers-reduced-motion` và `html[data-motion="reduced"]`.

## Kiểm chứng trước tích hợp

Draft/fixture: schema hợp lệ, references tồn tại, service/topic scope đúng, số trên UI trùng calculator, malformed/unknown-kind/foreign-fact bị từ chối. Prototype: 320/375/800 px, không tràn ngang, điều hướng/đọc sâu/keyboard/bấm nhanh hoạt động, giảm motion dừng hiệu ứng.

Integration: kiểm thử prompt-engine/descriptor round-trip, parser và fallback Markdown, retention báo cáo cũ, locale, grant/quote/consent, generation cancellation. Run typecheck, lint, build, prompt-runtime QA và diff checks phù hợp. Publish/deploy do release owner và có production checks riêng.

## Evidence của bản đề xuất

Fixture dùng hồ sơ giả định và calculator Thần Số Học hiện tại để lấy số chủ đạo 5 và tổng trước rút gọn 14. Các lời diễn giải trong fixture được soạn thủ công để thử giao diện; chưa phải bằng chứng chất lượng đầu ra của provider AI.
